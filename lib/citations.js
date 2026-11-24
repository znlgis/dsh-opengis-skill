/**
 * Cross-reference scanners for the DSH adaptation layer.
 *
 * Two consumers ask the same question about "adaptations/": does the guidance
 * still point at things the package actually ships? "scripts/check-citations.mjs"
 * turns a violation into a CI error, and "diagnose()" reports the dangling
 * references as {from, ref} pairs. Keeping two copies of the rules would let the
 * gate and the diagnostic disagree, so both read this module.
 *
 * A reference is either
 *
 * - a skill the guidance tells the model to load ("加载 `x`" or a
 *   `skill({ name: "x" })` example), or
 * - an exact three-part version the guidance cites (the "正文按 3.13.3 编写"
 *   kind). A three-part version is precise enough that a miss is real drift;
 *   two-part versions are only warnings because migration notes legitimately
 *   name earlier releases ("1.16 之前用 X").
 *
 * @module @dsh-gis/dsh-opengis-skill/citations
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SKILL_FILE } from "./catalog.js";

/** One `skill({ name: "x" })` example. */
export const SKILL_EXAMPLE = /skill\(\{\s*name:\s*"([a-z0-9-]+)"\s*\}\)/gu;

/** One "加载 `x`" pointer, the shorter form the guidance uses in prose. */
export const SKILL_POINTER = /加载 `([a-z0-9]+(?:-[a-z0-9]+)*)`/gu;

/**
 * An exact three-part version, guarded against IP addresses and semver ranges.
 *
 * The lookarounds reject anything glued to another dot or digit, so
 * "127.0.0.1" and "3.13.3-rc1" never match as bare versions.
 */
export const THREE_PART = /(?<![\d.])(\d+\.\d+\.\d+)(?![\d.])/gu;

/** A two-part version, for the softer migration-note check. */
export const TWO_PART = /(?<![\d.])(\d+\.\d+)(?![\d.])/gu;

/**
 * Normalize one Markdown file for scanning: LF line endings and no edge blanks.
 *
 * @param text - the raw file contents.
 * @returns the normalized text.
 */
export function normalizeCitationText(text) {
	return text.replace(/\r\n?/gu, "\n").trim();
}

/**
 * List the skills one guidance text points at.
 *
 * @param text - the normalized guidance text.
 * @returns one {kind, ref} entry per citation, in document order.
 */
export function skillReferences(text) {
	const references = [];
	for (const match of text.matchAll(SKILL_POINTER)) references.push({ kind: "pointer", ref: match[1] });
	for (const match of text.matchAll(SKILL_EXAMPLE)) references.push({ kind: "example", ref: match[1] });
	return references;
}

/**
 * List the distinct exact (three-part) versions one guidance text cites.
 *
 * @param text - the normalized guidance text.
 * @returns the versions, deduplicated, in document order.
 */
export function exactVersions(text) {
	const versions = new Set();
	for (const match of text.matchAll(THREE_PART)) versions.add(match[1]);
	return [...versions];
}

/**
 * Report whether one skill corpus mentions a version as a whole version token.
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
export function mentionsVersion(corpus, version) {
	const pattern = new RegExp("(?<![\\d.])" + version.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&") + "(?![\\d.])", "u");
	return pattern.test(corpus);
}

/**
 * Collect the text of one skill: its SKILL.md plus every reference file.
 *
 * @param directory - the absolute skill directory, when known.
 * @returns the concatenated corpus, or "" when the directory is unknown.
 */
export function skillCorpus(directory) {
	if (typeof directory !== "string") return "";
	const parts = [];
	let root;
	try {
		root = readdirSync(directory, { withFileTypes: true });
	} catch {
		return "";
	}
	const prefix = join(directory, SKILL_FILE);
	try {
		parts.push(normalizeCitationText(readFileSync(prefix, "utf8")));
	} catch {
		// A missing SKILL.md is reported by the catalog scan, not here.
	}
	const walk = (current) => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const path = join(current, entry.name);
			if (entry.isDirectory()) {
				walk(path);
				continue;
			}
			if (!entry.name.endsWith(".md") || path === prefix) continue;
			try {
				parts.push(normalizeCitationText(readFileSync(path, "utf8")));
			} catch {
				// Unreadable reference files are reported by validate-skills.
			}
		}
	};
	walk(directory);
	return parts.join("\n");
}

/**
 * Report every cross-reference problem inside the adaptation layer.
 *
 * @param options - "skills" (catalog entries carrying name and directory),
 *   "adaptations" (the {name, text} pairs that exist) and "common" (the shared
 *   guidance text, when readable).
 * @returns the errors and warnings, each carrying the adaptation file label,
 *   the offending reference and a readable message.
 */
export function citationProblems({ skills, adaptations, common }) {
	const errors = [];
	const warnings = [];
	const names = new Set(skills.map((skill) => skill.name));
	const directories = new Map(skills.map((skill) => [skill.name, skill.directory]));
	const reportSkill = (label, reference) => {
		if (names.has(reference.ref)) return;
		errors.push({
			from: label,
			ref: reference.ref,
			kind: "unknown-skill",
			message:
				reference.kind === "example"
					? 'example loads skill "' + reference.ref + '", which is not bundled'
					: 'points at skill "' + reference.ref + '", which is not bundled'
		});
	};
	for (const { name, text } of adaptations) {
		const label = "adaptations/" + name + ".md";
		for (const reference of skillReferences(text)) reportSkill(label, reference);
		const corpus = skillCorpus(directories.get(name));
		const exact = new Set(exactVersions(text));
		for (const version of exact) {
			if (mentionsVersion(corpus, version)) continue;
			errors.push({
				from: label,
				ref: version,
				kind: "version-drift",
				message: "cites version " + version + ", which " + name + " does not document; the body and the guidance have drifted apart"
			});
		}
		for (const match of text.matchAll(TWO_PART)) {
			const version = match[1];
			if (exact.has(version) || [...exact].some((known) => known.startsWith(version + "."))) continue;
			if (mentionsVersion(corpus, version)) continue;
			warnings.push({
				from: label,
				ref: version,
				kind: "two-part-version",
				message: "mentions " + version + ", which " + name + " does not document; keep it only if it is a migration note"
			});
		}
	}
	if (typeof common === "string") {
		const label = "adaptations/common.md";
		for (const reference of skillReferences(common)) reportSkill(label, reference);
	}
	return { errors, warnings };
}
