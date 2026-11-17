import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readSkillCatalog } from "../lib/catalog.js";
import { keywordScores } from "../lib/taxonomy.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skills = readSkillCatalog(join(root, "assets"));
const cases = JSON.parse(readFileSync(join(root, "test", "fixtures", "routing-cases.json"), "utf8"));

/**
 * Rank the candidates for one request with the only signals the provider
 * exposes: the local trigger keywords and the Latin tokens of the upstream
 * description.
 *
 * This is a stand-in for the model's own routing decision, not a replacement.
 * It fails when a description or a keyword set stops being discriminative,
 * which is exactly what an upstream re-sync can cause.
 *
 * @param query - one request, as a user would type it.
 * @returns the candidates ordered by score, then by name.
 */
function rank(query) {
	return keywordScores(skills, query.toLowerCase())
		.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
}

test("the routing fixture covers every bundled skill exactly once per skill", () => {
	const names = new Set(skills.map((skill) => skill.name));
	const seen = new Set();
	for (const entry of cases) {
		assert.ok(names.has(entry.skill), entry.skill + " is not a bundled skill");
		assert.ok(typeof entry.query === "string" && entry.query.length > 0, entry.skill + " has an empty query");
		seen.add(entry.skill);
	}
	for (const name of names) assert.ok(seen.has(name), name + " has no routing case");
});

test("every routing case reaches its skill in the top three", () => {
	const misses = [];
	for (const entry of cases) {
		const top = rank(entry.query).slice(0, 3).map((row) => row.name);
		if (!top.includes(entry.skill)) misses.push(entry.query + " → " + top.join(", ") + " (expected " + entry.skill + ")");
	}
	assert.deepEqual(misses, []);
});

test("at least nine in ten routing cases rank their skill first", () => {
	const hits = cases.filter((entry) => rank(entry.query)[0]?.name === entry.skill).length;
	const rate = hits / cases.length;
	assert.ok(rate >= 0.9, "top-1 routing rate " + rate.toFixed(3) + " is below 0.9 (" + hits + "/" + cases.length + ")");
});

test("a request that names no skill still scores the whole catalog", () => {
	const scored = keywordScores(skills, "帮我处理一下数据");
	assert.equal(scored.length, skills.length);
});
