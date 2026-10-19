#!/usr/bin/env node
/**
 * Synchronize the GIS skills of an opengis-skills checkout into `assets/`.
 *
 * Usage:
 *   node scripts/sync-opengis-skills.mjs [--from <checkout>] [--check]
 *
 * --from   path to the opengis-skills repository (default: ../opengis-skills,
 *          or the OPENGIS_SKILLS_DIR environment variable).
 * --check  compare the checkout with `assets/` without writing; exits non-zero
 *          on drift, so CI can detect an unsynced pack.
 *
 * The script copies each `gis/<skill>/` directory verbatim (SKILL.md plus its
 * reference files), validates the frontmatter, prunes skills that upstream
 * removed, refreshes `upstream.json`, and regenerates the skill table between
 * the `skills:start` / `skills:end` markers in README.md.
 */

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSkillFile } from "../lib/skill-file.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");
const upstreamFile = join(root, "upstream.json");
const readmeFile = join(root, "README.md");
const upstreamRepository = "https://github.com/znlgis/opengis-skills";

/** Read the value that follows one flag, if the flag is present. */
function flagValue(flag) {
	const index = process.argv.indexOf(flag);
	return index === -1 ? undefined : process.argv[index + 1];
}

/** Print the reason and stop the run. */
function fail(message) {
	console.error("sync-opengis-skills: " + message);
	process.exit(1);
}

const check = process.argv.includes("--check");
const from = resolve(flagValue("--from") ?? process.env.OPENGIS_SKILLS_DIR ?? join(root, "..", "opengis-skills"));
const sourceRoot = join(from, "gis");
if (!existsSync(sourceRoot)) fail('no "gis/" directory under ' + from + "; pass --from <opengis-skills checkout>");

/** Read one source skill directory, or return undefined when it has no SKILL.md. */
function readSourceSkill(sourceDirectory, directoryName) {
	const path = join(sourceDirectory, "SKILL.md");
	if (statSync(path, { throwIfNoEntry: false })?.isFile() !== true) return undefined;
	const parsed = parseSkillFile(readFileSync(path, "utf8"), path);
	if (parsed.name !== directoryName) {
		fail(path + ' declares "' + parsed.name + '" but its directory is "' + directoryName + '"');
	}
	return { name: parsed.name, description: parsed.description, directory: sourceDirectory };
}

const skills = [];
for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	const skill = readSourceSkill(join(sourceRoot, entry.name), entry.name);
	if (skill !== undefined) skills.push(skill);
}
skills.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
if (skills.length === 0) fail("no skills found under " + sourceRoot);

const previous = existsSync(upstreamFile) ? JSON.parse(readFileSync(upstreamFile, "utf8")) : { skills: [] };
const current = new Set(skills.map((skill) => skill.name));
const stale = (previous.skills ?? []).filter((skillName) => !current.has(skillName));

/** Compare every file of one source skill with its vendored copy. */
function inSync(skill) {
	const target = join(assetsRoot, skill.name);
	if (!existsSync(target)) return false;
	const stack = [[skill.directory, target]];
	while (stack.length > 0) {
		const [sourceDirectory, targetDirectory] = stack.pop();
		for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
			const sourcePath = join(sourceDirectory, entry.name);
			const targetPath = join(targetDirectory, entry.name);
			if (entry.isDirectory()) {
				stack.push([sourcePath, targetPath]);
				continue;
			}
			if (!existsSync(targetPath)) return false;
			if (!readFileSync(sourcePath).equals(readFileSync(targetPath))) return false;
		}
	}
	return true;
}

if (check) {
	const problems = [];
	for (const skill of skills) {
		if (!inSync(skill)) problems.push("assets/" + skill.name + " is not in sync with the checkout");
	}
	for (const skillName of stale) problems.push("assets/" + skillName + " was removed upstream but is still vendored");
	if (problems.length > 0) fail("assets/ is stale:\n  - " + problems.join("\n  - "));
	console.log("sync-opengis-skills: assets/ is in sync with " + from + " (" + skills.length + " skills)");
	process.exit(0);
}

mkdirSync(assetsRoot, { recursive: true });
for (const skillName of stale) {
	const target = resolve(assetsRoot, skillName);
	if (!target.startsWith(resolve(assetsRoot) + sep)) fail("refusing to remove " + target);
	rmSync(target, { recursive: true, force: true });
}
for (const skill of skills) {
	const target = join(assetsRoot, skill.name);
	rmSync(target, { recursive: true, force: true });
	cpSync(skill.directory, target, { recursive: true });
}

let commit;
try {
	commit = execFileSync("git", ["-C", from, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
	commit = undefined;
}

const manifest = {
	repository: upstreamRepository,
	...(commit === undefined ? {} : { commit }),
	syncedAt: new Date().toISOString(),
	skillCount: skills.length,
	skills: skills.map((skill) => skill.name)
};
writeFileSync(upstreamFile, JSON.stringify(manifest, null, 2) + "\n");

/** Render the README skill table from the synced frontmatter. */
function renderSkillTable() {
	const rows = skills.map((skill) => "| " + "\`" + skill.name + "\`" + " | " + skill.description.replaceAll("|", "\\|") + " |");
	return ["<!-- skills:start -->", "| Skill | Description (upstream frontmatter) |", "| --- | --- |", ...rows, "<!-- skills:end -->"].join("\n");
}

if (existsSync(readmeFile)) {
	const readme = readFileSync(readmeFile, "utf8");
	const start = readme.indexOf("<!-- skills:start -->");
	const end = readme.indexOf("<!-- skills:end -->");
	if (start !== -1 && end > start) {
		const table = renderSkillTable();
		writeFileSync(readmeFile, readme.slice(0, start) + table + readme.slice(end + "<!-- skills:end -->".length));
	}
}

const suffix = commit === undefined ? "" : " @ " + commit.slice(0, 7);
console.log("sync-opengis-skills: synced " + skills.length + " skills from " + from + suffix);
if (stale.length > 0) console.log("  pruned: " + stale.join(", "));
console.log("  " + skills.map((skill) => skill.name).join(", "));
