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
 * @module @dsh-gis/dsh-opengis-skill
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { composeSkillContent, readAdaptation, readCommon } from "./adaptations.js";
import { readSkillCatalog, resourceBaseOf } from "./catalog.js";
import { parseSkillFile } from "./skill-file.js";

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
 * Build the candidate metadata from the parsed upstream frontmatter.
 *
 * "category" is omitted when upstream does not declare one, so consumers never
 * see an explicit undefined; "tags" is always an array so a consumer can map
 * over it without a guard.
 *
 * @param metadata - the parsed frontmatter metadata, when the skill has any.
 * @returns the metadata object carried on the candidate.
 */
function candidateMetadata(metadata) {
	const tags = Array.isArray(metadata?.tags) ? metadata.tags : [];
	return metadata?.category === undefined ? { tags } : { category: metadata.category, tags };
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
 */
function apply(ctx) {
	const skills = loadSkills();
	const byName = new Map(skills.map((skill) => [skill.name, skill]));
	const candidates = skills.map((skill) => ({
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
		metadata: candidateMetadata(skill.metadata)
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
				readCommon(ADAPTATION_ROOT, options?.signal)
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
