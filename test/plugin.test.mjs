import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { apply, inject, name } from "../lib/index.js";
import { isSkillName, parseSkillFile } from "../lib/skill-file.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");

/** Register the provider against a minimal host context and return it. */
function loadProvider() {
	let created;
	const disposers = [];
	const ctx = {
		effect(callback, label) {
			const disposer = callback();
			disposers.push([label, disposer]);
			return disposer;
		},
		skills: {
			registerProvider(create) {
				created = create;
				return () => {};
			}
		}
	};
	apply(ctx);
	assert.ok(created !== undefined, "apply must register a skill provider");
	return { provider: created({ signal: new AbortController().signal, invalidate() {} }), disposers };
}

test("exposes the stable plugin identity", () => {
	assert.equal(name, "opengis-skill");
	assert.deepEqual([...inject], ["skills"]);
});

test("catalog lists the bundled GIS skills with unique kebab-case names", async () => {
	const { provider, disposers } = loadProvider();
	assert.equal(disposers.length, 1);
	assert.equal(disposers[0][0], "opengis-skill: skill provider");
	const candidates = await provider.list({ signal: new AbortController().signal });
	assert.ok(candidates.length >= 32, "expected at least 32 skills, got " + candidates.length);
	const names = candidates.map((candidate) => candidate.name);
	assert.deepEqual(names, [...names].sort(), "catalog must be sorted by name");
	assert.equal(new Set(names).size, names.length, "catalog names must be unique");
	for (const candidate of candidates) {
		assert.ok(isSkillName(candidate.name), candidate.name + " must be kebab-case");
		assert.ok(candidate.description.length > 0, candidate.name + " needs a description");
		assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true });
		assert.equal(candidate.provider, "opengis");
		assert.equal(candidate.source, "opengis");
		assert.equal(candidate.rank, 600);
		assert.equal(candidate.resourceBase.kind, "directory");
		assert.ok(existsSync(candidate.locator), candidate.locator + " must exist");
		assert.ok(existsSync(candidate.resourceBase.path), candidate.resourceBase.path + " must exist");
		assert.ok(candidate.path.endsWith("SKILL.md"));
	}
});

test("loading returns the current body without frontmatter", async () => {
	const { provider } = loadProvider();
	const candidates = await provider.list({ signal: new AbortController().signal });
	for (const candidate of candidates) {
		const definition = await provider.get(candidate, { signal: new AbortController().signal });
		const parsed = parseSkillFile(readFileSync(candidate.locator, "utf8"), candidate.locator);
		assert.equal(definition.name, candidate.name);
		assert.equal(definition.content, parsed.content);
		assert.ok(definition.content.length > 0);
		assert.ok(!definition.content.startsWith("---"), "frontmatter must be stripped");
		assert.equal(definition.provider, "opengis");
		assert.equal(definition.path, candidate.locator);
	}
});

test("unknown skill names fail with a clear error", async () => {
	const { provider } = loadProvider();
	await assert.rejects(
		() => provider.get({ name: "does-not-exist" }, { signal: new AbortController().signal }),
		/unknown skill "does-not-exist"/u
	);
});

test("every relative link in every skill resolves inside assets/", async () => {
	const { provider } = loadProvider();
	const candidates = await provider.list({ signal: new AbortController().signal });
	for (const candidate of candidates) {
		const raw = readFileSync(candidate.locator, "utf8");
		const directory = candidate.locator.slice(0, candidate.locator.length - "SKILL.md".length);
		for (const match of raw.matchAll(/\]\(([^)]+)\)/gu)) {
			const link = match[1];
			if (/^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(link)) continue;
			const filePart = link.split("#")[0];
			if (filePart.length === 0) continue;
			const target = resolve(directory, decodeURIComponent(filePart));
			assert.ok(target.startsWith(assetsRoot + sep), candidate.name + ": link escapes assets/: " + link);
			assert.ok(existsSync(target), candidate.name + ": broken link " + link);
		}
	}
});

test("assets match the recorded upstream manifest", () => {
	const manifest = JSON.parse(readFileSync(join(root, "upstream.json"), "utf8"));
	const directories = readdirSync(assetsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && statSync(join(assetsRoot, entry.name, "SKILL.md"), { throwIfNoEntry: false })?.isFile() === true)
		.map((entry) => entry.name)
		.sort();
	assert.deepEqual(directories, [...manifest.skills].sort());
	assert.equal(manifest.skillCount, manifest.skills.length);
});
