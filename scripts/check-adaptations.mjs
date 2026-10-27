#!/usr/bin/env node
/**
 * Check the DeepSeek Harness adaptation files: one per vendored skill, plus the
 * shared "common.md", against the same rules the validation script enforces.
 *
 * Usage:
 *   node scripts/check-adaptations.mjs            check every skill
 *   node scripts/check-adaptations.mjs gdal jts   check the named skills only
 *
 * The coverage checks are skipped when skill names are given, so a contributor
 * can verify one file while the rest are still being written. Exit code is 1
 * when any checked file has a problem.
 */

import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	ADAPTATION_DIRECTORY,
	adaptationFile,
	adaptationProblems,
	commonFile,
	commonProblems,
	listAdaptations,
	SKILL_HEADING
} from "../lib/adaptations.js";
import { readSkillCatalog } from "../lib/catalog.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adaptationRoot = join(root, ADAPTATION_DIRECTORY);
const assetsRoot = join(root, "assets");

/** Read one adaptation file and normalize it the way the provider does. */
function readText(path) {
	return readFileSync(path, "utf8").replace(/\r\n?/gu, "\n").trim();
}

const requested = process.argv.slice(2);
const skills = readSkillCatalog(assetsRoot);
const expected = new Set(skills.map((skill) => skill.name));
const present = new Set(listAdaptations(adaptationRoot).filter((name) => name !== "common"));
const targets = requested.length > 0 ? requested : [...expected].sort();
const problems = [];
let checked = 0;

if (requested.length === 0) {
	const commonPath = commonFile(adaptationRoot);
	if (!existsSync(commonPath)) problems.push(ADAPTATION_DIRECTORY + "/common.md: missing");
	else problems.push(...commonProblems(readText(commonPath)));
	for (const name of expected) {
		if (!present.has(name)) problems.push(ADAPTATION_DIRECTORY + "/" + name + ".md: missing");
	}
	for (const name of present) {
		if (!expected.has(name)) problems.push(ADAPTATION_DIRECTORY + "/" + name + ".md: no matching skill under assets/");
	}
}

for (const name of targets) {
	const file = adaptationFile(adaptationRoot, name);
	if (!existsSync(file)) {
		problems.push(ADAPTATION_DIRECTORY + "/" + name + ".md: missing");
		continue;
	}
	checked += 1;
	const text = readText(file);
	const found = adaptationProblems(name, text);
	if (!text.startsWith(SKILL_HEADING)) found.unshift(ADAPTATION_DIRECTORY + "/" + name + ".md: wrong heading");
	problems.push(...found);
	console.log(name + ": " + text.length + " chars, " + (found.length === 0 ? "ok" : found.length + " problem(s)"));
}

for (const problem of problems) console.error("  error: " + problem);
console.log("check-adaptations: " + checked + " file(s) checked, " + problems.length + " problem(s)");
if (problems.length > 0) process.exitCode = 1;
