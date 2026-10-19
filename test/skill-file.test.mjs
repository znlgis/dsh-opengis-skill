import assert from "node:assert/strict";
import test from "node:test";
import { isSkillName, parseSkillFile } from "../lib/skill-file.js";

const QUOTED = String.raw`---
name: gdal
description: "Use when processing raster — with an escaped \"quote\" and unicode \u00e9."
tags:
  - gis
  - raster
---

# GDAL

Body line.
`;

test("parses a single-line quoted description and strips the frontmatter", () => {
	const parsed = parseSkillFile(QUOTED, "gdal/SKILL.md");
	assert.equal(parsed.name, "gdal");
	assert.equal(parsed.description, 'Use when processing raster — with an escaped "quote" and unicode é.');
	assert.equal(parsed.content, "# GDAL\n\nBody line.");
});

test("strips a UTF-8 BOM before reading the frontmatter", () => {
	const parsed = parseSkillFile("\uFEFF" + QUOTED, "bom/SKILL.md");
	assert.equal(parsed.name, "gdal");
	assert.equal(parsed.content, "# GDAL\n\nBody line.");
});

test("accepts CRLF line endings and normalizes the body to LF", () => {
	const parsed = parseSkillFile(QUOTED.replaceAll("\n", "\r\n"), "crlf/SKILL.md");
	assert.equal(parsed.name, "gdal");
	assert.equal(parsed.description, 'Use when processing raster — with an escaped "quote" and unicode é.');
	assert.equal(parsed.content, "# GDAL\n\nBody line.");
});

test("parses single-quoted scalars with doubled quotes", () => {
	const raw = String.raw`---
name: single-quoted
description: 'It''s a single-quoted ''description''.'
---

body
`;
	const parsed = parseSkillFile(raw, "single-quoted/SKILL.md");
	assert.equal(parsed.description, "It's a single-quoted 'description'.");
});

test("parses plain scalars and drops a trailing comment", () => {
	const raw = String.raw`---
name: plain
description: Plain description with a colon: and dashes. # ignored comment
---

body
`;
	const parsed = parseSkillFile(raw, "plain/SKILL.md");
	assert.equal(parsed.description, "Plain description with a colon: and dashes.");
});

test("rejects missing frontmatter", () => {
	assert.throws(() => parseSkillFile("# no frontmatter\n", "bad/SKILL.md"), /missing YAML frontmatter/u);
});

test("rejects a non-kebab-case name", () => {
	const raw = "---\nname: Bad_Name\ndescription: d\n---\nbody";
	assert.throws(() => parseSkillFile(raw, "bad/SKILL.md"), /"name" must be kebab-case/u);
});

test("rejects a missing or empty description", () => {
	assert.throws(() => parseSkillFile("---\nname: valid\n---\nbody", "missing/SKILL.md"), /"description" is required/u);
	assert.throws(() => parseSkillFile('---\nname: valid\ndescription: ""\n---\nbody', "empty/SKILL.md"), /"description" is required/u);
});

test("rejects unterminated quoted scalars", () => {
	const raw = '---\nname: valid\ndescription: "unterminated\n---\nbody';
	assert.throws(() => parseSkillFile(raw, "unterminated/SKILL.md"), /malformed or unterminated double-quoted scalar/u);
});

test("rejects block scalars instead of silently truncating them", () => {
	const raw = "---\nname: block\ndescription: >-\n  folded text\n---\nbody";
	assert.throws(() => parseSkillFile(raw, "block/SKILL.md"), /multi-line block scalars are not supported/u);
});

test("rejects unsupported escape sequences", () => {
	const raw = String.raw`---
name: bad-escape
description: "bad \q escape"
---

body
`;
	assert.throws(() => parseSkillFile(raw, "bad-escape/SKILL.md"), /unsupported escape sequence/u);
});

test("isSkillName accepts only the public kebab-case grammar", () => {
	assert.equal(isSkillName("gdal"), true);
	assert.equal(isSkillName("mapbox-gl-js"), true);
	assert.equal(isSkillName("Gdal"), false);
	assert.equal(isSkillName("gdal_"), false);
	assert.equal(isSkillName("-gdal"), false);
	assert.equal(isSkillName(42), false);
});
