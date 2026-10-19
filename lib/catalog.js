/**
 * Shared skill-catalog helpers for the runtime provider and the source-repo
 * scripts. The functions are pure Node built-ins: no DeepSeek Harness imports
 * and no third-party dependencies.
 *
 * @module @dsh-gis/dsh-opengis-skill/catalog
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseSkillFile } from "./skill-file.js";

/** The instruction file name inside one skill directory. */
export const SKILL_FILE = "SKILL.md";

/** One inline code-span delimiter used by the generated markdown table. */
const TICK = "`";

/** README marker pair around the generated skill count line. */
const COUNT_START = "<!-- skills:count:start -->";
const COUNT_END = "<!-- skills:count:end -->";

/** README marker pair around the generated skill table. */
const TABLE_START = "<!-- skills:start -->";
const TABLE_END = "<!-- skills:end -->";

/**
 * Read one skill directory.
 *
 * @param directory - absolute skill directory.
 * @param expectedName - directory name the frontmatter name must match, when known.
 * @returns the validated entry, or undefined when the directory has no SKILL.md.
 * @throws when SKILL.md is malformed or declares a different name.
 */
export function readSkillEntry(directory, expectedName) {
	const path = join(directory, SKILL_FILE);
	if (statSync(path, { throwIfNoEntry: false })?.isFile() !== true) return undefined;
	const parsed = parseSkillFile(readFileSync(path, "utf8"), path);
	if (expectedName !== undefined && parsed.name !== expectedName) {
		throw new Error(path + ' declares "' + parsed.name + '" but its directory is "' + expectedName + '"');
	}
	return { name: parsed.name, description: parsed.description, directory, path };
}

/**
 * Read every skill directory under one asset root, sorted by name.
 *
 * Directories without SKILL.md are skipped so a stray directory cannot break
 * the runtime; the validation script reports those separately.
 *
 * @param assetRoot - absolute directory holding one subdirectory per skill.
 * @returns the validated skills sorted by name.
 * @throws when the root is missing, two skills share a name, or no skill exists.
 */
export function readSkillCatalog(assetRoot) {
	if (statSync(assetRoot, { throwIfNoEntry: false })?.isDirectory() !== true) {
		throw new Error("skill asset directory not found: " + assetRoot);
	}
	const skills = [];
	const seen = new Set();
	for (const entry of readdirSync(assetRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const skill = readSkillEntry(join(assetRoot, entry.name), entry.name);
		if (skill === undefined) continue;
		if (seen.has(skill.name)) throw new Error('duplicate skill name "' + skill.name + '" under ' + assetRoot);
		seen.add(skill.name);
		skills.push(skill);
	}
	if (skills.length === 0) throw new Error("no skills found under " + assetRoot);
	return skills.sort((left, right) => compareCodePoints(left.name, right.name));
}

/**
 * Render the directory resource base with forward slashes for the model.
 *
 * @param directory - absolute skill directory, using the host separator.
 * @returns the resource base value the skill registry expects.
 */
export function resourceBaseOf(directory) {
	return { kind: "directory", path: directory.replaceAll("\\", "/") };
}

/**
 * Render the generated README skill-count section.
 *
 * @param skills - the catalog entries.
 * @returns the complete marked section, markers included.
 */
export function renderSkillCount(skills) {
	return [
		COUNT_START,
		"共 **" + skills.length + "** 个技能，描述取自上游 frontmatter。",
		COUNT_END
	].join("\n");
}

/**
 * Render the generated README skill table.
 *
 * @param skills - the catalog entries carrying name and description.
 * @returns the complete marked table section, markers included.
 */
export function renderSkillTable(skills) {
	const rows = skills.map((skill) => {
		const cell = "| " + TICK + skill.name + TICK + " | " + skill.description.replaceAll("|", "\\|") + " |";
		return cell;
	});
	return [
		TABLE_START,
		"| Skill | Description (upstream frontmatter) |",
		"| --- | --- |",
		...rows,
		TABLE_END
	].join("\n");
}

/**
 * Read the generated README sections including their markers.
 *
 * @param markdown - the complete README text.
 * @returns the exact current count and table sections.
 * @throws when a marker is missing or duplicated.
 */
export function readGeneratedSections(markdown) {
	return {
		count: extractSection(markdown, COUNT_START, COUNT_END),
		table: extractSection(markdown, TABLE_START, TABLE_END)
	};
}

/**
 * Regenerate both README sections in place.
 *
 * @param markdown - the complete README text.
 * @param skills - the catalog entries to render.
 * @returns the README text with both generated sections replaced.
 * @throws when a marker is missing or duplicated.
 */
export function replaceGeneratedSections(markdown, skills) {
	const current = readGeneratedSections(markdown);
	const replacements = [
		[current.table, renderSkillTable(skills)],
		[current.count, renderSkillCount(skills)]
	];
	let next = markdown;
	for (const [from, to] of replacements) {
		const index = next.indexOf(from);
		if (index === -1) throw new Error("cannot regenerate README: generated section not found");
		next = next.slice(0, index) + to + next.slice(index + from.length);
	}
	return next;
}

/**
 * List every regular file under one directory as POSIX-style relative paths.
 *
 * @param root - the directory to walk.
 * @returns sorted relative paths using "/" on every platform.
 * @throws when the root is missing, a symbolic link is present, or an entry is neither a file nor a directory.
 */
export function listFiles(root) {
	const resolvedRoot = resolve(root);
	const output = [];
	const stack = [""];
	while (stack.length > 0) {
		const prefix = stack.pop();
		const directory = prefix === "" ? resolvedRoot : join(resolvedRoot, prefix);
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const relativePath = prefix === "" ? entry.name : prefix + "/" + entry.name;
			if (entry.isDirectory()) {
				stack.push(relativePath);
				continue;
			}
			if (entry.isSymbolicLink()) throw new Error("refusing to follow symbolic link: " + join(directory, entry.name));
			if (!entry.isFile()) throw new Error("unsupported file type: " + join(directory, entry.name));
			output.push(relativePath);
		}
	}
	return output.sort(compareCodePoints);
}

/**
 * Hash one file with SHA-256.
 *
 * @param path - the file to read.
 * @returns the lowercase hexadecimal digest.
 */
export function hashFile(path) {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Hash every regular file under one directory.
 *
 * @param root - the directory to walk.
 * @returns a map from POSIX-style relative path to lowercase SHA-256 digest.
 */
export function hashFiles(root) {
	const digests = {};
	for (const relativePath of listFiles(root)) digests[relativePath] = hashFile(join(root, relativePath));
	return digests;
}

/**
 * Normalize one vendored file to the upstream git blob form.
 *
 * A file carrying a NUL byte is treated as binary and copied unchanged; every
 * other file has its CRLF line endings collapsed to LF. An upstream checkout on
 * Windows can carry CRLF through core.autocrlf while the upstream git blob is
 * LF, so normalizing keeps the vendored bytes equal to the blob independent of
 * the platform.
 *
 * @param buffer - the raw file bytes.
 * @returns the bytes to write or compare.
 */
export function canonicalVendoredBytes(buffer) {
	if (buffer.includes(0)) return buffer;
	return Buffer.from(buffer.toString("utf8").replaceAll("\r\n", "\n"), "utf8");
}

/** Extract one marked section and reject missing or duplicated markers. */
function extractSection(markdown, start, end) {
	const first = markdown.indexOf(start);
	if (first === -1) throw new Error('missing generated README marker "' + start + '"');
	if (markdown.indexOf(start, first + start.length) !== -1) throw new Error('duplicate generated README marker "' + start + '"');
	const last = markdown.indexOf(end, first + start.length);
	if (last === -1) throw new Error('missing generated README marker "' + end + '"');
	if (markdown.indexOf(end, last + end.length) !== -1) throw new Error('duplicate generated README marker "' + end + '"');
	return markdown.slice(first, last + end.length);
}

/** Compare two strings by Unicode code point, independent of the locale. */
function compareCodePoints(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}
