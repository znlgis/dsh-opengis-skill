import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

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
	"docs",
	"lib",
	"locale",
	"scripts",
	"test"
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
	pruneTaxonomy(destination, skills);
}

/**
 * Reconcile lib/taxonomy.js with a fixture's assets/ directory.
 *
 * The shipped taxonomy describes the 45 vendored skills, so a fixture that swaps
 * the assets for one synthetic skill would otherwise fail the taxonomy check.
 * The two data literals are replaced; the exported helpers stay untouched.
 *
 * @param destination - the scratch repository root.
 * @param skills - the fixture skill names.
 */
function pruneTaxonomy(destination, skills) {
	const file = join(destination, "lib", "taxonomy.js");
	const source = readFileSync(file, "utf8");
	const groups = skills.map((name) => "\t" + JSON.stringify(name) + ": [\"data\"]").join(",\n");
	const keywords = skills.map((name) => "\t" + JSON.stringify(name) + ": [\"fixture\", \"placeholder\", \"synthetic\"]").join(",\n");
	const next = source
		.replace(/const SKILL_GROUPS = Object\.freeze\(\{[\s\S]*?\n\}\);\n/u, "const SKILL_GROUPS = Object.freeze({\n" + groups + "\n});\n")
		.replace(/const SKILL_KEYWORDS = Object\.freeze\(\{[\s\S]*?\n\}\);\n/u, "const SKILL_KEYWORDS = Object.freeze({\n" + keywords + "\n});\n")
		.replace(/const GROUP_IDS_JSON = [\s\S]*?;\n/u, "")
		.replace(/export const GROUP_IDS = Object\.freeze\(\[[\s\S]*?\]\);/u, 'export const GROUP_IDS = Object.freeze(["data"]);');
	if (next === source) throw new Error("pruneTaxonomy could not rewrite lib/taxonomy.js");
	writeFileSync(file, next);
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
		"- **加载与引用**：用 \`skill\` 按名 \`" + name + "\` 加载。",
		"  - 参考文件按 Base directory 相对读取，先看目录再按 \`offset\` 跳读。",
		"  - 相邻技能同样用 \`skill\` 加载，不 \`read\` 兄弟目录。",
		"- **执行环境**：命令走 \`ops_bash\`。",
		"  - Windows 原生命令走 \`pwsh\`。",
		"  - 长任务用后台作业，\`job_output\` 收日志。",
		"- **先探测版本**：先跑 \`--version\` 确认工具可用。",
		"  - 按实际版本挑命令，低版本没有的参数不要照抄。",
		"  - 拿不准就看 \`--help\`。",
		"- **验证产物**：用 \`read\` 重新打开输出文件核对元数据。",
		"  - 不要只看退出码，退出码 0 只代表命令跑过。",
		"  - 出图用 \`read_image\` 真看一。",
		"- **风险与权限**：覆盖、删除、安装与使用凭据前先向用户确认。",
		"  - 用 \`ask_user_question\` 给选项，不要只在正文里写一句建议确认。",
		"  - 凭据用环境变量，不回显到日志与回答。",
		"",
		"这是测试夹具生成的填充适配文件，只用于让校验脚本走完资产检查；内容长度足以通过结构阈值，且不含任何真实建议。".repeat(20)
	].join("\n");
}


test("diagnose() runs through the package entry point in a bare node -e", () => {
	const moduleUrl = pathToFileURL(join(root, "lib", "index.js")).href;
	const result = spawnSync(node, ["-e", "import(" + JSON.stringify(moduleUrl) + ").then((module) => process.stdout.write(JSON.stringify(module.diagnose())))"], {
		cwd: root,
		encoding: "utf8",
		timeout: 60_000
	});
	assert.equal(result.status, 0, result.stdout + result.stderr);
	const report = JSON.parse(result.stdout);
	assert.equal(report.provider, "opengis-skill");
	assert.equal(report.healthy, true);
	assert.equal(report.skills, 45);
});

test("npm run diagnose prints JSON and exits 0 on the repository", () => {
	const result = runNode(join(root, "scripts", "diagnose.mjs"), [], root);
	assert.equal(result.status, 0, result.stdout + result.stderr);
	const report = JSON.parse(result.stdout);
	assert.equal(report.healthy, true);
	assert.equal(report.skills, 45);
	assert.ok(Array.isArray(report.degraded) && report.degraded.length === 0);
});

test("npm run diagnose exits 1 and names the degraded skill in --human mode", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-diagnose-cli-"));
	try {
		copyRepository(scratch);
		rmSync(join(scratch, "adaptations", "gdal.md"));
		const human = runNode(join(scratch, "scripts", "diagnose.mjs"), ["--human"], scratch);
		assert.equal(human.status, 1, "a degraded package must fail the exit-code gate");
		assert.match(human.stdout, /降级技能：gdal/u);
		const json = runNode(join(scratch, "scripts", "diagnose.mjs"), [], scratch);
		assert.equal(json.status, 1);
		const report = JSON.parse(json.stdout);
		assert.deepEqual(report.degraded, [{ skill: "gdal", reason: "adaptation-missing" }]);
		assert.equal(report.healthy, false);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

test("compat:report records the real contract suite as pass and a skipped suite as not-run", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-compat-report-"));
	try {
		const out = join(scratch, "compatibility.md");
		const result = spawnSync(node, [join(root, "scripts", "compat-report.mjs"), "--out", out, "--json"], {
			cwd: root,
			encoding: "utf8",
			timeout: 300_000,
			env: { ...process.env, DSH_SKIP_INTEGRATION: "1" }
		});
		assert.equal(result.status, 0, result.stdout + result.stderr);
		const summary = JSON.parse(result.stdout);
		assert.equal(summary.scriptVersion, 1);
		const contract = summary.suites.find((suite) => suite.file === "test/dsh-contract.test.mjs");
		assert.equal(contract.status, "pass", "the contract suite must really run");
		assert.ok(contract.counts.pass > 0);
		const integration = summary.suites.find((suite) => suite.file === "test/dsh-integration.test.mjs");
		assert.equal(integration.status, "not-run", "a fully skipped suite must never be recorded as pass");
		assert.match(integration.reason, /跳过/u);
		const markdown = readFileSync(out, "utf8");
		assert.match(markdown, /<!-- generated by npm run compat:report; do not edit by hand -->/u);
		assert.match(markdown, /\| `test\/dsh-contract\.test\.mjs` .* \| pass \|/u);
		assert.match(markdown, /\| `test\/dsh-integration\.test\.mjs` .* \| not-run \|/u);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

test("compat:report writes not-run instead of pass when the evidence files are missing", () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-compat-unrunnable-"));
	try {
		copyRepository(scratch);
		rmSync(join(scratch, "test"), { recursive: true, force: true });
		const result = runNode(join(scratch, "scripts", "compat-report.mjs"), [], scratch);
		assert.equal(result.status, 0, "not-run is an environment limitation, not a failure");
		const markdown = readFileSync(join(scratch, "docs", "compatibility.md"), "utf8");
		assert.match(markdown, /not-run/u);
		assert.match(markdown, /测试文件不存在: test\/dsh-contract\.test\.mjs/u);
		assert.doesNotMatch(markdown, /\| pass \|/u, "no suite may be recorded as pass when it did not run");
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

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
