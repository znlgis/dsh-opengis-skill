# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
