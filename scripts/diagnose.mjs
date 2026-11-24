#!/usr/bin/env node
/**
 * One-line diagnostic entry for the packaged bundle.
 *
 * Prints the diagnose() JSON on stdout and exits 0 only when the package is
 * healthy (missing/degraded/danglingRefs/hashMismatch are all empty); any other
 * state exits 1 so a shell gate can depend on it. "--human" prints a short
 * Chinese summary for a person instead of the raw JSON.
 *
 * Usage:
 *   node scripts/diagnose.mjs            JSON 到 stdout，healthy 为 true 退 0，否则退 1
 *   node scripts/diagnose.mjs --human    人读摘要
 *
 * The same diagnostic is reachable without this script (it is not part of the
 * published package), which is the real one-line entry point:
 *
 *   node -e "import('@dsh-gis/dsh-opengis-skill').then(m => console.log(JSON.stringify(m.diagnose(), null, 2)))"
 *
 * Zero dependencies; the only import is the package entry point.
 */

import { diagnose } from "../lib/index.js";

const report = diagnose();
const human = process.argv.slice(2).includes("--human");

if (!human) {
	console.log(JSON.stringify(report, null, 2));
} else {
	const lines = [];
	lines.push("OpenGIS 技能包诊断（" + report.provider + " " + report.packageVersion + "）");
	lines.push("  技能总数：" + report.skills + "，当前配置可见：" + report.visible + "，目录估算：" + report.catalogTokens + " token");
	lines.push("  DSH 版本探测：" + (report.hostVersionHint === null ? "未探测到" : report.hostVersionHint));
	lines.push("  结论：" + (report.healthy ? "健康" : "存在问题"));
	for (const entry of report.missing) lines.push("  缺失技能：" + entry + "（upstream.json 有记录，assets/ 下没有）");
	for (const entry of report.degraded) lines.push("  降级技能：" + entry.skill + "（" + entry.reason + "，只会上游正文 + 通用约定）");
	for (const entry of report.danglingRefs) lines.push("  悬空引用：" + entry.from + " → " + entry.ref);
	for (const entry of report.hashMismatch) lines.push("  哈希不符：" + entry);
	for (const entry of report.problems) lines.push("  内部问题：" + entry);
	console.log(lines.join("\n"));
}

process.exitCode = report.healthy ? 0 : 1;
