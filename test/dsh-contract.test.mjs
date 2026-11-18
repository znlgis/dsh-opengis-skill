import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { apply, createProvider, inject, name } from "../lib/index.js";

/**
 * Contract regression tests for the DeepSeek Harness skill registry.
 *
 * The registry validates every candidate and definition at runtime and throws
 * on a malformed field, which turns one bad entry into a broken skill catalog
 * for the whole session. These tests mirror the rules enforced by
 * "@deepseek-ai/dsh-skill" 0.2.2-rc.5 ("validateCandidate" and
 * "validateDefinition") against the real packaged catalog, so a change here
 * fails in "npm test" instead of in an installed host.
 *
 * The mirrored rules are: kebab-case name, non-empty string description,
 * boolean invocation policy, string source and provider, finite rank,
 * provider equal to the registered provider name, any opaque locator, optional
 * string path, optional string whenToUse, and a definition whose name matches
 * the candidate and whose content is a string.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** Mirror the registry's candidate validation for one provider. */
function assertValidCandidate(candidate, providerName) {
	assert.equal(typeof candidate.name, "string", "candidate name must be a string");
	assert.ok(SKILL_NAME.test(candidate.name), candidate.name + " must be kebab-case");
	assert.equal(typeof candidate.description, "string", candidate.name + " description must be a string");
	assert.ok(candidate.description.length > 0, candidate.name + " needs a non-empty description");
	assert.equal(typeof candidate.invocation?.modelInvocable, "boolean", candidate.name + " invocation.modelInvocable must be boolean");
	assert.equal(typeof candidate.invocation?.userInvocable, "boolean", candidate.name + " invocation.userInvocable must be boolean");
	assert.equal(typeof candidate.source, "string", candidate.name + " source must be a string");
	assert.equal(typeof candidate.provider, "string", candidate.name + " provider must be a string");
	assert.equal(candidate.provider, providerName, candidate.name + " must report its owning provider");
	assert.equal(typeof candidate.rank, "number", candidate.name + " rank must be a number");
	assert.ok(Number.isFinite(candidate.rank), candidate.name + " rank must be finite");
	// The locator is the registry's opaque provider-owned handle: any type is
	// legal, and this pack uses the absolute SKILL.md path.
	assert.notEqual(candidate.locator, undefined, candidate.name + " needs an opaque locator");
	if (candidate.path !== undefined) assert.equal(typeof candidate.path, "string", candidate.name + " path must be a string");
	if (candidate.whenToUse !== undefined) assert.equal(typeof candidate.whenToUse, "string", candidate.name + " whenToUse must be a string");
	if (candidate.resourceBase !== undefined) {
		assert.ok(["directory", "url", "opaque"].includes(candidate.resourceBase.kind), candidate.name + " resourceBase.kind must be a known variant");
		if (candidate.resourceBase.kind === "directory") assert.equal(typeof candidate.resourceBase.path, "string", candidate.name + " resourceBase.path must be a string");
	}
}

/** Mirror the registry's definition validation for one loaded skill. */
function assertValidDefinition(definition, candidate) {
	assert.equal(typeof definition.name, "string", "definition name must be a string");
	assert.ok(SKILL_NAME.test(definition.name), definition.name + " must be kebab-case");
	assert.equal(definition.name, candidate.name, "the definition must keep the candidate name");
	assert.equal(typeof definition.description, "string", definition.name + " description must be a string");
	assert.ok(definition.description.length > 0, definition.name + " needs a non-empty description");
	assert.equal(typeof definition.invocation?.modelInvocable, "boolean", definition.name + " invocation.modelInvocable must be boolean");
	assert.equal(typeof definition.invocation?.userInvocable, "boolean", definition.name + " invocation.userInvocable must be boolean");
	assert.equal(typeof definition.source, "string", definition.name + " source must be a string");
	assert.equal(typeof definition.provider, "string", definition.name + " provider must be a string");
	assert.equal(typeof definition.content, "string", definition.name + " content must be a string");
	if (definition.path !== undefined) assert.equal(typeof definition.path, "string", definition.name + " path must be a string");
}

test("the provider identity follows the Cordis loader contract", () => {
	assert.equal(name, "opengis-skill");
	assert.deepEqual([...inject], ["skills"], "the plugin must depend on the skill registry");
	assert.equal(typeof apply, "function", "the loader calls apply(ctx, config)");
	assert.equal(typeof createProvider, "function");
});

test("registration is synchronous and borrows the registry control signal", () => {
	let created;
	const control = { signal: new AbortController().signal, invalidate() {} };
	const host = {
		skills: {
			registerProvider(create) {
				created = create(control);
				return () => {};
			}
		}
	};
	apply(host, { groups: ["web"] });
	assert.ok(created !== undefined, "apply must register exactly one provider synchronously");
	assert.equal(created.name, "opengis");
	assert.equal(typeof created.list, "function");
	assert.equal(typeof created.get, "function");
});

test("list() resolves the complete-array shorthand the registry accepts", async () => {
	const provider = createProvider();
	const listed = await provider.list({ signal: new AbortController().signal });
	assert.ok(Array.isArray(listed), "an array is the registry's complete-discovery shorthand");
	assert.ok(listed.length === 45, "the packaged catalog ships 45 skills");
	assert.equal(listed.filter((candidate) => candidate.provider !== "opengis").length, 0);
});

test("every candidate satisfies the registry validation rules", async () => {
	const provider = createProvider();
	const listed = await provider.list({});
	for (const candidate of listed) assertValidCandidate(candidate, provider.name);
});

test("every definition satisfies the registry validation rules", async () => {
	const provider = createProvider();
	for (const candidate of await provider.list({})) {
		const definition = await provider.get(candidate, {});
		assert.ok(definition !== undefined, candidate.name + " must load");
		assertValidDefinition(definition, candidate);
	}
});

test("list() hands out a fresh array so a consumer cannot corrupt the catalog", async () => {
	const provider = createProvider();
	const first = await provider.list({});
	const second = await provider.list({});
	assert.notEqual(first, second, "each call must return its own array");
	first.length = 0;
	const third = await provider.list({});
	assert.equal(third.length, 45, "mutating a returned array must not shrink the catalog");
	assert.equal(Object.isFrozen(third[0]), true, "the candidates themselves stay frozen");
});

test("get() resolves undefined for a candidate this provider never listed", async () => {
	const provider = createProvider();
	assert.equal(await provider.get({ name: "not-a-bundled-skill" }, {}), undefined);
});

test("get() resolves undefined for a skill the selection removed", async () => {
	const provider = createProvider({ config: { groups: ["web"] } });
	assert.equal(await provider.get({ name: "gdal" }, {}), undefined);
});
