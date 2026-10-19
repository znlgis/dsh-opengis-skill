#!/usr/bin/env node
/**
 * Validate the packaged skill assets, plugin metadata, and bundle wiring.
 *
 * Usage: node scripts/validate-skills.mjs
 *
 * Exits non-zero on errors; warnings are reported but do not fail the run.
 * Run this before publishing and in CI.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSkillFile } from "../lib/skill-file.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");
const errors = [];
const warnings = [];

/** Record a blocking problem. */
function error(message) {
	errors.push(message);
}

/** Record a non-blocking problem. */
function warn(message) {
	warnings.push(message);
}

/** Parse one JSON file, reporting a readable error instead of throwing. */
function readJson(path) {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch (cause) {
		error(path + ": " + cause.message);
		return undefined;
	}
}

const pkg = readJson(join(root, "package.json"));
if (pkg !== undefined) {
	if (typeof pkg.name !== "string" || pkg.name.length === 0) error("package.json: name is required");
	if (pkg.dsh?.bundle?.patch !== "./cordis.patch.yml") error('package.json: dsh.bundle.patch must be "./cordis.patch.yml"');
	if (typeof pkg.main !== "string" || !existsSync(join(root, pkg.main))) error("package.json: main does not exist");
	if (!Array.isArray(pkg.files) || !pkg.files.includes("assets")) error('package.json: files must include "assets"');
	if (!Array.isArray(pkg.files) || !pkg.files.includes("lib")) error('package.json: files must include "lib"');
	if (pkg.exports?.["."] === undefined) error('package.json: exports must declare "."');
	if (pkg.exports?.["./icon"] === undefined) error('package.json: exports must declare "./icon"');
	if (pkg.exports?.["./cordis.patch.yml"] === undefined) error('package.json: exports must declare "./cordis.patch.yml"');
	if (pkg.publishConfig?.registry !== "https://registry.npmjs.org/") warn("package.json: publishConfig.registry is not the public npm registry");
}

const patchPath = join(root, "cordis.patch.yml");
if (!existsSync(patchPath)) error("cordis.patch.yml is missing");
else if (pkg !== undefined && !readFileSync(patchPath, "utf8").includes(pkg.name)) error("cordis.patch.yml does not insert " + pkg.name);

const iconPath = join(root, "icon.svg");
if (!existsSync(iconPath)) error("icon.svg is missing");
else {
	const icon = readFileSync(iconPath);
	if (icon.byteLength > 256 * 1024) error("icon.svg exceeds the 256 KiB bundle icon limit");
	if (!icon.subarray(0, 256).toString("utf8").includes("<svg")) error("icon.svg is not an SVG document");
}

for (const locale of ["en", "zh"]) {
	const path = join(root, "locale", locale + ".json");
	const data = readJson(path);
	if (data === undefined) continue;
	if (typeof data.meta?.title !== "string" || data.meta.title.length === 0) error("locale/" + locale + ".json: meta.title is required");
	if (typeof data.meta?.description !== "string" || data.meta.description.length === 0) error("locale/" + locale + ".json: meta.description is required");
}

const skills = [];
if (!existsSync(assetsRoot)) {
	error("assets/ is missing; run npm run sync");
} else {
	for (const entry of readdirSync(assetsRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const directory = join(assetsRoot, entry.name);
		const path = join(directory, "SKILL.md");
		if (statSync(path, { throwIfNoEntry: false })?.isFile() !== true) {
			error("assets/" + entry.name + ": SKILL.md is missing");
			continue;
		}
		const raw = readFileSync(path, "utf8");
		let parsed;
		try {
			parsed = parseSkillFile(raw, path);
		} catch (cause) {
			error(cause.message);
			continue;
		}
		if (parsed.name !== entry.name) error("assets/" + entry.name + ": declares " + parsed.name);
		if (skills.some((skill) => skill.name === parsed.name)) error("duplicate skill name " + parsed.name);
		if (parsed.content.length === 0) error("assets/" + entry.name + ": instruction body is empty");
		for (const match of raw.matchAll(/\]\(([^)]+)\)/gu)) {
			const link = match[1];
			if (/^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(link)) continue;
			const filePart = link.split("#")[0];
			if (filePart.length === 0) continue;
			const target = resolve(directory, decodeURIComponent(filePart));
			if (!target.startsWith(assetsRoot + sep)) {
				error("assets/" + entry.name + ": link escapes assets/: " + link);
				continue;
			}
			if (!existsSync(target)) error("assets/" + entry.name + ": broken link " + link);
		}
		skills.push({ name: parsed.name, description: parsed.description, directory: entry.name });
	}
}

const upstream = readJson(join(root, "upstream.json"));
if (upstream === undefined) {
	warn("upstream.json is missing; run npm run sync");
} else {
	const expected = [...(upstream.skills ?? [])].sort();
	const actual = skills.map((skill) => skill.name).sort();
	if (expected.length !== actual.length || expected.some((name, index) => name !== actual[index])) {
		error("upstream.json skills do not match assets/; run npm run sync");
	}
	if (typeof upstream.repository !== "string") warn("upstream.json: repository is missing");
}

const catalogCharacters = skills.reduce((total, skill) => total + skill.name.length + skill.description.length, 0);
const tokens = Math.ceil(catalogCharacters / 4);
console.log("validate-skills: " + skills.length + " skills, catalog " + catalogCharacters + " chars (~" + tokens + " tokens), " + errors.length + " error(s), " + warnings.length + " warning(s)");
for (const warning of warnings) console.warn("  warning: " + warning);
for (const message of errors) console.error("  error: " + message);
if (errors.length > 0) process.exit(1);
