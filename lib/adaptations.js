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
 * Failure handling is split in two on purpose. A missing "<skill>.md" is a
 * recoverable packaging gap: the skill still loads with the upstream body plus
 * "common.md", and the gap is recorded in the degradation table below so
 * "diagnose()" can report it. A file that exists but does not start with the
 * required heading is a packaging bug that must fail loudly, because silently
 * dropping the DSH guidance would make the model believe the harness rules do
 * not apply.
 *
 * The degradation table is module-private state rather than a provider field or
 * a return value: the registry validates definitions and would only carry an
 * extra payload nobody reads, the provider object is frozen, and only the
 * package itself needs to read the reasons. It is keyed by adaptation root
 * instead of provider instance because "diagnose()" must be synchronous (the
 * one-line entry point stringifies its result) while the provider is built
 * asynchronously; the root is the one identifier both sides share.
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

/** Degradation reason: the per-skill guidance file is missing, the skill still loads. */
export const DEGRADE_ADAPTATION_MISSING = "adaptation-missing";

/** File-system error codes that mean "the file is gone" rather than "the read failed". */
const MISSING_FILE_CODES = new Set(["ENOENT", "ENOTDIR", "EISDIR"]);

/**
 * Report whether one read failure means the path no longer exists.
 *
 * The registry contract asks a provider to resolve "undefined" when a listed
 * candidate can no longer be loaded, and a vanished guidance file is the same
 * kind of "no longer there": neither may surface as a provider failure.
 *
 * @param cause - the rejection reason from readFile or readFileSync.
 * @returns whether the failure is a missing path.
 */
export function isMissingFile(cause) {
	const code = cause?.code;
	return typeof code === "string" && MISSING_FILE_CODES.has(code);
}

/**
 * Current degradations per adaptation root: root -> Map<skill, reason>.
 *
 * Entries describe the current state rather than a log: a successful read
 * removes the record for that skill, so a recovered installation reports clean.
 * The map is never exposed through the package entry points.
 */
const DEGRADATIONS = new Map();

/**
 * Record one degradation for a skill.
 *
 * @param root - absolute adaptations directory.
 * @param name - kebab-case skill name.
 * @param reason - one of the DEGRADE_* constants.
 */
export function recordDegradation(root, name, reason) {
	let table = DEGRADATIONS.get(root);
	if (table === undefined) {
		table = new Map();
		DEGRADATIONS.set(root, table);
	}
	table.set(name, reason);
}

/**
 * Forget the recorded degradation of one skill, when present.
 *
 * @param root - absolute adaptations directory.
 * @param name - kebab-case skill name.
 */
export function clearDegradation(root, name) {
	DEGRADATIONS.get(root)?.delete(name);
}

/**
 * List the current degradations of one adaptation root.
 *
 * @param root - absolute adaptations directory.
 * @returns the {skill, reason} entries, sorted by skill name.
 */
export function degradationsOf(root) {
	const table = DEGRADATIONS.get(root);
	if (table === undefined) return [];
	return [...table.entries()]
		.map(([skill, reason]) => ({ skill, reason }))
		.sort((left, right) => compareCodePoints(left.skill, right.skill));
}

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
 * How many of the required labels must decompose into indented sub-bullets, and
 * how many sub-bullets a file must carry in total.
 *
 * A flat file with six 600-character bullets is technically complete and
 * practically unreadable: the model sees one paragraph per label and cannot
 * tell which sentence applies now. Sub-bullets are the cheapest fix that keeps
 * the five required labels and the character budget intact.
 */
export const MIN_NESTED_LABELS = 4;

/** Minimum indented sub-bullets across one per-skill guidance file. */
export const MIN_NESTED_BULLETS = 8;

/**
 * Words that mark an optional-plugin capability as guarded.
 *
 * Guidance may name tools such as "spawn_teammate", but a bare citation breaks
 * in a session without that plugin. The same line must say what happens when
 * the capability is absent, so the fallback travels with the citation.
 */
const FALLBACK = /退回|没有|不一定|可选插件|未启用|不存在/u;

/**
 * DeepSeek Harness tools that ship with the official distribution itself, so
 * guidance may depend on them whenever the session exposes a full tool surface.
 *
 * Verified against the tool rows of "dsh-base" and the "web-app" preset in
 * 0.2.2-rc.5: "skill", the shell consumers ("bash"/"pwsh"), the file and search
 * consumers, "present", "todo_write", the job consumers, the web consumers,
 * "working_directory", the subagent family, "ask_user_question", the goal
 * consumers, and Agent Teams. The bare "bash" name is the official shell tool;
 * the deployment commonly hides it behind the third-party "ops_bash" wrapper,
 * which is why "bash" and "ops_bash" are both citable.
 */
export const CORE_TOOLS = Object.freeze([
	"skill",
	"bash",
	"pwsh",
	"read",
	"write",
	"edit",
	"grep",
	"glob",
	"read_image",
	"present",
	"todo_write",
	"subagent",
	"subagent_fork",
	"ask_user_question",
	"job_output",
	"job_kill",
	"job_list",
	"web_fetch",
	"web_search",
	"working_directory",
	"send_message",
	"wait_agent",
	"list_agents",
	"interrupt_agent",
	"team_task_create",
	"team_task_list",
	"team_task_get",
	"team_task_update",
	"create_goal",
	"get_goal",
	"update_goal",
	"list_subagent_models"
]);

/**
 * Tools that belong to a third-party plugin, an optional official bundle, or a
 * non-default execution preset: the desktop "ops_bash" shell wrapper, the
 * programmatic "run_code" executor, the bundled-runtime introspection helper,
 * desktop control, scheduled tasks, MCP resource reads, and the
 * configuration-management tools. Guidance may name them, but only together
 * with the fallback that applies when the session does not expose them.
 *
 * "spawn_teammate" is the Agent Teams tool of older releases; it is kept so the
 * guidance may still cite it after a host upgrade, but nothing in this pack
 * relies on it.
 */
export const OPTIONAL_TOOLS = Object.freeze([
	"ops_bash",
	"run_code",
	"load_workspace_dependencies",
	"spawn_teammate",
	"windows_desktop",
	"schedule_create",
	"schedule_list",
	"schedule_edit",
	"schedule_view",
	"list_mcp_resources",
	"read_mcp_resource",
	"config_backup",
	"config_import_plan",
	"config_import_apply",
	"config_restore",
	"config_list_snapshots",
	"config_sync_preview",
	"config_sync_apply",
	"config_sync_pull",
	"config_sync_push"
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

/**
 * Markers that mean an adaptation file was left unfinished.
 *
 * "\\b" only sits between an ASCII word character and a non-word one, so a
 * CJK alternative inside the same group never matched ("待补充" is not an ASCII
 * word). The Chinese markers are therefore matched bare, and "占位符" (a
 * legitimate phrase: "use a placeholder for the password") is excluded from the
 * "占位" alternative.
 */
const UNFINISHED = /\b(?:TODO|FIXME|TBD)\b|待补充|占位(?!符)|待实现/u;

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
		throw new Error('cannot read the DSH adaptation for skill "' + name + '": ' + file + " (" + describeCause(cause) + "; run npm run validate)", { cause });
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
		throw new Error("cannot read the shared DSH adaptation: " + file + " (" + describeCause(cause) + "; run npm run validate)", { cause });
	}
	return assertCommon(normalizeAdaptation(text));
}

/**
 * Read one per-skill adaptation file without blocking the event loop.
 *
 * A missing file degrades instead of failing: the returned text is empty, the
 * reason is recorded in the degradation table, and the caller (the provider)
 * appends only the upstream body and the shared guidance. Malformed content
 * still throws, because that is a packaging error rather than a partial
 * installation.
 *
 * @param root - absolute adaptations directory.
 * @param name - kebab-case skill name.
 * @param signal - optional abort signal handed to the read.
 * @returns the normalized guidance text, or "" when the file is missing.
 * @throws when the file exists but does not start with the required heading.
 */
export async function readAdaptation(root, name, signal) {
	const file = adaptationFile(root, name);
	let text;
	try {
		text = await readFile(file, { encoding: "utf8", signal });
	} catch (cause) {
		if (isAbort(cause, signal)) throw cause;
		if (isMissingFile(cause)) {
			recordDegradation(root, name, DEGRADE_ADAPTATION_MISSING);
			return "";
		}
		throw new Error('cannot read the DSH adaptation for skill "' + name + '": ' + file + " (" + describeCause(cause) + "; run npm run validate)", { cause });
	}
	clearDegradation(root, name);
	return assertAdaptation(name, normalizeAdaptation(text));
}

/**
 * Read one per-skill adaptation file synchronously for diagnostics.
 *
 * This is the synchronous twin of readAdaptation, needed because diagnose() has
 * to answer synchronously (the contract's one-line entry point stringifies the
 * result) while the provider loads skills asynchronously. Both paths classify a
 * read failure the same way and feed the same degradation table, so the
 * diagnostic reflects exactly what the provider would do.
 *
 * @param root - absolute adaptations directory.
 * @param name - kebab-case skill name.
 * @returns the normalized guidance text and the degradation reason, if any.
 * @throws when the file exists but does not start with the required heading.
 */
export function inspectAdaptationSync(root, name) {
	const file = adaptationFile(root, name);
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch (cause) {
		if (isMissingFile(cause)) {
			recordDegradation(root, name, DEGRADE_ADAPTATION_MISSING);
			return { text: "", reason: DEGRADE_ADAPTATION_MISSING };
		}
		throw new Error('cannot read the DSH adaptation for skill "' + name + '": ' + file + " (" + describeCause(cause) + "; run npm run validate)", { cause });
	}
	clearDegradation(root, name);
	return { text: assertAdaptation(name, normalizeAdaptation(text)), reason: null };
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
		if (isAbort(cause, signal)) throw cause;
		throw new Error("cannot read the shared DSH adaptation: " + file + " (" + describeCause(cause) + "; run npm run validate)", { cause });
	}
	return assertCommon(normalizeAdaptation(text));
}

/**
 * Report whether one read failure is the caller's cancellation.
 *
 * "readFile" rejects with "signal.reason" rather than an "AbortError", so the
 * error name alone is not enough: an aborted signal, an "ABORT_ERR" code, and a
 * DOMException are all cancellations. A cancellation must reach the caller
 * unchanged; wrapping it as a missing-file error would report a broken
 * installation for an ordinary cancelled lookup.
 *
 * @param cause - the rejection reason.
 * @param signal - the signal handed to the read, when any.
 * @returns whether the read was cancelled rather than failed.
 */
function isAbort(cause, signal) {
	if (signal?.aborted === true) return true;
	if (cause?.code === "ABORT_ERR") return true;
	return cause?.name === "AbortError" || cause?.name === "TimeoutError";
}

/**
 * Describe one read failure for an actionable diagnostic.
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
	const body = base.trimEnd();
	const skillGuidance = adaptation.trim();
	const sharedGuidance = common.trim();
	// A degraded skill carries no per-skill guidance; skip its block instead of
	// leaving a doubled separator behind.
	if (skillGuidance.length === 0) return body + SKILL_SEPARATOR + sharedGuidance + "\n";
	return body + SKILL_SEPARATOR + skillGuidance + "\n\n" + sharedGuidance + "\n";
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
 * List the indented sub-bullets of one "\"- **label**：…\"" section.
 *
 * Sub-bullets are written two spaces in, so they stay inside their parent
 * section and never count as one of the five required top-level bullets.
 *
 * @param text - the normalized adaptation text.
 * @param label - the label between the asterisks; omit to count the whole file.
 * @returns the sub-bullet lines, already trimmed.
 */
export function nestedBullets(text, label) {
	const source = label === undefined ? text : bulletBody(text, label);
	if (source === undefined) return [];
	return source
		.split("\n")
		.filter((line) => /^[ \t]+-[ \t]+\S/u.test(line))
		.map((line) => line.trim());
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
	const emptyLabels = REQUIRED_LABELS.filter((required) => nestedBullets(text, required).length === 0);
	if (REQUIRED_LABELS.length - emptyLabels.length < MIN_NESTED_LABELS) {
		problems.push(
			label +
				": " +
				(REQUIRED_LABELS.length - emptyLabels.length) +
				" label(s) decompose into sub-bullets, needs at least " +
				MIN_NESTED_LABELS +
				"; add two-space \"- \" items under " +
				emptyLabels.slice(0, REQUIRED_LABELS.length - MIN_NESTED_LABELS).join(" / ")
		);
	}
	const nested = nestedBullets(text);
	if (nested.length < MIN_NESTED_BULLETS) {
		problems.push(label + ": carries " + nested.length + " sub-bullet(s), needs at least " + MIN_NESTED_BULLETS + " so each label breaks into concrete items");
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
	for (const line of text.split("\n")) {
		const optional = OPTIONAL_TOOLS.filter((tool) => line.includes("`" + tool + "`"));
		if (optional.length > 0 && !FALLBACK.test(line)) {
			problems.push(label + ": cites optional-plugin tool(s) " + optional.join("/") + " without stating the fallback for sessions that do not expose them");
		}
	}
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
