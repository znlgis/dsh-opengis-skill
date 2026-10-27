import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { listAdaptations, COMMON_HEADING, SKILL_HEADING } from "../lib/adaptations.js";
import { hashFiles, listFiles } from "../lib/catalog.js";
import { apply, inject, name } from "../lib/index.js";
import { findMarkdownLinkProblems } from "../lib/markdown-links.js";
import { isSkillName, parseSkillFile } from "../lib/skill-file.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");

/** Register the provider against a minimal host context and return it. */
function loadProvider() {
	let created;
	const host = {
		skills: {
			registerProvider(create) {
				created = create;
				return () => {};
			}
		}
	};
	apply(host);
	assert.ok(created !== undefined, "apply must register a skill provider");
	return created({ signal: new AbortController().signal, invalidate() {} });
}

/** Read and parse one asset SKILL.md through the shared parser. */
function readParsed(candidate) {
	return parseSkillFile(readFileSync(candidate.locator, "utf8"), candidate.locator);
}

test("exposes the stable plugin identity", () => {
	assert.equal(name, "opengis-skill");
	assert.deepEqual([...inject], ["skills"]);
});

test("catalog lists every bundled GIS skill with unique kebab-case names", async () => {
	const provider = loadProvider();
	const candidates = await provider.list({ signal: new AbortController().signal });
	const directories = readdirSync(assetsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	assert.deepEqual(candidates.map((candidate) => candidate.name), directories);
	const names = candidates.map((candidate) => candidate.name);
	assert.equal(new Set(names).size, names.length, "catalog names must be unique");
	for (const candidate of candidates) {
		assert.ok(isSkillName(candidate.name), candidate.name + " must be kebab-case");
		assert.equal(candidate.description, readParsed(candidate).description);
		assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true });
		assert.equal(candidate.provider, "opengis");
		assert.equal(candidate.source, "opengis");
		assert.equal(candidate.rank, 600);
		assert.equal(candidate.path, candidate.locator);
		assert.ok(existsSync(candidate.locator), candidate.locator + " must exist");
		assert.equal(candidate.resourceBase.kind, "directory");
		assert.ok(candidate.resourceBase.path.endsWith("/" + candidate.name), candidate.resourceBase.path + " must end with the skill name");
		assert.equal(candidate.resourceBase.path.includes("\\"), false, candidate.resourceBase.path + " must use forward slashes");
		assert.equal(Object.hasOwn(candidate, "content"), false, "the catalog must not carry instruction bodies");
	}
});

test("loading returns the current body without frontmatter", async () => {
	const provider = loadProvider();
	const candidates = await provider.list({ signal: new AbortController().signal });
	for (const candidate of candidates) {
		const definition = await provider.get(candidate, { signal: new AbortController().signal });
		const parsed = readParsed(candidate);
		assert.equal(definition.name, candidate.name);
		assert.equal(definition.description, parsed.description);
		assert.ok(definition.content.startsWith(parsed.content), "the vendored body must be kept verbatim at the start");
		const guidance = definition.content.indexOf(SKILL_HEADING);
		const common = definition.content.indexOf(COMMON_HEADING);
		assert.ok(guidance > parsed.content.length - 1, "the per-skill DSH guidance must follow the body");
		assert.ok(common > guidance, "the shared DSH guidance must come last");
		assert.ok(definition.content.endsWith("\n"), "loaded content must end with a newline");
		assert.ok(!definition.content.startsWith("---"), "frontmatter must be stripped");
		assert.equal(definition.provider, "opengis");
		assert.equal(definition.source, "opengis");
		assert.equal(definition.path, candidate.locator);
		assert.deepEqual(definition.resourceBase, candidate.resourceBase);
		assert.equal(Object.hasOwn(definition, "rank"), false, "a definition must not carry the catalog rank");
	}
});

test("every bundled skill ships DSH guidance and every adaptation belongs to a skill", async () => {
	const provider = loadProvider();
	const candidates = await provider.list({ signal: new AbortController().signal });
	const files = listAdaptations(join(root, "adaptations"));
	assert.ok(files.includes("common"), "adaptations/common.md is required");
	assert.deepEqual(
		files.filter((name) => name !== "common"),
		candidates.map((candidate) => candidate.name).sort(),
		"adaptations/ must hold exactly one file per bundled skill"
	);
	for (const candidate of candidates) {
		const definition = await provider.get(candidate, { signal: new AbortController().signal });
		assert.ok(definition.content.includes(SKILL_HEADING), candidate.name + " must carry the per-skill DSH guidance");
		assert.ok(definition.content.includes(COMMON_HEADING), candidate.name + " must carry the shared DSH guidance");
	}
});

test("unknown skill names fail with a clear error", async () => {
	const provider = loadProvider();
	await assert.rejects(
		() => provider.get({ name: "does-not-exist" }, { signal: new AbortController().signal }),
		/unknown skill "does-not-exist"/u
	);
});

test("loading honors an aborted lookup signal", async () => {
	const provider = loadProvider();
	const candidates = await provider.list({ signal: new AbortController().signal });
	const controller = new AbortController();
	controller.abort();
	await assert.rejects(() => provider.get(candidates[0], { signal: controller.signal }));
});

test("every relative link in every asset markdown file resolves inside assets/", () => {
	const problems = [];
	for (const relativePath of listFiles(assetsRoot)) {
		if (!relativePath.endsWith(".md")) continue;
		const file = join(assetsRoot, relativePath);
		problems.push(...findMarkdownLinkProblems(file, readFileSync(file, "utf8"), assetsRoot));
	}
	assert.deepEqual(problems, []);
});

test("assets match the recorded upstream manifest and its SHA-256 digests", () => {
	const manifest = JSON.parse(readFileSync(join(root, "upstream.json"), "utf8"));
	const directories = readdirSync(assetsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	assert.equal(manifest.schemaVersion, 1);
	assert.equal(manifest.hashAlgorithm, "sha256");
	assert.match(manifest.commit, /^[0-9a-f]{40}$/u);
	assert.equal(manifest.skillCount, manifest.skills.length);
	assert.deepEqual(manifest.skills, directories);
	const actual = hashFiles(assetsRoot);
	const expected = manifest.files;
	assert.ok(expected !== undefined && typeof expected === "object", "upstream.json must record a SHA-256 file map; run npm run sync");
	assert.deepEqual(Object.keys(expected).sort(), Object.keys(actual));
	for (const relativePath of Object.keys(expected)) {
		assert.equal(expected[relativePath], actual[relativePath], relativePath + " digest must match upstream.json");
	}
});
