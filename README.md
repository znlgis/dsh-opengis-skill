# @dsh-gis/dsh-opengis-skill

DeepSeek Harness 的 **OpenGIS 技能包插件**：把 [opengis-skills](https://github.com/znlgis/opengis-skills) 中 **gis/ 分类的 32 个 GIS 技能**打包成可安装、可启停的 DSH bundle。会话技能目录只列出名称与描述，技能正文与参考资料按需加载。

## 特性

- **32 个 GIS 技能**：GDAL、GDAL API、QGIS（qgis_process / PyQGIS / QGIS Server）、GeoServer（含 REST API 与 Cloud）、MapServer、PostGIS、PROJ、PDAL、GRASS GIS、JTS、NetTopologySuite、Esri Geometry API（Java/.NET）、Shapely、GeoPandas、GeoPipeAgent、OpenGisDAF、CesiumJS、OpenLayers、Leaflet、Mapbox GL JS、deck.gl、SharpMap、Mapsui、GeoTools、OpenGIS Utils（Java/.NET）、opengis-all 全流程索引。
- **按需加载**：注册的是 skill provider（`ctx.skills.registerProvider`），发现阶段只读 frontmatter；正文每次加载时读取，参考资料（`reference/*.md`）通过技能目录（resource base）相对解析。
- **零运行时依赖**：只用 Node 内置模块，npm 包内自带全部资产（约 640 KB），不 import DSH 内部包。
- **可同步上游**：`npm run sync` 从 opengis-skills 检出复制资产，记录上游 commit 到 `upstream.json`，并重新生成本文下方技能表。
- **可启停**：单包同时是 bundle 与插件（`dsh.bundle.patch` 插入自身行），在 Plugins 里启用/停用即可。

## 技能清单

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

1. 打开 DSH 的 **Plugins / 插件** 页面，选择安装 bundle（安装本地包目录）。
2. 目标填本仓库的绝对路径，例如 `D:\self\code\dsh-opengis-skill`。
3. 在列表中找到 **OpenGIS 技能包** 并启用。

### 方式二：npm

```bash
dsh plugin --profile <profile> add @dsh-gis/dsh-opengis-skill
```

安装后在 Plugins 页面启用该 bundle。desktop profile 由 Electron 应用独占，推荐直接用 Plugins 界面操作；安装、升级或启停之后，需要新会话（或重启 dsh）才会出现最新的技能目录。

## 使用

- 技能目录会列出 32 个技能的名称与描述；模型用 `skill("gdal")` 之类的调用加载，用户也可以在输入框直接输入 `/gdal`。
- 常用入口：
  - `opengis-all` — 端到端 GIS 流程索引（GDAL → 处理 → GeoServer → 可视化）；
  - `gdal` / `gdal-api` — 命令行与编程式栅格/矢量处理；
  - `qgis-process` / `pyqgis` — QGIS 批处理与二次开发；
  - `geoserver` + `geoserver-rest-api` — 发布与管理 OGC 服务；
  - `postgis` — 空间数据库；`proj` — 坐标转换；
  - `openlayers` / `cesiumjs` / `deck-gl` — Web 2D/3D 可视化。
- 加载结果会给出该技能的 Base directory；正文中的 `reference/*.md` 与 `../<其他技能>/SKILL.md` 相对链接都据此解析（资源随包全量分发）。

## 上游同步

```bash
# 默认从 ../opengis-skills 读取，也可用 --from 或 OPENGIS_SKILLS_DIR 指定
npm run sync -- --from ../opengis-skills

# 只检查是否与上游一致（CI 可用）
npm run sync:check -- --from ../opengis-skills
```

同步脚本会：逐文件复制 `gis/<skill>/`（不含任何改写）、校验 frontmatter（name 必须为 kebab-case 且与目录同名）、清理上游已删除的技能目录、更新 `upstream.json`（仓库地址、commit、同步时间、技能清单）以及本文的技能表。

## 开发

```bash
npm test            # Node 内置测试运行器，覆盖 provider 目录/加载/链接
npm run validate    # 资产、元数据、bundle 接线与打包校验
npm pack --dry-run  # 查看实际发布内容
```

### 目录结构

```text
dsh-opengis-skill/
├── package.json            # dsh.bundle.patch、engines、files、icons/locales 导出
├── cordis.patch.yml        # bundle 层：把 opengis-skill provider 行插入 Host
├── lib/
│   ├── index.js            # provider 插件（扫描 assets、注册 ctx.skills）
│   ├── skill-file.js       # SKILL.md frontmatter 解析（插件/脚本/测试共用）
│   └── *.d.ts              # 手写类型声明
├── assets/<skill>/         # 32 个技能资产（SKILL.md + reference/*.md，随上游同步）
├── locale/{en,zh}.json     # Plugins 里显示的标题与描述
├── icon.svg                # bundle 图标
├── scripts/                # 同步与校验脚本
├── test/plugin.test.mjs    # 单元测试
└── upstream.json           # 上游仓库、commit、同步时间与技能清单
```

### 设计说明

- `apply` 时扫描 `assets/*/SKILL.md`，解析并校验名称与描述，然后 `ctx.effect(() => ctx.skills.registerProvider(...))`；provider 名为 `opengis`，候选 rank 为 600（与官方内置技能包一致），模型与用户均可调用。
- 目录（list）只含元数据；正文（get）每次重新读盘，因此编辑资产后重新加载插件即可生效，无需清缓存。插件不注册工具、不注入提示段、不写会话状态。
- 相对链接不做改写：包内是全量 32 个技能目录，`reference/*.md` 与 `../<skill>/SKILL.md` 都能解析；如果将来裁剪技能，`npm run validate` 会报断链。

## 与 @dsh-gis 其他插件的关系

- ```dsh-gis/dsh-gis`：GIS 工具与地图界面（inspect/query/CRS/OGC/UI）。
- ```dsh-gis/dsh-prompt-gis`：一段 GIS system-prompt 与两个内联技能（`gis-inspect-first`、`gis-query-patterns`）。
- 本包：纯知识型技能包（32 个 GIS 技能），不提供工具，可与上述插件同时安装。

## 许可

MIT，见 [LICENSE](./LICENSE)。技能正文与参考资料来自 [opengis-skills](https://github.com/znlgis/opengis-skills)（MIT © 2024-2026 znlgis），详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
