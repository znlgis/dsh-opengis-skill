#!/usr/bin/env node
/**
 * Check the cross-references a DSH adaptation makes to the rest of the package.
 *
 * validate-skills.mjs proves each adaptation is structurally sound on its own.
 * This script proves it still points at things that exist after the vendored
 * skills were re-synced:
 *
 *   1. Every skill the guidance tells the model to load ("加载 `x`" or a
 *      `skill({ name: "x" })` example) is a bundled skill. A renamed or dropped
 *      upstream skill otherwise leaves a dead pointer that only the model sees.
 *   2. Every exact three-part version the guidance cites (the "正文按 3.13.3
 *      编写" kind) appears somewhere in that skill's own body or references.
 *      A three-part version is precise enough that a miss is real drift: either
 *      upstream moved or the guidance was copied from a neighbouring skill.
 *   3. Two-part versions are reported as warnings instead, because guidance
 *      legitimately names earlier releases in migration notes ("1.16 之前用 X").
 *
 * The rules themselves live in "lib/citations.js": diagnose() reports the same
 * violations as dangling references, and two copies of the rules would let CI
 * and the diagnostic disagree. This script owns the file reading, the missing
 * adaptation coverage check, and the exit code.
 *
 * Usage:
 *   node scripts/check-citations.mjs             report, exit 1 on errors
 *   node scripts/check-citations.mjs --strict    treat warnings as errors
 *
 * Zero dependencies; the only imports are Node built-ins and local helpers.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ADAPTATION_DIRECTORY, commonFile } from "../lib/adaptations.js";
import { readSkillCatalog } from "../lib/catalog.js";
import { citationProblems, normalizeCitationText } from "../lib/citations.js";

/** Repository root: this script lives in <root>/scripts/. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");
const adaptationRoot = join(root, ADAPTATION_DIRECTORY);
const strict = process.argv.includes("--strict");

const errors = [];
const warnings = [];

const skills = readSkillCatalog(assetsRoot);
const adaptations = [];
let checked = 0;

for (const skill of skills) {
	const file = join(adaptationRoot, skill.name + ".md");
	if (!existsSync(file)) {
		errors.push("adaptations/" + skill.name + ".md: missing; run npm run validate");
		continue;
	}
	checked += 1;
	adaptations.push({ name: skill.name, text: normalizeCitationText(readFileSync(file, "utf8")) });
}

const sharedFile = commonFile(adaptationRoot);
const common = existsSync(sharedFile) ? normalizeCitationText(readFileSync(sharedFile, "utf8")) : undefined;
const problems = citationProblems({ skills, adaptations, common });
for (const entry of problems.errors) errors.push(entry.from + ": " + entry.message);
for (const entry of problems.warnings) warnings.push(entry.from + ": " + entry.message);

for (const warning of warnings) console.log("  warning: " + warning);
for (const message of errors) console.error("  error: " + message);
console.log(
	"check-citations: " +
		checked +
		" adaptation(s) checked against " +
		skills.length +
		" skill(s), " +
		errors.length +
		" error(s), " +
		warnings.length +
		" warning(s)"
);
if (errors.length > 0) process.exitCode = 1;
if (strict && warnings.length > 0) process.exitCode = 1;
