import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readSkillCatalog } from "../lib/catalog.js";
import {
	GROUP_IDS,
	groupsOf,
	keywordsOf,
	normalizeSelection,
	selectSkills,
	taxonomyProblems
} from "../lib/taxonomy.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skills = readSkillCatalog(join(root, "assets"));
const names = skills.map((skill) => skill.name);

test("the taxonomy covers the catalog exactly", () => {
	assert.deepEqual(taxonomyProblems(names), []);
});

test("every skill carries at least three distinct keywords in request wording", () => {
	for (const name of names) {
		const keywords = keywordsOf(name);
		assert.ok(keywords.length >= 3, name + " needs at least three keywords");
		assert.equal(new Set(keywords).size, keywords.length, name + " repeats a keyword");
		for (const keyword of keywords) {
			assert.ok(keyword.trim().length > 0, name + " has an empty keyword");
			assert.equal(keyword, keyword.trim(), name + " keyword \"" + keyword + "\" has stray whitespace");
		}
	}
});

test("every group is non-empty and every skill belongs to a known group", () => {
	for (const name of names) {
		const groups = groupsOf(name);
		assert.ok(groups.length >= 1, name + " has no group");
		for (const group of groups) assert.ok(GROUP_IDS.includes(group), name + " names unknown group " + group);
	}
	for (const group of GROUP_IDS) {
		assert.ok(names.some((name) => groupsOf(name).includes(group)), "group " + group + " has no members");
	}
});

test("normalizeSelection rejects unknown names instead of ignoring them", () => {
	assert.deepEqual(normalizeSelection(undefined, skills), { groups: [], only: [], exclude: [] });
	assert.deepEqual(normalizeSelection({ groups: ["data"], exclude: ["gdal"] }, skills), {
		groups: ["data"],
		only: [],
		exclude: ["gdal"]
	});
	assert.throws(() => normalizeSelection({ groups: ["nope"] }, skills), /unknown group "nope"/u);
	assert.throws(() => normalizeSelection({ skills: ["nope"] }, skills), /unknown skill "nope"/u);
	assert.throws(() => normalizeSelection({ exclude: ["nope"] }, skills), /unknown skill "nope"/u);
	assert.throws(() => normalizeSelection({ groups: "data" }, skills), /must be an array/u);
	assert.throws(() => normalizeSelection({ skills: [""] }, skills), /must be an array/u);
});

test("selectSkills unions groups, lets skills win, and applies exclude last", () => {
	const byGroup = selectSkills(skills, normalizeSelection({ groups: ["desktop"] }, skills));
	assert.ok(byGroup.length > 0);
	assert.ok(byGroup.every((skill) => groupsOf(skill.name).includes("desktop")));

	const union = selectSkills(skills, normalizeSelection({ groups: ["desktop", "meta"] }, skills));
	assert.ok(union.some((skill) => skill.name === "qgis-process"));
	assert.ok(union.some((skill) => skill.name === "opengis-all"));

	const explicit = selectSkills(skills, normalizeSelection({ groups: ["desktop"], skills: ["shapely"] }, skills));
	assert.deepEqual(explicit.map((skill) => skill.name), ["shapely"], "an explicit allow list wins over groups");

	const excluded = selectSkills(skills, normalizeSelection({ groups: ["desktop"], exclude: ["qgis-process"] }, skills));
	assert.equal(excluded.some((skill) => skill.name === "qgis-process"), false);

	assert.throws(
		() => selectSkills(skills, normalizeSelection({ groups: ["desktop"], exclude: ["qgis-process", "pyqgis", "geolibre"] }, skills)),
		/selects no skill/u
	);
});

test("the selection keeps the catalog order", () => {
	const selected = selectSkills(skills, normalizeSelection({ groups: ["data", "web"] }, skills));
	const catalogOrder = names.filter((name) => selected.some((skill) => skill.name === name));
	assert.deepEqual(selected.map((skill) => skill.name), catalogOrder);
});
