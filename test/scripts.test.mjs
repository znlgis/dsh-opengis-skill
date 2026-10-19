import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const COPIED_ENTRIES = [
	"package.json",
	"README.md",
	"THIRD_PARTY_NOTICES.md",
	"CHANGELOG.md",
	"LICENSE",
	".editorconfig",
	"cordis.patch.yml",
	"icon.svg",
	"upstream.json",
	"assets",
	"lib",
	"locale",
	"scripts"
];

function runNode(script, args, cwd) {
	return spawnSync(node, [script, ...args], { cwd, encoding: "utf8" });
}

/** Copy the files validate-skills.mjs reads into a scratch directory. */
function copyRepository(destination) {
	for (const entry of COPIED_ENTRIES) {
		const from = join(root, entry);
		if (!existsSync(from)) continue;
		cpSync(from, join(destination, entry), { recursive: true });
	}
}

test("validate-skills passes on the repository", () => {
	const result = runNode(join(root, "scripts", "validate-skills.mjs"), [], root);
	assert.equal(result.status, 0, result.stdout + result.stderr);
	assert.match(result.stdout, /validate-skills:/u);
});

test("validate-skills rejects a modified vendored asset", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-validate-"));
	try {
		copyRepository(scratch);
		const asset = join(scratch, "assets", "gdal", "SKILL.md");
		writeFileSync(asset, readFileSync(asset, "utf8") + "\n");
		const result = runNode(join(scratch, "scripts", "validate-skills.mjs"), [], scratch);
		assert.notEqual(result.status, 0, "a modified asset must fail validation");
		assert.match(result.stdout + result.stderr, /gdal[\\/]SKILL\.md/u);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

test("validate-skills rejects a manually damaged README skill table", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-validate-readme-"));
	try {
		copyRepository(scratch);
		const readme = join(scratch, "README.md");
		writeFileSync(readme, readFileSync(readme, "utf8").replace("<!-- skills:count:end -->", ""));
		const result = runNode(join(scratch, "scripts", "validate-skills.mjs"), [], scratch);
		assert.notEqual(result.status, 0, "a missing generated README marker must fail validation");
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

test("validate-skills rejects a stray file at the assets root", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-validate-stray-"));
	try {
		copyRepository(scratch);
		writeFileSync(join(scratch, "assets", "stray.txt"), "stray");
		const result = runNode(join(scratch, "scripts", "validate-skills.mjs"), [], scratch);
		assert.notEqual(result.status, 0, "a stray asset-root file must fail validation");
		assert.match(result.stdout + result.stderr, /unexpected file at the assets root/u);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

const upstreamCheckout = process.env.OPENGIS_SKILLS_DIR === undefined
	? resolve(root, "..", "opengis-skills")
	: resolve(process.env.OPENGIS_SKILLS_DIR);
const manifestCommit = JSON.parse(readFileSync(join(root, "upstream.json"), "utf8")).commit;

/**
 * Decide whether the adjacent checkout can back the pinned sync tests: it must
 * contain gis/, be a clean git checkout, and its HEAD must equal the recorded
 * upstream commit. A publisher's unrelated sibling checkout then skips the
 * tests instead of failing the release.
 *
 * @returns false when the tests can run, otherwise the skip reason.
 */
function upstreamSkipReason() {
	try {
		if (!existsSync(join(upstreamCheckout, "gis"))) return "no opengis-skills checkout";
		const head = execFileSync("git", ["-C", upstreamCheckout, "rev-parse", "HEAD"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"]
		}).trim();
		if (head !== manifestCommit) return "adjacent checkout HEAD does not match upstream.json";
		const dirty = execFileSync("git", ["-C", upstreamCheckout, "status", "--porcelain"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"]
		}).trim();
		if (dirty.length > 0) return "adjacent checkout has uncommitted changes";
		return false;
	} catch {
		return "adjacent checkout is not a git working tree";
	}
}

const upstreamSkip = upstreamSkipReason();

test(
	"sync --check matches the adjacent opengis-skills checkout",
	{ skip: upstreamSkip },
	() => {
		const result = runNode(join(root, "scripts", "sync-opengis-skills.mjs"), ["--check", "--from", upstreamCheckout], root);
		assert.equal(result.status, 0, result.stdout + result.stderr);
	}
);

test(
	"sync --check detects a vendored file rewritten with CRLF",
	{ skip: upstreamSkip },
	() => {
		const scratch = mkdtempSync(join(tmpdir(), "opengis-sync-check-"));
		try {
			copyRepository(scratch);
			const asset = join(scratch, "assets", "gdal", "SKILL.md");
			writeFileSync(asset, readFileSync(asset, "utf8").replaceAll("\n", "\r\n"));
			const result = runNode(join(scratch, "scripts", "sync-opengis-skills.mjs"), ["--check", "--from", upstreamCheckout], scratch);
			assert.notEqual(result.status, 0, "a vendored CRLF rewrite must fail sync --check");
			assert.match(result.stdout + result.stderr, /differs from upstream/u);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}
);

const gitAvailable = spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;

test(
	"sync write mode normalizes CRLF text, keeps binary bytes, and records provenance",
	{ skip: gitAvailable ? false : "git is required to create the fixture checkout" },
	() => {
		const scratch = mkdtempSync(join(tmpdir(), "opengis-sync-write-"));
		const upstream = mkdtempSync(join(tmpdir(), "opengis-upstream-"));
		try {
			copyRepository(scratch);
			mkdirSync(join(upstream, "gis", "alpha", "reference"), { recursive: true });
			writeFileSync(
				join(upstream, "gis", "alpha", "SKILL.md"),
				"---\r\nname: alpha\r\ndescription: \"Alpha skill.\"\r\n---\r\n\r\n# Alpha\r\n"
			);
			writeFileSync(join(upstream, "gis", "alpha", "reference", "binary.bin"), Buffer.from([0x00, 0x0d, 0x0a, 0x01]));
			execFileSync("git", ["init", "-q"], { cwd: upstream });
			execFileSync("git", ["add", "."], { cwd: upstream });
			execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "fixture"], { cwd: upstream });
			const sync = runNode(join(scratch, "scripts", "sync-opengis-skills.mjs"), ["--from", upstream], scratch);
			assert.equal(sync.status, 0, sync.stdout + sync.stderr);
			const skill = readFileSync(join(scratch, "assets", "alpha", "SKILL.md"));
			assert.equal(skill.includes(0x0d), false, "text files must be vendored with LF endings");
			assert.deepEqual(
				readFileSync(join(scratch, "assets", "alpha", "reference", "binary.bin")),
				Buffer.from([0x00, 0x0d, 0x0a, 0x01])
			);
			const manifest = JSON.parse(readFileSync(join(scratch, "upstream.json"), "utf8"));
			assert.match(manifest.commit, /^[0-9a-f]{40}$/u);
			assert.equal(manifest.skillCount, 1);
			assert.deepEqual(Object.keys(manifest.files).sort(), ["alpha/SKILL.md", "alpha/reference/binary.bin"]);
			assert.match(readFileSync(join(scratch, "README.md"), "utf8"), /共 \*\*1\*\* 个技能/u);
			const validate = runNode(join(scratch, "scripts", "validate-skills.mjs"), [], scratch);
			assert.equal(validate.status, 0, validate.stdout + validate.stderr);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
			rmSync(upstream, { recursive: true, force: true });
		}
	}
);

test("sync refuses a non-git source and upstream directories without SKILL.md", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-sync-guard-"));
	const upstream = mkdtempSync(join(tmpdir(), "opengis-upstream-guard-"));
	try {
		copyRepository(scratch);
		mkdirSync(join(upstream, "gis", "alpha"), { recursive: true });
		writeFileSync(join(upstream, "gis", "alpha", "SKILL.md"), "---\nname: alpha\ndescription: \"Alpha skill.\"\n---\n\n# Alpha\n");
		const before = readFileSync(join(scratch, "upstream.json"), "utf8");
		const nonGit = runNode(join(scratch, "scripts", "sync-opengis-skills.mjs"), ["--from", upstream], scratch);
		assert.notEqual(nonGit.status, 0, "sync write mode must refuse a source that is not a git checkout root");
		assert.match(nonGit.stdout + nonGit.stderr, /not a git checkout root/u);
		assert.equal(readFileSync(join(scratch, "upstream.json"), "utf8"), before, "a refused sync must not mutate the manifest");
		mkdirSync(join(upstream, "gis", "broken"), { recursive: true });
		writeFileSync(join(upstream, "gis", "broken", "notes.md"), "no skill here");
		const missing = runNode(join(scratch, "scripts", "sync-opengis-skills.mjs"), ["--check", "--from", upstream], scratch);
		assert.notEqual(missing.status, 0, "a gis/ directory without SKILL.md must fail sync");
		assert.match(missing.stdout + missing.stderr, /missing SKILL\.md/u);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
		rmSync(upstream, { recursive: true, force: true });
	}
});

test(
	"sync never inherits the HEAD of an enclosing repository",
	{ skip: gitAvailable ? false : "git is required to create the enclosing checkout" },
	() => {
		const scratch = mkdtempSync(join(tmpdir(), "opengis-sync-nested-"));
		try {
			copyRepository(scratch);
			execFileSync("git", ["init", "-q"], { cwd: scratch });
			const nested = join(scratch, "nested-upstream");
			mkdirSync(join(nested, "gis", "alpha"), { recursive: true });
			writeFileSync(join(nested, "gis", "alpha", "SKILL.md"), "---\nname: alpha\ndescription: \"Alpha skill.\"\n---\n\n# Alpha\n");
			const before = readFileSync(join(scratch, "upstream.json"), "utf8");
			const result = runNode(join(scratch, "scripts", "sync-opengis-skills.mjs"), ["--from", nested], scratch);
			assert.notEqual(result.status, 0, "a plain copy nested inside another repository must be rejected");
			assert.match(result.stdout + result.stderr, /not a git checkout root/u);
			assert.equal(readFileSync(join(scratch, "upstream.json"), "utf8"), before, "the enclosing repository HEAD must never be recorded");
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}
);
