# @dsh-gis/dsh-opengis-skill

> **English summary** — A DeepSeek Harness bundle that packages the `gis/` skills of
> [opengis-skills](https://github.com/znlgis/opengis-skills) as installable, toggleable skills.
> The session catalog lists names and descriptions only; skill bodies and their
> `reference/*.md` files are loaded on demand, and every body carries DeepSeek Harness
> execution guidance (tool mapping, version probes, verification, permissions). Zero
> runtime dependencies: every asset ships inside the npm package.
>
> Compatibility: DeepSeek Harness `>=0.2.0-rc.2 <0.3.0-0`; Node.js `>=22` for development
> only. MIT licensed.

DeepSeek Harness 的 **OpenGIS 技能包插件**：把 [opengis-skills](https://github.com/znlgis/opengis-skills) 中 `gis/` 分类的 GIS 技能打包成可安装、可启停的 DSH bundle。会话技能目录只列出名称与描述，技能正文与参考资料按需加载。

## 特性

- **覆盖 GIS 全链路**：GDAL、GDAL API、QGIS（qgis_process / PyQGIS / QGIS Server）、GeoServer（含 REST API 与 Cloud）、MapServer、PostGIS、PROJ、PDAL、GRASS GIS、JTS、NetTopologySuite、Esri Geometry API（Java/.NET）、Shapely、GeoPandas、GeoPipeAgent、OpenGisDAF、CesiumJS、OpenLayers、Leaflet、Mapbox GL JS、deck.gl、SharpMap、Mapsui、GeoTools、OpenGIS Utils（Java/.NET），以及 `opengis-all` 全流程索引。
- **按需加载**：注册的是 skill provider（`ctx.skills.registerProvider`），发现阶段只读 frontmatter；正文每次加载时读取，参考资料（`reference/*.md`）通过技能目录（resource base）相对解析。
- **零运行时依赖**：只用 Node 内置模块，不 import DSH 内部包；全部资产随 npm 包分发，整个包解包后约 720 kB。
- **可同步上游**：`npm run sync` 从 opengis-skills 检出复制资产，记录上游 commit 与每个文件的 SHA-256 到 `upstream.json`，并重新生成本文下方技能清单。
- **可启停**：单包同时是 bundle 与插件（`dsh.bundle.patch` 插入自身行），在 Plugins 里启用/停用即可。
- **面向 DSH 的执行建议**：每个技能末尾都有 `## DeepSeek Harness 使用建议`，写明如何按需读 reference、Windows 下如何映射 shell 命令、先跑哪个版本探测命令、如何重新打开产物验证，以及哪些安装/覆盖/凭据操作要先确认。

## 兼容性

- **DeepSeek Harness**：`>=0.2.0-rc.2 <0.3.0-0`（`package.json` 的 `engines.dsh`）。本包通过 Host 提供的 `ctx.skills` 注册 provider，遵循 `@deepseek-ai/dsh-skill` 的 registry API 与 candidate/definition 契约；该契约在 0.2.0-rc.2 与 0.2.1-rc.2 之间字节一致，`dsh.bundle.patch`、locale 与图标元数据在 0.2.0-rc.2 已经可用。
- **Node.js**：`>=22`（`engines.node`）。仅开发脚本与测试需要，插件本身运行在 DSH 内。
- **运行时依赖**：无。`dependencies` 为空，只使用 Node 内置模块，不 import DSH 内部包。

## 技能清单

<!-- skills:count:start -->
共 **32** 个技能，描述取自上游 frontmatter。
<!-- skills:count:end -->

<!-- skills:start -->
| Skill | Description (upstream frontmatter) |
| --- | --- |
| `cesiumjs` | Use when building browser-based 3D globes, 3D Tiles, CZML/time-dynamic data, or glTF models with npm cesium 1.146.0 — Viewer, Cesium3DTileset, Ion token (Cesium.Ion.defaultAccessToken), CESIUM_BASE_URL for Workers/Assets/Widgets, GCJ-02 tile offset, or debugging a black screen after a Vite/Webpack build. |
| `deck-gl` | Use when visualizing large geospatial datasets in the browser with deck.gl 9.4.0 — ScatterplotLayer/GeoJsonLayer, HexagonLayer/ScreenGridLayer aggregation, MVTLayer/TileLayer, @deck.gl/mapbox MapboxOverlay over MapLibre, or debugging blank canvases, stale data props and mismatched @deck.gl/* subpackage versions. |
| `gdal` | Use when processing geospatial raster/vector data via GDAL/OGR CLI — ogr2ogr format conversion (Shapefile/GeoPackage/GeoJSON), gdalwarp reprojection, gdal_translate, gdal_calc.py NDVI, COG, mosaicking, DEM contours, gdalinfo -json checks — or diagnosing "not recognized as a supported file format"; also covers the 3.9+ unified gdal raster / gdal vector CLI. |
| `gdal-api` | Use when programming against GDAL/OGR in C, C++, Python, Java, or .NET — raster/vector I/O, gdal.UseExceptions, OGRSpatialReference transforms, gdal.Translate / gdal.Warp, VRT/COG, or fixing "no driver registered" and UnsatisfiedLinkError; C++ gdal-config, Maven org.gdal:gdal 3.13.0, NuGet MaxRev.Gdal.Core. |
| `geometry-api-java` | Use when working with Esri geometry types (Point, Polyline, Polygon, Envelope) in Java — GeometryEngine, com.esri.geometry:esri-geometry-api:2.2.4, WKT/WKB/GeoJSON/Esri JSON I/O, geodesic distance; also when GeometryEngine has no intersects or WKB method and you need OperatorFactoryLocal, or when 2.3.1 coordinates fail to resolve on Maven Central. Esri Geometry API for Java. |
| `geometry-api-net` | Use when working with Esri geometry types (Point, Polyline, Polygon, Envelope) in .NET/C# — GeometryEngine, NuGet OpenGIS.Esri.Geometry.Core 1.0.9, WKT/EWKT, WKB, GeoJSON and Esri JSON I/O, System.Text.Json converters, geodesic distance; also for unclosed polygon rings, Geometry base-class casts after overlay, or the retired Esri/geometry-api-net repo. Esri Geometry API for .NET. |
| `geopandas` | Use when doing vector spatial analysis in Python — gpd.read_file/to_file via pyogrio (GPKG, Shapefile, GeoParquet), sjoin/sjoin_nearest, overlay, clip, dissolve, to_crs vs set_crs, gdf.plot choropleth; also for CRSError from a missing PROJ data dir, area/distance computed in degrees, or GeoDataFrame geometry-column conflicts. GeoPandas 1.2.0 extends pandas DataFrames with geometry columns. |
| `geopipe-agent` | Use when building YAML GIS pipelines with GeoPipeAgent — geopipe-agent validate/run, io.read_vector → vector.buffer → io.write_vector chains, 33 built-in steps, qc.geometry_validity/attribute_completeness/topology, native_python\|qgis_process\|gdal_cli backends, $step.output refs; also for validate "not registered" errors, silent when-condition skips, and resolve/knowledge capability gaps. 0.1.0, source install only (not on PyPI). |
| `geoserver` | Use when deploying GeoServer 3.0.x to publish WMS/WFS/WMTS/WCS/MVT, or configuring SLD/CSS styles, RBAC security, and GeoWebCache seeding. Covers geoserver-3.0.2-bin.zip, docker.osgeo.org/geoserver:3.0.2 on Java 17/21, /rest/about/version.json, blank GetMap from wrong native bounds, and Shapefile charset mojibake. |
| `geoserver-cloud` | Use when deploying GeoServer Cloud 3.0.2 on Docker Compose or Kubernetes — gateway serving WMS/WFS/WCS/WPS/GWC microservices under /geoserver/cloud, PgConfig vs datadir backends, RabbitMQ config-bus sync, Helm chart geoservercloud 3.0.2, and diagnosing 502s via actuator/health and Consul registration. |
| `geoserver-rest-api` | Use when automating GeoServer 3.0.2 over REST — POST /rest/workspaces, datastores, featuretypes, PUT Shapefile ZIP to file.shp, GeoTIFF to coveragestores, upload SLD as application/vnd.ogc.sld+xml, ?recurse=true deletes. curl -u admin:geoserver, single-key JSON like {"workspace":{...}}, 401 on POST but 200 on GET, GWC cache masking style changes. |
| `geotools` | Use when building Java GIS apps on GeoTools 35.2 (JDK 17) — org.geotools:gt-main / gt-shapefile / gt-geopkg / gt-epsg-hsql from repo.osgeo.org (not Maven Central), CQL/ECQL filters, CRS.decode plus JTS.transform reprojection, StreamingRenderer PNG output, and disposing DataStore/SimpleFeatureIterator. |
| `grass-gis` | Use when doing GIS geoprocessing with GRASS GIS headlessly — grass --exec and --tmp-project for servers and CI, g.region computational region management, r.* raster, v.* vector, r3.* 3D raster and t.* temporal modules, r.import/v.import data import, or Python scripting with grass.script, grass.script.array and grass.tools. |
| `jts` | Use when doing precise 2D computational geometry in Java with org.locationtech.jts:jts-core 1.20.0 — GeometryFactory construction, contains/intersects predicates, overlay via OverlayNGRobust, buffer, STRtree and PreparedGeometry speedups, WKT/WKB/GeoJSON I/O, and fixing TopologyException or unclosed rings. |
| `leaflet` | Use when adding lightweight 2D tile maps to web pages with leaflet 1.9.4 — L.map/L.tileLayer, markers, popups, GeoJSON overlays, layer control, [lat, lng] ordering, or debugging blank maps, broken default marker icons after bundling, and sizing fixed by invalidateSize(). |
| `mapbox-gl-js` | Use when building vector web maps with mapbox-gl 3.33.0 — WebGL rendering, Style Spec layers, data-driven expressions, setTerrain raster-dem, fill-extrusion, or debugging 401 'A valid Mapbox access token is required', 'Style is not done loading', and pk./sk. token handling. Note: v2+ is proprietary under Mapbox TOS and requires a token; MapLibre GL JS is the open-source fork. |
| `mapserver` | Use when publishing WMS/WFS/WCS/OGC API Features from a MapServer 8.6.6 .map mapfile — MAP/LAYER/CLASS/STYLE objects, STATUS/PROJECTION/EXTENT errors, WEB.METADATA wms_enable_request and wfs_enable_request, SLD binding, FastCGI plus MS_MAP_PATTERN hardening, and blank GetMap / "No query information to decode" symptoms. |
| `mapsui` | Use when embedding interactive 2D maps in .NET desktop (WPF/WinUI/WinForms) or mobile (MAUI/Avalonia/Blazor) apps with Mapsui 5.1.0 (net8.0/net9.0) — Mapsui.Wpf/Mapsui.Maui packages, Map and Layers, OpenStreetMap.CreateTileLayer, Shapefile/GeoJSON via Mapsui.Nts, SphericalMercator.FromLonLat, or fixing a blank MapControl. |
| `nettopologysuite` | Use when doing 2D computational geometry in .NET with NuGet NetTopologySuite 2.6.0 — GeometryFactory with SRID, Contains/Intersects predicates, Intersection/Union/Buffer overlays, STRtree, GeometryFixer, WKT/WKB/GeoJSON I/O, Shapefile via IO.Esri, and EF Core spatial queries on SQL Server/Npgsql. |
| `opengis-all` | Use when navigating end-to-end GIS workflows — GDAL CLI/API (ogr2ogr, gdalwarp, gdal_calc.py), qgis_process and PyQGIS analysis, GeoServer REST publishing, and OpenLayers/CesiumJS visualization. One-stop index covering the complete open-source GIS data pipeline. |
| `opengis-daf` | Use when building JSON-plan GIS analysis or QC pipelines with OpenGisDAF (.NET 10 / C# 14) — daf validate/run, operators buffer/clip/intersect_check/containment_check/coordinate_transform, DAG upstream bindings, GeoJSON/Shapefile/PostGIS sinks, qcMode QC reports, AssemblyLoadContext plugins; also for "zero tests ran" exit code 5, missing --recurse-submodules GDAL build errors, or PostGIS Layer already exists. Plan-driven ETL. |
| `opengis-utils-for-java` | Use when needing common GIS utilities in Java — OguLayerUtil layer read/write, GeometryUtil 60+ ops, CrsUtil CGCS2000 (EPSG:4490, 4502-4554), Shapefile/GeoJSON/FileGDB/PostGIS/land TXT I/O, topology validation; also for GDAL UnsatisfiedLinkError on gdal_jni, missing osgeo repo on GeoTools, or resolving com.znlgis.ogu4j:ogu4j:1.0.0 that is not on Maven Central. OGU4J. |
| `opengis-utils-for-net` | Use when needing common GIS utilities in .NET/C# — OguLayerUtil ReadLayer/WriteLayer/ConvertFormat, GeometryUtil 50+ ops, CrsUtil CGCS2000 transforms, Shapefile/GeoJSON/FileGDB/GeoPackage/KML/PostGIS I/O; also for Unable to load DLL gdal / DllNotFoundException, GBK shapefile mojibake, or ArgumentException from Geojson2Wkt on a whole FeatureCollection. OpenGIS.Utils 1.1.2. |
| `openlayers` | Use when adding interactive 2D maps to web apps with npm ol 10.11.0 — Map/View, fromLonLat to EPSG:3857, WMS/WMTS/XYZ sources, MVT with featureClass, Draw/Modify/Snap interactions, or debugging blank layers (missing setStyle), offset centers and ol/... module-not-found errors. |
| `pdal` | Use when processing point cloud data (LAS/LAZ/BPF/EPT/COPC) via CLI or Python — pipeline JSON workflows, format conversion, reprojection, cropping, outlier removal, ground classification (SMRF), and DEM generation from LiDAR. PDAL (Point Data Abstraction Library) is the point cloud equivalent of GDAL: pdal info/translate/pipeline commands plus pdal.Pipeline Python bindings. |
| `postgis` | Use when extending PostgreSQL with PostGIS 3.6.4 — geometry/geography/raster types, GiST and KNN <-> indexes, ST_Intersects/ST_Buffer/ST_Transform/ST_AsMVT, shp2pgsql -I and raster2pgsql import, and fixing "Operation on mixed SRID", slow spatial joins, and invalid polygons with ST_MakeValid. |
| `proj` | Use when transforming coordinates or inspecting CRS definitions from the command line — cs2cs, projinfo -s/-t, proj projection math, cct, EPSG lookup, datum shift with grid files, WKT/PROJJSON export, or debugging "Cannot find proj.db" and latitude-first axis order. PROJ 9.9.0: the OSGeo engine behind GDAL/QGIS, with the proj.db SQLite database. |
| `pyqgis` | Use when scripting QGIS with Python — QgsApplication standalone init, QgsVectorLayer / QgsRasterLayer loading, processing.run after Processing.initialize(), QgsGeometry / QgsExpression, QgsMapSettings rendering and QgsLayoutExporter PDF/PNG export, qgis._3d, or debugging "import qgis.core" failures. PyQGIS for QGIS 4.2.3 and LTR 3.44.15, Python 3.12. |
| `qgis-process` | Use when running QGIS geoprocessing headless via qgis_process — native:buffer / native:reprojectlayer / native:clip, qgis_process list / help --json / run --json, .model3 models and .py scripts, batch CI pipelines, or debugging "Algorithm ... not found!"; includes QT_QPA_PLATFORM=offscreen and the qgis/qgis images (stable 4.2, ltr 3.44). |
| `qgis-server` | Use when publishing QGIS projects (.qgs/.qgz) as OGC web services — WMS GetMap/GetPrint, WFS and WFS-T, WMTS, OGC API Features via qgis_mapserv.fcgi with Apache mod_fcgid, Nginx, or Docker, plus QGIS_SERVER_* tuning (MAX_THREADS, PARALLEL_RENDERING, LOG_STDERR); covers "Service unknown or unsupported" and MAP/GetCapabilities checks. QGIS 4.2.3 and LTR 3.44.15. |
| `shapely` | Use when doing computational geometry in Python — shapely.intersection/union/buffer/convex_hull/simplify, STRtree queries, from_wkt/to_wkt/to_geojson, make_valid, GEOS-gated ops (coverage_clean, split); also for TopologyException on self-intersecting polygons or OOP vs function buffer quad_segs mismatch. Shapely 2.2.0 binds GEOS. |
| `sharpmap` | Use when rendering 2D maps in legacy .NET Framework 4.7.2 WinForms or ASP.NET WebForms apps with SharpMap 1.2.0 — Map.GetMap() to PNG, ShapeFile/PostGIS providers, VectorLayer with CustomTheme, TileAsyncLayer via BruTile, ProjNet4GeoAPI transforms, or debugging blank output and GDI+ handle leaks. New projects should use Mapsui. |
<!-- skills:end -->

## 安装

### 方式一：Plugins 界面（本地目录，适合开发）

1. 在 DSH 中打开 **Plugins / 插件** 页面，选择安装 bundle（本地目录方式）。
2. 目标填**包根目录**的绝对路径，也就是包含 `package.json` 的目录，例如本仓库 `D:\self\code\dsh-opengis-skill`。
3. 安装后在列表中找到 **OpenGIS 技能包** 并启用；记录写入当前所选 profile 的插件配置。
4. 本地目录方式直接引用源码目录，改动会随重载生效，适合开发与试用；正式使用建议走下面的 npm 方式，便于升级与版本校验。

### 方式二：npm

```bash
dsh plugin --profile <profile> add @dsh-gis/dsh-opengis-skill
```

安装后在 Plugins 页面启用该 bundle。卸载：

```bash
dsh plugin --profile <profile> remove @dsh-gis/dsh-opengis-skill
```

- desktop profile 由 Electron 应用独占，推荐直接使用 Plugins 界面操作。
- 安装、升级或启停之后，需要重载/重启 dsh，并**新开会话**，技能目录才会反映最新状态（bundle 与技能目录在会话启动时装配）。
- 升级到新版本后同样需要重载 + 新会话；本地目录方式改动 `package.json` 或 `assets/` 后也一样。

## 使用

- 技能目录只列出每个技能的名称与描述；模型用 `skill("gdal")` 之类的调用加载，用户也可以在输入框直接输入 `/gdal`。
- 常用入口：
  - `opengis-all` — 端到端 GIS 流程索引（GDAL → 处理 → GeoServer → 可视化）；
  - `gdal` / `gdal-api` — 命令行与编程式栅格/矢量处理；
  - `qgis-process` / `pyqgis` — QGIS 批处理与二次开发；
  - `geoserver` + `geoserver-rest-api` — 发布与管理 OGC 服务；
  - `postgis` — 空间数据库；`proj` — 坐标转换；
  - `openlayers` / `cesiumjs` / `deck-gl` — Web 2D/3D 可视化。
- 加载结果会给出该技能的 **Base directory**；正文中的 `reference/*.md` 与 `../<其他技能>/SKILL.md` 相对链接都据此解析。因为全部技能资产随同一个包一起分发，跨技能链接不需要额外安装或配置。

## DeepSeek Harness 适配

- 每个技能正文末尾都有 `## DeepSeek Harness 使用建议`：先加载哪个技能、哪些 `reference/*.md` 值得按需读取、先跑什么版本探测命令、产物怎样重新打开验证、哪些操作要先征得用户同意。
- 命令统一走 DSH 的 shell 工具：Windows 用 `pwsh`；若当前会话只暴露 `run_code`，则在其中调用 `tools.pwsh`。正文里的 Bash 示例（`sudo`、`/tmp`、heredoc、反引号）按平台改写。
- 文件与日志优先用 `read` / `grep` / `glob` 分段读取；大输出先落盘，长任务放后台作业。技能目录和运行时是只读资源，脚本与产物写到会话工作区。
- 技能正文标注的是 2026-10-20 核验的上游版本（例如 GeoServer 3.0.2、GeoTools 35.2、QGIS 4.2.3 / LTR 3.44.15、GDAL 3.13.3）。实际环境版本不同时，先探测版本，再按“低版本降级”或“高版本新增 API”说明差异，不要照搬不存在的命令。
- 技能只是领域知识与执行约定，不会替你安装工具、绕过沙箱或读取凭据；安装依赖、启动服务、覆盖数据、执行破坏性 SQL 前先向用户确认，命令输出中不要回显密码与 token。

## 上游同步

> 本节只适用于**本仓库的源码开发**。`scripts/` 与 `test/` 不在 npm 发布包内（`package.json` 的 `files` 未包含它们），安装用户无需执行这些命令。

```bash
# 默认从 ../opengis-skills 读取，也可用 --from 或 OPENGIS_SKILLS_DIR 指定
npm run sync -- --from ../opengis-skills

# 只检查是否与上游一致（CI 可用）
npm run sync:check -- --from ../opengis-skills
```

同步脚本会：逐文件复制 `gis/<skill>/`（文本统一为 LF，保证与上游 git blob 跨平台字节一致）、校验 frontmatter（name 必须为 kebab-case 且与目录同名）、清理上游已删除的技能目录、更新 `upstream.json`，并重新生成 README 中的技能数量与技能表（生成区域由 `<!-- skills:count:* -->` 与 `<!-- skills:* -->` 标记界定）。`sync:check` 做双向比较：既检查已同步文件是否漂移，也检查上游新增/删除的技能是否遗漏。

为避免伪造来源，`npm run sync` 要求 `--from` 指向 opengis-skills 的 **git 检出根目录**：脚本用 `git rev-parse --show-toplevel` 校验该目录就是仓库根，避免把外层仓库的 HEAD 误记成上游 commit；无法证明 commit 时同步直接失败。上游 `gis/` 下若出现没有 `SKILL.md` 的目录，同步会报错而不是静默跳过（否则上游改名会静默丢技能）；`gis/` 根目录的普通文件（上游分类索引 `gis/SKILL.md` 等）不参与同步，也不会被当作技能打包。

`upstream.json` 同时是一份完整性清单：`schemaVersion` 为 `1`，`hashAlgorithm` 为 `"sha256"`，`files` 以相对 `assets/` 的 POSIX 路径为键、对应文件的 SHA-256 摘要为值。`npm run validate` 会重新计算并比对全部摘要，因此**不依赖上游 checkout** 也能发现资产被手改、缺失或未列入清单的情况；CI 的 `sync` 任务再用固定 commit 的上游检出做一次 `sync:check`，确保快照与上游一致。

## 开发

需要 Node.js 22+。

```bash
npm run check       # validate + test，发布前必跑（也是 prepublishOnly）
npm run validate    # 资产、元数据、bundle 接线、完整性清单与断链校验
npm test            # Node 内置测试运行器
npm pack --dry-run  # 查看实际发布内容
```

编辑器默认值见 [.editorconfig](./.editorconfig)（UTF-8、LF、最终换行；JS/MJS 用 Tab，JSON/YAML/Markdown 用 2 空格；Markdown 保留行尾空格）。版本变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

### 目录结构

```text
dsh-opengis-skill/
├── package.json                  # dsh.bundle.patch、engines、files、图标/本地化导出
├── cordis.patch.yml              # bundle 层：把 opengis-skill provider 行插入 Host
├── lib/
│   ├── index.js                  # provider 插件（注册 ctx.skills、list/get）
│   ├── catalog.js                # 扫描 assets/ 构建技能目录、生成 README 区域
│   ├── markdown-links.js         # Markdown 相对链接解析与断链校验
│   ├── skill-file.js             # SKILL.md frontmatter 解析（插件/脚本/测试共用）
│   └── *.d.ts                    # 手写类型声明
├── assets/<skill>/               # 技能资产（SKILL.md + reference/*.md，随上游同步）
├── locale/{en,zh}.json           # Plugins 里显示的标题与描述
├── icon.svg                      # bundle 图标
├── scripts/
│   ├── sync-opengis-skills.mjs   # 上游同步（assets/、upstream.json、README 生成区域）
│   └── validate-skills.mjs       # 发布前校验（自包含，无需上游 checkout）
├── test/
│   ├── plugin.test.mjs           # provider 目录/加载/链接
│   ├── skill-file.test.mjs       # frontmatter 解析
│   ├── catalog.test.mjs          # 目录构建与 README 生成区域
│   ├── markdown-links.test.mjs   # 相对链接解析与断链检测
│   └── scripts.test.mjs          # 同步/校验脚本（临时目录夹具）
├── .editorconfig                 # 编辑器默认值
├── CHANGELOG.md                  # 版本变更记录
├── README.md
└── upstream.json                 # 上游仓库、commit、同步时间、技能清单与 SHA-256 清单
```

### 设计说明

- **规范注册**：`apply` 时调用 `ctx.skills.registerProvider(() => provider)`；返回的 disposer 由调用方 fiber 拥有，卸载时自动清理，因此**不需要**再套一层 `ctx.effect(...)`。
- provider 名为 `opengis`，`source` 为 `opengis`，候选 rank 为 600（即 `BUNDLED_SKILL_RANK`，与官方内置技能包一致），`invocation` 为模型与用户均可调用。
- `list` 只返回元数据（名称、描述、rank、source、`locator`/`path`、`resourceBase`）；`get` 每次重新读盘并解析正文，因此编辑资产后重新加载插件即可生效，无需清缓存。插件不注册工具、不注入提示段、不写会话状态。
- **运行时加固**：frontmatter 解析严格且容忍 UTF-8 BOM（`name` 必须为 kebab-case、`description` 必填，未闭合引号或块标量会报可读错误）；`assets/` 缺失时报错会指明期望的资产根目录；`resourceBase` 在 Windows 上也统一输出为正斜杠，跨平台链接一致。
- 相对链接不做改写：包内是全量技能目录，`reference/*.md` 与 `../<skill>/SKILL.md` 都能解析；`npm run validate` 会扫描全部 Markdown 相对链接，断链或越出 `assets/` 都会失败。

## 故障排查

- **技能目录没有出现**：确认 bundle 已在 Plugins 中启用；安装、升级或启停后需要重载/重启 dsh 并新开会话。若用本地目录方式，确认填的是包含 `package.json` 的包根目录。
- **加载技能失败**：错误信息会带出具体资产路径（例如 `.../assets/gdal/SKILL.md` 的 frontmatter 问题）；按提示修复，或从上游重新同步，不要手工编辑 `assets/`。
- **本地验证**：`npm run validate` 检查资产、元数据、bundle 接线、完整性清单与链接；`npm test` 跑单元测试；发布前统一用 `npm run check`。
- **同名技能冲突**：技能注册表按 rank、再按注册顺序决定同名技能的解析优先级；本包 rank 为 600。若其他 provider 也提供了同名技能，检查是否有另一份 OpenGIS 技能包或自定义技能被同时启用。
- **不要手改 `assets/`**：它是上游快照，手工修改会导致 SHA-256 完整性校验与同步检查失败；需要改内容时先改上游，再 `npm run sync` 重新生成。

## 与 @dsh-gis 其他插件的关系

- `@dsh-gis/dsh-gis`：GIS 工具与地图界面（inspect/query/CRS/OGC/UI）。
- `@dsh-gis/dsh-prompt-gis`：一段 GIS system-prompt 与两个内联技能（`gis-inspect-first`、`gis-query-patterns`）。
- 本包：纯知识型技能包，不提供工具，可与上述插件同时安装。

## 许可

MIT，见 [LICENSE](./LICENSE)。技能正文与参考资料来自 [opengis-skills](https://github.com/znlgis/opengis-skills)（MIT © 2024-2026 znlgis），详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
