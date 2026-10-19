# Third-party notices

## opengis-skills

The skill instructions under `assets/` are copied verbatim from the
[opengis-skills](https://github.com/znlgis/opengis-skills) repository
(`gis/` category), which is licensed under the MIT License:

> MIT License
>
> Copyright (c) 2024-2026 znlgis

The exact upstream commit, sync time, and the list of vendored skills are
recorded in [`upstream.json`](./upstream.json); the copy is performed by
[`scripts/sync-opengis-skills.mjs`](./scripts/sync-opengis-skills.mjs). The
skills are documentation: each one describes an independent open-source project
(GDAL, QGIS, GeoServer, PostGIS, JTS, CesiumJS, OpenLayers, and others) and
links to that project's own repository, documentation, and license. Those
projects keep their own licenses; nothing in this package re-licenses them.

## DeepSeek Harness

This package registers a skill provider on the public `ctx.skills` service of
DeepSeek Harness and mirrors the standard bundled-provider rank (600) documented
by `@deepseek-ai/dsh-skill`. No DeepSeek Harness source code is copied into
or redistributed with this package; DeepSeek Harness itself is MIT licensed.
