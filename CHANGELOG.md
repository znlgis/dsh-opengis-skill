# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2] - 2026-11-24

### Added — 可诊断性与兼容性证据

- **`diagnose()`**（`lib/diagnose.js`，包根再导出）：同步、只读、不抛错的诊断入口，返回 `provider`/`packageVersion`/`skills`/`visible`/`missing`/`degraded`/`danglingRefs`/`hashMismatch`/`catalogTokens`/`hostVersionHint`/`healthy`，外加 `problems` 汇总内部异常。`healthy` 严格等于四个契约数组全空；`catalogTokens` 口径为 `ceil(Σ 可见 description 字符数 / 4)`；`hostVersionHint` 先看 `DSH_VERSION`/`DSH_HOST_VERSION`，再从已安装桌面应用的 `app.asar` 里读运行时版本，探不到给 `null`。普通 Node 无法把 `app.asar` 当目录读，因此这里按 ASAR 头解析成员，失败静默降级。
- **`npm run diagnose`**（`scripts/diagnose.mjs`）：JSON 到 stdout，`healthy === true` 退 0、否则退 1；`--human` 输出中文摘要。
- **交叉引用判定抽成 `lib/citations.js`**：`scripts/check-citations.mjs` 与 `diagnose()` 共用同一套规则（技能名指针、三段式版本漂移、两段式版本警告），避免 CI 门禁与诊断结论各说一套。
- **场景预设**（`lib/taxonomy.js` 的 `SCENARIO_PRESETS`）：`web`/`server`/`data`/`all` 四个预设映射到分组集合；插件配置新增 `scenario` 字段，与 `groups` 取并集、非空 `skills` 覆盖分组、`exclude` 最后应用，未知场景名报错。
- **`dsh.compatibility` + `npm run compat:report`**：`package.json` 声明实测版本与证据测试文件（`verified[].evidence` 必须真实存在，`npm run validate` 会校验），`scripts/compat-report.mjs` 真实执行契约测试与集成测试并生成 `docs/compatibility.md`（退出码、通过/失败/跳过数、耗时、生成时间、探测到的 DSH 版本）；测试文件缺失或全部跳过时写 `not-run` 与原因，绝不伪造 pass。

### Fixed — 缺适配文件不再让技能加载失败

- **`readAdaptation` 区分两类失败**（`lib/adaptations.js`）：文件缺失（`ENOENT`/`ENOTDIR`/`EISDIR`）时返回空串并记入模块内降级表，技能降级为「上游正文 + `common.md`」继续加载；内容不合规（不以 `## DeepSeek Harness 使用建议` 开头）仍然抛错，因为那是打包错误。`composeSkillContent` 在无专属指南时不再留下重复分隔符。降级表以 adaptation root 为键而不是挂在 provider 上：`get()` 的返回值受宿主 `validateDefinition` 约束、provider 对象是冻结的，而 `diagnose()` 必须同步（一行 `node -e` 会直接 `JSON.stringify` 结果），同步探测路径与异步加载路径共用同一张表。

### Changed

- **README**：新增「可诊断」「场景预设」「目录 token 估算口径」「机器可读兼容性证据」说明；目录结构补 `lib/citations.js`、`lib/diagnose.js`、两个新脚本与 `docs/compatibility.md`；故障排查补诊断用法、`unknown scenario` 与降级语义。
- **`npm run validate` 扩展**：`REQUIRED_SCRIPTS` 增加 `diagnose`/`compat:report`；新增 `checkCompatibility` 校验 `dsh.compatibility` 形状、`verified[].evidence` 指向真实文件、`docs/compatibility.md` 携带生成标记；入口脚本必须存在。
- **测试**：新增 `test/diagnose.test.mjs`（好包全绿、缺 adaptation 降级、内容不合规仍抛错、哈希不符、缺失技能、悬空引用、坏安装不崩溃、非法配置、版本探测）；`test/taxonomy.test.mjs` 增加场景预设与优先级用例；`test/adaptations.test.mjs` 增加降级与同步/异步一致性用例；`test/scripts.test.mjs` 增加 `node -e` 动态 import、诊断 CLI 退出码、`compat:report` 的 pass / not-run 两种诚实记录。

## [0.5.1] - 2026-11-19

### Fixed — DeepSeek Harness 0.2.2 compatibility

- **`get()` 现在按注册表契约返回 `undefined`**（`lib/index.js`）：候选不在本 provider 目录内、已被配置过滤掉、或 `SKILL.md` 在发现与加载之间被删除时，返回 `undefined` 让宿主报告「unknown or no longer available」；此前抛出的 `unknown skill` / `ENOENT` 会把一次普通查找变成工具失败。类型声明同步为 `Promise<OpenGisSkillDefinition | undefined>`（`lib/index.d.ts`）。
- **取消不再被误报成安装损坏**（`lib/adaptations.js`）：`readFile` 取消时拒绝的是 `signal.reason` 而不是 `AbortError`，旧代码因此把取消包装成「missing DSH adaptation … run npm run validate」。新增 `isAbort()`（同时看 `signal.aborted`、`ABORT_ERR` 与 `AbortError`/`TimeoutError`），取消原样抛出；其余读取失败的错误信息带上错误码（`ENOENT`/`EACCES`），不再一律说成「缺文件」。
- **注册表生命周期信号接入加载路径**：`apply()` 把 `registerProvider` 的 `control.signal` 传进 provider，与调用方 `options.signal` 合并（`AbortSignal.any`），插件卸载时正在进行的 `get()` 会及时收敛。
- **工具清单按 0.2.2-rc.5 的真实来源重分**：`CORE_TOOLS` 改为官方分发自带的工具（`bash`、`pwsh`、文件与检索、`job_*`、`subagent` 家族、`skill`、`present`、`todo_write`、Web、`working_directory`、`ask_user_question`、目标与 Agent Teams 等，已对照 `dsh-base` 与 web 预设的行清单核实），`ops_bash`、`run_code`、`load_workspace_dependencies` 移到 `OPTIONAL_TOOLS`——它们分别来自第三方 Ops 插件、PTC 预设与 web 预设，并非每个构建都有。45 个适配文件仍各自引用不少于 2 个核心工具，`common.md` 引用 14 个，门槛不变。
- **可选工具兜底措辞**：`common.md` 新增「shell 工具名」一条，说明 `ops_bash` 与官方 `bash` 是同一消费者的两种暴露方式、没有插件时替换即可；`load_workspace_dependencies` 缺失时按平台自探解释器路径。两处都带退路，`commonProblems` 的兜底约束得以通过。
- **未完成标记检查对中文生效**（`lib/adaptations.js`）：旧正则把 `TODO/FIXME/TBD` 与 `待补充/占位` 放在同一组、外面套 ASCII 词边界符，中英文分支因此永远命不中中文文本。改为 ASCII 分支保留词边界、中文分支直接匹配，并排除合法词「占位符」；残留的 `待补充`/`占位` 现在会被 `npm run validate` 拒绝。

### Fixed — routing, links, diagnostics

- **路由打分改为整词匹配**（`lib/taxonomy.js`）：描述里的拉丁词此前用裸 `includes`，`geos` 会命中 `GeoServer`、`jts` 会命中版本号。新增 `containsTerm()` 对含拉丁字母的词要求前后非字母数字边界，纯中文关键词仍按子串匹配；给 `pyqgis` 补 `QGIS 环境`、`initQgis` 两个请求原话，中文用例仍全部命中前三。
- **Markdown 链接正则支持一层成对括号**（`lib/markdown-links.js`）：形如 `x → reference/foo_(bar).md` 的链接不再被截成 `reference/foo_(bar`，目标也不再跨行；资产里当前没有这类链接，属于失败即报错的健壮性修复。
- **`list()` 每次返回新数组**：元素仍冻结，但调用方排序或截断不再可能改到 provider 内部目录。
- **`check-citations.mjs` 版本号按整词比对**：`3.9` 不再被 `13.9`/`3.9.1` 误命中，真实漂移不再被掩盖。
- **`check-adaptations.mjs` 不再重复报标题错误**：`adaptationProblems` 已报「must start with」时不再追加一条 `wrong heading`。

### Added

- **`test/dsh-contract.test.mjs`**：按 `@deepseek-ai/dsh-skill` 0.2.2-rc.5 的 `validateCandidate`/`validateDefinition` 规则回归 45 个候选与 45 份正文（kebab-case 名称、非空描述、布尔 invocation、字符串 source/provider、有限 rank、provider 与注册名一致、`locator` 存在、可选 `path`/`whenToUse`/`resourceBase`、定义名与候选一致、`content` 为字符串），并覆盖 `list()` 返回新数组、`get()` 对未知候选与已过滤候选返回 `undefined`。
- **`test/dsh-integration.test.mjs`**：自动探测本机安装的 DeepSeek Harness，用 `ELECTRON_RUN_AS_NODE` 在真实的 `@deepseek-ai/dsh-skill` 注册表里跑 provider（45 个候选、加载 `gdal`、未知技能返回 `undefined`、取消传播、重名 provider 被拒）；没有安装或设置 `DSH_SKIP_INTEGRATION=1` 时跳过。
- **`plugin.test.mjs` 新增「文件消失」用例**：用临时夹具验证发现之后删除 `SKILL.md` 返回 `undefined`。
- **`npm run check` 与 CI 纳入 `check:adaptations`**：此前 `check` 只有 validate/citations/test，适配层的独立校验脚本不在发布门禁里。

### Changed

- **README 兼容性声明改为可核查的表述**：删掉「契约在 0.2.0-rc.2 与 0.2.1-rc.2 之间字节一致」这类无证据断言，明确「已实测 `0.2.2-rc.5`」；同时修正 `metadata` 对模型不可见（目录只渲染名称与描述）、`ops_bash`/`run_code` 的真实来源、`spillPath` 已删除、包体积按实测写、示例路径去个人化。
- **`common.md` 不再让模型去看 `metadata.keywords`/`groups`**：DSH 的模型侧目录只给名称与描述，那条指引不可执行；改为「按名称与描述判断，加载后按正文切换」。
- **新增 Plugins 详情文档**：`docs/DETAIL.md` 由 `locale/{en,zh}.json` 的 `meta.detail` 指向，插件详情页不再退回渲染 48 KB 的 README；`files` 相应加上 `docs/`。
## [0.5.0] - 2026-11-17

### Added

- **中文触发词与技能分组**（`lib/taxonomy.js`）：45 个技能各带 3–6 条请求原话（`keywordScores` 用它们打分）与至少一个分组（`desktop`/`server`/`data`/`geometry`/`web`/`dotnet`/`java`/`pipeline`/`meta`）。两套数据随 candidate 的 `metadata.keywords` 与 `metadata.groups` 交给宿主；上游描述是英文，这一层消掉了中文提问先翻译一步才命中的不确定性。
- **可裁剪的技能目录**：`apply(ctx, config)` 支持 `groups`（并集）、`skills`（白名单，优先于 groups）、`exclude`（最后应用）。未知组名、未知技能名与「筛完为空」都直接抛错，避免拼错过滤词后静默返回一半目录。
- **适配层子条目契约**：每个 `<skill>.md` 至少 4 个固定要点要拆成两格缩进的子条目、全文至少 8 条（`MIN_NESTED_LABELS` / `MIN_NESTED_BULLETS`）。45 个适配文件按语义边界重排，最长单条从 675 字符降到 300 上下。
- **`scripts/check-citations.mjs`**（`npm run check:citations`，进 CI）：校验适配层 `加载 `x`` 与 `skill({ name: "x" })` 指向的技能仍然存在，以及引用的三段式版本号能在该技能正文或参考资料里找到；两段式版本号降级为警告（迁移注记会合法地提到旧版本）。
- **分类法校验**（`checkTaxonomy`）：技能目录、分组、触发词三者必须一一对应，未知键、空分组、少于 3 条触发词都会让 `npm run validate` 失败。
- **路由回归测试**（`test/routing.test.mjs` + `test/fixtures/routing-cases.json`）：每个技能两条中文请求，用关键词命中（×3）与描述拉丁词命中（×1）打分，要求 90% 以上命中第一名、全部命中前三名。
- **`common.md` 兜底约束**：`commonProblems` 现在要求点名可选插件工具的行同时给出「没有该插件时怎么办」的退路。

### Changed

- **`common.md` 去重压缩**：删掉与宿主工具说明重复的「命令执行分工」与「输出截断/spillPath」两段，把剩下的平台差异并进「长任务与后台作业」「Windows 改写」；新增「随包运行时没有 GIS 绑定」与「索引型入口先定位阶段」两条，总长 3223 字符（仍在 2600–9000 窗口内）。
- **README**：新增「配置（裁剪目录）」一节与四个新特性条目；包体积数字按实测更新为解包 1.24 MB / tarball 457 kB / 140 个文件。
- **测试夹具**：`scripts.test.mjs` 在复制仓库后会同步裁剪 `lib/taxonomy.js` 与 `GROUP_IDS`，使单技能夹具不会因为分类法覆盖全量目录而失败。

## [0.4.0] - 2026-11-11

### Added

- **Five new GIS skills synced from upstream**: `geos` (GEOS 3.15.0 C/C++ geometry
  engine), `maplibre-gl-js` (MapLibre GL JS 6.17.0, token-free vector web maps),
  `maplibre-native` (Android/iOS/desktop/Node native rendering), `opendronemap`
  (ODM 3.6.2 / WebODM 4.0.0 photogrammetry pipeline) and `stac-cog-titiler`
  (STAC 1.1.0 + COG + TiTiler 2.4.0 imagery pipeline). The pack now ships 45
  skills / 71 asset files.
- **Capability-tiered tool whitelist in the adaptation contract.** `lib/adaptations.js`
  now splits the harness vocabulary into `CORE_TOOLS` (shipped with every supported
  DeepSeek Harness build) and `OPTIONAL_TOOLS` (Agent Teams, desktop control,
  scheduled tasks, derived subagents and MCP resource reads, all delivered by optional
  plugins). The minimum citation counts are computed on core tools only, so a
  guidance file that only names plugin capabilities no longer passes; optional tools
  stay citable, but only together with the fallback for sessions that do not expose
  them. `citedCoreTools()` is exported next to `citedTools()`.
- **Concreteness gate for the two bullets that decay first.** The "先探测版本" and
  "验证产物" bullets must each carry a backticked command or tool
  (`CONCRETE_LABELS`), so "check the result" prose can no longer stand in for a probe
  command or a verification step.
- **Shared-guidance caching in the provider.** `adaptations/common.md` is read once per
  process and reused across skill loads; only a successful read is memoized, a failure
  is retried on the next load, and a caller's abort signal cannot cancel the shared
  read for other callers.
- Tests for the core/optional split, the optional-only rejection and the
  prose-only probe/verification rejection.

### Changed

- **Re-synced the vendored GIS skills from opengis-skills `e47ff34` to `55b87f4`.**
  Upstream added the five skills above and refreshed 20+ bodies: GDAL's unified
  `gdal vector/raster` CLI argument order and `--overwrite`, `gdal dataset check`
  exit code, GeoPandas 1.2.0 (`make_grid`, `read_file_info`, GeoParquet 2.0,
  pyogrio options), Shapely 2.2.0 (`minimum_width`, `get_segments`,
  `transform_coordseq`, `split`, `coverage_clean`, bundled GEOS 3.14.1), PDAL 2.10
  (`filters.m3c2`, `filters.radiusassign`, `p<percentile>` bands, GDAL 3.8 build
  floor), DuckDB's built-in GEOMETRY type plus `INSTALL AND LOAD spatial`,
  `ST_CRS`/`ST_SetCRS`, GRASS 8.5 (`grass.tools`, JSON output, GDAL 3.7+/PROJ 9.0+
  requirements), MapServer's `shp2img` → `map2img` rename, Mapsui 5.x
  `WmsProvider.CreateAsync`, GeoNode's in-container version probe, WhiteboxTools'
  tool-discovery helpers and Spatialite's CLI option order. The snapshot keeps byte
  parity: 71 asset files, SHA-256 manifest updated.
- **The shared adaptation was rewritten around what this harness actually does**, not
  around generic shell advice: foreground timeouts promoted to background jobs,
  truncated output and `spillPath`, `run_code` for batching tool calls, the bundled
  Python runtime (numpy/pandas/Pillow but no GDAL/Shapely/GeoPandas bindings), optional
  plugins vs the single-session fallback, GUI verification boundaries, and a
  "do not fabricate" rule. The file now carries 19 points and cites 19 core tools.
- Per-skill adaptations were refreshed against the new bodies (version baselines,
  renamed commands, removed workarounds) and the sibling-skill pointers gained the
  newly vendored skills (MapLibre for the web-map family, STAC/COG for
  `opengis-all`).
- README, locale metadata and the package description describe 45 skills, the
  core/optional split, the concreteness gate and the new pinned upstream commit.

### Fixed

- `adaptations/qgis-server.md` named no execution tool, so it could not be told apart
  from tool-agnostic upstream prose; the execution bullet now covers the container,
  `curl.exe` and background-job path.
- `adaptations/mapserver.md` still claimed `gml_include_items` was a MapServer 8.x
  default; upstream corrected this to "since 4.6", and the guidance follows.
- `adaptations/mapsui.md` warned about a leftover synchronous `new WmsProvider(...)`
  in the body; the refreshed body uses `WmsProvider.CreateAsync` everywhere, so the
  warning is gone.
- `adaptations/geonode.md` probed the version via `curl /version.txt`, which upstream
  replaced with an in-container `docker compose exec django python -c ...` probe.

## [0.3.0] - 2026-11-09

### Added

- **Upstream routing metadata on the provider candidate.** The frontmatter reader now
  parses the Agent Skills six-field schema, including the nested
  `metadata{category,tags}` block, and the provider exposes `metadata` on every
  candidate (`SkillCandidate.metadata`); definitions stay clean because
  `SkillSummary` does not allow that field. Tag lists are parsed into arrays, and the
  top-level field order is kept so validation can prove nothing illegal was added.
- **Harness-specificity gate for the adaptation layer.** Every `adaptations/<skill>.md`
  must now cite at least two DeepSeek Harness tools from a fixed whitelist (and must
  stay between 900 and 4000 characters), while `common.md` must cite at least six and
  carry at least twelve points. `citedTools()` is exported and shared by the plugin,
  the checker and the tests, so "read the file" prose no longer passes for tool mapping.
- **Asset content-contract validation.** `npm run validate` now rejects illegal
  frontmatter fields, a missing MIT license, a non-`gis` category, malformed or
  oversized tag lists, descriptions over 500 characters / not starting with
  `Use when` / carrying angle brackets or CJK / duplicated across skills, SKILL.md
  files over 500 lines, and `reference/` files the body never links. Stale freshness
  markers, thin FAQ tables, reference files without a table of contents, code fences
  without a language and emoji are reported as warnings so an upstream editorial commit
  cannot block a release.
- Tests for the six-field parser (nested metadata, tag list, field order, illegal
  nested forms) and for the new validator rejections.

### Changed

- **Re-synced the vendored GIS skills from opengis-skills `6562616` to `e47ff34`.**
  Upstream migrated every skill to the Agent Skills specification (six legal
  frontmatter fields, `metadata.tags` replacing the top-level `tags` array), added
  table-of-contents blocks to references, and refreshed 30+ upstream versions —
  PostGIS 3.7.0, CesiumJS 1.147.0, deck.gl 9.4.1, GeoLibre 3.7.0, GeoServer Cloud
  3.0.2.1, Mapbox GL JS 3.34.2 and others. The snapshot keeps byte parity: 66 asset
  files, SHA-256 manifest updated.
- **All 40 `adaptations/<skill>.md` files were rewritten against the new bodies.**
  Each one names the version baseline the body now claims, the exact commands to probe
  it, a verification criterion that is not "exit code 0", and the skill's real
  irreversible operations; long-running work (services, full imports, builds) is routed
  to background jobs with `job_output`/`job_kill`, rendered output is checked with
  `read_image`, deliverables go through `present`, and destructive choices go through
  `ask_user_question`. `common.md` gained skill loading via the `skill` tool, sibling
  skill loading instead of reading `../<skill>/SKILL.md`, reference section targeting
  through `## Contents`, `todo_write`/`subagent` orchestration, `present` delivery,
  failure triage and an explicit "do not fabricate" rule.
- README, locale metadata and the package description describe the execution layer, the
  metadata pass-through and the new validation split (errors vs warnings).

### Fixed

- The freshness check compared against a string instead of a regular expression, so it
  warned on every asset; it is now a real `/截至 \d{4}-\d{2}/u` match.
- The sync fixture and the adaptation fixtures were brought up to the new length, tool
  and frontmatter contract so the test suite still exercises the rules it documents.

## [0.2.0] - 2026-10-27

### Added

- A dedicated DeepSeek Harness adaptation layer under `adaptations/`, appended by the
  provider when a skill is loaded: `common.md` carries the conventions every skill
  needs (tool mapping, Windows rewrites, version probes, artifact verification,
  background jobs, sandbox and secret handling) and `<skill>.md` carries the
  skill-specific guidance (which reference file to read, where commands run, what to
  probe, what to verify, what needs consent). Vendored bodies stay byte-identical to
  upstream, so the SHA-256 manifest and `sync:check` keep working.
- Eight newly synced GIS skills: `brutile`, `duckdb-spatial`, `geolibre`,
  `geonode`, `kepler-gl`, `projnet4geoapi`, `spatialite`, and `whitebox-tools`
  (32 → 40 skills).
- `npm run check:adaptations` validates the adaptation layer alone and accepts skill
  names, so one file can be checked while the rest are still being written; `npm run
  validate` now also checks adaptation coverage, structure, length, and relative
  links resolved against the skill directory.
- `test/adaptations.test.mjs` and expanded provider tests cover the composed content
  order, coverage of every skill, and structural rejections.

### Changed

- Synced the vendored GIS skills to opengis-skills commit `6562616`, which decoupled
  the upstream repository from any single agent runtime and therefore removed the
  `## DeepSeek Harness 使用建议` sections from the bodies. The guidance now lives in
  `adaptations/` instead of inside the vendored snapshot, so future syncs no longer
  have to rewrite upstream content.
- Skill bodies and descriptions refreshed by upstream (versions, new skills, release
  notes); all 40 skills keep their upstream frontmatter.
- `package.json` ships `adaptations/`, bumps to 0.2.0, and expands the keyword list.

### Fixed

- The frontmatter reader now accepts upstream descriptions that carry unescaped inner
  double quotes (invalid YAML, written by upstream long descriptions), taking the text
  between the outermost quotes and keeping unknown escapes literal; block scalars and
  unterminated values still fail with a readable error. This removes the parity
  failure that blocked syncing commit `6562616`.

## [0.1.3] - 2026-10-20

### Added

- Every GIS skill now ends with a `## DeepSeek Harness 使用建议` section covering skill
  loading and reference reads, shell-tool mapping (`pwsh` and `run_code`), version
  probes, artifact verification, and permission/secret handling. Generic "AI 使用建议"
  sections were replaced rather than duplicated, so most skills got shorter.
- Descriptions rewritten for skill discovery: concrete commands, package coordinates,
  formats, and error symptoms, still starting with "Use when" and within the upstream
  500-character limit.

### Changed

- Synced the vendored GIS skills to opengis-skills commit `4b64b89`; version claims
  re-verified against upstream releases on 2026-10-20.
- GeoServer (plus `geoserver-rest-api` and the `opengis-all` image tag) 3.0.1 → 3.0.2:
  SourceForge binary URL, Docker tag, Java 17/21 prerequisite, and the 2026-10-19
  security-release note.
- GeoServer Cloud 3.0.1.1 → 3.0.2 and Helm chart `geoservercloud` 3.0.1 → 3.0.2.
- GeoTools 35.1 → 35.2 (JDK 17); NetTopologySuite notes now pin IO.GeoJSON 4.0.0,
  IO.Esri.Shapefile 1.2.0, and ProjNet 2.1.0.

### Fixed

- QGIS Server guidance probes the installed QGIS version instead of assuming a
  `qgis_mapserver --version` binary; Cesium no longer asserts a 1.150 removal date;
  Mapsui notes that 5.2.0-beta.1 is a prerelease.
- Escaped inner quotes in rewritten frontmatter descriptions so the strict DSH
  frontmatter parser accepts every skill.

## [0.1.2] - 2026-10-19

### Added

- Tests for the frontmatter parser, the catalog builder, Markdown link resolution,
  and the sync/validate scripts, plus expanded provider coverage in `test/plugin.test.mjs`.
- A SHA-256 integrity manifest in `upstream.json` (`schemaVersion: 1`,
  `hashAlgorithm: "sha256"`, `files` keyed by the POSIX path relative to `assets/`),
  so validation no longer needs an upstream checkout.
- Generated README sections: the skill count and skill table are rendered from the
  vendored assets and verified by `npm run validate`.
- `.editorconfig` and this changelog.

### Changed

- Compatibility: `engines.dsh` widened to `>=0.2.0-rc.2 <0.3.0-0`. The registry API
  and candidate/definition contract of `@deepseek-ai/dsh-skill` are byte-identical
  between 0.2.0-rc.2 and 0.2.1-rc.2, and 0.2.0-rc.2 already supports
  `dsh.bundle.patch`, locale and icon metadata, so the old `>=0.2.1-rc.2` gate
  needlessly blocked users on the npm-latest DSH 0.2.0-rc.2.
- Runtime hardening: canonical provider registration via
  `ctx.skills.registerProvider(() => provider)` (the returned disposer is owned by
  the calling fiber, so no extra `ctx.effect` wrapper), a strict BOM-tolerant
  frontmatter parser, a clear error when the asset root is missing, and
  forward-slash `resourceBase` paths on Windows.
- Tooling hardening: two-way `sync:check` (drift plus upstream additions/removals),
  SHA-256 manifest verification, generated README count/table verification,
  validation of every relative Markdown link in the repository docs and assets,
  and CRLF detection.
- CI: the test matrix now covers Ubuntu (Node 22/24) and Windows (Node 24), and a
  new `sync` job verifies the vendored snapshot against the pinned upstream commit.
- `npm run check` (`validate && test`) added; `prepublishOnly` now runs it.
- Docs refreshed: README rewritten without hardcoded skill counts, with an English
  summary, a compatibility note, install/uninstall/update notes, upstream integrity
  docs and a troubleshooting section; package description and locale metadata
  updated.

### Fixed

- `SKILL.md` files with a UTF-8 BOM are parsed correctly; frontmatter parsing is
  strict and reports unterminated quotes or block scalars instead of silently
  ignoring them.
- A missing `assets/` directory now fails with a clear error that names the expected
  asset root instead of an opaque `ENOENT`.
- `resourceBase` paths are emitted with forward slashes on Windows, so relative
  references resolve consistently across platforms.
- Stale hardcoded skill counts removed from the README, locale metadata and the npm
  description; count and table are generated from the vendored assets.
- CRLF line endings in vendored assets are detected and reported by validation.
- Sync refuses a `--from` directory that is not itself a git checkout root, so an
  enclosing repository's HEAD can no longer be recorded as forged upstream
  provenance; the manifest commit is now mandatory and validated.
- Sync rejects `gis/` directories without `SKILL.md` and stray files at the
  `assets/` root instead of silently dropping or blessing them.
- Stray files at the `assets/` root are pruned by sync and rejected by
  validation, so `assets/` publishes only skill directories.
- CI actions are pinned to release commit SHAs, and the external upstream
  checkout disables persisted credentials.
- Validation checks the bundle row structurally, the locale file grammar, and the
  engine range shape instead of accepting any non-empty string.

## [0.1.1] - 2026-10-19

### Fixed

- Vendored skill assets are written with LF bytes regardless of the source
  checkout's line endings, so the snapshot matches the upstream git blob on every
  platform.
- Corrected the release documentation shipped with 0.1.0.

## [0.1.0] - 2026-10-19

### Added

- Initial public release: a DeepSeek Harness bundle and plugin that vendors the
  `gis/` skills of opengis-skills and registers one skill provider (`opengis`) on
  `ctx.skills`.
- Bundled assets under `assets/<skill>/` (`SKILL.md` plus `reference/*.md`), bundle
  wiring (`cordis.patch.yml`), locale metadata, icon, and npm packaging.
- Source-repository tooling: `npm run sync` / `npm run sync:check`, `npm run
  validate`, `npm test`, and GitHub Actions CI.

## [0.0.0-stage] - 2026-10-19

### Added

- First staging release: bundle/plugin skeleton, vendored skill assets, locale and
  icon metadata, and the initial sync/validate/test scripts for installation
  checks.