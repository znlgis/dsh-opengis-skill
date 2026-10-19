#!/usr/bin/env node
/**
 * Synchronize the GIS skills of an opengis-skills checkout into `assets/`,
 * refresh `upstream.json`, and regenerate the marked README sections.
 *
 * Usage:
 *   node scripts/sync-opengis-skills.mjs [--from <path>] [--check] [--help]
 *
 * Options:
 *   --from <path>  opengis-skills checkout holding `gis/` (default:
 *                  OPENGIS_SKILLS_DIR, else ../opengis-skills next to this repo)
 *   --check        compare the vendored snapshot with the checkout without
 *                  writing; exits 1 on any drift
 *   --help         print this help
 *
 * Write mode copies one `gis/<name>/` directory per skill, normalizes text
 * files to LF so the vendored snapshot matches the upstream git blob on every
 * platform, prunes skill directories upstream removed, records the upstream
 * commit plus one SHA-256 digest per file in `upstream.json`, and regenerates
 * the README generated sections. `--from` must be the git checkout root itself:
 * a plain copy nested inside another repository is rejected so that a foreign
 * HEAD can never be recorded as provenance.
 * `--check` compares the full file set in both
 * directions (paths and canonical bytes), the generated README sections, and
 * the integrity manifest; syncedAt is ignored because a fresh sync would only
 * change that timestamp. Both modes reuse the runtime helpers in lib/ and need
 * no third-party dependency. Every output line is prefixed with
 * "sync-opengis-skills: ".
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	canonicalVendoredBytes,
	hashFiles,
	listFiles,
	readGeneratedSections,
	readSkillCatalog,
	replaceGeneratedSections,
	renderSkillCount,
	renderSkillTable
} from "../lib/catalog.js";

/** Prefix for every line printed by this script. */
const PREFIX = "sync-opengis-skills: ";

/** Upstream repository recorded in the integrity manifest. */
const REPOSITORY = "https://github.com/znlgis/opengis-skills";

/** Directory inside the upstream checkout that holds one skill per subdirectory. */
const SKILL_DIRECTORY = "gis";

/** A complete lowercase hexadecimal SHA-1 commit id. */
const COMMIT = /^[0-9a-f]{40}$/u;

/** Repository root: this script lives in <root>/scripts/. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");
const readmeFile = join(root, "README.md");
const upstreamFile = join(root, "upstream.json");

/** The usage block printed by --help and on a CLI error. */
const USAGE = [
	"usage: node scripts/sync-opengis-skills.mjs [--from <path>] [--check] [--help]",
	"  --from <path>  opengis-skills git checkout that contains gis/",
	"                 (default: OPENGIS_SKILLS_DIR, else ../opengis-skills)",
	"  --check        verify assets/, README.md, and upstream.json without writing",
	"  --help         show this help"
];

/** Print the usage block. */
function printUsage() {
	for (const line of USAGE) console.log(PREFIX + line);
}

/**
 * Stop the run with one readable message.
 *
 * @param message - the reason, without the common prefix.
 * @throws always; the top-level handler prints the message and sets exit code 1.
 */
function fail(message) {
	throw new Error(message);
}

/**
 * Parse the command line strictly.
 *
 * @param argv - arguments after the script name.
 * @returns the parsed options, or an error message for a bad invocation.
 */
function parseArguments(argv) {
	const options = { check: false, from: undefined };
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--check") {
			options.check = true;
			continue;
		}
		if (argument === "--from") {
			const value = argv[index + 1];
			if (value === undefined || value.startsWith("-")) return { error: "--from requires a path value" };
			options.from = value;
			index += 1;
			continue;
		}
		if (argument.startsWith("--from=")) {
			const value = argument.slice("--from=".length);
			if (value.length === 0) return { error: "--from requires a path value" };
			options.from = value;
			continue;
		}
		return { error: 'unknown argument "' + argument + '"' };
	}
	return { options };
}

/**
 * Resolve the upstream checkout directory.
 *
 * An explicit --from value and OPENGIS_SKILLS_DIR are resolved against the
 * working directory; the fallback is the sibling checkout next to this repo.
 *
 * @param value - the --from value, when present.
 * @returns the absolute checkout path.
 */
function resolveFrom(value) {
	if (value !== undefined) return resolve(value);
	const environment = process.env.OPENGIS_SKILLS_DIR;
	if (environment !== undefined && environment.length > 0) return resolve(environment);
	return resolve(root, "..", "opengis-skills");
}

/**
 * Read the upstream commit, but only when `from` is itself the git checkout
 * root. A plain copy nested inside another repository must never inherit that
 * repository's HEAD: recording it would forge the provenance in upstream.json
 * and poison the pinned CI sync check.
 *
 * @param from - the upstream checkout path.
 * @returns the 40-character commit id, or undefined when `from` is not a git checkout root.
 */
function readGitCommit(from) {
	try {
		const checkout = realpathSync.native(from);
		const topLevel = realpathSync.native(execFileSync("git", ["-C", checkout, "rev-parse", "--show-toplevel"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"]
		}).trim());
		if (pathKey(topLevel) !== pathKey(checkout)) return undefined;
		const commit = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"]
		}).trim();
		return COMMIT.test(commit) ? commit : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Normalize one path for comparison, folding case on Windows.
 *
 * @param value - the path to compare.
 * @returns the resolved comparison key.
 */
function pathKey(value) {
	const normalized = resolve(value);
	return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

/**
 * Check that every skill directory under the upstream gis/ directory carries a
 * SKILL.md. readSkillCatalog() skips directories without one; sync must not,
 * because a renamed or mistyped upstream directory would otherwise silently
 * prune the corresponding vendored skill. Regular files at the gis/ root are
 * ignored: upstream keeps a category index there that is not a skill payload.
 *
 * @param sourceRoot - the upstream gis/ directory.
 * @returns one problem line per skill directory missing SKILL.md.
 */
function checkSourceDirectory(sourceRoot) {
	const problems = [];
	for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		if (statSync(join(sourceRoot, entry.name, "SKILL.md"), { throwIfNoEntry: false })?.isFile() !== true) {
			problems.push(SKILL_DIRECTORY + "/" + entry.name + ": missing SKILL.md");
		}
	}
	return problems;
}

/**
 * Split one POSIX relative path into path components.
 *
 * @param relativePath - a path produced by listFiles(), always "/"-separated.
 * @returns the components consumed by join().
 */
function pathParts(relativePath) {
	return relativePath.split("/");
}

/**
 * Read README.md and verify that both generated sections are present exactly
 * once. This runs before any mutation so a damaged README fails the sync before
 * assets/ is touched.
 *
 * @returns the current README text.
 */
function readReadme() {
	if (!existsSync(readmeFile)) fail("README.md is missing; it must contain the skills:count and skills generated markers");
	const markdown = readFileSync(readmeFile, "utf8");
	try {
		readGeneratedSections(markdown);
	} catch (cause) {
		fail("README.md: " + cause.message);
	}
	return markdown;
}

/**
 * Remove everything under assets/ that the source catalog does not describe:
 * skill directories upstream removed, and stray files at the assets root that
 * a vendored snapshot must never carry.
 *
 * @param skillNames - the source skill names.
 * @returns the removed entry names, sorted.
 */
function pruneAssets(skillNames) {
	const pruned = [];
	if (!existsSync(assetsRoot)) return pruned;
	const resolvedAssetsRoot = resolve(assetsRoot);
	for (const entry of readdirSync(assetsRoot, { withFileTypes: true })) {
		if (entry.isDirectory() && skillNames.has(entry.name)) continue;
		const target = resolve(assetsRoot, entry.name);
		if (!target.startsWith(resolvedAssetsRoot + sep)) fail("refusing to remove a path outside assets/: " + target);
		rmSync(target, { recursive: true, force: true });
		pruned.push(entry.name);
	}
	return pruned.sort();
}

/**
 * Copy one source skill directory verbatim, normalizing text to LF.
 *
 * @param sourceDirectory - the upstream skill directory.
 * @param targetDirectory - the asset directory to replace.
 */
function copySkillDirectory(sourceDirectory, targetDirectory) {
	mkdirSync(targetDirectory, { recursive: true });
	for (const relativePath of listFiles(sourceDirectory)) {
		const components = pathParts(relativePath);
		const targetPath = join(targetDirectory, ...components);
		mkdirSync(dirname(targetPath), { recursive: true });
		writeFileSync(targetPath, canonicalVendoredBytes(readFileSync(join(sourceDirectory, ...components))));
	}
}

/**
 * Compare one source skill with its vendored copy in both directions.
 *
 * @param skill - the source catalog entry.
 * @returns one problem line per missing, extra, or modified file.
 */
function compareSkill(skill) {
	const label = "assets/" + skill.name;
	const targetDirectory = join(assetsRoot, skill.name);
	if (!existsSync(targetDirectory)) return [label + ": missing from assets/ (run npm run sync)"];
	let sourceFiles;
	let targetFiles;
	try {
		sourceFiles = listFiles(skill.directory);
		targetFiles = listFiles(targetDirectory);
	} catch (cause) {
		return [label + ": " + cause.message];
	}
	const sourceSet = new Set(sourceFiles);
	const targetSet = new Set(targetFiles);
	const problems = [];
	for (const relativePath of sourceFiles) {
		if (!targetSet.has(relativePath)) problems.push(label + ": missing file " + relativePath);
	}
	for (const relativePath of targetFiles) {
		if (!sourceSet.has(relativePath)) problems.push(label + ": unexpected file " + relativePath);
	}
	for (const relativePath of sourceFiles) {
		if (!targetSet.has(relativePath)) continue;
		const components = pathParts(relativePath);
		try {
			const sourceBytes = canonicalVendoredBytes(readFileSync(join(skill.directory, ...components)));
			const targetBytes = readFileSync(join(targetDirectory, ...components));
			if (!sourceBytes.equals(targetBytes)) problems.push(label + ": file " + relativePath + " differs from upstream");
		} catch (cause) {
			problems.push(label + ": " + cause.message);
		}
	}
	return problems;
}

/**
 * Verify the generated README sections against the source catalog.
 *
 * @param skills - the source catalog.
 * @returns one problem line per damaged or outdated section.
 */
function checkReadme(skills) {
	if (!existsSync(readmeFile)) return ["README.md: missing; it must contain the skills:count and skills generated markers"];
	const markdown = readFileSync(readmeFile, "utf8");
	let current;
	try {
		current = readGeneratedSections(markdown);
	} catch (cause) {
		return ["README.md: " + cause.message];
	}
	const problems = [];
	if (current.count !== renderSkillCount(skills)) problems.push("README.md: generated skill count section is out of date; run npm run sync");
	if (current.table !== renderSkillTable(skills)) problems.push("README.md: generated skill table section is out of date; run npm run sync");
	return problems;
}

/**
 * Read upstream.json without throwing.
 *
 * @returns either { manifest } or { error }.
 */
function readManifest() {
	if (!existsSync(upstreamFile)) return { error: "upstream.json: missing; run npm run sync" };
	try {
		return { manifest: JSON.parse(readFileSync(upstreamFile, "utf8")) };
	} catch (cause) {
		return { error: "upstream.json: invalid JSON: " + cause.message };
	}
}

/**
 * Compare the manifest file map with the vendored assets.
 *
 * @param files - the manifest files value.
 * @returns one problem line per missing, extra, or mismatched path.
 */
function checkManifestFiles(files) {
	if (files === null || typeof files !== "object" || Array.isArray(files)) {
		return ["upstream.json: files map is missing; run npm run sync"];
	}
	if (!existsSync(assetsRoot)) return [];
	let actual;
	try {
		actual = hashFiles(assetsRoot);
	} catch (cause) {
		return ["assets/: " + cause.message];
	}
	const problems = [];
	for (const [relativePath, digest] of Object.entries(files)) {
		if (!Object.hasOwn(actual, relativePath)) problems.push("upstream.json: files lists missing asset " + relativePath + "; run npm run sync");
		else if (actual[relativePath] !== digest) problems.push("upstream.json: SHA-256 mismatch for assets/" + relativePath + "; run npm run sync");
	}
	for (const relativePath of Object.keys(actual)) {
		if (!Object.hasOwn(files, relativePath)) problems.push("upstream.json: assets/" + relativePath + " is not listed in the files map; run npm run sync");
	}
	return problems;
}

/**
 * Verify the whole integrity manifest; syncedAt is intentionally ignored.
 *
 * @param manifestResult - the result of readManifest().
 * @param skills - the source catalog.
 * @returns one problem line per schema or integrity error.
 */
function checkManifest(manifestResult, skills) {
	if (manifestResult.error !== undefined) return [manifestResult.error];
	const manifest = manifestResult.manifest;
	if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) return ["upstream.json: root value must be a JSON object"];
	const problems = [];
	if (manifest.schemaVersion !== 1) problems.push("upstream.json: schemaVersion must be 1");
	if (manifest.hashAlgorithm !== "sha256") problems.push('upstream.json: hashAlgorithm must be "sha256"');
	if (manifest.commit !== undefined && !COMMIT.test(manifest.commit)) {
		problems.push("upstream.json: commit must be a 40-character lowercase hexadecimal SHA-1");
	}
	if (manifest.skillCount !== skills.length) {
		problems.push("upstream.json: skillCount " + JSON.stringify(manifest.skillCount) + " does not match the " + skills.length + " skills in the source catalog");
	}
	const expectedNames = skills.map((skill) => skill.name);
	if (!Array.isArray(manifest.skills) || manifest.skills.length !== expectedNames.length || manifest.skills.some((name, index) => name !== expectedNames[index])) {
		problems.push("upstream.json: skills do not match the source catalog; run npm run sync");
	}
	problems.push(...checkManifestFiles(manifest.files));
	return problems;
}

/**
 * Write mode: prune, copy, refresh the manifest and the README.
 *
 * @param from - the upstream checkout path.
 * @param skills - the source catalog, sorted by skill name.
 * @returns the process exit code.
 */
function runSync(from, skills) {
	const markdown = readReadme();
	const commit = readGitCommit(from);
	if (commit === undefined) {
		fail("not a git checkout root: " + from + "; sync records the upstream commit, so --from must name the opengis-skills git clone");
	}
	mkdirSync(assetsRoot, { recursive: true });
	const skillNames = new Set(skills.map((skill) => skill.name));
	const pruned = pruneAssets(skillNames);
	for (const skill of skills) {
		const targetDirectory = resolve(assetsRoot, skill.name);
		if (!targetDirectory.startsWith(resolve(assetsRoot) + sep)) fail("refusing to write outside assets/: " + targetDirectory);
		rmSync(targetDirectory, { recursive: true, force: true });
		copySkillDirectory(skill.directory, targetDirectory);
	}
	const files = hashFiles(assetsRoot);
	const manifest = {
		schemaVersion: 1,
		repository: REPOSITORY,
		commit,
		syncedAt: new Date().toISOString(),
		hashAlgorithm: "sha256",
		skillCount: skills.length,
		skills: skills.map((skill) => skill.name),
		files
	};
	writeFileSync(upstreamFile, JSON.stringify(manifest, null, 2) + "\n");
	writeFileSync(readmeFile, replaceGeneratedSections(markdown, skills));
	const suffix = " @ " + commit.slice(0, 7);
	console.log(PREFIX + "synced " + skills.length + " skills from " + from + suffix);
	console.log(PREFIX + "  files: " + Object.keys(files).length);
	console.log(PREFIX + "  pruned: " + (pruned.length === 0 ? "none" : pruned.join(", ")));
	return 0;
}

/**
 * Check mode: compare assets/, README.md, and upstream.json with the checkout.
 *
 * @param from - the upstream checkout path.
 * @param skills - the source catalog, sorted by skill name.
 * @returns the process exit code.
 */
function runCheck(from, skills) {
	const problems = [];
	const sourceNames = new Set(skills.map((skill) => skill.name));
	if (!existsSync(assetsRoot)) {
		problems.push("assets/: missing; run npm run sync");
	} else {
		let assetEntries = [];
		try {
			assetEntries = readdirSync(assetsRoot, { withFileTypes: true });
		} catch (cause) {
			problems.push("assets/: " + cause.message);
		}
		for (const entry of assetEntries) {
			if (entry.isDirectory()) {
				if (!sourceNames.has(entry.name)) problems.push("assets/" + entry.name + ": no longer exists in the source catalog; run npm run sync");
			} else {
				problems.push("assets/" + entry.name + ": unexpected file at the assets root; run npm run sync");
			}
		}
		for (const skill of skills) problems.push(...compareSkill(skill));
	}
	problems.push(...checkReadme(skills));
	const manifestResult = readManifest();
	problems.push(...checkManifest(manifestResult, skills));
	const recordedCommit = manifestResult.manifest !== null && typeof manifestResult.manifest === "object" && typeof manifestResult.manifest.commit === "string"
		? manifestResult.manifest.commit
		: undefined;
	if (recordedCommit !== undefined) {
		const head = readGitCommit(from);
		if (head === undefined) {
			console.warn(PREFIX + "warning: cannot verify the upstream commit; " + from + " is not a git checkout root");
		} else if (head !== recordedCommit) {
			console.warn(PREFIX + "warning: upstream git HEAD " + head + " differs from the upstream.json commit " + recordedCommit);
		}
	}
	if (problems.length > 0) {
		console.error(PREFIX + "found " + problems.length + " problem(s) between " + from + " and the vendored snapshot:");
		for (const problem of problems) console.error("  - " + problem);
		return 1;
	}
	console.log(PREFIX + "assets/ is in sync with " + from + " (" + skills.length + " skills)");
	return 0;
}

/**
 * Entry point.
 *
 * @param argv - arguments after the script name.
 * @returns the process exit code.
 */
function run(argv) {
	if (argv.includes("--help")) {
		printUsage();
		return 0;
	}
	const parsed = parseArguments(argv);
	if (parsed.error !== undefined) {
		printUsage();
		console.error(PREFIX + parsed.error);
		return 1;
	}
	const from = resolveFrom(parsed.options.from);
	const sourceRoot = join(from, SKILL_DIRECTORY);
	if (!existsSync(sourceRoot)) {
		console.error(PREFIX + 'no "' + SKILL_DIRECTORY + '/" directory under ' + from + "; pass --from <opengis-skills checkout>");
		return 1;
	}
	const sourceProblems = checkSourceDirectory(sourceRoot);
	if (sourceProblems.length > 0) {
		console.error(PREFIX + "invalid upstream " + SKILL_DIRECTORY + "/ directory under " + from + ":");
		for (const problem of sourceProblems) console.error("  - " + problem);
		return 1;
	}
	const skills = readSkillCatalog(sourceRoot);
	return parsed.options.check ? runCheck(from, skills) : runSync(from, skills);
}

try {
	process.exitCode = run(process.argv.slice(2));
} catch (cause) {
	console.error(PREFIX + (cause instanceof Error ? cause.message : String(cause)));
	process.exitCode = 1;
}
