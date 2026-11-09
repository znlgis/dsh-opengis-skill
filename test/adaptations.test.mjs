import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	ADAPTATION_DIRECTORY,
	adaptationProblems,
	commonProblems,
	composeSkillContent,
	listAdaptations,
	readAdaptationSync,
	readCommonSync,
	SKILL_SEPARATOR
} from "../lib/adaptations.js";
import { readSkillCatalog } from "../lib/catalog.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adaptationRoot = join(root, ADAPTATION_DIRECTORY);
const assetsRoot = join(root, "assets");

test("composeSkillContent keeps the vendored body first and adds both guidance blocks", () => {
	const body = "# GDAL\n\nBody.";
	const adapted = composeSkillContent(body, "## DeepSeek Harness 使用建议\n\n- **加载与引用**：x", "## DeepSeek Harness 通用约定\n\n- **加载与引用**：y");
	assert.ok(adapted.startsWith(body), "the upstream body must be untouched");
	assert.ok(adapted.includes(SKILL_SEPARATOR.trim()), "a separator must divide the sections");
	const guidance = adapted.indexOf("## DeepSeek Harness 使用建议");
	const common = adapted.indexOf("## DeepSeek Harness 通用约定");
	assert.ok(guidance > body.length, "the per-skill section must follow the body");
	assert.ok(common > guidance, "the shared section must come last");
	assert.ok(adapted.endsWith("\n"), "loaded content must end with a newline");
});

test("every vendored skill has a readable adaptation starting with the required heading", () => {
	const skills = readSkillCatalog(assetsRoot);
	assert.equal(skills.length, 40);
	for (const skill of skills) {
		const text = readAdaptationSync(adaptationRoot, skill.name);
		assert.ok(text.startsWith("## DeepSeek Harness 使用建议"), skill.name + ".md must start with the per-skill heading");
		assert.deepEqual(adaptationProblems(skill.name, text), [], skill.name + ".md must pass its structural checks");
	}
});

test("the shared adaptation is readable and passes its checks", () => {
	const text = readCommonSync(adaptationRoot);
	assert.ok(text.startsWith("## DeepSeek Harness 通用约定"));
	assert.deepEqual(commonProblems(text), []);
});

test("listAdaptations covers common plus every skill", () => {
	const skills = readSkillCatalog(assetsRoot).map((skill) => skill.name);
	const files = listAdaptations(adaptationRoot);
	assert.deepEqual(files, ["common", ...skills].sort());
});

test("adaptationProblems rejects structural damage", () => {
	const good = [
		"## DeepSeek Harness 使用建议",
		"",
		"- **加载与引用**：先读正文，再按需 `read` `reference/x.md`。",
		"- **执行环境**：命令走 `ops_bash`，Windows 原生命令走 `pwsh`。",
		"- **先探测版本**：`gdalinfo --version` 确认实际版本。",
		"- **验证产物**：`gdalinfo -json` 核对驱动与 CRS。",
		"- **风险与权限**：覆盖已有数据前用 `ask_user_question` 确认。",
		"",
		"补充说明：这段文字把文件长度补到阈值以上，让结构检查而不是长度检查决定结果。".repeat(30)
	].join("\n");
	assert.deepEqual(adaptationProblems("gdal", good), []);
	assert.ok(adaptationProblems("gdal", good.replace("## DeepSeek Harness 使用建议", "## DSH")).length > 0);
	assert.ok(adaptationProblems("gdal", good.replace("先探测版本", "版本探测")).some((problem) => problem.includes("先探测版本")));
	const reordered = [
		"## DeepSeek Harness 使用建议",
		"",
		"- **执行环境**：命令走 `ops_bash`。",
		"- **加载与引用**：`read` 参考。",
		"- **先探测版本**：`--version`。",
		"- **验证产物**：`gdalinfo`。",
		"- **风险与权限**：确认。",
		"",
		"补充说明：这段文字把文件长度补到阈值以上，让结构检查而不是长度检查决定结果。".repeat(30)
	].join("\n");
	assert.ok(
		adaptationProblems("gdal", reordered).some((problem) => problem.includes("must keep the order")),
		"required bullets out of order must be rejected"
	);
	assert.ok(adaptationProblems("gdal", good.replaceAll("`", "")).some((problem) => problem.includes("backticks")));
	const toolFree = good
		.replace("`read` `reference/x.md`", "reference/x.md")
		.replace("命令走 `ops_bash`，Windows 原生命令走 `pwsh`。", "命令在 shell 里跑。")
		.replace("用 `ask_user_question` 确认", "先确认");
	assert.ok(
		adaptationProblems("gdal", toolFree).some((problem) => problem.includes("DeepSeek Harness tool")),
		"an adaptation that names fewer than two DSH tools must be rejected"
	);
	assert.ok(adaptationProblems("gdal", good + "\nTODO: 补全").some((problem) => problem.includes("unfinished")));
	assert.ok(adaptationProblems("gdal", good + "\n# H1").some((problem) => problem.includes("top-level heading")));
	assert.ok(adaptationProblems("gdal", "## DeepSeek Harness 使用建议\nshort").some((problem) => problem.includes("too short")));
	assert.ok(adaptationProblems("gdal", good + "\r\n").some((problem) => problem.includes("CR bytes")));
});

test("commonProblems rejects a stub shared file", () => {
	assert.ok(commonProblems("## DeepSeek Harness 通用约定\n\n- **加载与引用**：x").length > 0);
	assert.deepEqual(commonProblems(readFileSync(join(adaptationRoot, "common.md"), "utf8")), []);
});
