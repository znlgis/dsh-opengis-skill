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
 * The tool lists below are split by availability, not by usefulness:
 *
 * - "CORE_TOOLS" ship with every supported DeepSeek Harness build, so guidance
 *   may rely on them. A per-skill file must cite at least two of them, and the
 *   shared file at least eight, which is what stops the layer from decaying
 *   into tool-agnostic advice the upstream bodies already carry.
 * - "OPTIONAL_TOOLS" come from optional plugins (Agent Teams, desktop control,
 *   scheduled tasks, workspace dependency introspection). Guidance may name
 *   them, but must phrase them as a capability the session may or may not
 *   expose and keep a fallback, because a bare citation would break in a
 *   session without that plugin.
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

/**
 * Labels whose bullet must carry a concrete command or tool in backticks.
 *
 * "先探测版本" without a probe command and "验证产物" without a check command
 * are the two ways this layer most easily degenerates into an assertion: the
 * model reads "check the result" and reports success without checking.
 */
export const CONCRETE_LABELS = ["先探测版本", "验证产物"];

/**
 * DeepSeek Harness tools that every supported build exposes. Guidance may
 * depend on these unconditionally.
 */
export const CORE_TOOLS = Object.freeze([
	"skill",
	"ops_bash",
	"pwsh",
	"run_code",
	"read",
	"grep",
	"glob",
	"write",
	"edit",
	"read_image",
	"present",
	"todo_write",
	"subagent",
	"ask_user_question",
	"job_output",
	"job_kill",
	"job_list",
	"web_fetch",
	"web_search",
	"working_directory",
	"load_workspace_dependencies"
]);

/**
 * DeepSeek Harness tools that arrive with an optional plugin: Agent Teams,
 * desktop control, scheduled tasks, derived "subagent" branches, and MCP
 * resource reads. Guidance may name them, but only together with the fallback
 * that applies when the session does not expose them.
 */
export const OPTIONAL_TOOLS = Object.freeze([
	"spawn_teammate",
	"send_message",
	"wait_agent",
	"team_task_create",
	"team_task_list",
	"team_task_get",
	"team_task_update",
	"subagent_fork",
	"windows_desktop",
	"schedule_create",
	"schedule_list",
	"schedule_edit",
	"list_mcp_resources",
	"read_mcp_resource"
]);

/** Every tool name the guidance may cite; the union of both lists. */
export const DSH_TOOLS = Object.freeze([...CORE_TOOLS, ...OPTIONAL_TOOLS]);

/** Minimum distinct core DSH tools one per-skill guidance must cite. */
const SKILL_MIN_CORE_TOOLS = 2;

/** Minimum distinct core DSH tools the shared guidance must cite. */
const COMMON_MIN_CORE_TOOLS = 8;

/** Minimum bullets in the shared guidance. */
const COMMON_MIN_BULLETS = 14;

/** Minimum characters in the shared guidance. */
const COMMON_MIN_CHARACTERS = 2600;

/** Maximum characters in the shared guidance. */
const COMMON_MAX_CHARACTERS = 9000;

/** Minimum characters in one per-skill guidance file. */
const SKILL_MIN_CHARACTERS = 900;

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
 * List the distinct DeepSeek Harness tool names cited in backticks.
 *
 * Only the identifiers declared in DSH_TOOLS count, so prose that happens to
 * mention "read a file" does not satisfy the harness-specificity requirement.
 *
 * @param text - the normalized adaptation text.
 * @returns the distinct tool names found, in first-citation order.
 */
export function citedTools(text) {
	const found = [];
	for (const match of text.matchAll(/`([a-z][a-z0-9_]*)`/gu)) {
		const name = match[1];
		if (DSH_TOOLS.includes(name) && !found.includes(name)) found.push(name);
	}
	return found;
}

/**
 * List the distinct core tool names cited in backticks.
 *
 * The minimums are counted on this list: a file that only names optional-plugin
 * capabilities would be useless in a session where those plugins are off.
 *
 * @param text - the normalized adaptation text.
 * @returns the distinct core tool names found, in first-citation order.
 */
export function citedCoreTools(text) {
	return citedTools(text).filter((name) => CORE_TOOLS.includes(name));
}

/**
 * Extract the body of one "- **label**：…" bullet.
 *
 * @param text - the normalized adaptation text.
 * @param label - the label between the asterisks.
 * @returns the bullet body after the label, or undefined when the bullet is missing.
 */
function bulletBody(text, label) {
	const marker = "- **" + label + "**";
	const start = text.indexOf(marker);
	if (start === -1) return undefined;
	const rest = text.slice(start + marker.length);
	const next = rest.indexOf("\n- **");
	return next === -1 ? rest : rest.slice(0, next);
}

/**
 * Report every problem with one per-skill adaptation file.
 *
 * The checks keep the per-skill files comparable: each one states how to load
 * it, where the commands run, how to probe the installed version, how to verify
 * the artifact, and which operations need the user's consent. The probe and
 * verification bullets must carry a concrete command or tool, and the file must
 * cite core harness tools rather than only optional-plugin capabilities.
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
	const positions = [];
	for (const required of REQUIRED_LABELS) {
		const index = text.indexOf("- **" + required + "**");
		if (index === -1) problems.push(label + ': missing the "' + required + '" bullet');
		else positions.push(index);
	}
	for (let index = 1; index < positions.length; index += 1) {
		if (positions[index] < positions[index - 1]) {
			problems.push(label + ": required bullets must keep the order " + REQUIRED_LABELS.join(" → "));
			break;
		}
	}
	if (!/`[^`]+`/u.test(text)) problems.push(label + ": must name at least one concrete command or tool in backticks");
	for (const required of CONCRETE_LABELS) {
		const body = bulletBody(text, required);
		if (body === undefined) continue;
		if (!/`[^`]+`/u.test(body)) problems.push(label + ': "' + required + '" must cite a concrete command or tool in backticks, not just prose');
	}
	const tools = citedCoreTools(text);
	if (tools.length < SKILL_MIN_CORE_TOOLS) {
		problems.push(label + ": cites " + tools.length + " core DeepSeek Harness tool(s), needs at least " + SKILL_MIN_CORE_TOOLS + " (one of " + CORE_TOOLS.slice(0, 6).join("/") + "/…); optional-plugin tools do not count");
	}
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
	if (text.length < COMMON_MIN_CHARACTERS) problems.push(label + ": " + text.length + " characters is too short for the shared guidance (minimum " + COMMON_MIN_CHARACTERS + ")");
	if (text.length > COMMON_MAX_CHARACTERS) problems.push(label + ": " + text.length + " characters exceeds the " + COMMON_MAX_CHARACTERS + "-character budget");
	const bullets = text.split("\n").filter((line) => line.startsWith("- **"));
	if (bullets.length < COMMON_MIN_BULLETS) problems.push(label + ": needs at least " + COMMON_MIN_BULLETS + ' bullets of the form "- **label**：…"');
	const tools = citedCoreTools(text);
	if (tools.length < COMMON_MIN_CORE_TOOLS) problems.push(label + ": cites " + tools.length + " core DeepSeek Harness tool(s), needs at least " + COMMON_MIN_CORE_TOOLS);
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
