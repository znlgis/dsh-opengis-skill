# Third-party notices

## opengis-skills

The skill instructions under `assets/` are copied from the
[opengis-skills](https://github.com/znlgis/opengis-skills) repository
(`gis/` category), which is licensed under the MIT License:

```text
MIT License

Copyright (c) 2024-2026 znlgis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The exact upstream commit, sync time, and the list of vendored skills are
recorded in [`upstream.json`](./upstream.json), together with a SHA-256
integrity manifest of the snapshot: `schemaVersion` 1, `hashAlgorithm`
`sha256`, and a `files` map from every vendored file's POSIX path (relative
to `assets/`) to its digest. `npm run validate` recomputes those digests and
fails when the vendored bytes drift from the recorded manifest. The copy is
performed by `scripts/sync-opengis-skills.mjs`, which lives in the source
repository (<https://github.com/znlgis/dsh-opengis-skill>) and is not part of
the published package. Text files are vendored with LF line endings so the
snapshot matches the upstream git blob on every platform. The skills are
documentation: each one describes an independent open-source project (GDAL,
QGIS, GeoServer, PostGIS, JTS, CesiumJS, OpenLayers, and others) and links to
that project's own repository, documentation, and license. Those projects
keep their own licenses; nothing in this package re-licenses them.

## DeepSeek Harness

This package registers a skill provider on the public `ctx.skills` service of
DeepSeek Harness and mirrors the standard bundled-provider rank (600) documented
by `@deepseek-ai/dsh-skill`. No DeepSeek Harness source code is copied into
or redistributed with this package; DeepSeek Harness itself is MIT licensed.
