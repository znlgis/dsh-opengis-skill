/**
 * DeepSeek Harness adaptation layer for the vendored GIS skills.
 *
 * The files under "assets/" are an exact snapshot of the upstream
 * opengis-skills repository, so they are never edited here: "upstream.json"
 * records one SHA-256 digest per vendored file and "npm run sync" restores the
 * snapshot byte for byte. DSH-specific execution guidance therefore lives in
 * "adaptations/": "common.md" carries the rules that apply to every skill and
 * "<skill>.md" carries the skill-specific notes. The provider appends both to
 * the upstream body when a skill is loaded.
 *
 * Every function here is pure Node built-ins and takes the adaptation root as
 * an argument, so the plugin, the validation script, and the tests share one
 * implementation. No DeepSeek Harness imports.
 *
 * @module @dsh-gis/dsh-opengis-skill/adaptations
 */

import { readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Directory (relative to the package root) holding the DSH adaptation files. */
export const ADAPTATION_DIRECTORY = "adaptations";

/** File name of the guidance shared by every skill. */
export const COMMON_FILE = "common.md";

/** Heading the shared guidance must start with. */
export const COMMON_HEADING = "## DeepSeek Harness 通用约定";

/** Heading every per-skill guidance must start with. */
export const SKILL_HEADING = "## DeepSeek Harness 使用建议";

/** Separator between the upstream body and the DSH guidance block. */
export const SKILL_SEPARATOR = "\n\n---\n\n";

/** Labels every per-skill guidance must keep, in this order. */
export const REQUIRED_LABELS = ["加载与引用", "执行环境", "先探测版本", "验证产物", "风险与权限"];

/** Minimum bullets in the shared guidance. */
const COMMON_MIN_BULLETS = 8;

/** Minimum characters in one per-skill guidance file. */
const SKILL_MIN_CHARACTERS = 240;

/** Maximum characters in one per-skill guidance file. */
const SKILL_MAX_CHARACTERS = 4000;

/** Markers that mean an adaptation file was left unfinished. */
const UNFINISHED = /\b(?:TODO|FIXME|TBD|待补充|占位)\b/u;

/**
 * Build the path of one per-skill adaptation file.
 *
 * @param root - absolute adaptations directory.
 * @param name - kebab-case skill name.
 * @returns the absolute Markdown path.
 */
export function adaptationFile(root, name) {
	return join(root, name + ".md");
}

/**
 * Build the path of the shared adaptation file.
 *
 * @param root - absolute adaptations directory.
 * @returns the absolute Markdown path.
 */
export function commonFile(root) {
	return join(root, COMMON_FILE);
}

/**
 * Normalize one adaptation file for use inside a skill body.
 *
 * @param text - the file contents.
 * @returns the text with CRLF collapsed to LF and the edges trimmed.
 */
function normalizeAdaptation(text) {
	return text.replace(/\r\n?/gu, "\n").trim();
}

/**
 * Read and normalize one per-skill adaptation file.
 *
 * @param root - absolute adaptations directory.
 * @param name - kebab-case skill name.
 * @returns the normalized guidance text.
 * @throws when the file is missing or does not start with the required heading.
 */
export function readAdaptationSync(root, name) {
	const file = adaptationFile(root, name);
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch (cause) {
		throw new Error('missing DSH adaptation for skill "' + name + '": ' + file + " (run npm run validate)", { cause });
	}
	return assertAdaptation(name, normalizeAdaptation(text));
}

/**
 * Read and normalize the shared adaptation file.
 *
 * @param root - absolute adaptations directory.
 * @returns the normalized guidance text.
 * @throws when the file is missing or does not start with the required heading.
 */
export function readCommonSync(root) {
	const file = commonFile(root);
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch (cause) {
		throw new Error("missing shared DSH adaptation: " + file + " (run npm run validate)", { cause });
	}
	return assertCommon(normalizeAdaptation(text));
}

/**
 * Read one per-skill adaptation file without blocking the event loop.
 *
 * @param root - absolute adaptations directory.
 * @param name - kebab-case skill name.
 * @param signal - optional abort signal handed to the read.
 * @returns the normalized guidance text.
 * @throws when the file is missing or does not start with the required heading.
 */
export async function readAdaptation(root, name, signal) {
	const file = adaptationFile(root, name);
	let text;
	try {
		text = await readFile(file, { encoding: "utf8", signal });
	} catch (cause) {
		if (cause?.name === "AbortError") throw cause;
		throw new Error('missing DSH adaptation for skill "' + name + '": ' + file + " (run npm run validate)", { cause });
	}
	return assertAdaptation(name, normalizeAdaptation(text));
}

/**
 * Read the shared adaptation file without blocking the event loop.
 *
 * @param root - absolute adaptations directory.
 * @param signal - optional abort signal handed to the read.
 * @returns the normalized guidance text.
 * @throws when the file is missing or does not start with the required heading.
 */
export async function readCommon(root, signal) {
	const file = commonFile(root);
	let text;
	try {
		text = await readFile(file, { encoding: "utf8", signal });
	} catch (cause) {
		if (cause?.name === "AbortError") throw cause;
		throw new Error("missing shared DSH adaptation: " + file + " (run npm run validate)", { cause });
	}
	return assertCommon(normalizeAdaptation(text));
}

/**
 * List the adaptation file names (without the ".md" suffix), sorted.
 *
 * @param root - absolute adaptations directory.
 * @returns the file base names, including "common".
 * @throws when the directory is missing.
 */
export function listAdaptations(root) {
	return readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
		.map((entry) => entry.name.slice(0, -".md".length))
		.sort(compareCodePoints);
}

/**
 * Append the DSH guidance block to one upstream skill body.
 *
 * @param base - the upstream instruction body, already trimmed and LF-normalized.
 * @param adaptation - the per-skill guidance.
 * @param common - the shared guidance.
 * @returns the body a DeepSeek Harness session should read.
 */
export function composeSkillContent(base, adaptation, common) {
	return base.trimEnd() + SKILL_SEPARATOR + adaptation.trim() + "\n\n" + common.trim() + "\n";
}

/**
 * Report every problem with one per-skill adaptation file.
 *
 * The checks keep the 40 files comparable: each one states how to load it,
 * where the commands run, how to probe the installed version, how to verify
 * the artifact, and which operations need the user's consent.
 *
 * @param name - kebab-case skill name, used in every message.
 * @param text - the normalized adaptation text.
 * @returns human-readable problems, empty when the file is valid.
 */
export function adaptationProblems(name, text) {
	const problems = [];
	const label = ADAPTATION_DIRECTORY + "/" + name + ".md";
	if (text.includes("\r")) problems.push(label + ": contains CR bytes; adaptations must use LF");
	if (!text.startsWith(SKILL_HEADING)) problems.push(label + ': must start with "' + SKILL_HEADING + '"');
	if (/^# /mu.test(text)) problems.push(label + ": must not carry a top-level heading");
	if (text.length < SKILL_MIN_CHARACTERS) problems.push(label + ": " + text.length + " characters is too short for DSH guidance (minimum " + SKILL_MIN_CHARACTERS + ")");
	if (text.length > SKILL_MAX_CHARACTERS) problems.push(label + ": " + text.length + " characters exceeds the " + SKILL_MAX_CHARACTERS + "-character budget");
	const bullets = text.split("\n").filter((line) => line.startsWith("- **"));
	if (bullets.length < REQUIRED_LABELS.length) problems.push(label + ": needs at least " + REQUIRED_LABELS.length + ' bullets of the form "- **label**：…"');
	for (const required of REQUIRED_LABELS) {
		if (!text.includes("- **" + required + "**")) problems.push(label + ': missing the "' + required + '" bullet');
	}
	if (!/`[^`]+`/u.test(text)) problems.push(label + ": must name at least one concrete command or tool in backticks");
	if (UNFINISHED.test(text)) problems.push(label + ": still contains an unfinished marker (TODO/FIXME/TBD/待补充/占位)");
	return problems;
}

/**
 * Report every problem with the shared adaptation file.
 *
 * @param text - the normalized common guidance.
 * @returns human-readable problems, empty when the file is valid.
 */
export function commonProblems(text) {
	const problems = [];
	const label = ADAPTATION_DIRECTORY + "/" + COMMON_FILE;
	if (text.includes("\r")) problems.push(label + ": contains CR bytes; adaptations must use LF");
	if (!text.startsWith(COMMON_HEADING)) problems.push(label + ': must start with "' + COMMON_HEADING + '"');
	if (/^# /mu.test(text)) problems.push(label + ": must not carry a top-level heading");
	if (text.length < 600) problems.push(label + ": " + text.length + " characters is too short for the shared guidance");
	const bullets = text.split("\n").filter((line) => line.startsWith("- **"));
	if (bullets.length < COMMON_MIN_BULLETS) problems.push(label + ": needs at least " + COMMON_MIN_BULLETS + ' bullets of the form "- **label**：…"');
	if (UNFINISHED.test(text)) problems.push(label + ": still contains an unfinished marker (TODO/FIXME/TBD/待补充/占位)");
	return problems;
}

/**
 * Reject a per-skill adaptation that cannot be appended to a skill body.
 *
 * @param name - kebab-case skill name.
 * @param text - the normalized adaptation text.
 * @returns the same text.
 * @throws when the file is empty or does not start with the required heading.
 */
function assertAdaptation(name, text) {
	if (!text.startsWith(SKILL_HEADING)) {
		throw new Error('DSH adaptation for skill "' + name + '" must start with "' + SKILL_HEADING + '": ' + adaptationFile("<adaptations>", name));
	}
	return text;
}

/**
 * Reject a shared adaptation that cannot be appended to a skill body.
 *
 * @param text - the normalized common guidance.
 * @returns the same text.
 * @throws when the file is empty or does not start with the required heading.
 */
function assertCommon(text) {
	if (!text.startsWith(COMMON_HEADING)) throw new Error('shared DSH adaptation must start with "' + COMMON_HEADING + '"');
	return text;
}

/** Compare two strings by Unicode code point, independent of the locale. */
function compareCodePoints(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}
