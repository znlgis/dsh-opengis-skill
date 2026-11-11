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
 *   7. The Agent Skills six-field frontmatter contract: only legal fields,
 *      "license: MIT", "metadata.category: gis", a well-formed tag list, and
 *      descriptions that are unique, English, free of angle brackets, within
 *      the catalog budget and prefixed with "Use when".
 *   8. Asset content quality: SKILL.md within the progressive-disclosure line
 *      budget, no orphan reference files, reference tables of contents, FAQ
 *      size, freshness markers and fenced-code languages (the last four are
 *      warnings so upstream editorial state cannot block a release).
 *   9. Relative Markdown links in every asset document and repo document,
 *      rejecting broken links and paths escaping their root.
 *  10. upstream.json: schema, commit, syncedAt, skill list, and one SHA-256
 *      digest per vendored file; text files must not contain CR bytes.
 *  11. adaptations/: one DeepSeek Harness guidance file per vendored skill plus
 *      "common.md", with the required headings, ordered labels, length budget,
 *      a minimum number of cited *core* tools (optional-plugin tools do not
 *      count), concrete commands in the probe and verification bullets, links
 *      that resolve against the skill directory, and no orphan files.
 *  12. Non-fatal warnings (unparseable syncedAt, non-public npm registry).
 *  13. A catalog size/file/byte/token summary.
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
import {
	ADAPTATION_DIRECTORY,
	adaptationFile,
	adaptationProblems,
	commonFile,
	commonProblems,
	listAdaptations
} from "../lib/adaptations.js";
import { findMarkdownLinkProblems, relativeMarkdownLinks } from "../lib/markdown-links.js";
import { LEGAL_FIELDS, parseSkillFile } from "../lib/skill-file.js";

/** Repository root: this script lives in <root>/scripts/. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");
const packageFile = join(root, "package.json");
const patchFile = join(root, "cordis.patch.yml");
const iconFile = join(root, "icon.svg");
const localeDirectory = join(root, "locale");
const adaptationRoot = join(root, ADAPTATION_DIRECTORY);
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

/** One "reference/<file>.md" citation inside a DSH adaptation file. */
const REFERENCE_CITATION = /\b(reference\/[a-z0-9-]+\.md)\b/gu;

/** Maximum length of an upstream description, tightened from the spec's 1024. */
const DESCRIPTION_MAX = 500;

/** The description prefix that makes a skill routable from the session catalog. */
const DESCRIPTION_PREFIX = "Use when";

/** Accepted character count for the upstream metadata.tags list. */
const TAG_COUNT = { min: 5, max: 10 };

/** Grammar for one upstream metadata tag. */
const TAG = /^[a-z0-9][a-z0-9.-]*$/u;

/** One ASCII angle bracket, which some skill clients reject in a description. */
const ANGLE_BRACKET = /[<>]/u;

/** One CJK character; upstream descriptions must stay English. */
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

/** One emoji or pictographic symbol, which upstream forbids in skill bodies. */
const EMOJI = /[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}]/u;

/** The freshness marker every skill header must carry, for example "截至 2026-11". */
const FRESHNESS = /截至 \d{4}-\d{2}/u;

/** Upper bound on SKILL.md length before it must be split into references. */
const SKILL_MAX_LINES = 500;

/** Reference files longer than this need a table of contents. */
const REFERENCE_TOC_LINES = 100;

/** Minimum FAQ table rows upstream requires in a skill body. */
const FAQ_MIN_ROWS = 5;

/** Package entry points that must be listed for the published tarball. */
const REQUIRED_FILES = [
	"assets",
	"adaptations",
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
 * Verify the vendored frontmatter against the Agent Skills contract the
 * provider depends on.
 *
 * Upstream migrated every skill to the six legal fields plus a nested
 * "metadata" map, so the packaged snapshot must keep that shape: "name" and
 * "description" drive the session catalog, "license" and "metadata" are what
 * the plugin republishes as candidate metadata. A regression here breaks
 * discovery or leaks an illegal field into clients that pack skills, so these
 * are errors, not warnings.
 *
 * @param skills - the valid asset skill entries.
 */
function checkFrontmatter(skills) {
	const descriptions = new Map();
	for (const skill of skills) {
		const label = "assets/" + skill.name + "/SKILL.md";
		let parsed;
		try {
			parsed = parseSkillFile(readFileSync(skill.path, "utf8"), skill.path);
		} catch (cause) {
			error(displayPath(cause.message));
			continue;
		}
		for (const field of parsed.frontmatterFields) {
			if (!LEGAL_FIELDS.includes(field)) error(label + ': illegal frontmatter field "' + field + '"; only ' + LEGAL_FIELDS.join(", ") + " are allowed");
		}
		if (parsed.license !== "MIT") error(label + ': "license" must be MIT, got ' + JSON.stringify(parsed.license));
		if (parsed.metadata.category !== "gis") error(label + ': "metadata.category" must be "gis", got ' + JSON.stringify(parsed.metadata.category));
		const tags = parsed.metadata.tags;
		if (!Array.isArray(tags) || tags.length < TAG_COUNT.min || tags.length > TAG_COUNT.max) {
			error(label + ': "metadata.tags" must list ' + TAG_COUNT.min + "-" + TAG_COUNT.max + " tags, got " + JSON.stringify(tags));
		} else {
			for (const tag of tags) {
				if (typeof tag !== "string" || !TAG.test(tag)) error(label + ': invalid "metadata.tags" entry ' + JSON.stringify(tag));
			}
		}
		const description = parsed.description;
		if (description.length > DESCRIPTION_MAX) error(label + ": description is " + description.length + " characters; the catalog budget is " + DESCRIPTION_MAX);
		if (!description.startsWith(DESCRIPTION_PREFIX)) error(label + ': description must start with "' + DESCRIPTION_PREFIX + '" so the model can route on it');
		if (ANGLE_BRACKET.test(description)) error(label + ": description must not carry angle brackets");
		if (CJK.test(description)) error(label + ": description must stay English");
		if (descriptions.has(description)) error(label + ": description duplicates assets/" + descriptions.get(description) + "/SKILL.md");
		else descriptions.set(description, skill.name);
	}
}

/**
 * Report content-quality regressions in the vendored assets: stale version
 * headers, oversized SKILL.md files, emoji, code fences without a language,
 * uncatalogued reference files, missing reference tables of contents, and thin
 * FAQ tables.
 *
 * The freshness marker and the FAQ size are warnings on purpose: they describe
 * upstream's editorial state, and blocking a release on them would make this
 * package hostage to an upstream documentation commit. Everything that hides
 * content from the model (an orphan reference, a SKILL.md over the split
 * threshold) is an error.
 *
 * @param skills - the valid asset skill entries.
 */
function checkAssetQuality(skills) {
	for (const skill of skills) {
		const label = "assets/" + skill.name;
		let raw;
		try {
			raw = readFileSync(skill.path, "utf8");
		} catch (cause) {
			error(displayPath(skill.path + ": " + cause.message));
			continue;
		}
		const lines = raw.split(/\r?\n/u);
		if (lines.length > SKILL_MAX_LINES) error(label + "/SKILL.md: " + lines.length + " lines exceeds the " + SKILL_MAX_LINES + "-line progressive-disclosure limit");
		if (!FRESHNESS.test(lines.slice(0, 40).join("\n"))) warn(label + "/SKILL.md: header lacks a freshness marker (截至 YYYY-MM)");
		if (EMOJI.test(raw)) warn(label + "/SKILL.md: contains emoji characters");
		let fence = 0;
		for (const line of lines) {
			const match = /^\s*```(.*)$/u.exec(line);
			if (match === null) continue;
			fence += 1;
			if (fence % 2 === 1 && match[1].trim().length === 0) warn(label + "/SKILL.md: code fence without a language tag");
		}
		checkFaq(label, lines);
		let referenceFiles = [];
		try {
			referenceFiles = readdirSync(join(skill.directory, "reference")).filter((file) => file.endsWith(".md")).sort();
		} catch {
			referenceFiles = [];
		}
		for (const file of referenceFiles) {
			const relative = "reference/" + file;
			if (!raw.includes(relative)) error(label + "/SKILL.md: does not link " + relative + ", so the model cannot discover it");
			let text;
			try {
				text = readFileSync(join(skill.directory, "reference", file), "utf8");
			} catch (cause) {
				error(displayPath(join(skill.directory, "reference", file) + ": " + cause.message));
				continue;
			}
			const referenceLines = text.split(/\r?\n/u);
			if (referenceLines.length > REFERENCE_TOC_LINES && !/^## (?:Contents|目录)/mu.test(text)) {
				warn(label + "/" + relative + ": " + referenceLines.length + " lines without a table of contents");
			}
		}
	}
}

/**
 * Count the FAQ table rows of one skill body and report a thin table.
 *
 * @param label - the repository-relative skill label.
 * @param lines - the SKILL.md lines.
 */
function checkFaq(label, lines) {
	const start = lines.findIndex((line) => /^## 常见问题/u.test(line));
	if (start === -1) {
		warn(label + "/SKILL.md: no \"## 常见问题\" section");
		return;
	}
	let end = lines.length;
	for (let index = start + 1; index < lines.length; index += 1) {
		if (/^## /u.test(lines[index])) {
			end = index;
			break;
		}
	}
	const rows = lines.slice(start + 1, end).filter((line) => line.trim().startsWith("|") && !/^\|[\s:|-]+\|$/u.test(line.trim())).length;
	const dataRows = Math.max(0, rows - 1);
	if (dataRows < FAQ_MIN_ROWS) warn(label + "/SKILL.md: FAQ has " + dataRows + " row(s), upstream asks for at least " + FAQ_MIN_ROWS);
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

/** Number of per-skill adaptation files, filled by checkAdaptations(). */
let adaptationFileCount = 0;

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
 * Read one adaptation file and normalize it the way the provider does.
 *
 * @param path - the absolute Markdown file.
 * @returns the LF-normalized, trimmed text.
 */
function readAdaptationText(path) {
	return readFileSync(path, "utf8").replaceAll("\r\n", "\n").trim();
}

/**
 * Verify the DeepSeek Harness adaptation layer: the shared file, one guidance
 * file per vendored skill, the required structure, and links that resolve
 * against the skill directory a loaded skill uses as its resource base.
 *
 * @param skills - the valid asset skill entries.
 */
function checkAdaptations(skills) {
	if (!existsSync(adaptationRoot)) {
		error("adaptations/: directory is missing; the DSH guidance layer is required");
		return;
	}
	let names;
	try {
		names = listAdaptations(adaptationRoot);
	} catch (cause) {
		error(displayPath(adaptationRoot + ": " + cause.message));
		return;
	}
	const commonPath = commonFile(adaptationRoot);
	if (!existsSync(commonPath)) {
		error("adaptations/common.md: the shared DSH guidance file is missing");
	} else {
		let text;
		try {
			text = readAdaptationText(commonPath);
		} catch (cause) {
			error(displayPath(commonPath + ": " + cause.message));
			text = undefined;
		}
		if (text !== undefined) {
			for (const problem of commonProblems(text)) error(problem);
			for (const link of relativeMarkdownLinks(text)) error("adaptations/common.md: must not carry a relative link (" + link + "); it is appended to every skill directory");
		}
	}
	const expected = new Set(skills.map((skill) => skill.name));
	const present = names.filter((name) => name !== "common");
	for (const name of expected) {
		if (!present.includes(name)) error("adaptations/" + name + ".md: missing DSH guidance for this skill");
	}
	for (const name of present) {
		if (!expected.has(name)) error("adaptations/" + name + ".md: no matching skill under assets/");
	}
	const skillDirectories = new Map(skills.map((skill) => [skill.name, skill.directory]));
	for (const name of present) {
		if (!expected.has(name)) continue;
		const file = adaptationFile(adaptationRoot, name);
		let text;
		try {
			text = readAdaptationText(file);
		} catch (cause) {
			error(displayPath(file + ": " + cause.message));
			continue;
		}
		adaptationFileCount += 1;
		for (const problem of adaptationProblems(name, text)) error(problem);
		const skillDirectory = skillDirectories.get(name);
		const fromFile = join(skillDirectory, "SKILL.md");
		for (const problem of findMarkdownLinkProblems(fromFile, text, assetsRoot)) error(displayPath(problem));
		for (const match of text.matchAll(REFERENCE_CITATION)) {
			const target = join(skillDirectory, ...match[1].split("/"));
			if (statSync(target, { throwIfNoEntry: false })?.isFile() !== true) {
				error("adaptations/" + name + ".md: cites " + match[1] + ", which is not a file in assets/" + name + "/");
			}
		}
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
			" asset files, " +
			adaptationFileCount +
			" DSH adaptations, " +
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
checkFrontmatter(validatedSkills);
checkAssetQuality(validatedSkills);
checkLinks();
checkManifest(validatedSkills);
checkAdaptations(validatedSkills);
checkChangelog();
scanAssets();
printSummary(validatedSkills);