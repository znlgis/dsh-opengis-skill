import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
	canonicalVendoredBytes,
	hashFile,
	hashFiles,
	listFiles,
	readGeneratedSections,
	readSkillCatalog,
	readSkillEntry,
	replaceGeneratedSections,
	renderSkillCount,
	renderSkillTable,
	resourceBaseOf
} from "../lib/catalog.js";

const TICK = String.fromCharCode(96);

function makeTemp() {
	return mkdtempSync(join(tmpdir(), "opengis-catalog-"));
}

function writeSkill(root, directory, name, description) {
	mkdirSync(join(root, directory), { recursive: true });
	writeFileSync(join(root, directory, "SKILL.md"), ["---", "name: " + name, "description: " + JSON.stringify(description), "---", "", "# " + name].join("\n"));
}

test("readSkillCatalog returns validated entries sorted by name", () => {
	const root = makeTemp();
	try {
		writeSkill(root, "beta", "beta", "Beta skill.");
		writeSkill(root, "alpha", "alpha", "Alpha skill.");
		mkdirSync(join(root, "stray"));
		const skills = readSkillCatalog(root);
		assert.deepEqual(skills.map((skill) => skill.name), ["alpha", "beta"]);
		assert.equal(skills[0].description, "Alpha skill.");
		assert.equal(skills[0].path, join(root, "alpha", "SKILL.md"));
		assert.equal(readSkillEntry(join(root, "stray"), "stray"), undefined);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("readSkillCatalog rejects a missing root, an empty root, and a mismatched name", () => {
	const root = makeTemp();
	try {
		assert.throws(() => readSkillCatalog(join(root, "missing")), /skill asset directory not found/u);
		assert.throws(() => readSkillCatalog(root), /no skills found/u);
		writeSkill(root, "alpha", "beta", "Wrong name.");
		assert.throws(() => readSkillCatalog(root), /declares "beta" but its directory is "alpha"/u);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("resourceBaseOf always uses forward slashes", () => {
	assert.deepEqual(resourceBaseOf("/home/user/assets/gdal"), { kind: "directory", path: "/home/user/assets/gdal" });
	assert.deepEqual(resourceBaseOf("C:\\work\\assets\\gdal"), { kind: "directory", path: "C:/work/assets/gdal" });
});

test("renderSkillTable escapes table pipes and keeps names in code spans", () => {
	const skills = [{ name: "alpha", description: "One | two." }];
	assert.equal(
		renderSkillTable(skills),
		[
			"<!-- skills:start -->",
			"| Skill | Description (upstream frontmatter) |",
			"| --- | --- |",
			"| " + TICK + "alpha" + TICK + " | One \\| two. |",
			"<!-- skills:end -->"
		].join("\n")
	);
	assert.equal(renderSkillCount(skills), ["<!-- skills:count:start -->", "共 **1** 个技能，描述取自上游 frontmatter。", "<!-- skills:count:end -->"].join("\n"));
});

test("replaceGeneratedSections regenerates both sections and keeps the prose", () => {
	const readme = [
		"# Title",
		"<!-- skills:count:start -->",
		"old count",
		"<!-- skills:count:end -->",
		"",
		"<!-- skills:start -->",
		"| old | table |",
		"<!-- skills:end -->",
		"",
		"tail"
	].join("\n");
	const next = replaceGeneratedSections(readme, [{ name: "alpha", description: "Desc." }]);
	assert.match(next, /共 \*\*1\*\* 个技能/u);
	assert.ok(next.includes("| " + TICK + "alpha" + TICK + " | Desc. |"));
	assert.ok(next.startsWith("# Title"));
	assert.ok(next.endsWith("tail"));
	assert.equal(next.includes("old count"), false);
	assert.equal(next.includes("| old | table |"), false);
});

test("readGeneratedSections rejects missing and duplicated markers", () => {
	assert.throws(() => readGeneratedSections("# no markers"), /missing generated README marker/u);
	const duplicated = [
		"<!-- skills:count:start -->",
		"count",
		"<!-- skills:count:end -->",
		"<!-- skills:start -->",
		"table",
		"<!-- skills:end -->",
		"<!-- skills:start -->"
	].join("\n");
	assert.throws(() => readGeneratedSections(duplicated), /duplicate generated README marker/u);
});

test("canonicalVendoredBytes normalizes CRLF text and leaves binary bytes alone", () => {
	assert.deepEqual(canonicalVendoredBytes(Buffer.from("a\r\nb\r\n")), Buffer.from("a\nb\n"));
	assert.deepEqual(canonicalVendoredBytes(Buffer.from([0x61, 0x0d, 0x00, 0x62])), Buffer.from([0x61, 0x0d, 0x00, 0x62]));
	assert.deepEqual(canonicalVendoredBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x61])), Buffer.from([0xef, 0xbb, 0xbf, 0x61]));
});

test("listFiles and hashFiles describe the tree deterministically", () => {
	const root = makeTemp();
	try {
		mkdirSync(join(root, "sub"));
		writeFileSync(join(root, "b.txt"), "bravo");
		writeFileSync(join(root, "sub", "a.txt"), "alpha");
		assert.deepEqual(listFiles(root), ["b.txt", "sub/a.txt"]);
		const expected = createHash("sha256").update("alpha").digest("hex");
		assert.equal(hashFile(join(root, "sub", "a.txt")), expected);
		assert.deepEqual(hashFiles(root), { "b.txt": createHash("sha256").update("bravo").digest("hex"), "sub/a.txt": expected });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
