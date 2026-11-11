# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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