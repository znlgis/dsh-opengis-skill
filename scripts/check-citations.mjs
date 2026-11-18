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
 * Usage:
 *   node scripts/check-citations.mjs             report, exit 1 on errors
 *   node scripts/check-citations.mjs --strict    treat warnings as errors
 *
 * Zero dependencies; the only imports are Node built-ins and local helpers.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ADAPTATION_DIRECTORY, commonFile } from "../lib/adaptations.js";
import { readSkillCatalog } from "../lib/catalog.js";

/** Repository root: this script lives in <root>/scripts/. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");
const adaptationRoot = join(root, ADAPTATION_DIRECTORY);
const strict = process.argv.includes("--strict");

/** One "`skill({ name: \"x\" })`" example. */
const SKILL_EXAMPLE = /skill\(\{\s*name:\s*"([a-z0-9-]+)"\s*\}\)/gu;

/** One "`skill` 加载 `x`" pointer, the shorter form the guidance uses in prose. */
const SKILL_POINTER = /加载 `([a-z0-9]+(?:-[a-z0-9]+)*)`/gu;

/**
 * An exact three-part version, guarded against IP addresses and semver ranges.
 *
 * The lookarounds reject anything glued to another dot or digit, so
 * "127.0.0.1" and "3.13.3-rc1" never match as bare versions.
 */
const THREE_PART = /(?<![\d.])(\d+\.\d+\.\d+)(?![\d.])/gu;

/** A two-part version, for the softer migration-note check. */
const TWO_PART = /(?<![\d.])(\d+\.\d+)(?![\d.])/gu;

const errors = [];
const warnings = [];

/** Record one blocking problem. */
function error(message) {
	errors.push(message);
}

/** Record one non-blocking problem. */
function warn(message) {
	warnings.push(message);
}

/** Read one text file, normalizing CRLF and trimming the edges. */
function readText(path) {
	return readFileSync(path, "utf8").replace(/\r\n?/gu, "\n").trim();
}

/**
 * Collect the text of one skill: its SKILL.md plus every reference file.
 *
 * @param directory - the absolute skill directory.
 * @returns the concatenated corpus.
 */
function skillCorpus(directory) {
	const parts = [readText(join(directory, "SKILL.md"))];
	const walk = (current) => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const path = join(current, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (entry.name.endsWith(".md")) parts.push(readText(path));
		}
	};
	walk(directory);
	return parts.join("\n");
}

/**
 * Report whether one skill corpus mentions a version as a whole version.
 *
 * A plain "includes" test hides real drift: "3.9" also matches inside "13.9"
 * and "3.9.1", so guidance copied from a neighbouring skill can look correct.
 * The same lookarounds the scans use are applied here, so a match has to be a
 * complete version token.
 *
 * @param corpus - the skill body plus every reference file.
 * @param version - the version text to look for.
 * @returns whether the corpus mentions that exact version token.
 */
function mentionsVersion(corpus, version) {
	const pattern = new RegExp("(?<![\\d.])" + version.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&") + "(?![\\d.])", "u");
	return pattern.test(corpus);
}

const skills = readSkillCatalog(assetsRoot);
const names = new Set(skills.map((skill) => skill.name));
const directories = new Map(skills.map((skill) => [skill.name, skill.directory]));
let checked = 0;

for (const skill of skills) {
	const file = join(adaptationRoot, skill.name + ".md");
	if (!existsSync(file)) {
		error("adaptations/" + skill.name + ".md: missing; run npm run validate");
		continue;
	}
	checked += 1;
	const text = readText(file);
	const corpus = skillCorpus(skill.directory);
	const label = "adaptations/" + skill.name + ".md";

	for (const match of text.matchAll(SKILL_POINTER)) {
		if (!names.has(match[1])) error(label + ": points at skill \"" + match[1] + "\", which is not bundled");
	}
	for (const match of text.matchAll(SKILL_EXAMPLE)) {
		if (!names.has(match[1])) error(label + ": example loads skill \"" + match[1] + "\", which is not bundled");
	}
	const exact = new Set();
	for (const match of text.matchAll(THREE_PART)) {
		exact.add(match[1]);
		if (mentionsVersion(corpus, match[1])) continue;
		error(label + ": cites version " + match[1] + ", which " + skill.name + " does not document; the body and the guidance have drifted apart");
	}
	for (const match of text.matchAll(TWO_PART)) {
		if (exact.has(match[1]) || [...exact].some((version) => version.startsWith(match[1] + ".")) || mentionsVersion(corpus, match[1])) continue;
		warn(label + ": mentions " + match[1] + ", which " + skill.name + " does not document; keep it only if it is a migration note");
	}
}

const common = commonFile(adaptationRoot);
if (existsSync(common)) {
	const text = readText(common);
	for (const match of text.matchAll(SKILL_EXAMPLE)) {
		if (!names.has(match[1])) error("adaptations/common.md: example loads skill \"" + match[1] + "\", which is not bundled");
	}
	for (const match of text.matchAll(SKILL_POINTER)) {
		if (!names.has(match[1])) error("adaptations/common.md: points at skill \"" + match[1] + "\", which is not bundled");
	}
}

for (const warning of warnings) console.log("  warning: " + warning);
for (const message of errors) console.error("  error: " + message);
console.log(
	"check-citations: " +
		checked +
		" adaptation(s) checked against " +
		directories.size +
		" skill(s), " +
		errors.length +
		" error(s), " +
		warnings.length +
		" warning(s)"
);
if (errors.length > 0) process.exitCode = 1;
if (strict && warnings.length > 0) process.exitCode = 1;
