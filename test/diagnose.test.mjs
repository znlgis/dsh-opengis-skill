import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { degradationsOf } from "../lib/adaptations.js";
import { hashFiles, readSkillCatalog } from "../lib/catalog.js";
import { diagnose, probeHostVersion } from "../lib/diagnose.js";
import { createProvider, diagnose as exportedDiagnose, name } from "../lib/index.js";
import { parseSkillFile } from "../lib/skill-file.js";

/**
 * Fixture tests for diagnose() and the degraded-load path.
 *
 * The real package is the "good" case; every failure case is built by copying
 * one or two vendored skills into a scratch tree, so the tests never mutate the
 * repository and the SHA-256 manifest still matches the copied assets.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = join(root, "assets");
const adaptationRoot = join(root, "adaptations");

/** Skills used by the fixtures; both ship reference files and a real adaptation. */
const FIXTURE_SKILLS = ["gdal", "jts"];

/**
 * Build a scratch package tree with the given skills.
 *
 * @returns the fixture paths.
 */
function createFixture() {
	const directory = mkdtempSync(join(tmpdir(), "opengis-diagnose-"));
	const assets = join(directory, "assets");
	const adaptations = join(directory, "adaptations");
	mkdirSync(assets, { recursive: true });
	mkdirSync(adaptations, { recursive: true });
	for (const skill of FIXTURE_SKILLS) {
		cpSync(join(assetsRoot, skill), join(assets, skill), { recursive: true });
		cpSync(join(adaptationRoot, skill + ".md"), join(adaptations, skill + ".md"));
	}
	cpSync(join(adaptationRoot, "common.md"), join(adaptations, "common.md"));
	const manifestFile = join(directory, "upstream.json");
	writeManifest(directory, manifestFile);
	writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "@dsh-gis/dsh-opengis-skill", version: "0.0.0-fixture" }));
	return { directory, assets, adaptations, manifestFile };
}

/**
 * Write an integrity manifest that matches the fixture assets exactly.
 *
 * @param directory - the fixture root.
 * @param manifestFile - the manifest path to write.
 * @param mutate - optional hook that may rewrite the digest map.
 */
function writeManifest(directory, manifestFile, mutate) {
	const files = hashFiles(join(directory, "assets"));
	if (mutate !== undefined) mutate(files);
	writeFileSync(
		manifestFile,
		JSON.stringify(
			{ schemaVersion: 1, hashAlgorithm: "sha256", repository: "fixture", commit: "0".repeat(40), syncedAt: new Date().toISOString(), skillCount: FIXTURE_SKILLS.length, skills: [...FIXTURE_SKILLS].sort(), files },
			null,
			2
		)
	);
}

/** Run diagnose() against one fixture. */
function diagnoseFixture(fixture, extra = {}) {
	return diagnose({ assetRoot: fixture.assets, adaptationRoot: fixture.adaptations, manifestFile: fixture.manifestFile, packageFile: join(fixture.directory, "package.json"), ...extra });
}

test("diagnose() reports the packaged bundle as healthy", () => {
	const report = exportedDiagnose();
	const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
	assert.equal(report.provider, name);
	assert.equal(report.packageVersion, pkg.version);
	assert.equal(report.skills, 45);
	assert.equal(report.visible, 45);
	assert.deepEqual(report.missing, []);
	assert.deepEqual(report.degraded, []);
	assert.deepEqual(report.danglingRefs, []);
	assert.deepEqual(report.hashMismatch, []);
	assert.deepEqual(report.problems, []);
	assert.equal(report.healthy, true, "the packaged snapshot must pass its own diagnosis");
	assert.ok(report.hostVersionHint === null || /^\d+\.\d+\.\d+/u.test(report.hostVersionHint), "a detected host version must look like a version");
	// The token estimate follows the documented formula over visible descriptions.
	const descriptions = readSkillCatalog(assetsRoot).reduce((total, skill) => total + skill.description.length, 0);
	assert.equal(report.catalogTokens, Math.ceil(descriptions / 4));
});

test("diagnose() is JSON-serializable and never undefined", () => {
	const report = exportedDiagnose();
	const roundTrip = JSON.parse(JSON.stringify(report));
	assert.deepEqual(roundTrip, report);
	for (const [key, value] of Object.entries(report)) {
		assert.notEqual(value, undefined, key + " must not be undefined");
	}
	assert.ok(!JSON.stringify(report).includes("undefined"), "the diagnostic must be pure JSON");
});

test("a missing adaptation degrades the load instead of failing it", async () => {
	const fixture = createFixture();
	try {
		renameSync(join(fixture.adaptations, "jts.md"), join(fixture.directory, "jts.md.away"));
		const provider = createProvider({ assetRoot: fixture.assets, adaptationRoot: fixture.adaptations });
		const candidates = await provider.list({});
		const candidate = candidates.find((entry) => entry.name === "jts");
		const definition = await provider.get(candidate, {});
		assert.ok(definition !== undefined, "a skill with missing guidance must still load");
		const parsed = parseSkillFile(readFileSync(join(fixture.assets, "jts", "SKILL.md"), "utf8"), join(fixture.assets, "jts", "SKILL.md"));
		assert.ok(definition.content.startsWith(parsed.content.trimEnd()), "the upstream body must stay in the loaded content");
		assert.ok(definition.content.includes("## DeepSeek Harness 通用约定"), "the shared guidance must still be appended");
		assert.equal(definition.content.includes("## DeepSeek Harness 使用建议"), false, "no per-skill guidance exists to append");
		const report = diagnoseFixture(fixture);
		assert.deepEqual(report.degraded, [{ skill: "jts", reason: "adaptation-missing" }]);
		assert.equal(report.healthy, false);
		assert.deepEqual(degradationsOf(fixture.adaptations), [{ skill: "jts", reason: "adaptation-missing" }]);
		// The other skill is unaffected.
		const gdal = await provider.get(candidates.find((entry) => entry.name === "gdal"), {});
		assert.ok(gdal.content.includes("## DeepSeek Harness 使用建议"));
	} finally {
		rmSync(fixture.directory, { recursive: true, force: true });
	}
});

test("a malformed adaptation still fails the load and is reported as a problem", async () => {
	const fixture = createFixture();
	try {
		writeFileSync(join(fixture.adaptations, "jts.md"), "## 错误的标题\n\n- **加载与引用**：x\n");
		const provider = createProvider({ assetRoot: fixture.assets, adaptationRoot: fixture.adaptations });
		const candidates = await provider.list({});
		await assert.rejects(() => provider.get(candidates.find((entry) => entry.name === "jts"), {}), /must start with/u);
		const report = diagnoseFixture(fixture);
		assert.equal(report.degraded.length, 0, "a malformed file is a packaging error, not a degradation");
		assert.ok(report.problems.some((problem) => problem.includes("adaptations/jts.md")), "the malformed file must be named in problems");
	} finally {
		rmSync(fixture.directory, { recursive: true, force: true });
	}
});

test("a SHA-256 mismatch against upstream.json is reported", () => {
	const fixture = createFixture();
	try {
		writeManifest(fixture.directory, fixture.manifestFile, (files) => {
			files["gdal/SKILL.md"] = "0".repeat(64);
		});
		const report = diagnoseFixture(fixture);
		assert.deepEqual(report.hashMismatch, ["assets/gdal/SKILL.md"]);
		assert.equal(report.healthy, false);
	} finally {
		rmSync(fixture.directory, { recursive: true, force: true });
	}
});

test("a skill listed by upstream.json but missing from assets/ is reported", () => {
	const fixture = createFixture();
	try {
		const manifest = JSON.parse(readFileSync(fixture.manifestFile, "utf8"));
		manifest.skills = [...manifest.skills, "ghost"];
		manifest.skillCount = manifest.skills.length;
		writeFileSync(fixture.manifestFile, JSON.stringify(manifest, null, 2));
		const report = diagnoseFixture(fixture);
		assert.deepEqual(report.missing, ["ghost"]);
		assert.equal(report.healthy, false);
	} finally {
		rmSync(fixture.directory, { recursive: true, force: true });
	}
});

test("dangling skill references are reported as {from, ref}", () => {
	const fixture = createFixture();
	try {
		const file = join(fixture.adaptations, "gdal.md");
		writeFileSync(file, readFileSync(file, "utf8") + "\n加载 `no-such-skill` 之前先确认它还在包里。\n");
		const report = diagnoseFixture(fixture);
		assert.ok(
			report.danglingRefs.some((entry) => entry.from === "adaptations/gdal.md" && entry.ref === "no-such-skill"),
			"the fabricated reference must be reported"
		);
		assert.ok(
			report.danglingRefs.every((entry) => entry.from.startsWith("adaptations/") && typeof entry.ref === "string" && entry.ref.length > 0),
			"every dangling entry must name its source and its target"
		);
		assert.equal(report.healthy, false);
	} finally {
		rmSync(fixture.directory, { recursive: true, force: true });
	}
});

test("an entirely broken installation still returns a diagnostic instead of throwing", () => {
	const directory = mkdtempSync(join(tmpdir(), "opengis-diagnose-broken-"));
	try {
		const report = diagnose({ assetRoot: join(directory, "missing-assets"), adaptationRoot: join(directory, "missing-adaptations"), manifestFile: join(directory, "missing-upstream.json"), packageFile: join(directory, "missing-package.json") });
		assert.equal(report.healthy, false);
		assert.equal(report.skills, 0);
		assert.equal(report.visible, 0);
		assert.equal(report.packageVersion, "0.0.0");
		assert.ok(report.problems.length > 0, "failures must surface as diagnostic problems");
		assert.ok(report.problems.some((problem) => problem.includes("assets/")));
		assert.ok(report.hashMismatch.length > 0, "an unreadable manifest is reported through hashMismatch");
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test("an invalid plugin config is a problem, not a crash", () => {
	const report = diagnose({ config: { scenario: "webb" } });
	assert.equal(report.visible, 0);
	assert.equal(report.healthy, true, "healthy only follows the four contract arrays");
	assert.ok(report.problems.some((problem) => problem.includes("unknown scenario")));
});

test("probeHostVersion reads an explicit environment override and gives up cleanly", () => {
	assert.equal(probeHostVersion({ environment: { DSH_VERSION: "9.9.9" }, platform: "freebsd" }), "9.9.9");
	assert.equal(probeHostVersion({ environment: { DSH_HOST_VERSION: "0.2.2-rc.5" }, platform: "freebsd" }), "0.2.2-rc.5");
	assert.equal(probeHostVersion({ environment: {}, platform: "freebsd" }), null, "without a Harness installation the probe returns null");
	const host = probeHostVersion();
	assert.ok(host === null || /^\d+\.\d+\.\d+/u.test(host), "the real probe must return a version or null");
});

test("diagnose() covers the whole catalog, not just the visible slice", () => {
	const fixture = createFixture();
	try {
		const report = diagnoseFixture(fixture, { config: { skills: ["gdal"] } });
		assert.equal(report.skills, FIXTURE_SKILLS.length);
		assert.equal(report.visible, 1);
	} finally {
		rmSync(fixture.directory, { recursive: true, force: true });
	}
});
