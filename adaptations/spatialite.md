## DeepSeek Harness 使用建议

- **加载与引用**：单文件技能，加载方式、`AddGeometryColumn`、RTree 索引与常见问题都在正文；导入导出细节转 `gdal`，读成 GeoDataFrame 转 `geopandas`，别在本技能重写。
- **执行环境**：`spatialite`、`sqlite3`、`ogr2ogr` 走 `ops_bash`。正文的 `spatialite> .load mod_spatialite` 是交互式 shell 写法，会话里改成一次性调用：`spatialite mydb.sqlite -cmd ".load mod_spatialite" "SELECT spatialite_version();"`。Python 侧必须先 `enable_load_extension(True)` 再 `load_extension("mod_spatialite")`，找不到模块就传绝对路径：Windows 把 `mod_spatialite.dll` 放到 `sqlite3.exe` 同级目录或加入 PATH，conda-forge 安装则无需手工放置 DLL。
- **先探测版本**：`spatialite :memory: "SELECT spatialite_version();"` 一步验证库可加载并报版本（本技能按 libspatialite 5.1.0、spatialite-tools 5.1.0a 编写）。没有 CLI 时用正文那条 Python 探测代替，库加载不了时任何 SQL 报错都没有诊断价值。
- **验证产物**：写库后回读 `SELECT f_table_name, f_geometry_column, geometry_type, srid, spatial_index_enabled FROM geometry_columns;`，再跑 `SELECT CheckSpatialIndex('poi','geom');` 确认 RTree 与主表同步；导出后用正文那条 `ogrinfo -so out/road_city.gpkg road_city` 核对要素数与 SRID，别只凭 `fetchone()` 有值就算成功。
- **风险与权限**：`DROP TABLE`、`DisableSpatialIndex`、批量 `DELETE` 在 SQLite 里不会保留旧版本，执行前整库复制一份 `.sqlite`。`InitSpatialMetaData` 每个库只跑一次（重复调用返回 0），`'NONE'` 模式不插入 EPSG 定义，SRID 要自己管；写操作后要 `con.commit()`，否则索引与数据都不落盘。
- **常见失败**：`no such module: mod_spatialite` 是动态库不在搜索路径，先绝对路径加载；`no such function: InitSpatialMetaData` 基本是扩展没加载成功，回到上面的探测；`CreateSpatialIndex` 返回 -1 是表里已有名为 `rowid` 的物理列；`geometry has invalid SRID` 是混进 SRID 为 -1/0 的几何，用 `GeomFromText(wkt, 4326)` 或 `ST_Transform` 补上；GDAL 打开看不到图层多半是库不是 SpatiaLite 格式，导入时补 `-dsco SPATIALITE=YES`。
