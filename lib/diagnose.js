/**
 * Read-only diagnostics for the packaged OpenGIS skill bundle.
 *
 * The contract requires one question to be answerable without reading source:
 * "why is my skill catalog not what I expected". This module answers it with a
 * plain JSON-serializable object that is safe to print from anywhere:
 *
 * - it never throws: every probe is wrapped and a failure becomes a diagnostic
 *   entry, because a diagnostic that crashes answers nothing;
 * - it never writes and never touches the network;
 * - it is synchronous on purpose: the contract's one-line entry point is
 *   `node -e "import(...).then(m => console.log(JSON.stringify(m.diagnose())))"`,
 *   and a promise would stringify to "{}".
 *
 * Fields and their formulas:
 *
 * - "skills": skills found under "assets/" by a tolerant scan (a broken skill
 *   directory becomes a "problems" entry instead of aborting the scan);
 * - "visible": the count after the same normalizeSelection/selectSkills the
 *   provider applies, so it matches what a session would list;
 * - "missing": names listed in "upstream.json" that "assets/" does not ship;
 * - "degraded": skills whose per-skill DSH guidance is missing, read from the
 *   degradation table in lib/adaptations.js (the provider records the same
 *   entries at load time);
 * - "danglingRefs": adaptation cross-references that point at a skill or an exact
 *   version the package does not ship, from lib/citations.js;
 * - "hashMismatch": files whose SHA-256 differs from "upstream.json" (plus
 *   entries that are missing or not listed), i.e. the vendored snapshot drifted;
 * - "catalogTokens": ceil(sum of visible skill description character counts / 4).
 *   The 4:1 character-to-token ratio is the budget heuristic the repository
 *   already uses in validate-skills.mjs. Only "description" counts: the rendered
 *   catalog line also carries the skill name, but the name is 3-20 characters and
 *   is deliberately excluded so this number matches the README's estimation rule;
 * - "hostVersionHint": the installed DeepSeek Harness version when one can be
 *   found (environment variable, then the installed desktop app archive), else
 *   null;
 * - "healthy": missing/degraded/danglingRefs/hashMismatch are all empty, exactly
 *   as the contract defines it;
 * - "problems": extra, contract-compatible field summarising internal failures
 *   (unreadable manifest, malformed adaptation, bad plugin config). It never
 *   changes "healthy", because the contract pins healthy to the four arrays.
 *
 * @module @dsh-gis/dsh-opengis-skill/diagnose
 */

import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { degradationsOf, inspectAdaptationSync, readCommonSync } from "./adaptations.js";
import { hashFiles, readSkillEntry } from "./catalog.js";
import { citationProblems } from "./citations.js";
import { normalizeSelection, selectSkills } from "./taxonomy.js";

/** Provider identity; must equal the "name" export of the plugin entry point. */
export const PROVIDER_ID = "opengis-skill";

/** Packaged asset root, resolved from this module inside the installed package. */
const ASSET_ROOT = fileURLToPath(new URL("../assets/", import.meta.url));

/** Packaged adaptation root holding the DSH guidance. */
const ADAPTATION_ROOT = fileURLToPath(new URL("../adaptations/", import.meta.url));

/** Packaged integrity manifest. */
const MANIFEST_FILE = fileURLToPath(new URL("../upstream.json", import.meta.url));

/** Packaged package.json, source of "packageVersion". */
const PACKAGE_FILE = fileURLToPath(new URL("../package.json", import.meta.url));

/** Characters per estimated token, matching the catalog budget heuristic. */
const TOKEN_CHARS = 4;

/** A plain semantic version, optionally with a prerelease suffix. */
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

/**
 * Describe one failure for a diagnostic message.
 *
 * @param cause - the rejection reason.
 * @returns the error code when present, otherwise the message.
 */
function describeCause(cause) {
	const code = cause?.code;
	if (typeof code === "string" && code.length > 0) return code;
	return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Read and parse one JSON file without throwing.
 *
 * @param path - the absolute JSON path.
 * @returns the parsed value, or undefined when the file is missing or invalid.
 */
function readJson(path) {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return undefined;
	}
}

/**
 * Read one JSON file and report why it could not be used.
 *
 * @param path - the absolute JSON path.
 * @returns the parsed value plus the failure reason, when any.
 */
function readJsonReport(path, problems) {
	try {
		return { value: JSON.parse(readFileSync(path, "utf8")), error: undefined };
	} catch (cause) {
		const reason = describeCause(cause);
		problems.push(path + ": " + reason);
		return { value: undefined, error: reason };
	}
}

/**
 * Scan the asset root for skill directories, tolerating one broken skill.
 *
 * Mirrors the provider's catalog read but records a bad directory as a problem
 * and keeps going, so a single malformed SKILL.md does not hide the rest of the
 * diagnosis.
 *
 * @param assetRoot - absolute asset root.
 * @param problems - the diagnostic problem list to append to.
 * @returns the validated skill entries, sorted by name.
 */
function scanCatalog(assetRoot, problems) {
	const skills = [];
	if (statSync(assetRoot, { throwIfNoEntry: false })?.isDirectory() !== true) {
		problems.push("assets/: directory is missing: " + assetRoot);
		return skills;
	}
	let entries;
	try {
		entries = readdirSync(assetRoot, { withFileTypes: true });
	} catch (cause) {
		problems.push("assets/: " + describeCause(cause));
		return skills;
	}
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			problems.push("assets/" + entry.name + ": unexpected file at the assets root");
			continue;
		}
		try {
			const skill = readSkillEntry(join(assetRoot, entry.name), entry.name);
			if (skill === undefined) {
				problems.push("assets/" + entry.name + ": SKILL.md is missing");
				continue;
			}
			skills.push(skill);
		} catch (cause) {
			problems.push("assets/" + entry.name + ": " + describeCause(cause));
		}
	}
	return skills.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
}

/**
 * Read one JSON member out of an Electron ASAR archive.
 *
 * The installed desktop application keeps its Node modules inside "app.asar",
 * which a plain Node process cannot open as a directory but can read as one
 * file: a 16-byte header records the JSON index size and payload size, and
 * member offsets are relative to the start of the payload. Returns undefined on
 * any structural surprise instead of throwing.
 *
 * @param archive - the absolute "app.asar" path.
 * @param relativePath - the member path inside the archive, "/"-separated.
 * @returns the parsed JSON member, or undefined.
 */
function readAsarJson(archive, relativePath) {
	let descriptor;
	try {
		descriptor = openSync(archive, "r");
		const header = Buffer.alloc(16);
		readSync(descriptor, header, 0, 16, 0);
		const payloadSize = header.readUInt32LE(4);
		const indexSize = header.readUInt32LE(12);
		const index = Buffer.alloc(indexSize);
		readSync(descriptor, index, 0, indexSize, 16);
		let node = JSON.parse(index.toString("utf8"));
		for (const segment of relativePath.split("/")) {
			node = node?.files?.[segment];
			if (node === undefined) return undefined;
		}
		if (node.unpacked === true) return undefined;
		const start = 8 + payloadSize + Number.parseInt(node.offset, 10);
		const size = Number.parseInt(node.size, 10);
		if (!Number.isFinite(start) || !Number.isFinite(size) || size <= 0) return undefined;
		const data = Buffer.alloc(size);
		readSync(descriptor, data, 0, size, start);
		return JSON.parse(data.toString("utf8"));
	} catch {
		return undefined;
	} finally {
		if (descriptor !== undefined) {
			try {
				closeSync(descriptor);
			} catch {
				// Closing a descriptor we failed to open is not worth a diagnostic.
			}
		}
	}
}

/**
 * Read the DeepSeek Harness version out of one Resources directory.
 *
 * Tries the extracted "app.asar.unpacked" copy first (cheap), then the archive
 * index for the runtime package, then a plain "app/package.json" for unpacked
 * installations.
 *
 * @param resources - the absolute ".../DeepSeek Harness/resources" directory.
 * @returns the version string, or undefined.
 */
function versionFromResources(resources) {
	const unpacked = join(resources, "app.asar.unpacked", "dsh", "package.json");
	if (existsSync(unpacked)) {
		const pkg = readJson(unpacked);
		if (typeof pkg?.version === "string" && VERSION.test(pkg.version)) return pkg.version;
	}
	const archive = join(resources, "app.asar");
	if (statSync(archive, { throwIfNoEntry: false })?.isFile() === true) {
		for (const member of ["dsh/package.json", "package.json"]) {
			const pkg = readAsarJson(archive, member);
			if (typeof pkg?.version === "string" && VERSION.test(pkg.version)) return pkg.version;
		}
	}
	const plain = join(resources, "app", "package.json");
	if (existsSync(plain)) {
		const pkg = readJson(plain);
		if (typeof pkg?.version === "string" && VERSION.test(pkg.version)) return pkg.version;
	}
	return undefined;
}

/**
 * List the resources directories worth probing for an installed Harness.
 *
 * @param environment - the environment variables to read.
 * @param platform - the platform id ("win32", "darwin", ...).
 * @param localAppData - override for "%LOCALAPPDATA%", used by tests.
 * @returns the candidate directories, deduplicated.
 */
function resourcesCandidates(environment, platform, localAppData) {
	const candidates = [];
	const push = (value) => {
		if (typeof value === "string" && value.length > 0 && !candidates.includes(value)) candidates.push(value);
	};
	const install = environment.DSH_INSTALL_DIR;
	if (typeof install === "string") {
		// DSH_INSTALL_DIR points inside the archive: ".../resources/app.asar/dsh/node_modules/@deepseek-ai/dsh".
		const marker = install.indexOf("resources");
		if (marker !== -1) push(install.slice(0, marker + "resources".length));
	}
	const executable = environment.DSH_NODE_EXECUTABLE;
	if (typeof executable === "string") push(join(dirname(executable), "resources"));
	if (platform === "win32") {
		const base = localAppData ?? environment.LOCALAPPDATA;
		if (typeof base === "string") push(join(base, "Programs", "DeepSeek Harness", "resources"));
	} else if (platform === "darwin") {
		push("/Applications/DeepSeek Harness.app/Contents/Resources");
	} else {
		push(join(homedir(), ".local", "share", "deepseek-harness", "resources"));
		push("/opt/DeepSeek Harness/resources");
	}
	return candidates;
}

/**
 * Probe the installed DeepSeek Harness version.
 *
 * Never throws and never requires a running Harness: it reads an explicit
 * environment override first, then the installed desktop application archive.
 * A source checkout without an installed app simply reports null.
 *
 * @param options - optional overrides: "environment" (defaults to
 *   process.env), "platform" (defaults to process.platform) and "localAppData"
 *   (defaults to "%LOCALAPPDATA%"), all used by the tests.
 * @returns the version string, or null when it cannot be determined.
 */
export function probeHostVersion(options = {}) {
	const environment = options.environment ?? process.env;
	const platform = options.platform ?? process.platform;
	try {
		for (const key of ["DSH_VERSION", "DSH_HOST_VERSION"]) {
			const value = environment[key];
			if (typeof value === "string" && VERSION.test(value.trim())) return value.trim();
		}
		for (const resources of resourcesCandidates(environment, platform, options.localAppData)) {
			const version = versionFromResources(resources);
			if (version !== undefined) return version;
		}
	} catch {
		// A probe that fails is simply "not detected".
	}
	return null;
}

/**
 * Report the SHA-256 differences between "upstream.json" and "assets/".
 *
 * @param assetRoot - absolute asset root.
 * @param manifest - the parsed manifest, when readable.
 * @param problems - the diagnostic problem list to append to.
 * @returns the mismatch labels.
 */
function hashMismatches(assetRoot, manifest, problems) {
	const mismatches = [];
	const expected = manifest?.files;
	if (expected === null || typeof expected !== "object" || Array.isArray(expected)) {
		mismatches.push("<io-error>: upstream.json: files map is missing");
		problems.push("upstream.json: files map is missing");
		return mismatches;
	}
	let actual;
	try {
		actual = hashFiles(assetRoot);
	} catch (cause) {
		mismatches.push("<io-error>: " + describeCause(cause));
		problems.push("assets/: " + describeCause(cause));
		return mismatches;
	}
	for (const [relativePath, digest] of Object.entries(expected)) {
		if (!Object.hasOwn(actual, relativePath)) mismatches.push("assets/" + relativePath + " (missing)");
		else if (actual[relativePath] !== digest) mismatches.push("assets/" + relativePath);
	}
	for (const relativePath of Object.keys(actual)) {
		if (!Object.hasOwn(expected, relativePath)) mismatches.push("assets/" + relativePath + " (unlisted)");
	}
	return mismatches;
}

/**
 * Diagnose the packaged bundle (or a fixture tree) without side effects.
 *
 * @param options - optional overrides used by the tests: "assetRoot",
 *   "adaptationRoot", "manifestFile", "packageFile" and "config" (the plugin
 *   config that decides "visible").
 * @returns the contract diagnostic object; never throws.
 */
export function diagnose(options = {}) {
	const assetRoot = options.assetRoot ?? ASSET_ROOT;
	const adaptationRoot = options.adaptationRoot ?? ADAPTATION_ROOT;
	const manifestFile = options.manifestFile ?? MANIFEST_FILE;
	const packageFile = options.packageFile ?? PACKAGE_FILE;
	const problems = [];

	let packageVersion = "0.0.0";
	const pkg = readJsonReport(packageFile, problems);
	if (typeof pkg.value?.version === "string" && VERSION.test(pkg.value.version)) packageVersion = pkg.value.version;

	let hostVersionHint = null;
	try {
		hostVersionHint = probeHostVersion();
	} catch (cause) {
		problems.push("host version probe: " + describeCause(cause));
	}

	const skills = scanCatalog(assetRoot, problems);
	const catalogNames = new Set(skills.map((skill) => skill.name));

	let visibleSkills = [];
	try {
		visibleSkills = selectSkills(skills, normalizeSelection(options.config, skills));
	} catch (cause) {
		problems.push("plugin config: " + describeCause(cause));
	}
	const visible = visibleSkills.length;

	// Prime the degradation table with the same classification the provider uses,
	// and collect the readable guidance for the dangling-reference scan.
	const adaptations = [];
	for (const skill of skills) {
		try {
			const inspected = inspectAdaptationSync(adaptationRoot, skill.name);
			if (inspected.text.length > 0) adaptations.push({ name: skill.name, text: inspected.text });
		} catch (cause) {
			problems.push("adaptations/" + skill.name + ".md: " + describeCause(cause));
		}
	}
	const degraded = degradationsOf(adaptationRoot).filter((entry) => catalogNames.has(entry.skill));

	let common;
	try {
		common = readCommonSync(adaptationRoot);
	} catch (cause) {
		problems.push(describeCause(cause));
	}

	const danglingRefs = [];
	try {
		const { errors } = citationProblems({ skills, adaptations, common });
		const seen = new Set();
		for (const error of errors) {
			const key = error.from + "\u0000" + error.ref;
			if (seen.has(key)) continue;
			seen.add(key);
			danglingRefs.push({ from: error.from, ref: error.ref });
		}
	} catch (cause) {
		problems.push("citations: " + describeCause(cause));
	}

	const manifest = readJsonReport(manifestFile, problems);
	const hashMismatch = hashMismatches(assetRoot, manifest.value, problems);
	const listed = Array.isArray(manifest.value?.skills) ? manifest.value.skills : [];
	const missing = listed.filter((name) => typeof name === "string" && !catalogNames.has(name));

	const descriptionCharacters = visibleSkills.reduce((total, skill) => total + skill.description.length, 0);
	const catalogTokens = Math.ceil(descriptionCharacters / TOKEN_CHARS);

	return {
		provider: PROVIDER_ID,
		packageVersion,
		skills: skills.length,
		visible,
		missing,
		degraded,
		danglingRefs,
		hashMismatch,
		catalogTokens,
		hostVersionHint,
		healthy: missing.length === 0 && degraded.length === 0 && danglingRefs.length === 0 && hashMismatch.length === 0,
		problems
	};
}
