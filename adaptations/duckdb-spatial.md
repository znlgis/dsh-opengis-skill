## DeepSeek Harness 使用建议

- **加载与引用**：单文件技能，函数表与 `ST_Read` 参数表都在正文，按小节标题 `grep` 定位即可；需要 GDAL 侧细节转 `gdal`，需要 GeoDataFrame 互转转 `geopandas`，浏览器端转 `geolibre`。
- **执行环境**：Python 片段走 `ops_bash` 的解释器。正文的 CLI 是单文件可执行（Windows 下载 `duckdb_cli-windows-amd64.zip` 解压），没装 CLI 就用 Python 会话代替；CLI 里每条 `INSTALL spatial;` 的分号必须有；Python 的 `con.execute` 一次给一条语句，别把 `INSTALL`/`LOAD` 和查询串在一起。扩展缓存在 `~/.duckdb/extensions/<version>/<platform>/`，Windows 即 `$env:USERPROFILE\.duckdb\extensions\...`，离线复用前先 `ls` 确认目录存在。
- **先探测版本**：`python -c "import duckdb; print(duckdb.__version__)"`，再在同一条连接里 `SELECT extension_version FROM duckdb_extensions() WHERE extension_name='spatial'` 与 `SELECT duckdb_proj_version()`；本技能按 Python 包 2.0.0 编写。spatial 随 DuckDB 版本匹配、没有独立版本号，`extension_version` 可能只是一个构建哈希，别拿它和文档里的 x.y.z 比大小。
- **验证产物**：`COPY ... TO 'out.parquet'` 与 MVT 生成后都要回读：`SELECT count(*), ST_IsValid(geom)`、`ST_GeometryType(geom)` 分布与坐标范围，或用 `ST_Read` 读回文件核对行数。注意 `ST_AsWKB` 写出的 Parquet 不带 CRS 元数据，下游要 CRS 就落 `.gpkg` 或用 `ogr2ogr` 补写，别直接宣称"输出了 GeoParquet"。
- **风险与权限**：`INSTALL spatial` 会联网从 extensions.duckdb.org 下载，离线环境先确认缓存或改用本地包（正文提到 `-unsigned` 启动）；`COPY ... TO`、`CREATE OR REPLACE TABLE`、`DROP TABLE` 会覆盖文件或表，执行前确认目标路径可覆盖；`ST_Read` 读大文件吃内存，先 `LIMIT` 预览或加 `spatial_filter_box` 下推过滤，重复查询前先落表。
- **常见失败**：`Extension spatial is not installed` 是只 LOAD 未 INSTALL 或离线拉不到；每个新连接都要重新 `LOAD spatial`，否则报 `Catalog Error: Scalar Function with name ST_Intersects does not exist`——看到"函数不存在"先查 `duckdb_extensions()` 的 loaded，不要改 SQL；`ST_Area` 返回 0 或极小值是经纬度下的平方度，换 `ST_Area_Spheroid` 或先 `ST_Transform`；多图层 GeoPackage 只出第一层是没给 `layer`。
