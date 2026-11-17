/**
 * Bundled OpenGIS skill provider for DeepSeek Harness.
 *
 * The package ships the "gis/" skills of the opengis-skills repository under
 * "assets/<skill>/SKILL.md" and registers one skill provider on "ctx.skills".
 * Discovery reads only the frontmatter; the instruction body and the
 * "reference/*.md" files are read on demand, and each candidate carries the
 * skill directory as its resource base so relative references resolve.
 *
 * The vendored bodies are an exact upstream snapshot, so the DeepSeek Harness
 * guidance lives outside them: "adaptations/<skill>.md" plus the shared
 * "adaptations/common.md" are appended when a skill is loaded.
 *
 * Three catalog layers stay outside the vendored snapshot on purpose:
 *
 * - "lib/taxonomy.js" maps each skill to coarse groups and to the Chinese
 *   trigger phrases a request actually uses, and the provider exposes both on
 *   the candidate metadata.
 * - The plugin config ("groups", "skills", "exclude") trims the catalog per
 *   bundle configuration, so a browser-map session never pays for the server
 *   and database skills.
 * - Loading appends the DSH guidance, so the upstream body stays byte-identical.
 *
 * @module @dsh-gis/dsh-opengis-skill
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { composeSkillContent, readAdaptation, readCommon } from "./adaptations.js";
import { readSkillCatalog, resourceBaseOf } from "./catalog.js";
import { parseSkillFile } from "./skill-file.js";
import { groupsOf, keywordsOf, normalizeSelection, selectSkills } from "./taxonomy.js";

/** Provider name registered on "ctx.skills" (the runtime name "runtime" is reserved). */
const PROVIDER_NAME = "opengis";

/** Source label carried by every candidate and definition. */
const SOURCE = "opengis";

/** Standard rank for packaged skill providers and bundled roots (BUNDLED_SKILL_RANK). */
const RANK = 600;

/** Absolute asset root, resolved from this module inside the installed package. */
const ASSET_ROOT = fileURLToPath(new URL("../assets/", import.meta.url));

/** Absolute adaptation root holding the DSH guidance appended on load. */
const ADAPTATION_ROOT = fileURLToPath(new URL("../adaptations/", import.meta.url));

/** Stable Loader identity. */
const name = "opengis-skill";

/** The skill registry must exist before "apply" runs. */
const inject = ["skills"];

/** The invocation policy every bundled skill uses: model and user may load it. */
const INVOCATION = { modelInvocable: true, userInvocable: true };

/**
 * Cached shared-guidance read.
 *
 * "common.md" is appended to every loaded skill and never changes while the
 * process runs, so it is read once and reused. Only a successful read is
 * cached: a transient failure must not poison the provider for the rest of the
 * session, and a caller-supplied abort signal must not cancel a shared read
 * that other callers are waiting on.
 */
let commonContent;

/**
 * Read the shared DSH guidance, memoizing the successful result.
 *
 * @returns the normalized guidance text.
 */
function sharedGuidance() {
	if (commonContent === undefined) {
		commonContent = readCommon(ADAPTATION_ROOT).catch((cause) => {
			commonContent = undefined;
			throw cause;
		});
	}
	return commonContent;
}

/**
 * Build the candidate metadata from the upstream frontmatter plus the local
 * taxonomy.
 *
 * "category" is omitted when upstream does not declare one, so consumers never
 * see an explicit undefined; "tags", "groups" and "keywords" are always arrays
 * so a consumer can map over them without a guard. "groups" and "keywords" are
 * local additions: upstream carries neither, and a host that does not know them
 * simply ignores the keys.
 *
 * @param skill - the parsed catalog entry.
 * @returns the metadata object carried on the candidate.
 */
function candidateMetadata(skill) {
	const tags = Array.isArray(skill.metadata?.tags) ? skill.metadata.tags : [];
	const metadata = { tags, groups: groupsOf(skill.name), keywords: keywordsOf(skill.name) };
	if (skill.metadata?.category !== undefined) metadata.category = skill.metadata.category;
	return metadata;
}

/**
 * Read and validate the packaged skill catalog, annotating asset failures with
 * the plugin name so a broken installation is diagnosable from the host log.
 *
 * @returns the validated catalog sorted by name.
 * @throws when the packaged assets are missing or malformed.
 */
function loadSkills() {
	try {
		return readSkillCatalog(ASSET_ROOT);
	} catch (cause) {
		throw new Error("opengis-skill: cannot load skill assets from " + ASSET_ROOT + ": " + cause.message, { cause });
	}
}

/**
 * Register the bundled OpenGIS skill provider on "ctx.skills".
 *
 * The returned disposer of "registerProvider" is owned by the calling fiber,
 * so plugin unload removes the provider without an extra "ctx.effect" wrapper.
 *
 * @param ctx - Cordis context carrying the skill registry.
 * @param config - optional plugin config: "groups" (string[]), "skills"
 *   (string[] allow list) and "exclude" (string[] deny list). Unknown names are
 *   rejected so a typo cannot silently return the wrong catalog.
 */
function apply(ctx, config) {
	const skills = loadSkills();
	const visible = selectSkills(skills, normalizeSelection(config, skills));
	const byName = new Map(visible.map((skill) => [skill.name, skill]));
	const candidates = visible.map((skill) => ({
		name: skill.name,
		description: skill.description,
		invocation: { ...INVOCATION },
		source: SOURCE,
		provider: PROVIDER_NAME,
		rank: RANK,
		locator: skill.path,
		path: skill.path,
		resourceBase: resourceBaseOf(skill.directory),
		// The registry keeps upstream routing metadata on the candidate only;
		// a definition is a summary and must not carry it. Absent values are
		// omitted rather than emitted as undefined keys.
		metadata: candidateMetadata(skill)
	}));
	const provider = {
		name: PROVIDER_NAME,
		list: () => Promise.resolve(candidates),
		async get(candidate, options) {
			const skill = byName.get(candidate.name);
			if (skill === undefined) throw new Error('opengis-skill: unknown skill "' + candidate.name + '"');
			const [raw, adaptation, common] = await Promise.all([
				readFile(skill.path, { encoding: "utf8", signal: options?.signal }),
				readAdaptation(ADAPTATION_ROOT, skill.name, options?.signal),
				sharedGuidance()
			]);
			let parsed;
			try {
				parsed = parseSkillFile(raw, skill.path);
			} catch (cause) {
				throw new Error("opengis-skill: " + cause.message, { cause });
			}
			if (parsed.name !== candidate.name) {
				throw new Error("opengis-skill: " + skill.path + ' now declares "' + parsed.name + '" but was listed as "' + candidate.name + '"');
			}
			return {
				name: parsed.name,
				description: parsed.description,
				invocation: { ...INVOCATION },
				source: SOURCE,
				provider: PROVIDER_NAME,
				resourceBase: resourceBaseOf(skill.directory),
				path: skill.path,
				content: composeSkillContent(parsed.content, adaptation, common)
			};
		}
	};
	ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name };
