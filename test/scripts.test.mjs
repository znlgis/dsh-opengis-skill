import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
	"adaptations",
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

/**
 * Reconcile the copied DSH adaptation layer with a fixture's assets/ directory:
 * drop files for skills the fixture no longer has and synthesize a minimal file
 * for skills that arrived without one. A fixture that swaps the assets for a
 * one-skill checkout would otherwise carry one orphan adaptation per skill.
 *
 * @param destination - the scratch repository root.
 */
function pruneAdaptations(destination) {
	const directory = join(destination, "adaptations");
	mkdirSync(directory, { recursive: true });
	const skills = existsSync(join(destination, "assets"))
		? readdirSync(join(destination, "assets"), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
		: [];
	const keep = new Set(["common.md", ...skills.map((name) => name + ".md")]);
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (!entry.isFile() || keep.has(entry.name)) continue;
		rmSync(join(directory, entry.name), { force: true });
	}
	for (const name of skills) {
		if (existsSync(join(directory, name + ".md"))) continue;
		writeFileSync(join(directory, name + ".md"), syntheticAdaptation(name));
	}
}

/**
 * Build a structurally valid adaptation for a fixture skill that has no real
 * guidance file, so validate-skills.mjs exercises its asset checks rather than
 * failing on the adaptation layer.
 *
 * @param name - the fixture skill name.
 * @returns the Markdown text of the synthetic guidance.
 */
function syntheticAdaptation(name) {
	return [
		"## DeepSeek Harness 使用建议",
		"",
		"- **加载与引用**：用 \`skill\` 按名 \`" + name + "\` 加载，参考文件按 Base directory 相对读取。",
		"- **执行环境**：命令走 \`ops_bash\`，Windows 原生命令走 \`pwsh\`。",
		"- **先探测版本**：先跑 \`--version\` 确认工具可用，再按版本挑命令。",
		"- **验证产物**：用 \`read\` 重新打开输出文件核对元数据，不要只看退出码。",
		"- **风险与权限**：覆盖、删除、安装与使用凭据前先向用户确认。",
		"",
		"这是测试夹具生成的占位适配文件，只用于让校验脚本走完资产检查；内容长度足以通过结构阈值，且不含任何真实建议。".repeat(20)
	].join("\n");
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

test("validate-skills rejects a missing DSH adaptation", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-validate-adapt-"));
	try {
		copyRepository(scratch);
		rmSync(join(scratch, "adaptations", "gdal.md"));
		const result = runNode(join(scratch, "scripts", "validate-skills.mjs"), [], scratch);
		assert.notEqual(result.status, 0, "a missing adaptation must fail validation");
		assert.match(result.stdout + result.stderr, /adaptations\/gdal\.md: missing DSH guidance/u);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

test("validate-skills rejects an adaptation citing a file the skill does not ship", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-validate-cite-"));
	try {
		copyRepository(scratch);
		const file = join(scratch, "adaptations", "gdal.md");
		writeFileSync(file, readFileSync(file, "utf8").replace("reference/vector-tools.md", "reference/does-not-exist.md"));
		const result = runNode(join(scratch, "scripts", "validate-skills.mjs"), [], scratch);
		assert.notEqual(result.status, 0, "a dangling reference citation must fail validation");
		assert.match(result.stdout + result.stderr, /cites reference\/does-not-exist\.md/u);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

test("validate-skills rejects an illegal frontmatter field", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-validate-field-"));
	try {
		copyRepository(scratch);
		const asset = join(scratch, "assets", "gdal", "SKILL.md");
		writeFileSync(asset, readFileSync(asset, "utf8").replace("license: MIT", "license: MIT\ntags:\n  - gdal"));
		const result = runNode(join(scratch, "scripts", "validate-skills.mjs"), [], scratch);
		assert.notEqual(result.status, 0, "an illegal frontmatter field must fail validation");
		assert.match(result.stdout + result.stderr, /illegal frontmatter field "tags"/u);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

test("validate-skills rejects a description the model cannot route on", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-validate-desc-"));
	try {
		copyRepository(scratch);
		const asset = join(scratch, "assets", "gdal", "SKILL.md");
		const text = readFileSync(asset, "utf8");
		writeFileSync(asset, text.replace(/^description: "Use when/mu, 'description: "Handles'));
		const result = runNode(join(scratch, "scripts", "validate-skills.mjs"), [], scratch);
		assert.notEqual(result.status, 0, "a description without the routing prefix must fail validation");
		assert.match(result.stdout + result.stderr, /description must start with "Use when"/u);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

test("validate-skills rejects a reference file the body never links", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-validate-orphan-"));
	try {
		copyRepository(scratch);
		writeFileSync(join(scratch, "assets", "gdal", "reference", "orphan.md"), "# Orphan\n\nnever linked\n");
		const result = runNode(join(scratch, "scripts", "validate-skills.mjs"), [], scratch);
		assert.notEqual(result.status, 0, "an unlinked reference file must fail validation");
		assert.match(result.stdout + result.stderr, /does not link reference\/orphan\.md/u);
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
				"---\r\nname: alpha\r\ndescription: \"Use when proving the sync fixture.\"\r\nlicense: MIT\r\nmetadata:\r\n  category: gis\r\n  tags: \"alpha, beta, gamma, delta, epsilon\"\r\n---\r\n\r\n# Alpha\r\n"
			);
			writeFileSync(join(upstream, "gis", "alpha", "reference", "binary.bin"), Buffer.from([0x00, 0x0d, 0x0a, 0x01]));
			execFileSync("git", ["init", "-q"], { cwd: upstream });
			execFileSync("git", ["add", "."], { cwd: upstream });
			execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "fixture"], { cwd: upstream });
			const sync = runNode(join(scratch, "scripts", "sync-opengis-skills.mjs"), ["--from", upstream], scratch);
			assert.equal(sync.status, 0, sync.stdout + sync.stderr);
			pruneAdaptations(scratch);
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
