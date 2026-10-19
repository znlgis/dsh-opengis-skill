# @dsh-gis/dsh-opengis-skill

> **English summary** — A DeepSeek Harness bundle that packages the `gis/` skills of
> [opengis-skills](https://github.com/znlgis/opengis-skills) as installable, toggleable skills.
> The session catalog lists names and descriptions only; skill bodies and their
> `reference/*.md` files are loaded on demand. Zero runtime dependencies: every asset
> ships inside the npm package.
>
> Compatibility: DeepSeek Harness `>=0.2.0-rc.2 <0.3.0-0`; Node.js `>=22` for development
> only. MIT licensed.

DeepSeek Harness 的 **OpenGIS 技能包插件**：把 [opengis-skills](https://github.com/znlgis/opengis-skills) 中 `gis/` 分类的 GIS 技能打包成可安装、可启停的 DSH bundle。会话技能目录只列出名称与描述，技能正文与参考资料按需加载。

## 特性

- **覆盖 GIS 全链路**：GDAL、GDAL API、QGIS（qgis_process / PyQGIS / QGIS Server）、GeoServer（含 REST API 与 Cloud）、MapServer、PostGIS、PROJ、PDAL、GRASS GIS、JTS、NetTopologySuite、Esri Geometry API（Java/.NET）、Shapely、GeoPandas、GeoPipeAgent、OpenGisDAF、CesiumJS、OpenLayers、Leaflet、Mapbox GL JS、deck.gl、SharpMap、Mapsui、GeoTools、OpenGIS Utils（Java/.NET），以及 `opengis-all` 全流程索引。
- **按需加载**：注册的是 skill provider（`ctx.skills.registerProvider`），发现阶段只读 frontmatter；正文每次加载时读取，参考资料（`reference/*.md`）通过技能目录（resource base）相对解析。
- **零运行时依赖**：只用 Node 内置模块，不 import DSH 内部包；全部资产随 npm 包分发，整个包解包后约 670 KiB。
- **可同步上游**：`npm run sync` 从 opengis-skills 检出复制资产，记录上游 commit 与每个文件的 SHA-256 到 `upstream.json`，并重新生成本文下方技能清单。
- **可启停**：单包同时是 bundle 与插件（`dsh.bundle.patch` 插入自身行），在 Plugins 里启用/停用即可。

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
| `cesiumjs` | Use when building browser-based 3D globes, 3D Tiles visualization, time-dynamic geospatial data, or virtual globe applications. CesiumJS: high-performance WebGL 3D geospatial engine for interactive earth visualization. |
| `deck-gl` | Use when visualizing large geospatial or tabular datasets in the browser with GPU rendering — millions of points, GeoJSON polygons, vector tiles, aggregation layers (hexagon, screen grid, heatmap), and overlaying them on a MapLibre/Mapbox GL JS base map via @deck.gl/mapbox. |
| `gdal` | Use when processing geospatial raster/vector data via command line — format conversion (Shapefile to GeoJSON), reprojection, DEM analysis, NDVI calculation, mosaicking. GDAL/OGR CLI: the industry standard for batch geospatial data processing with 50+ command-line tools (ogr2ogr, gdalwarp, gdal_translate, gdal_calc). |
| `gdal-api` | Use when programming against GDAL/OGR in C, C++, Python, Java, or .NET for raster/vector I/O, coordinate transformation, or custom geospatial algorithms. GDAL API: low-level programming interface for reading/writing 70+ geospatial formats. |
| `geometry-api-java` | Use when working with Esri geometry types (Point, Polyline, Polygon, Envelope) in Java — spatial operations, JSON/GeoJSON/WKT I/O, geodesic calculations. Esri Geometry API for Java. |
| `geometry-api-net` | Use when working with Esri geometry types (Point, Polyline, Polygon, Envelope) in .NET/C# — spatial operations, JSON/GeoJSON/WKT I/O, geodesic calculations. Esri Geometry API for .NET. |
| `geopandas` | Use when performing vector spatial data analysis in Python — reading/writing shapefiles, spatial joins, overlay operations, choropleth maps. GeoPandas: extends pandas DataFrames with geometry columns for Pythonic spatial analysis. |
| `geopipe-agent` | Use when building AI-driven GIS data pipelines with YAML-defined steps — format conversion, spatial validation, QC reporting, and self-extending capability gaps. GeoPipe Agent: YAML-driven GIS ETL pipeline agent with a built-in offline GIS knowledge layer. |
| `geoserver` | Use when deploying OGC-compliant map services (WMS, WFS, WMTS, WCS) or configuring SLD styling, security, and tile caching. GeoServer: the leading open-source Java map server for publishing spatial data to the web. |
| `geoserver-cloud` | Use when deploying GeoServer on Kubernetes as cloud-native microservices with auto-scaling, service discovery, and centralized configuration. GeoServer Cloud: break monolithic GeoServer into independently scalable WMS/WFS/WCS services. |
| `geoserver-rest-api` | Use when automating GeoServer management — programmatic workspace, datastore, and layer creation, style upload, service configuration via REST API. GeoServer REST API: manage GeoServer without GUI using curl, Python, or any HTTP client. |
| `geotools` | Use when building Java GIS applications — feature reading/writing, coordinate transformations, map styling, spatial filters, WMS/WFS clients. GeoTools: the Java GIS toolkit and OGC standards reference implementation. |
| `grass-gis` | Use when doing GIS geoprocessing with GRASS GIS headlessly — grass --exec and --tmp-project for servers and CI, g.region computational region management, r.* raster, v.* vector, r3.* 3D raster and t.* temporal modules, r.import/v.import data import, or Python scripting with grass.script, grass.script.array and grass.tools. |
| `jts` | Use when performing precise 2D computational geometry in Java — spatial predicates (contains, intersects), overlay operations, buffering, triangulation. JTS (Java Topology Suite): the canonical geometry engine used as blueprint for GEOS, Shapely, and NetTopologySuite. |
| `leaflet` | Use when adding lightweight interactive 2D maps to web pages — tile layers, markers, GeoJSON overlays, layer control, popups. Leaflet: compact, mobile-friendly open-source JavaScript web mapping library. |
| `mapbox-gl-js` | Use when building interactive vector web maps with Mapbox GL JS — WebGL rendering, Style Spec, data-driven expressions, 3D terrain, layer-level events. Note: v2+ is proprietary under Mapbox TOS with an access token requirement; MapLibre GL JS is the open-source API-compatible fork. |
| `mapserver` | Use when publishing spatial data as OGC web services (WMS, WFS, WCS) from a mapfile, styling layers with SLD, or deploying the mapserv CGI/FastCGI. MapServer: the C-based OSGeo open-source map server for the web. |
| `mapsui` | Use when embedding interactive 2D maps in .NET desktop (WinForms/WPF) or mobile (MAUI) applications — tile layers, vector features, map controls. Mapsui: cross-platform .NET map component library. |
| `nettopologysuite` | Use when performing 2D computational geometry in .NET — spatial predicates, overlay operations, buffering, WKT/WKB I/O. NetTopologySuite: the .NET port of JTS, available via NuGet for spatial analysis in C# applications. |
| `opengis-all` | Use when navigating end-to-end GIS workflows — discover the full toolchain from GDAL data processing through GeoServer publishing to CesiumJS/OpenLayers visualization. One-stop index covering the complete open-source GIS data pipeline. |
| `opengis-daf` | Use when building plan-driven GIS data analysis or data quality-check pipelines with OpenGisDAF (.NET 10 / C# 14): define buffer, clip, intersect/containment checks, coordinate transform, field calculator, attribute/geometry QC rules purely in JSON plans, run the daf CLI, chain operators via DAG upstream bindings, output to GeoJSON/Shapefile/PostGIS, or extend with plugin operators loaded via AssemblyLoadContext. |
| `opengis-utils-for-java` | Use when needing common GIS utility functions in Java — CRS utilities, geometry helpers, format converters, spatial validation. OpenGIS Utils for Java: convenience toolkit for Java GIS projects. |
| `opengis-utils-for-net` | Use when needing common GIS utility functions in .NET/C# — CRS utilities, geometry helpers, format converters, spatial validation. OpenGIS Utils for .NET: convenience toolkit for .NET GIS projects. |
| `openlayers` | Use when adding interactive 2D maps to web applications — WMS/WFS/WMTS layers, vector styling, map controls, popups. OpenLayers: the most full-featured open-source JavaScript web mapping library. |
| `pdal` | Use when processing point cloud data (LAS/LAZ/BPF/EPT/COPC) via CLI or Python — pipeline JSON workflows, format conversion, reprojection, cropping, outlier removal, ground classification (SMRF), and DEM generation from LiDAR. PDAL (Point Data Abstraction Library) is the point cloud equivalent of GDAL: pdal info/translate/pipeline commands plus pdal.Pipeline Python bindings. |
| `postgis` | Use when extending PostgreSQL with spatial data types, spatial indexes (GiST/SP-GiST), geometry functions (ST_Intersects, ST_Buffer, ST_Transform), and spatial queries. PostGIS: the most widely used open-source spatial database extension. |
| `proj` | Use when performing coordinate reference system (CRS) transformation, reprojection, datum shift or EPSG lookup from the command line — converting coordinates between WGS 84, UTM, Web Mercator and CGCS2000. PROJ: the OSGeo library that powers GDAL/QGIS transformations, with projinfo, cs2cs, proj, cct and the proj.db SQLite database. |
| `pyqgis` | Use when extending QGIS with Python plugins, automating map composition, or scripting QGIS processing algorithms. PyQGIS: QGIS Python API for custom tools, processing scripts, and plugin development. |
| `qgis-process` | Use when running QGIS geoprocessing tools headless from command line or CI/CD — buffer, clip, reproject, raster analysis without GUI. QGIS Processing: batch spatial analysis via qgis_process CLI. |
| `qgis-server` | Use when publishing QGIS projects (.qgs/.qgz) as OGC web services (WMS, WFS, WMTS, OGC API Features) via FastCGI, Docker, or Apache/Nginx, and when tuning QGIS_SERVER_* environment variables. QGIS Server: the C++ map server that renders QGIS Desktop projects over HTTP. |
| `shapely` | Use when performing computational geometry in Python — intersection, union, buffer, convex hull, simplification. Shapely: Python bindings for GEOS, the C++ geometry engine that powers PostGIS. |
| `sharpmap` | Use when rendering 2D maps in legacy .NET WinForms or ASP.NET WebForms applications. SharpMap: an older .NET 2D mapping library. For new projects, prefer Mapsui. |
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
