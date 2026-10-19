import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
	findMarkdownLinkProblems,
	isInsideDirectory,
	relativeMarkdownLinks,
	resolveMarkdownLink
} from "../lib/markdown-links.js";

test("relativeMarkdownLinks keeps relative file targets only", () => {
	const markdown = [
		"[a](./a.md)",
		"[b](https://example.com/b.md)",
		"[c](#section)",
		"[d](reference/data.md#top)",
		"[e](mailto:someone@example.com)",
		"[f](  spaces.md  )"
	].join("\n");
	assert.deepEqual(relativeMarkdownLinks(markdown), ["./a.md", "reference/data.md#top", "spaces.md"]);
});

test("resolveMarkdownLink resolves relative and fragment links lexically", () => {
	const fromFile = join("/tmp", "docs", "README.md");
	const expected = resolve("/tmp/docs", "sub", "a.md");
	assert.deepEqual(resolveMarkdownLink(fromFile, "sub/a.md"), { path: expected, fragment: "" });
	assert.deepEqual(resolveMarkdownLink(fromFile, "sub/a.md#part"), { path: expected, fragment: "part" });
	assert.deepEqual(resolveMarkdownLink(fromFile, "#part"), { path: fromFile, fragment: "part" });
	assert.deepEqual(resolveMarkdownLink(fromFile, "a%20b.md"), { path: resolve("/tmp/docs", "a b.md"), fragment: "" });
	assert.throws(() => resolveMarkdownLink(fromFile, "bad%E0%A4%A.md"), /invalid URL encoding/u);
});

test("isInsideDirectory rejects escape and sibling-prefix paths", () => {
	const root = join("/tmp", "assets");
	assert.equal(isInsideDirectory(root, join(root, "a", "b.md")), true);
	assert.equal(isInsideDirectory(root, root), true);
	assert.equal(isInsideDirectory(root, join("/tmp", "assets2", "b.md")), false);
	assert.equal(isInsideDirectory(root, join("/tmp", "assets", "..", "b.md")), false);
});

test("findMarkdownLinkProblems reports missing, escaping, and malformed links", () => {
	const root = mkdtempSync(join(tmpdir(), "opengis-links-"));
	try {
		mkdirSync(join(root, "reference"));
		writeFileSync(join(root, "reference", "ok.md"), "# ok");
		const fromFile = join(root, "SKILL.md");
		const markdown = [
			"[ok](reference/ok.md)",
			"[missing](reference/missing.md)",
			"[escape](../../outside.md)",
			"[malformed](bad%E0%A4%A.md)",
			"[anchor](#top)"
		].join("\n");
		const problems = findMarkdownLinkProblems(fromFile, markdown, root);
		assert.equal(problems.length, 3);
		assert.match(problems[0], /broken link reference\/missing\.md/u);
		assert.match(problems[1], /link escapes/u);
		assert.match(problems[2], /invalid URL encoding/u);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
