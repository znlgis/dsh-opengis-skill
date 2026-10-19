/**
 * Bundled OpenGIS skill provider for DeepSeek Harness.
 *
 * The package ships the 32 GIS skills of the opengis-skills repository under
 * `assets/<skill>/SKILL.md` and registers one skill provider on `ctx.skills`.
 * Discovery reads only the frontmatter; the instruction body and the
 * `reference/*.md` files are read on demand, and each candidate carries the
 * skill directory as its resource base so relative references resolve.
 *
 * @module @dsh-gis/dsh-opengis-skill
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSkillFile } from "./skill-file.js";

/** Provider name registered on `ctx.skills` (the runtime name "runtime" is reserved). */
const PROVIDER_NAME = "opengis";

/** Source label carried by every candidate and definition. */
const SOURCE = "opengis";

/** Standard rank for packaged skill providers and bundled roots (BUNDLED_SKILL_RANK). */
const RANK = 600;

/** The instruction file name inside one skill directory. */
const SKILL_FILE = "SKILL.md";

/** Absolute asset root, resolved from this module inside the installed package. */
const ASSET_ROOT = fileURLToPath(new URL("../assets/", import.meta.url));

/** Stable Loader identity. */
const name = "opengis-skill";

/** The skill registry must exist before `apply` runs. */
const inject = ["skills"];

/**
 * Read every `assets/<name>/SKILL.md` bundle and validate it.
 *
 * @param assetRoot - absolute directory holding one subdirectory per skill.
 * @returns the validated skills sorted by name.
 * @throws when two skills share a name or a directory disagrees with its frontmatter.
 */
function readAssetSkills(assetRoot) {
	const skills = [];
	const seen = new Set();
	for (const entry of readdirSync(assetRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const directory = join(assetRoot, entry.name);
		const path = join(directory, SKILL_FILE);
		if (statSync(path, { throwIfNoEntry: false })?.isFile() !== true) continue;
		const parsed = parseSkillFile(readFileSync(path, "utf8"), path);
		if (parsed.name !== entry.name) {
			throw new Error(`opengis-skill: ${path} declares "${parsed.name}" but its directory is "${entry.name}"`);
		}
		if (seen.has(parsed.name)) throw new Error(`opengis-skill: duplicate skill name "${parsed.name}"`);
		seen.add(parsed.name);
		skills.push({ name: parsed.name, description: parsed.description, directory, path });
	}
	return skills.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
}

/** Render the directory resource base with forward slashes for the model. */
function resourceBaseOf(directory) {
	return { kind: "directory", path: directory.split(sep).join("/") };
}

/** The invocation policy every bundled skill uses: model and user may load it. */
const INVOCATION = { modelInvocable: true, userInvocable: true };

/**
 * Register the bundled OpenGIS skill provider on `ctx.skills`.
 *
 * @param ctx - Cordis context carrying the skill registry.
 */
function apply(ctx) {
	const skills = readAssetSkills(ASSET_ROOT);
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
		resourceBase: resourceBaseOf(skill.directory)
	}));
	const provider = {
		name: PROVIDER_NAME,
		list: () => Promise.resolve(candidates),
		async get(candidate, options) {
			const skill = byName.get(candidate.name);
			if (skill === undefined) throw new Error(`opengis-skill: unknown skill "${candidate.name}"`);
			const raw = await readFile(skill.path, { encoding: "utf8", signal: options?.signal });
			const parsed = parseSkillFile(raw, skill.path);
			if (parsed.name !== candidate.name) {
				throw new Error(`opengis-skill: ${skill.path} now declares "${parsed.name}"`);
			}
			return {
				name: parsed.name,
				description: parsed.description,
				invocation: { ...INVOCATION },
				source: SOURCE,
				provider: PROVIDER_NAME,
				resourceBase: resourceBaseOf(skill.directory),
				path: skill.path,
				content: parsed.content
			};
		}
	};
	ctx.effect(() => ctx.skills.registerProvider(() => provider), "opengis-skill: skill provider");
}

export { apply, inject, name };
