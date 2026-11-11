# @dsh-gis/dsh-opengis-skill

> **English summary** — A DeepSeek Harness bundle that packages the `gis/` skills of
> [opengis-skills](https://github.com/znlgis/opengis-skills) as installable, toggleable skills.
> The session catalog lists names and descriptions only; skill bodies and their
> `reference/*.md` files are loaded on demand. Vendored bodies stay byte-identical to
> upstream, and a separate `adaptations/` layer is appended when a skill is loaded —
> one DeepSeek Harness guidance block per skill plus a shared one (tool mapping,
> Windows rewrites, background jobs, spill files, artifact verification, consent gates,
> sandbox semantics, optional-plugin fallbacks). A per-skill block must name at least
> two *core* harness tools and give a concrete probe command and a concrete verification
> command, so the layer stays about *this* harness instead of repeating tool-agnostic
> advice the upstream bodies already carry; optional-plugin tools (Agent Teams, desktop
> control, scheduled tasks) may be cited only together with their fallback. Upstream routing
> metadata (`metadata.category` and `metadata.tags` from the Agent Skills six-field
> frontmatter) is exposed on the provider candidate. Zero runtime dependencies: every
> asset ships inside the npm package.
>
> Compatibility: DeepSeek Harness `>=0.2.0-rc.2 <0.3.0-0`; Node.js `>=22` for development
> only. MIT licensed.

DeepSeek Harness 的 **OpenGIS 技能包插件**：把 [opengis-skills](https://github.com/znlgis/opengis-skills) 中 `gis/` 分类的 GIS 技能打包成可安装、可启停的 DSH bundle。会话技能目录只列出名称与描述，技能正文与参考资料按需加载。

## 特性

- **覆盖 GIS 全链路（45 个技能）**：GDAL、GDAL API、QGIS（qgis_process / PyQGIS / QGIS Server）、GeoServer（含 REST API 与 Cloud）、GeoNode、MapServer、PostGIS、DuckDB Spatial、SpatiaLite、PROJ、ProjNet4GeoAPI、PDAL、GRASS GIS、WhiteboxTools、JTS、NetTopologySuite、Esri Geometry API（Java/.NET）、GEOS、Shapely、GeoPandas、GeoPipeAgent、OpenGisDAF、CesiumJS、OpenLayers、Leaflet、BruTile、Mapbox GL JS、MapLibre GL JS、MapLibre Native、deck.gl、Kepler.gl、GeoLibre、OpenDroneMap、STAC/COG/TiTiler、SharpMap、Mapsui、GeoTools、OpenGIS Utils（Java/.NET），以及 `opengis-all` 全流程索引。
- **按需加载**：注册的是 skill provider（`ctx.skills.registerProvider`），发现阶段只读 frontmatter；正文每次加载时读取，参考资料（`reference/*.md`）通过技能目录（resource base）相对解析。
- **零运行时依赖**：只用 Node 内置模块，不 import DSH 内部包；全部资产与适配文件随 npm 包分发，整个包解包后约 1.2 MB（其中技能资产 910 kB、适配层 147 kB），npm tarball 约 450 kB（138 个文件）。
- **可同步上游**：`npm run sync` 从 opengis-skills 检出复制资产，记录上游 commit 与每个文件的 SHA-256 到 `upstream.json`，并重新生成本文下方技能清单。
- **可启停**：单包同时是 bundle 与插件（`dsh.bundle.patch` 插入自身行），在 Plugins 里启用/停用即可。
- **分层适配 DSH**：`assets/` 保持上游逐字节快照（SHA-256 清单可校验），DSH 专属建议单独放在 `adaptations/`：`common.md` 是通用执行约定（技能加载、引用分段读取、`ops_bash`/`pwsh`/`run_code` 分工、Windows 改写、后台作业、产物验证、`present` 交付、`ask_user_question` 确认、沙箱与审批）；`<skill>.md` 是该技能的执行建议（按需读哪个 reference、命令跑在哪、先探测什么版本、产物怎么验证、哪些操作要先确认）。加载技能时由 provider 把两段拼到正文之后，技能正文保持原样。
- **适配层强制体现 harness**：每个 `<skill>.md` 必须 900–4000 字符、含 5 个固定要点（加载与引用 / 执行环境 / 先探测版本 / 验证产物 / 风险与权限），至少点名 **2 个核心工具**（`ops_bash`、`read`、`job_output`、`read_image`、`ask_user_question` 等随包工具），并且「先探测版本」「验证产物」两条必须各带一条反引号命令——只写「检查一下」会被 `npm run validate` 拒绝。工具白名单按可用性拆成 `CORE_TOOLS`（每个受支持版本都有）与 `OPTIONAL_TOOLS`（Agent Teams、桌面控制、定时任务等可选插件），可选工具不计入最低数，且必须与「没有就退回」的备份方案一起写。
- **上游路由元数据透出**：provider 解析上游六字段 frontmatter 里的 `metadata.category` 与 `metadata.tags`，作为 candidate 的 `metadata` 交给宿主（`SkillCandidate.metadata`），描述与本地化仍走 `description`；解析器同时保留字段顺序，供校验确认没有引入规范外字段。

## 兼容性

- **DeepSeek Harness**：`>=0.2.0-rc.2 <0.3.0-0`（`package.json` 的 `engines.dsh`）。本包通过 Host 提供的 `ctx.skills` 注册 provider，遵循 `@deepseek-ai/dsh-skill` 的 registry API 与 candidate/definition 契约；该契约在 0.2.0-rc.2 与 0.2.1-rc.2 之间字节一致，`dsh.bundle.patch`、locale 与图标元数据在 0.2.0-rc.2 已经可用。
- **candidate `metadata`**：宿主契约里的 `SkillCandidate` 与 `SkillDefinition` 都声明了可选的 `metadata`，本包只放在 candidate 上；即使某个更早的宿主版本没有声明该字段，按候选对象读取 provider 的实现也只是忽略多余键，不会影响名称、描述与正文加载。
- **Node.js**：`>=22`（`engines.node`）。仅开发脚本与测试需要，插件本身运行在 DSH 内。
- **运行时依赖**：无。`dependencies` 为空，只使用 Node 内置模块，不 import DSH 内部包。

## 技能清单

<!-- skills:count:start -->
共 **45** 个技能，描述取自上游 frontmatter。
<!-- skills:count:end -->

<!-- skills:start -->
| Skill | Description (upstream frontmatter) |
| --- | --- |
| `brutile` | Use when fetching or enumerating map tiles in .NET with BruTile 6.0.0 — HttpTileSource over HttpClient, KnownTileSources.Create, ITileSchema.GetTileInfos for a viewport and resolution, MbTilesTileSource for offline MBTiles, or wiring tiles into Mapsui/SharpMap. Also for missing 'BruTile.Desktop' packages, CS0246 on KnownTileSources, MBTiles SQLite native load failures, and 404s from inverted TMS/OSM y-axis. |
| `cesiumjs` | Use when building browser-based 3D globes, 3D Tiles, CZML/time-dynamic data, or glTF models with npm cesium 1.147.0 — Viewer, Cesium3DTileset, Ion token (Cesium.Ion.defaultAccessToken), CESIUM_BASE_URL for Workers/Assets/Widgets, GCJ-02 tile offset, or debugging a black screen after a Vite/Webpack build. |
| `deck-gl` | Use when visualizing large geospatial datasets in the browser with deck.gl 9.4.1 — ScatterplotLayer/GeoJsonLayer, HexagonLayer/ScreenGridLayer aggregation, MVTLayer/TileLayer, @deck.gl/mapbox MapboxOverlay over MapLibre, or debugging blank canvases, stale data props and mismatched @deck.gl/* subpackage versions. |
| `duckdb-spatial` | Use when doing spatial analysis inside a DuckDB database or SQL pipeline — INSTALL spatial / LOAD spatial, ST_Read over Shapefile/GeoPackage/GeoJSON, ST_Point/ST_GeomFromText, ST_Intersects/ST_Contains/ST_Buffer joins, ST_Area_Spheroid, ST_AsMVT tiles, DuckDB-WASM; also for 'Extension spatial is not installed' or spatial function does not exist, GEOMETRY vs WKB_BLOB friction, CRS type modifiers, and exporting query results to GeoParquet. GEOMETRY became a built-in type in DuckDB 1.5. |
| `gdal` | Use when processing geospatial raster/vector data via GDAL/OGR CLI — ogr2ogr format conversion (Shapefile/GeoPackage/GeoJSON), gdalwarp reprojection, gdal_translate, gdal_calc.py NDVI, COG, mosaicking, DEM contours, gdalinfo -json checks — or diagnosing "not recognized as a supported file format"; also covers the 3.11+ unified gdal raster / gdal vector CLI. |
| `gdal-api` | Use when programming against GDAL/OGR in C, C++, Python, Java, or .NET — raster/vector I/O, gdal.UseExceptions, OGRSpatialReference transforms, gdal.Translate / gdal.Warp, VRT/COG, or fixing "no driver registered" and UnsatisfiedLinkError; C++ gdal-config, Maven org.gdal:gdal 3.13.0, NuGet MaxRev.Gdal.Core. |
| `geolibre` | Use when scripting or self-hosting the GeoLibre GIS app — geolibre Python anywidget (Map/add_geojson/add_cog/save_project), geolibre-mcp stdio server for AI agents, ghcr.io/opengeos/geolibre Docker image, DuckDB-WASM SQL workspace, ?data= and ?url= deep links; also for a blank window on Linux WebKitGTK, sidecar path not allowed from GEOLIBRE_CONVERSION_ROOTS, and Jupyter relay not connected. GeoLibre 3.7.0. |
| `geometry-api-java` | Use when working with Esri geometry types (Point, Polyline, Polygon, Envelope) in Java — GeometryEngine, com.esri.geometry:esri-geometry-api:2.2.4, WKT/WKB/GeoJSON/Esri JSON I/O, geodesic distance; also when GeometryEngine has no intersects or WKB method and you need OperatorFactoryLocal, or when 2.3.1 coordinates fail to resolve on Maven Central. Esri Geometry API for Java. |
| `geometry-api-net` | Use when working with Esri geometry types (Point, Polyline, Polygon, Envelope) in .NET/C# — GeometryEngine, NuGet OpenGIS.Esri.Geometry.Core 1.0.9, WKT/EWKT, WKB, GeoJSON and Esri JSON I/O, System.Text.Json converters, geodesic distance; also for unclosed polygon rings, Geometry base-class casts after overlay, or the retired Esri/geometry-api-net repo. Esri Geometry API for .NET. |
| `geonode` | Use when deploying or automating GeoNode 5.1.1 — docker compose with create-envfile.py, geonode/geonode:5.1.1 image, django4geonode logs, /api/v2/resources and /api/v2/uploads/upload (action=upload\|replace\|upsert\|create), OGC WMS/WFS links from resource.links[], geonode-project customization; also for 502 after compose up, 'GeoNode has no attribute' after upgrade, and upload 401/403 with Basic vs Bearer auth. |
| `geopandas` | Use when doing vector spatial analysis in Python — gpd.read_file/to_file via pyogrio (GPKG, Shapefile, GeoParquet 2.0), sjoin/sjoin_nearest, overlay, clip, dissolve, make_grid, to_crs vs set_crs, gdf.plot choropleth; also for CRSError from a missing PROJ data dir, area/distance computed in degrees, or GeoDataFrame geometry-column conflicts. GeoPandas 1.2.0 extends pandas DataFrames with geometry columns. |
| `geopipe-agent` | Use when building YAML GIS pipelines with GeoPipeAgent — geopipe-agent validate/run, io.read_vector to vector.buffer to io.write_vector chains, 36 built-in steps (33 analysis + 3 passthrough), qc.geometry_validity/attribute_completeness/topology, native_python\|qgis_process\|gdal_cli backends, $step.output refs; also for validate not-registered errors, silent when-condition skips, and resolve/knowledge gaps. 0.1.0, source install only (not on PyPI). |
| `geos` | Use when working with the GEOS C/C++ geometry engine that powers PostGIS, QGIS, Shapely and GDAL — GEOSGeomFromWKT/GEOSIntersection/GEOSBuffer/GEOSMakeValid C API, geos::geom C++ API, OverlayNG robustness, GEOSPrepare and GEOSSTRtree, or debugging TopologyException and self-intersection. |
| `geoserver` | Use when deploying GeoServer 3.0.x to publish WMS/WFS/WMTS/WCS/MVT, or configuring SLD/CSS styles, RBAC security, and GeoWebCache seeding. Covers geoserver-3.0.2-bin.zip, docker.osgeo.org/geoserver:3.0.2 on Java 17/21, /rest/about/version.json, blank GetMap from wrong native bounds, and Shapefile charset mojibake. |
| `geoserver-cloud` | Use when deploying GeoServer Cloud 3.0.2.1 on Docker Compose or Kubernetes — gateway serving WMS/WFS/WCS/WPS/GWC microservices under /geoserver/cloud, PgConfig vs datadir backends, RabbitMQ config-bus sync, Helm chart geoservercloud 3.0.3, and diagnosing 502s via actuator/health and Consul registration. |
| `geoserver-rest-api` | Use when automating GeoServer 3.0.2 over REST — POST /rest/workspaces, datastores, featuretypes, PUT Shapefile ZIP to file.shp, GeoTIFF to coveragestores, upload SLD as application/vnd.ogc.sld+xml, ?recurse=true deletes. curl -u admin:geoserver, single-key JSON like {"workspace":{...}}, 401 on POST but 200 on GET, GWC cache masking style changes. |
| `geotools` | Use when building Java GIS apps on GeoTools 35.2 (JDK 17) — org.geotools:gt-main / gt-shapefile / gt-geopkg / gt-epsg-hsql from repo.osgeo.org (not Maven Central), CQL/ECQL filters, CRS.decode plus JTS.transform reprojection, StreamingRenderer PNG output, and disposing DataStore/SimpleFeatureIterator. |
| `grass-gis` | Use when doing GIS geoprocessing with GRASS GIS headlessly — grass --exec and --tmp-project for servers and CI, g.region computational region management, r.* raster, v.* vector, r3.* 3D raster and t.* temporal modules, r.import/v.import data import, or Python scripting with grass.script, grass.script.array and grass.tools. |
| `jts` | Use when doing precise 2D computational geometry in Java with org.locationtech.jts:jts-core 1.20.0 — GeometryFactory construction, contains/intersects predicates, overlay via OverlayNGRobust, buffer, STRtree and PreparedGeometry speedups, WKT/WKB/GeoJSON I/O, and fixing TopologyException or unclosed rings. |
| `kepler-gl` | Use when building React/Redux web apps or Jupyter notebooks for large-scale geospatial visual exploration with Kepler.gl 3.3.0-alpha.20 — @kepler.gl/components KeplerGl, @kepler.gl/actions addDataToMap, @kepler.gl/processors processGeojson/processCsvData, and the Python keplergl widget. Also for fixing blank maps from a missing reducer or wrong getState (react-redux 'Could not find ... in the context of Connect(...)'), Mapbox token basemap errors, and oversized addDataToMap payloads. |
| `leaflet` | Use when adding lightweight 2D tile maps to web pages with leaflet 1.9.4 — L.map/L.tileLayer, markers, popups, GeoJSON overlays, layer control, [lat, lng] ordering, or debugging blank maps, broken default marker icons after bundling, and sizing fixed by invalidateSize(). |
| `mapbox-gl-js` | Use when building vector web maps with mapbox-gl 3.34.2 — WebGL rendering, Style Spec layers, data-driven expressions, setTerrain raster-dem, fill-extrusion, or debugging 401 'A valid Mapbox access token is required', 'Style is not done loading', and pk./sk. token handling. Note: v2+ is proprietary under Mapbox TOS and requires a token; MapLibre GL JS is the open-source fork. |
| `maplibre-gl-js` | Use when building open-source vector web maps with maplibre-gl 6.17.0 — Map/addSource/addLayer, Style Spec v25 layers, data-driven expressions, raster-dem terrain with setTerrain, setSky, setMissingStyleImageResolver, addProtocol for PMTiles, or debugging v6 ESM-only import errors, 'WebGL2 is required', blank maps after setStyle and style-spec expression warnings. MapLibre GL JS is the BSD-3-Clause fork of Mapbox GL JS and needs no access token. |
| `maplibre-native` | Use when embedding GPU-accelerated vector maps natively in Android, iOS, macOS, Linux, Windows or Node.js with MapLibre Native (C++ core, BSD-2-Clause) — org.maplibre.gl:android-sdk MapView/MapLibre.getInstance/getMapAsync, CocoaPods MapLibre MLNMapView, @maplibre/maplibre-gl-native mbgl.Map render, offline caching, Bazel/CMake builds, or debugging green map screens, missing submodules and NDK build failures. |
| `mapserver` | Use when publishing WMS/WFS/WCS/OGC API Features from a MapServer 8.6.6 .map mapfile — MAP/LAYER/CLASS/STYLE objects, STATUS/PROJECTION/EXTENT errors, WEB.METADATA wms_enable_request and wfs_enable_request, SLD binding, FastCGI plus MS_MAP_PATTERN hardening, and blank GetMap / "No query information to decode" symptoms. |
| `mapsui` | Use when embedding interactive 2D maps in .NET desktop (WPF/WinUI/WinForms) or mobile (MAUI/Avalonia/Blazor) apps with Mapsui 5.1.0 (net8.0/net9.0) — Mapsui.Wpf/Mapsui.Maui packages, Map and Layers, OpenStreetMap.CreateTileLayer, Shapefile/GeoJSON via Mapsui.Nts, SphericalMercator.FromLonLat, or fixing a blank MapControl. |
| `nettopologysuite` | Use when doing 2D computational geometry in .NET with NuGet NetTopologySuite 2.6.0 — GeometryFactory with SRID, Contains/Intersects predicates, Intersection/Union/Buffer overlays, STRtree, GeometryFixer, WKT/WKB/GeoJSON I/O, Shapefile via IO.Esri, and EF Core spatial queries on SQL Server/Npgsql. |
| `opendronemap` | Use when turning drone/aerial imagery into orthophotos, DSM/DTM, point clouds or 3D Tiles with OpenDroneMap — odm CLI via docker run --project-path, --dsm --dtm --orthophoto-resolution --pc-quality --3d-tiles, WebODM 4.0.0 compose, /api/token-auth/ and /api/projects/{id}/tasks, pyodm Node('localhost',3000); also for 'odm_orthophoto.tif' outputs and out-of-memory failures. |
| `opengis-all` | Use when navigating end-to-end GIS workflows — GDAL CLI/API (ogr2ogr, gdalwarp, gdal_calc.py), qgis_process and PyQGIS analysis, GeoServer REST publishing, and OpenLayers/CesiumJS visualization. One-stop index covering the complete open-source GIS data pipeline. |
| `opengis-daf` | Use when building JSON-plan GIS analysis or QC pipelines with OpenGisDAF (.NET 10 / C# 14) — daf validate/run, operators buffer/clip/intersect_check/containment_check/coordinate_transform, DAG upstream bindings, GeoJSON/Shapefile/PostGIS sinks, qcMode QC reports, AssemblyLoadContext plugins; also for "zero tests ran" exit code 5, missing --recurse-submodules GDAL build errors, or PostGIS Layer already exists. Plan-driven ETL. |
| `opengis-utils-for-java` | Use when needing common GIS utilities in Java — OguLayerUtil layer read/write, GeometryUtil 60+ ops, CrsUtil CGCS2000 (EPSG:4490, 4502-4554), Shapefile/GeoJSON/FileGDB/PostGIS/land TXT I/O, topology validation; also for GDAL UnsatisfiedLinkError on gdal_jni, missing osgeo repo on GeoTools, or resolving com.znlgis.ogu4j:ogu4j:1.0.0 that is not on Maven Central. OGU4J. |
| `opengis-utils-for-net` | Use when needing common GIS utilities in .NET/C# — OguLayerUtil ReadLayer/WriteLayer/ConvertFormat, GeometryUtil 50+ ops, CrsUtil CGCS2000 transforms, Shapefile/GeoJSON/FileGDB/GeoPackage/KML/PostGIS I/O; also for Unable to load DLL gdal / DllNotFoundException, GBK shapefile mojibake, or ArgumentException from Geojson2Wkt on a whole FeatureCollection. OpenGIS.Utils 1.1.2. |
| `openlayers` | Use when adding interactive 2D maps to web apps with npm ol 10.11.0 — Map/View, fromLonLat to EPSG:3857, WMS/WMTS/XYZ sources, MVT with featureClass, Draw/Modify/Snap interactions, or debugging blank layers (missing setStyle), offset centers and ol/... module-not-found errors. |
| `pdal` | Use when processing point cloud data (LAS/LAZ/BPF/EPT/COPC) via CLI or Python — pipeline JSON workflows, format conversion, reprojection, cropping, outlier removal, ground classification (SMRF), and DEM generation from LiDAR. PDAL (Point Data Abstraction Library) is the point cloud equivalent of GDAL: pdal info/translate/pipeline commands plus pdal.Pipeline Python bindings. |
| `postgis` | Use when extending PostgreSQL with PostGIS 3.7.0 — geometry/geography/raster types, GiST and KNN distance-operator indexes, ST_Intersects/ST_Buffer/ST_Transform/ST_AsMVT, shp2pgsql -I and raster2pgsql import, and fixing "Operation on mixed SRID", slow spatial joins, and invalid polygons with ST_MakeValid. |
| `proj` | Use when transforming coordinates or inspecting CRS definitions from the command line — cs2cs, projinfo -s/-t, proj projection math, cct, EPSG lookup, datum shift with grid files, WKT/PROJJSON export, or debugging "Cannot find proj.db" and latitude-first axis order. PROJ 9.9.0: the OSGeo engine behind GDAL/QGIS, with the proj.db SQLite database. |
| `projnet4geoapi` | Use when transforming coordinates or reading CRS definitions in .NET with ProjNet 2.1.0 (NuGet ProjNet, repo ProjNet4GeoAPI) — CoordinateSystemFactory.CreateFromWkt, CoordinateTransformationFactory.CreateFromCoordinateSystems, MathTransform.Transform, CoordinateSystemServices SRID registration. Also for 'no suitable transformation' / null from GetCoordinateSystem, EPSG codes beyond 4326 and 3857 returning null, and SharpMap projects needing the legacy ProjNet4GeoAPI 1.4.1 GeoAPI build. |
| `pyqgis` | Use when scripting QGIS with Python — QgsApplication standalone init, QgsVectorLayer / QgsRasterLayer loading, processing.run after Processing.initialize(), QgsGeometry / QgsExpression, QgsMapSettings rendering and QgsLayoutExporter PDF/PNG export, qgis._3d, or debugging "import qgis.core" failures. PyQGIS for QGIS 4.2.3 and LTR 3.44.15 (use the interpreter bundled with QGIS, not system Python). |
| `qgis-process` | Use when running QGIS geoprocessing headless via qgis_process — native:buffer / native:reprojectlayer / native:clip, qgis_process list / help --json / run --json, .model3 models and .py scripts, batch CI pipelines, or debugging "Algorithm ... not found!"; includes QT_QPA_PLATFORM=offscreen and the qgis/qgis images (stable 4.2, ltr 3.44). |
| `qgis-server` | Use when publishing QGIS projects (.qgs/.qgz) as OGC web services — WMS GetMap/GetPrint, WFS and WFS-T, WMTS, OGC API Features via qgis_mapserv.fcgi with Apache mod_fcgid, Nginx, or Docker, plus QGIS_SERVER_* tuning (MAX_THREADS, PARALLEL_RENDERING, LOG_STDERR); covers "Service unknown or unsupported" and MAP/GetCapabilities checks. QGIS 4.2.3 and LTR 3.44.15. |
| `shapely` | Use when doing computational geometry in Python — shapely.intersection/union/buffer/convex_hull/simplify, STRtree queries, from_wkt/to_wkt/to_geojson, make_valid, GEOS-gated ops (coverage_clean, split); also for TopologyException on self-intersecting polygons or OOP vs function buffer quad_segs mismatch. Shapely 2.2.0 binds GEOS. |
| `sharpmap` | Use when rendering 2D maps in legacy .NET Framework 4.7.2 WinForms or ASP.NET WebForms apps with SharpMap 1.2.0 — Map.GetMap() to PNG, ShapeFile/PostGIS providers, VectorLayer with CustomTheme, TileAsyncLayer via BruTile, ProjNet4GeoAPI transforms, or debugging blank output and GDI+ handle leaks. New projects should use Mapsui. |
| `spatialite` | Use when adding spatial SQL to a single-file SQLite database with SpatiaLite — mod_spatialite loading, InitSpatialMetaData, AddGeometryColumn, CreateSpatialIndex/MbrWithin, ST_Transform and GEOS predicates, spatialite_tool or ogr2ogr import of Shapefile, and GPKG fallback; also for 'no such module: mod_spatialite', 'no such function: InitSpatialMetaData', and 'the SPATIALITE_SECURITY environment variable' errors. libspatialite 5.1.0. |
| `stac-cog-titiler` | Use when building cloud-native imagery pipelines with STAC 1.1.0, Cloud Optimized GeoTIFF and TiTiler 2.4.0 — rio cogeo create/validate, pystac-client search, stac-fastapi 7.1.1 with stac-fastapi-pgstac 7.2.1, uvicorn stac_fastapi.pgstac.app:app, titiler.application /cog and /stac tilejson endpoints, MosaicJSON mosaics, or debugging HTTP 416 range errors, blank tiles from band index mismatch and 403 on private object storage. |
| `whitebox-tools` | Use when doing advanced raster, terrain or LiDAR geoprocessing with WhiteboxTools v2.4.0 — whitebox_tools --run=Slope/FillDepressions/BreachDepressions/FlowAccumulationFullWorkflow/Watershed/ExtractStreams, lidar_* tools for LAS point clouds, or the whitebox (whitebox-python 2.3.6) WhiteboxTools wrapper in Python. Also for 'whitebox_tools: command not found', mismatched Python frontend versions, and missing DEM/flow-accumulation intermediate outputs. |
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
  - `postgis` / `duckdb-spatial` / `spatialite` — 空间数据库；`proj` — 坐标转换；
  - `whitebox-tools` / `grass-gis` / `pdal` — 地形水文、点云批处理；
  - `geonode` / `geoserver` / `mapserver` / `qgis-server` — 发布 OGC 服务；
  - `openlayers` / `leaflet` / `maplibre-gl-js` / `mapbox-gl-js` / `cesiumjs` / `deck-gl` / `kepler-gl` / `geolibre` — Web 2D/3D 可视化；`maplibre-native` — Android/iOS/桌面/Node 原生渲染；
  - `geos` — GEOS C/C++ 几何内核（PostGIS/QGIS/Shapely 的底层）；
  - `opendronemap` — 无人机影像摄影测量（正射/DSM/点云/3D Tiles）；`stac-cog-titiler` — 影像云原生链路（STAC + COG + TiTiler）。
- 加载结果会给出该技能的 **Base directory**；正文中的 `reference/*.md` 与 `../<其他技能>/SKILL.md` 相对链接都据此解析。因为全部技能资产随同一个包一起分发，跨技能链接不需要额外安装或配置。

## DeepSeek Harness 适配

上游已把仓库与特定 Agent 解耦，技能正文保持通用写法。本包不去改上游快照，而是加一层只在 DSH 里生效的执行指南：

- **分层存放**：`assets/<skill>/SKILL.md` 是上游逐字节快照；`adaptations/common.md` 是每个技能都会读到的通用约定（技能加载与兄弟技能、reference 分段读取、`ops_bash`/`pwsh`/`run_code` 分工、Windows 改写、后台作业、`present` 交付、`ask_user_question` 确认、沙箱与审批、外部资料）；`adaptations/<skill>.md` 是该技能独有的执行建议（先读哪个 reference、命令跑在哪、探测什么版本、怎么验证、哪些操作要先确认）。
- **加载时拼接**：provider 的 `get` 把「上游正文 + `## DeepSeek Harness 使用建议` + `## DeepSeek Harness 通用约定`」拼成一次加载结果，正文与 `reference/*.md` 的相对链接仍以技能目录为基准解析，不需要额外配置。
- **硬约束保证「确实是 DSH」**：`<skill>.md` 必须 900–4000 字符、含 5 个固定要点、至少点名 2 个核心工具，「先探测版本」「验证产物」两条必须各带一条反引号命令；`common.md` 至少 14 条要点、覆盖 8 个以上核心工具。工具名从固定白名单里数，所以「读一下文件」这种泛泛叙述不算数。
- **能力按可用性分级**：`lib/adaptations.js` 把工具白名单拆成 `CORE_TOOLS`（每个受支持版本都随包提供）与 `OPTIONAL_TOOLS`（Agent Teams、桌面控制、定时任务、派生会话、MCP 资源，来自可选插件）；最低引用数只算核心工具，可选工具必须写成「会话提供时……否则退回……」的形态，避免在没有该插件的会话里给出无法执行的指引。
- **不随上游漂移**：同步只覆盖 `assets/` 与 `upstream.json`，不会碰 `adaptations/`；上游新增技能时 `npm run validate` 会点名缺少适配文件的技能，补齐后再发布，避免悄悄发布一个没有 DSH 指南的技能。
- **只写这个 harness 里才成立的事实**：通用约定按 DSH 的真实行为写，而不是泛泛的「用终端跑」——前台命令超时会被提升成后台作业并返回 `jobId`（不要重跑）、输出被截断时会给出 `spillPath`（用 `read` 的 `offset` 去读，而不是重跑命令）、随包 Python 有 numpy/pandas/Pillow 但没有 GDAL/Shapely/GeoPandas 绑定（`load_workspace_dependencies` 只用来取解释器与 Node 路径）、Agent Teams/桌面控制/定时任务属于可选插件（会话里没有就退回 `todo_write` + 后台作业 + `subagent`）。
- **自检**：`npm run check:adaptations` 只校验适配层（可传入技能名）；`npm run validate` 会同时校验适配层的结构、长度、工具覆盖、相对链接，以及适配文件里用反引号提到的 `reference/*.md` 是否真的存在于该技能目录。
- 命令统一走 DSH 的 shell 工具：Linux/macOS 用 `ops_bash`（旧文档里叫 `bash`），Windows 的 Bash 是 MSYS，Windows 原生命令用 `pwsh`；只暴露 `run_code` 的会话在 TypeScript 里调用 `tools.ops_bash` / `tools.pwsh`。
- 文件与日志优先用 `read`（分段）/ `grep` / `glob`；大输出先落盘，长任务放后台作业并用 `job_output` 收日志。技能目录与运行时是只读资源，脚本与产物写到会话工作区。
- 技能正文标注的是上游核验时点的版本（例如 GeoServer 3.0.2、GeoTools 35.2、QGIS 4.2.3 / LTR 3.44.15、GDAL 3.13.3）。实际环境版本不同时，先探测版本，再按“低版本降级”或“高版本新增 API”说明差异，不要照搬不存在的命令。
- 技能只是领域知识与执行约定，不会替你安装工具、绕过沙箱或读取凭据；安装依赖、启动服务、覆盖数据、执行破坏性 SQL 前先向用户确认，命令与回答中不要回显密码与 token。

## 上游同步

> 本节只适用于**本仓库的源码开发**。`scripts/` 与 `test/` 不在 npm 发布包内（`package.json` 的 `files` 未包含它们），安装用户无需执行这些命令。

```bash
# 默认从 ../opengis-skills 读取，也可用 --from 或 OPENGIS_SKILLS_DIR 指定
npm run sync -- --from ../opengis-skills

# 只检查是否与上游一致（CI 可用）
npm run sync:check -- --from ../opengis-skills
```

同步脚本会：逐文件复制 `gis/<skill>/`（文本统一为 LF，保证与上游 git blob 跨平台字节一致）、校验 frontmatter（name 必须为 kebab-case 且与目录同名）、清理上游已删除的技能目录、更新 `upstream.json`，并重新生成 README 中的技能数量与技能表（生成区域由 `<!-- skills:count:* -->` 与 `<!-- skills:* -->` 标记界定）。

当前快照对应上游 `55b87f4`（45 个技能、71 个文件）：在上次同步的 `e47ff34` 基础上新增 GEOS、MapLibre GL JS、MapLibre Native、OpenDroneMap、STAC/COG/TiTiler 五个技能，并刷新了 GDAL 统一 CLI 写法、GeoPandas 1.2 的 `make_grid`/`read_file_info`/GeoParquet 2.0、Shapely 2.2 的新函数、PDAL 2.10 的新 stage、GRASS 8.5 的 JSON 输出与 `grass.tools`、MapServer 的 `map2img` 更名、DuckDB 的 GEOMETRY 内置类型等 20 余处正文。上游仍使用 Agent Skills 规范的六字段（`name` / `description` / `license` / `metadata{category,tags}`，另有可选的 `compatibility` 与 `allowed-tools`）；本包的解析器认识这层嵌套结构，校验脚本会拒绝规范外字段，因此上游若再改 frontmatter 形状，`npm run validate` 会在发布前报错而不是悄悄丢字段。`sync:check` 做双向比较：既检查已同步文件是否漂移，也检查上游新增/删除的技能是否遗漏。**`adaptations/` 不参与同步**：它属于本仓库的 DSH 适配层，同步只覆盖资产快照；上游新增技能后需要手工补一个 `adaptations/<skill>.md`，否则校验失败。

为避免伪造来源，`npm run sync` 要求 `--from` 指向 opengis-skills 的 **git 检出根目录**：脚本用 `git rev-parse --show-toplevel` 校验该目录就是仓库根，避免把外层仓库的 HEAD 误记成上游 commit；无法证明 commit 时同步直接失败。上游 `gis/` 下若出现没有 `SKILL.md` 的目录，同步会报错而不是静默跳过（否则上游改名会静默丢技能）；`gis/` 根目录的普通文件（上游分类索引 `gis/SKILL.md` 等）不参与同步，也不会被当作技能打包。

`upstream.json` 同时是一份完整性清单：`schemaVersion` 为 `1`，`hashAlgorithm` 为 `"sha256"`，`files` 以相对 `assets/` 的 POSIX 路径为键、对应文件的 SHA-256 摘要为值。`npm run validate` 会重新计算并比对全部摘要，因此**不依赖上游 checkout** 也能发现资产被手改、缺失或未列入清单的情况；CI 的 `sync` 任务再用固定 commit 的上游检出做一次 `sync:check`，确保快照与上游一致。

## 开发

需要 Node.js 22+。

```bash
npm run check       # validate + test，发布前必跑（也是 prepublishOnly）
npm run check:adaptations [skill...]  # 只校验 DSH 适配层，可指定技能
npm run validate    # 资产、六字段 frontmatter、内容质量、bundle 接线、完整性清单、DSH 适配层与断链校验
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
│   ├── adaptations.js            # DSH 适配层读取、拼接与结构校验（插件/脚本/测试共用）
│   ├── catalog.js                # 扫描 assets/ 构建技能目录、生成 README 区域
│   ├── markdown-links.js         # Markdown 相对链接解析与断链校验
│   ├── skill-file.js             # SKILL.md frontmatter 解析（插件/脚本/测试共用）
│   └── *.d.ts                    # 手写类型声明
├── assets/<skill>/               # 上游技能快照（SKILL.md + reference/*.md，逐字节同步，勿手改）
├── adaptations/                  # DSH 适配层（不参与上游同步）
│   ├── common.md                 # 每个技能都会读到的通用执行约定
│   └── <skill>.md                # 该技能专属的执行建议
├── locale/{en,zh}.json           # Plugins 里显示的标题与描述
├── icon.svg                      # bundle 图标
├── scripts/
│   ├── sync-opengis-skills.mjs   # 上游同步（assets/、upstream.json、README 生成区域）
│   ├── check-adaptations.mjs     # 单独的 DSH 适配层校验（可指定技能）
│   └── validate-skills.mjs       # 发布前校验（自包含，无需上游 checkout）
├── test/
│   ├── plugin.test.mjs           # provider 目录/加载/链接/适配层拼接
│   ├── adaptations.test.mjs      # 适配层拼接、覆盖与结构规则
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
- `list` 只返回元数据（名称、描述、rank、source、`locator`/`path`、`resourceBase`、来自上游 frontmatter 的 `metadata`）；`get` 每次重新读盘并解析正文与 `adaptations/<skill>.md`，因此编辑资产或适配文件后重新加载插件即可生效。`adaptations/common.md` 会拼到每个技能后面且进程内不变，所以按进程缓存一次成功读取的结果（失败的读取不缓存，调用方取消也不会污染共享缓存），避免每加载一个技能重复读同一文件。插件不注册工具、不注入提示段、不写会话状态。
- **元数据只放 candidate**：宿主契约里 `SkillCandidate` 允许 `metadata`，而 `SkillSummary`（definition）不允许，所以 `metadata.category`/`metadata.tags` 只出现在 `list` 结果上，`get` 结果保持干净；description 始终用上游原文，不因元数据改动而偏移。
- **不设 `whenToUse`**：宿主虽然接受这个可选路由字段，但它只在网关的 user-invocable 技能列表（`/` 命令面板）里透出，模型可见的技能目录只渲染 `description`；上游 description 已经按「Use when … / Also for …」写好，再补一份 whenToUse 只会产生第二套会漂移的文案，因此本包不引入。
- **校验分层**：`npm run validate` 把「会破坏下游契约或让内容不可发现」的问题设为错误（规范外 frontmatter 字段、license 不是 MIT、`metadata.category` 不是 `gis`、tags 数量或语法不对、description 超 500 字符/不以 `Use when` 开头/含尖括号或中文/重复、SKILL.md 超 500 行、`reference/` 有孤儿文件、适配层不达标），把「上游编辑口味」设为警告（缺「截至 YYYY-MM」时效标记、FAQ 少于 5 行、reference 超 100 行没有目录、代码围栏没语言、正文含 emoji），警告不会阻塞发布。
- **适配层拼接**：`get` 返回的 `content` 是「上游正文 + 分隔线 + `adaptations/<skill>.md` + `adaptations/common.md`」。正文首部保持上游原样，所以 `reference/*.md` 与 `../<skill>/SKILL.md` 的相对链接仍按技能目录解析；共用约定放在最后，保证读到的最后一段是安全与平台约束。适配文件缺失或首行标题不对会直接报错并指出期望路径，而不是静默返回一个没有 DSH 指南的技能。
- **运行时加固**：frontmatter 解析严格且容忍 UTF-8 BOM（`name` 必须为 kebab-case、`description` 必填，块标量与未闭合引号会报可读错误）；上游部分 `description` 存在**未转义的内层双引号**（非法 YAML 但语义明确），解析器按“首尾引号之间全部内容”宽容读取，未知转义保持字面，从而继续与上游字节一致而不必改写快照；`assets/` 缺失时报错会指明期望的资产根目录；`resourceBase` 在 Windows 上也统一输出为正斜杠，跨平台链接一致。
- 相对链接不做改写：包内是全量技能目录，`reference/*.md` 与 `../<skill>/SKILL.md` 都能解析；`npm run validate` 会扫描全部 Markdown 相对链接，断链或越出 `assets/` 都会失败。

## 故障排查

- **技能目录没有出现**：确认 bundle 已在 Plugins 中启用；安装、升级或启停后需要重载/重启 dsh 并新开会话。若用本地目录方式，确认填的是包含 `package.json` 的包根目录。
- **加载技能失败**：错误信息会带出具体资产路径（例如 `.../assets/gdal/SKILL.md` 的 frontmatter 问题）；按提示修复，或从上游重新同步，不要手工编辑 `assets/`。
- **本地验证**：`npm run validate` 检查资产、元数据、bundle 接线、完整性清单与链接；`npm test` 跑单元测试；发布前统一用 `npm run check`。
- **同名技能冲突**：技能注册表按 rank、再按注册顺序决定同名技能的解析优先级；本包 rank 为 600。若其他 provider 也提供了同名技能，检查是否有另一份 OpenGIS 技能包或自定义技能被同时启用。
- **不要手改 `assets/`**：它是上游快照，手工修改会导致 SHA-256 完整性校验与同步检查失败；需要改内容时先改上游，再 `npm run sync` 重新生成。
- **适配层报错**：`npm run validate` 报 `adaptations/<skill>.md: missing` 表示上游新增了技能但还没写 DSH 指南；报 `... must start with "## DeepSeek Harness 使用建议"`、`missing the "…" bullet`、`too short`/`exceeds the …-character budget`、`cites N core DeepSeek Harness tool(s)` 分别表示标题、固定要点、长度或核心工具覆盖不达标；`"先探测版本" must cite a concrete command or tool in backticks` 表示该条目只有泛泛叙述、没有可执行命令；`cites reference/x.md, which is not a file` 表示引用了不存在的参考资料。按提示修好后再发布。
- **上游 frontmatter 报错**：报 `illegal frontmatter field`、`"license" must be MIT`、`"metadata.category" must be "gis"`、`"metadata.tags" must list`、`description must start with "Use when"` 表示上游改了 frontmatter 形状。`assets/` 是只读快照，先看上游是否已迁移到新规范，再决定是升级解析器/校验规则还是重新同步。

## 与 @dsh-gis 其他插件的关系

- `@dsh-gis/dsh-gis`：GIS 工具与地图界面（inspect/query/CRS/OGC/UI）。
- `@dsh-gis/dsh-prompt-gis`：一段 GIS system-prompt 与两个内联技能（`gis-inspect-first`、`gis-query-patterns`）。
- 本包：纯知识型技能包，不提供工具，可与上述插件同时安装。

## 许可

MIT，见 [LICENSE](./LICENSE)。技能正文与参考资料来自 [opengis-skills](https://github.com/znlgis/opengis-skills)（MIT © 2024-2026 znlgis），详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。