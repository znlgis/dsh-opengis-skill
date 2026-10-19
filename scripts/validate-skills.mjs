#!/usr/bin/env node
/**
 * Validate the packaged skill assets, plugin metadata, bundle wiring, docs, and
 * the upstream integrity manifest. This is the CI gate: it is self-contained
 * and never needs an opengis-skills checkout.
 *
 * Usage: node scripts/validate-skills.mjs
 *
 * Checked areas:
 *   1. package.json metadata, main/types, dsh.bundle.patch, files, exports,
 *      engines and lifecycle scripts.
 *   2. cordis.patch.yml: an insert row naming this package.
 *   3. icon.svg: presence, 256 KiB size limit, SVG content.
 *   4. locale/*.json: language-id file names, valid JSON, non-empty meta.
 *   5. README.md generated skill count/table compared with assets/.
 *   6. assets/: one readable, kebab-case skill directory per skill.
 *   7. Relative Markdown links in every asset document and repo document,
 *      rejecting broken links and paths escaping their root.
 *   8. upstream.json: schema, commit, syncedAt, skill list, and one SHA-256
 *      digest per vendored file; text files must not contain CR bytes.
 *   9. Non-fatal warnings (unparseable syncedAt, non-public npm registry).
 *  10. A catalog size/file/byte/token summary.
 *
 * Errors fail the run with exit code 1; warnings never do. Every diagnostic
 * names the offending file. No third-party dependencies are used.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	hashFiles,
	listFiles,
	readGeneratedSections,
	readSkillCatalog,
	readSkillEntry,
	renderSkillCount,
	renderSkillTable
} from "../lib/catalog.js";
import { findMarkdownLinkProblems } from "../lib/markdown-links.js";

/** Repository root: this script lives in <root>/scripts/. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");
const packageFile = join(root, "package.json");
const patchFile = join(root, "cordis.patch.yml");
const iconFile = join(root, "icon.svg");
const localeDirectory = join(root, "locale");
const readmeFile = join(root, "README.md");
const manifestFile = join(root, "upstream.json");

/** Semantic version with an optional prerelease suffix (no build metadata). */
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

/** Locale file name grammar: the host accepts 2-8 letter language ids and 1-8 character subtags. */
const LANGUAGE_ID = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u;

/** One npm-style version comparator, for example ">=0.2.0-rc.2" or "22". */
const VERSION_RANGE = /^(?:[<>]=?|=|~|\^)?v?\d+(?:\.(?:\d+|[xX*]))*(?:-[0-9A-Za-z.-]+)?$/u;

/** A complete lowercase hexadecimal SHA-1 commit id. */
const COMMIT = /^[0-9a-f]{40}$/u;

/** Package entry points that must be listed for the published tarball. */
const REQUIRED_FILES = [
	"assets",
	"lib",
	"cordis.patch.yml",
	"locale/*.json",
	"icon.svg",
	"upstream.json",
	"README.md",
	"THIRD_PARTY_NOTICES.md",
	"CHANGELOG.md",
	".editorconfig"
];

/** Export map keys the bundle contract relies on. */
const REQUIRED_EXPORTS = [".", "./skill-file", "./cordis.patch.yml", "./locale/*.json", "./icon", "./package.json"];

/** Lifecycle scripts that must stay wired. */
const REQUIRED_SCRIPTS = ["validate", "test", "sync", "sync:check", "check", "prepublishOnly"];

/** Locales that must carry both meta fields. */
const REQUIRED_LOCALES = ["en", "zh"];

/** Fallback package name used when package.json cannot be read. */
const EXPECTED_NAME = "@dsh-gis/dsh-opengis-skill";

/** Repository docs whose links are validated from the repo root. */
const REPOSITORY_DOCS = ["README.md", "CHANGELOG.md", "THIRD_PARTY_NOTICES.md"];

/** Blocking problems; any error fails the run. */
const errors = [];

/** Non-blocking problems; warnings never fail the run. */
const warnings = [];

/**
 * Record one blocking problem.
 *
 * @param message - the diagnostic, naming the offending file.
 */
function error(message) {
	errors.push(message);
}

/**
 * Record one non-blocking problem.
 *
 * @param message - the diagnostic, naming the offending file.
 */
function warn(message) {
	warnings.push(message);
}

/**
 * Turn an absolute path inside the repository into a repository-relative
 * display path so diagnostics are stable across machines and platforms.
 *
 * @param message - the message that may embed absolute paths.
 * @returns the message with repository paths made relative.
 */
function displayPath(message) {
	return message.replaceAll(root + sep, "").replaceAll("\\", "/");
}

/**
 * Read and parse one JSON file, recording a readable error on failure.
 *
 * @param path - the absolute JSON file path.
 * @returns the parsed value, or undefined when the file is missing or invalid.
 */
function readJson(path) {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch (cause) {
		error(displayPath(path + ": " + cause.message));
		return undefined;
	}
}

/**
 * Collect every file target of one export map value.
 *
 * @param target - a string, array, or nested conditions object.
 * @returns the file path strings found at any depth.
 */
function exportTargets(target) {
	if (typeof target === "string") return [target];
	if (Array.isArray(target)) return target.flatMap((entry) => exportTargets(entry));
	if (target !== null && typeof target === "object") return Object.values(target).flatMap((entry) => exportTargets(entry));
	return [];
}

/**
 * Check package.json metadata, entry points, publish files, exports, engines,
 * and lifecycle scripts.
 *
 * @param pkg - the parsed package.json value.
 */
function checkPackage(pkg) {
	if (pkg === null || typeof pkg !== "object" || Array.isArray(pkg)) {
		error("package.json: root value must be a JSON object");
		return;
	}
	if (typeof pkg.name !== "string" || pkg.name.length === 0) error("package.json: name must be a non-empty string");
	if (typeof pkg.version !== "string" || !VERSION.test(pkg.version)) error("package.json: version must be a semantic version such as 1.2.3 or 1.2.3-rc.1");
	if (typeof pkg.description !== "string" || pkg.description.length === 0) error("package.json: description must be a non-empty string");
	if (pkg.license !== "MIT") error('package.json: license must be "MIT"');
	for (const field of ["main", "types"]) {
		const value = pkg[field];
		if (typeof value !== "string" || value.length === 0) error("package.json: " + field + " must be a file path");
		else if (!existsSync(join(root, value))) error("package.json: " + field + " file does not exist: " + value);
	}
	if (pkg.dsh?.bundle?.patch !== "./cordis.patch.yml") error('package.json: dsh.bundle.patch must be "./cordis.patch.yml"');
	if (!Array.isArray(pkg.files)) {
		error("package.json: files must be an array");
	} else {
		for (const required of REQUIRED_FILES) {
			if (!pkg.files.includes(required)) error('package.json: files must include "' + required + '"');
		}
		for (const forbidden of ["scripts", "test"]) {
			if (pkg.files.some((entry) => entry === forbidden || entry.startsWith(forbidden + "/"))) error('package.json: files must not include "' + forbidden + '"');
		}
	}
	if (pkg.exports === null || typeof pkg.exports !== "object" || Array.isArray(pkg.exports)) {
		error("package.json: exports must be an object");
	} else {
		for (const key of REQUIRED_EXPORTS) {
			if (!Object.hasOwn(pkg.exports, key)) error('package.json: exports must declare "' + key + '"');
		}
		for (const [key, target] of Object.entries(pkg.exports)) {
			if (key.includes("*")) continue;
			for (const file of exportTargets(target)) {
				if (file.includes("*") || !file.startsWith("./")) continue;
				if (!existsSync(join(root, file))) error('package.json: export "' + key + '" points to a missing file: ' + file);
			}
		}
	}
	if (typeof pkg.engines?.node !== "string" || !isVersionRange(pkg.engines.node)) error('package.json: engines.node must be a version range such as ">=22"');
	if (typeof pkg.engines?.dsh !== "string" || !isVersionRange(pkg.engines.dsh)) error('package.json: engines.dsh must be a version range such as ">=0.2.0-rc.2 <0.3.0-0"');
	if (pkg.scripts === null || typeof pkg.scripts !== "object") {
		error("package.json: scripts must be an object");
	} else {
		for (const script of REQUIRED_SCRIPTS) {
			if (typeof pkg.scripts[script] !== "string" || pkg.scripts[script].length === 0) error('package.json: scripts must define "' + script + '"');
		}
	}
	if (pkg.publishConfig?.registry !== "https://registry.npmjs.org/") warn("package.json: publishConfig.registry is not https://registry.npmjs.org/");
}

/**
 * Report whether a value looks like an npm semver range.
 *
 * @param value - the range to inspect.
 * @returns whether every comparator token is a valid version comparator.
 */
function isVersionRange(value) {
	for (const alternative of value.split("||")) {
		const trimmed = alternative.trim();
		if (trimmed.length === 0) return false;
		if (trimmed === "*" || trimmed === "x") continue;
		if (trimmed.includes(" - ")) continue;
		for (const comparator of trimmed.split(/\s+/u)) {
			if (!VERSION_RANGE.test(comparator)) return false;
		}
	}
	return true;
}

/** Escape one literal string for use inside a regular expression. */
function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Check that the bundle patch contains an enabled insert row naming this
 * package. A line-based check is used instead of substring matching so a
 * commented-out or malformed row cannot pass validation.
 */
function checkBundlePatch() {
	if (!existsSync(patchFile)) {
		error("cordis.patch.yml is missing");
		return;
	}
	let patch;
	try {
		patch = readFileSync(patchFile, "utf8");
	} catch (cause) {
		error(displayPath(patchFile + ": " + cause.message));
		return;
	}
	const lines = patch.split(/\r?\n/u);
	const insertIndex = lines.findIndex((line) => /^\s*-\s+insert:\s*$/u.test(line));
	if (insertIndex === -1) {
		error('cordis.patch.yml: missing an "- insert:" row');
		return;
	}
	const packageName = typeof pkgName === "string" && pkgName.length > 0 ? pkgName : EXPECTED_NAME;
	const namePattern = new RegExp("^\\s+name:\\s*['\"]?" + escapeRegExp(packageName) + "['\"]?\\s*$", "u");
	let rowId;
	let rowName = false;
	for (const line of lines.slice(insertIndex + 1)) {
		if (/^-\s/u.test(line)) break;
		const id = /^\s*-\s+id:\s*(\S+)\s*$/u.exec(line);
		if (id !== null) rowId = id[1];
		if (namePattern.test(line)) rowName = true;
	}
	if (rowId === undefined) error('cordis.patch.yml: insert row is missing "id:"');
	if (!rowName) error("cordis.patch.yml: insert row does not name " + packageName);
}

/** The parsed package.json value, shared by the bundle-patch check. */
const pkg = readJson(packageFile);
const pkgName = pkg !== null && typeof pkg === "object" && typeof pkg.name === "string" ? pkg.name : undefined;

/**
 * Check the bundle icon: presence, size limit, and SVG content.
 */
function checkIcon() {
	if (!existsSync(iconFile)) {
		error("icon.svg is missing");
		return;
	}
	let icon;
	try {
		icon = readFileSync(iconFile);
	} catch (cause) {
		error(displayPath(iconFile + ": " + cause.message));
		return;
	}
	if (icon.byteLength > 256 * 1024) error("icon.svg exceeds the 256 KiB bundle icon limit");
	if (!icon.toString("utf8").includes("<svg")) error('icon.svg does not contain "<svg"');
}

/**
 * Check locale file names, JSON validity, and the required meta fields.
 */
function checkLocales() {
	if (!existsSync(localeDirectory)) {
		error("locale/: directory is missing");
		return;
	}
	let entries;
	try {
		entries = readdirSync(localeDirectory, { withFileTypes: true });
	} catch (cause) {
		error(displayPath(localeDirectory + ": " + cause.message));
		return;
	}
	const languages = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
		const language = entry.name.slice(0, -".json".length);
		languages.push(language);
		if (!LANGUAGE_ID.test(language)) error("locale/" + entry.name + ": file name is not a language id");
	}
	for (const language of REQUIRED_LOCALES) {
		const data = readJson(join(localeDirectory, language + ".json"));
		if (data === undefined) continue;
		if (data === null || typeof data !== "object" || Array.isArray(data)) {
			error("locale/" + language + ".json: root value must be a JSON object");
			continue;
		}
		if (typeof data.meta?.title !== "string" || data.meta.title.length === 0) error("locale/" + language + ".json: meta.title must be a non-empty string");
		if (typeof data.meta?.description !== "string" || data.meta.description.length === 0) error("locale/" + language + ".json: meta.description must be a non-empty string");
	}
	for (const language of languages) {
		if (REQUIRED_LOCALES.includes(language)) continue;
		const data = readJson(join(localeDirectory, language + ".json"));
		if (data === undefined) continue;
		if (data === null || typeof data !== "object" || Array.isArray(data)) {
			warn("locale/" + language + ".json: meta.title or meta.description is missing");
			continue;
		}
		const hasTitle = typeof data.meta?.title === "string" && data.meta.title.length > 0;
		const hasDescription = typeof data.meta?.description === "string" && data.meta.description.length > 0;
		if (!hasTitle || !hasDescription) warn("locale/" + language + ".json: meta.title or meta.description is missing");
	}
}

/**
 * Compare the generated README sections with the asset catalog.
 */
function checkReadme() {
	if (!existsSync(readmeFile)) {
		error("README.md: missing");
		return;
	}
	let markdown;
	try {
		markdown = readFileSync(readmeFile, "utf8");
	} catch (cause) {
		error(displayPath("README.md: " + cause.message));
		return;
	}
	let current;
	try {
		current = readGeneratedSections(markdown);
	} catch (cause) {
		error(displayPath("README.md: " + cause.message));
		return;
	}
	let catalog;
	try {
		catalog = readSkillCatalog(assetsRoot);
	} catch {
		return;
	}
	if (current.count !== renderSkillCount(catalog) || current.table !== renderSkillTable(catalog)) {
		error("README.md: generated skill count/table is out of date; run npm run sync");
	}
}

/**
 * Enumerate the asset skill directories and parse each SKILL.md, accumulating
 * errors per skill instead of stopping at the first bad directory.
 *
 * @returns the valid skill entries, sorted by directory name.
 */
function checkAssets() {
	const skills = [];
	if (!existsSync(assetsRoot)) {
		error("assets/: directory is missing; run npm run sync");
		return skills;
	}
	let entries;
	try {
		entries = readdirSync(assetsRoot, { withFileTypes: true });
	} catch (cause) {
		error(displayPath("assets/: " + cause.message));
		return skills;
	}
	const errorCountBefore = errors.length;
	const seen = new Set();
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			error("assets/" + entry.name + ": unexpected file at the assets root");
			continue;
		}
		const directory = join(assetsRoot, entry.name);
		const skillPath = join(directory, "SKILL.md");
		if (statSync(skillPath, { throwIfNoEntry: false })?.isFile() !== true) {
			error("assets/" + entry.name + ": SKILL.md is missing");
			continue;
		}
		let skill;
		try {
			skill = readSkillEntry(directory, entry.name);
		} catch (cause) {
			error(displayPath(cause.message));
			continue;
		}
		if (skill === undefined) {
			error("assets/" + entry.name + ": SKILL.md is missing");
			continue;
		}
		if (seen.has(skill.name)) {
			error("assets/: duplicate skill name " + skill.name);
			continue;
		}
		seen.add(skill.name);
		skills.push(skill);
	}
	// A per-skill parse error already explains why the catalog may not build;
	// re-reporting the aggregate catalog failure would only duplicate messages.
	if (errors.length !== errorCountBefore) return skills;
	try {
		const catalog = readSkillCatalog(assetsRoot);
		const expected = catalog.map((skill) => skill.name);
		const actual = skills.map((skill) => skill.name).sort();
		if (expected.length !== actual.length || expected.some((name, index) => name !== actual[index])) {
			error("assets/: readSkillCatalog(assetsRoot) does not match the skill directories");
		}
	} catch (cause) {
		error(displayPath(cause.message));
	}
	return skills;
}

/**
 * Verify every relative Markdown link: all documents under assets/ resolve
 * inside assets/, and the repository docs resolve inside the repository root.
 */
function checkLinks() {
	if (existsSync(assetsRoot)) {
		let files = [];
		try {
			files = listFiles(assetsRoot);
		} catch (cause) {
			error(displayPath("assets/: " + cause.message));
		}
		for (const relativePath of files) {
			if (!relativePath.toLowerCase().endsWith(".md")) continue;
			const file = join(assetsRoot, ...relativePath.split("/"));
			let markdown;
			try {
				markdown = readFileSync(file, "utf8");
			} catch (cause) {
				error(displayPath(file + ": " + cause.message));
				continue;
			}
			for (const problem of findMarkdownLinkProblems(file, markdown, assetsRoot)) error(displayPath(problem));
		}
	}
	for (const fileName of REPOSITORY_DOCS) {
		const file = join(root, fileName);
		if (!existsSync(file)) {
			if (fileName === "CHANGELOG.md") continue;
			if (fileName !== "README.md") error(fileName + ": file is missing");
			continue;
		}
		let markdown;
		try {
			markdown = readFileSync(file, "utf8");
		} catch (cause) {
			error(displayPath(file + ": " + cause.message));
			continue;
		}
		for (const problem of findMarkdownLinkProblems(file, markdown, root)) error(displayPath(problem));
	}
}

/**
 * Check the upstream.json schema, skill list, and per-file SHA-256 manifest.
 *
 * @param skills - the valid asset skill entries.
 */
function checkManifest(skills) {
	if (!existsSync(manifestFile)) {
		error("upstream.json is missing; run npm run sync");
		return;
	}
	const manifest = readJson(manifestFile);
	if (manifest === undefined) return;
	if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
		error("upstream.json: root value must be a JSON object");
		return;
	}
	if (manifest.schemaVersion !== 1) error("upstream.json: schemaVersion must be 1");
	if (manifest.hashAlgorithm !== "sha256") error('upstream.json: hashAlgorithm must be "sha256"');
	if (typeof manifest.repository !== "string" || manifest.repository.length === 0) error("upstream.json: repository must be a non-empty string");
	if (manifest.commit === undefined) error("upstream.json: commit is missing; run npm run sync");
	else if (typeof manifest.commit !== "string" || !COMMIT.test(manifest.commit)) error("upstream.json: commit must be a 40-character lowercase hexadecimal SHA-1");
	if (typeof manifest.syncedAt !== "string" || Number.isNaN(Date.parse(manifest.syncedAt))) warn("upstream.json: syncedAt is not a parseable ISO date");
	if (!Array.isArray(manifest.skills)) {
		error("upstream.json: skills must be an array of skill names");
	} else {
		if (manifest.skillCount !== manifest.skills.length) {
			error("upstream.json: skillCount " + JSON.stringify(manifest.skillCount) + " does not match " + manifest.skills.length + " entries in skills");
		}
		const expected = skills.map((skill) => skill.name).sort();
		const actual = [...manifest.skills].sort();
		if (expected.length !== actual.length || expected.some((name, index) => name !== actual[index])) {
			error("upstream.json: skills do not match the asset skill directories; run npm run sync");
		}
	}
	const files = manifest.files;
	if (files === null || typeof files !== "object" || Array.isArray(files)) {
		error("upstream.json: files map is missing; run npm run sync");
		return;
	}
	const skillNames = new Set(skills.map((skill) => skill.name));
	for (const [relativePath, digest] of Object.entries(files)) {
		const first = relativePath.split("/")[0];
		if (!skillNames.has(first)) error("upstream.json: files entry " + relativePath + " is not inside a known skill directory; run npm run sync");
		if (typeof digest !== "string" || !/^[0-9a-f]{64}$/u.test(digest)) error("upstream.json: files entry " + relativePath + " must be a 64-character lowercase SHA-256 digest");
	}
	if (!existsSync(assetsRoot)) return;
	let actual;
	try {
		actual = hashFiles(assetsRoot);
	} catch (cause) {
		error(displayPath("assets/: " + cause.message));
		return;
	}
	for (const [relativePath, digest] of Object.entries(files)) {
		if (!Object.hasOwn(actual, relativePath)) error("upstream.json: files lists missing asset " + relativePath + "; run npm run sync");
		else if (actual[relativePath] !== digest) error("upstream.json: SHA-256 mismatch for assets/" + relativePath + "; run npm run sync");
	}
	for (const relativePath of Object.keys(actual)) {
		if (!Object.hasOwn(files, relativePath)) error("upstream.json: assets/" + relativePath + " is not listed in the files map; run npm run sync");
	}
}

/** Total number of vendored files, filled by scanAssets(). */
let assetFileCount = 0;

/** Total size of the vendored files in bytes, filled by scanAssets(). */
let assetBytes = 0;

/**
 * Scan every vendored file: total the bytes and reject text files carrying a
 * CR byte (a CRLF or lone CR would mean the snapshot was edited or rewritten).
 */
function scanAssets() {
	if (!existsSync(assetsRoot)) return;
	let files;
	try {
		files = listFiles(assetsRoot);
	} catch (cause) {
		error(displayPath("assets/: " + cause.message));
		return;
	}
	assetFileCount = files.length;
	for (const relativePath of files) {
		const file = join(assetsRoot, ...relativePath.split("/"));
		let bytes;
		try {
			bytes = readFileSync(file);
		} catch (cause) {
			error(displayPath(file + ": " + cause.message));
			continue;
		}
		assetBytes += bytes.byteLength;
		if (bytes.includes(0)) continue;
		if (bytes.includes(13)) error("assets/" + relativePath + ": text-file contains a CR or CRLF byte; run npm run sync");
	}
}

/**
 * Warn when the changelog lacks an entry for the current package version.
 */
function checkChangelog() {
	const file = join(root, "CHANGELOG.md");
	if (!existsSync(file)) {
		warn("CHANGELOG.md is missing");
		return;
	}
	if (typeof pkg?.version !== "string") return;
	let markdown;
	try {
		markdown = readFileSync(file, "utf8");
	} catch (cause) {
		error(displayPath(file + ": " + cause.message));
		return;
	}
	if (!markdown.includes("## [" + pkg.version + "]")) warn("CHANGELOG.md: no section for version " + pkg.version);
}

/**
 * Print the warnings, errors, and the final summary line, then set the exit
 * code. Warnings alone never fail the run.
 *
 * @param skills - the valid asset skill entries.
 */
function printSummary(skills) {
	for (const warning of warnings) console.log("  warning: " + warning);
	for (const message of errors) console.error("  error: " + message);
	const catalogCharacters = skills.reduce((total, skill) => total + skill.name.length + skill.description.length, 0);
	const tokens = Math.ceil(catalogCharacters / 4);
	console.log(
		"validate-skills: " +
			skills.length +
			" skills, " +
			assetFileCount +
			" files, " +
			assetBytes +
			" asset bytes, catalog " +
			catalogCharacters +
			" chars (~" +
			tokens +
			" tokens), " +
			errors.length +
			" error(s), " +
			warnings.length +
			" warning(s)"
	);
	if (errors.length > 0) process.exitCode = 1;
}

if (pkg !== undefined) checkPackage(pkg);
checkBundlePatch();
checkIcon();
checkLocales();
checkReadme();
const validatedSkills = checkAssets();
checkLinks();
checkManifest(validatedSkills);
checkChangelog();
scanAssets();
printSummary(validatedSkills);
