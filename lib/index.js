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
 * - The plugin config ("scenario", "groups", "skills", "exclude") trims the
 *   catalog per bundle configuration, so a browser-map session never pays for
 *   the server and database skills; "scenario" is shorthand for one of the
 *   preset group sets in lib/taxonomy.js.
 * - Loading appends the DSH guidance, so the upstream body stays byte-identical.
 *   A missing "adaptations/<skill>.md" degrades that one skill to "upstream body
 *   + common guidance" instead of failing the load; the reason is recorded in
 *   lib/adaptations.js so diagnose() can report it.
 *
 * "diagnose()" is re-exported from "./diagnose.js": it is the read-only,
 * synchronous diagnostic entry point ( `npm run diagnose` and the `node -e`
 * one-liner ) that answers "why is my skill catalog not what I expected".
 *
 * The provider follows the "dsh-skill" contract at the version declared by
 * "engines.dsh": "list()" resolves a complete array of candidates, "get()"
 * resolves the full definition or "undefined" when the instruction file is no
 * longer loadable, and both settle promptly when their abort signal fires.
 *
 * @module @dsh-gis/dsh-opengis-skill
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { composeSkillContent, isMissingFile, readAdaptation, readCommon } from "./adaptations.js";
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
const INVOCATION = Object.freeze({ modelInvocable: true, userInvocable: true });

/**
 * Combine the registration lifecycle signal with one caller signal.
 *
 * The registry aborts "control.signal" when the exact provider registration is
 * disposed, while "options.signal" cancels one lookup. Either one must settle
 * the read, so the provider races both.
 *
 * @param signals - the optional signals to race; omitted entries are ignored.
 * @returns the combined signal, or undefined when no signal applies.
 */
function combineSignals(...signals) {
	const active = signals.filter((signal) => signal !== undefined);
	if (active.length === 0) return undefined;
	if (active.length === 1) return active[0];
	return AbortSignal.any(active);
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
 * @returns the frozen metadata object carried on the candidate.
 */
function candidateMetadata(skill) {
	const tags = Array.isArray(skill.metadata?.tags) ? skill.metadata.tags : [];
	const metadata = { tags: Object.freeze([...tags]), groups: Object.freeze(groupsOf(skill.name)), keywords: Object.freeze(keywordsOf(skill.name)) };
	if (skill.metadata?.category !== undefined) metadata.category = skill.metadata.category;
	return Object.freeze(metadata);
}

/**
 * Read and validate the packaged skill catalog, annotating asset failures with
 * the plugin name so a broken installation is diagnosable from the host log.
 *
 * @param assetRoot - absolute directory holding one subdirectory per skill.
 * @returns the validated catalog sorted by name.
 * @throws when the packaged assets are missing or malformed.
 */
function loadSkills(assetRoot) {
	try {
		return readSkillCatalog(assetRoot);
	} catch (cause) {
		throw new Error("opengis-skill: cannot load skill assets from " + assetRoot + ": " + cause.message, { cause });
	}
}

/**
 * Create the skill provider over one asset root.
 *
 * This is the testable core of {@link apply}: the packaged entry point only
 * supplies the module-relative roots and the registration-lived abort signal,
 * while a test can point it at a fixture tree.
 *
 * @param options - optional overrides: "assetRoot", "adaptationRoot", "config"
 *   (the plugin config) and "signal" (the registration lifecycle signal).
 * @returns the provider object the skill registry holds.
 * @throws when the assets are missing or the configuration names an unknown
 *   group or skill.
 */
export function createProvider(options = {}) {
	const assetRoot = options.assetRoot ?? ASSET_ROOT;
	const adaptationRoot = options.adaptationRoot ?? ADAPTATION_ROOT;
	const lifecycleSignal = options.signal;
	const skills = loadSkills(assetRoot);
	const visible = selectSkills(skills, normalizeSelection(options.config, skills));
	const byName = new Map(visible.map((skill) => [skill.name, skill]));
	const candidates = Object.freeze(
		visible.map((skill) =>
			Object.freeze({
				name: skill.name,
				description: skill.description,
				invocation: INVOCATION,
				source: SOURCE,
				provider: PROVIDER_NAME,
				rank: RANK,
				locator: skill.path,
				path: skill.path,
				resourceBase: Object.freeze(resourceBaseOf(skill.directory)),
				// Routing metadata rides on the candidate only. The registry and the
				// "skill" tool never read it (the model-facing catalog renders name and
				// description), so a definition would only carry dead payload. Absent
				// values are omitted rather than emitted as undefined keys.
				metadata: candidateMetadata(skill)
			})
		)
	);

	/**
	 * Cached shared-guidance read.
	 *
	 * "common.md" is appended to every loaded skill and never changes while the
	 * provider runs, so it is read once and reused. Only a successful read is
	 * cached: a transient failure must not poison the provider for the rest of
	 * the session, and a caller-supplied abort signal must not cancel a shared
	 * read that other callers are waiting on.
	 */
	let commonContent;

	/**
	 * Read the shared DSH guidance, memoizing the successful result.
	 *
	 * @returns the normalized guidance text.
	 */
	function sharedGuidance() {
		if (commonContent === undefined) {
			commonContent = readCommon(adaptationRoot).catch((cause) => {
				commonContent = undefined;
				throw cause;
			});
		}
		return commonContent;
	}

	return Object.freeze({
		name: PROVIDER_NAME,
		// A fresh array per call: the elements stay frozen, but a consumer that
		// sorts or splices the result cannot corrupt the provider's catalog.
		list: () => Promise.resolve([...candidates]),
		async get(candidate, lookup) {
			// A candidate this provider did not list, or one the configuration no
			// longer selects, is "no longer loadable": the registry contract resolves
			// undefined so the caller can report it as unknown instead of failing the
			// whole lookup with a provider-specific error.
			const skill = byName.get(candidate.name);
			if (skill === undefined) return undefined;
			const signal = combineSignals(lifecycleSignal, lookup?.signal);
			const [raw, adaptation, common] = await Promise.all([
				readFile(skill.path, { encoding: "utf8", signal }).catch((cause) => {
					// A listed skill whose directory disappeared is "no longer loadable";
					// the registry contract reports that as undefined, not as a failure.
					if (isMissingFile(cause)) return undefined;
					throw cause;
				}),
				readAdaptation(adaptationRoot, skill.name, signal),
				sharedGuidance()
			]);
			if (raw === undefined) return undefined;
			let parsed;
			try {
				parsed = parseSkillFile(raw, skill.path);
			} catch (cause) {
				throw new Error("opengis-skill: " + cause.message, { cause });
			}
			if (parsed.name !== candidate.name) {
				throw new Error("opengis-skill: " + skill.path + ' now declares "' + parsed.name + '" but was listed as "' + candidate.name + '"');
			}
			return Object.freeze({
				name: parsed.name,
				description: parsed.description,
				invocation: INVOCATION,
				source: SOURCE,
				provider: PROVIDER_NAME,
				resourceBase: Object.freeze(resourceBaseOf(skill.directory)),
				path: skill.path,
				content: composeSkillContent(parsed.content, adaptation, common)
			});
		}
	});
}

/**
 * Register the bundled OpenGIS skill provider on "ctx.skills".
 *
 * The returned disposer of "registerProvider" is owned by the calling fiber,
 * so plugin unload removes the provider without an extra "ctx.effect" wrapper.
 * The registration-scoped abort signal reaches every load, so an unload cannot
 * leave a half-read skill behind.
 *
 * @param ctx - Cordis context carrying the skill registry.
 * @param config - optional plugin config: "scenario" (preset group set),
 *   "groups" (string[]), "skills" (string[] allow list) and "exclude"
 *   (string[] deny list). "skills" wins over "scenario"/"groups", and
 *   "exclude" applies last. Unknown names are rejected so a typo cannot
 *   silently return the wrong catalog.
 */
function apply(ctx, config) {
	ctx.skills.registerProvider((control) => createProvider({ config, signal: control?.signal }));
}

export { apply, inject, name };
export { diagnose } from "./diagnose.js";
