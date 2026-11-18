import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * End-to-end compatibility test against an installed DeepSeek Harness.
 *
 * The unit tests mirror the registry contract; this one runs the packaged
 * provider inside the real "@deepseek-ai/dsh-skill" SkillRegistry that ships in
 * an installed Harness, so a host-side contract change (a stricter candidate
 * validator, a renamed provider method, a changed "list()" return shape) fails
 * here instead of in a user session.
 *
 * The Harness desktop bundle embeds Node (Electron), so the test re-runs itself
 * under ELECTRON_RUN_AS_NODE and imports the registry straight out of the
 * installed "app.asar". It skips when no installation is found or when the
 * environment variable DSH_SKIP_INTEGRATION is set.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Locate the installed Harness executable for this platform.
 *
 * @returns the executable path, or undefined when Harness is not installed.
 */
function harnessExecutable() {
	const local = process.env.LOCALAPPDATA;
	const candidates =
		process.platform === "win32" && local !== undefined
			? [join(local, "Programs", "DeepSeek Harness", "DeepSeek Harness.exe")]
			: process.platform === "darwin"
				? ["/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"]
				: [];
	return candidates.find((candidate) => existsSync(candidate));
}

/** The in-installation module root holding the DSH packages. */
function asarModuleRoot(executable) {
	const resources = process.platform === "darwin"
		? join(executable, "..", "..", "..", "Resources")
		: join(executable, "..", "resources");
	return join(resources, "app.asar", "dsh", "node_modules");
}

const executable = harnessExecutable();
const skip = process.env.DSH_SKIP_INTEGRATION === "1"
	? "DSH_SKIP_INTEGRATION is set"
	: executable === undefined
		? "no DeepSeek Harness installation found"
		: false;

test("the real DSH skill registry accepts the packaged provider", { skip }, () => {
	const scratch = mkdtempSync(join(tmpdir(), "opengis-dsh-integration-"));
	try {
		const script = join(scratch, "harness.mjs");
		writeFileSync(script, harnessScript);
		const result = spawnSync(executable, ["--expose-internals", script], {
			cwd: root,
			env: {
				...process.env,
				// Run the Electron binary as a plain Node process.
				ELECTRON_RUN_AS_NODE: "1",
				OPENGIS_DSH_MODULE_ROOT: asarModuleRoot(executable),
				OPENGIS_PLUGIN_ENTRY: pathToFileURL(join(root, "lib", "index.js")).href
			},
			encoding: "utf8",
			timeout: 120_000
		});
		const report = parseReport(result.stdout);
		assert.ok(result.status === 0, "the harness run must exit cleanly: " + result.stdout + result.stderr);
		assert.equal(report.ok, true, "the harness run must report success: " + JSON.stringify(report));
		assert.equal(report.listed, 45, "the registry must observe all 45 bundled skills");
		assert.ok(report.loadedChars > 0, "a loaded skill must carry its body");
		assert.equal(report.hasGuidance, true, "the loaded body must carry the per-skill DSH guidance");
		assert.equal(report.hasCommon, true, "the loaded body must carry the shared DSH guidance");
		assert.equal(report.unknownUndefined, true, "an unknown skill must resolve undefined");
		assert.equal(report.abortPropagates, true, "a cancelled lookup must reject with its reason");
		assert.equal(report.duplicateProviderRejected, true, "the registry must keep provider names unique");
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

/**
 * Extract the JSON report from the harness stdout.
 *
 * @param stdout - the child process stdout.
 * @returns the parsed report, or a failure object when no report was written.
 */
function parseReport(stdout) {
	const line = String(stdout ?? "").split(/\r?\n/u).reverse().find((entry) => entry.startsWith("OPENGIS_REPORT "));
	if (line === undefined) return { ok: false, reason: "no report line", stdout: String(stdout).slice(0, 2000) };
	try {
		return JSON.parse(line.slice("OPENGIS_REPORT ".length));
	} catch (cause) {
		return { ok: false, reason: "unparsable report: " + cause.message };
	}
}

/** The script the installed Harness runs; it reports one JSON line on stdout. */
const harnessScript = `
const moduleRoot = process.env.OPENGIS_DSH_MODULE_ROOT;
const pluginEntry = process.env.OPENGIS_PLUGIN_ENTRY;
const report = { ok: false };
function emit() {
	console.log("OPENGIS_REPORT " + JSON.stringify(report));
}
try {
	const { Context } = await import("file:///" + moduleRoot.replaceAll("\\\\", "/") + "/@deepseek-ai/cordis/lib/index.js");
	const { SkillRegistry } = await import("file:///" + moduleRoot.replaceAll("\\\\", "/") + "/@deepseek-ai/dsh-skill/lib/index.js");
	const ctx = new Context();
	new SkillRegistry(ctx);
	const plugin = await import(pluginEntry);
	await ctx.plugin({ name: plugin.name, inject: plugin.inject, apply: plugin.apply }, {});
	const listed = await ctx.skills.list();
	report.listed = listed.length;
	const definition = await ctx.skills.get("gdal");
	report.loadedChars = definition === undefined ? 0 : definition.content.length;
	report.hasGuidance = definition !== undefined && definition.content.includes("## DeepSeek Harness 使用建议");
	report.hasCommon = definition !== undefined && definition.content.includes("## DeepSeek Harness 通用约定");
	report.unknownUndefined = (await ctx.skills.get("not-a-bundled-skill")) === undefined;
	const controller = new AbortController();
	controller.abort(new Error("cancelled"));
	try {
		await ctx.skills.get("gdal", { signal: controller.signal });
		report.abortPropagates = false;
	} catch {
		report.abortPropagates = true;
	}
	let duplicateRejected = false;
	try {
		await ctx.plugin({ name: "opengis-duplicate", inject: ["skills"], apply(inner) {
			inner.skills.registerProvider(() => ({ name: "opengis", list: () => Promise.resolve([]), get: () => Promise.resolve(undefined) }));
		} }, {});
	} catch {
		duplicateRejected = true;
	}
	report.duplicateProviderRejected = duplicateRejected;
	report.ok = true;
} catch (error) {
	report.error = String(error && error.stack || error);
}
emit();
`;
