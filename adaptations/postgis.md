## DeepSeek Harness 使用建议

- **加载与引用**：单文件技能，无 reference 目录；验收 SQL 与 EXPLAIN 判据在「典型工作流」「性能优化」「常见问题」三节，按标题定位即可。GDAL 侧导入转 `gdal`、发布转 `geoserver`，不在此重写。
- **执行环境**：`psql`、`shp2pgsql`、`raster2pgsql`、`pgsql2shp`、`ogr2ogr` 都在 `ops_bash` 里跑；导入用管道 `shp2pgsql ... | psql -d gisdb -v ON_ERROR_STOP=1`，别在 `pwsh` 里照搬。元命令不能进交互式会话，单条传：`psql -d gisdb -c "\d+ poi"`。`command -v shp2pgsql` 找不到时就改走 `ogr2ogr -f PostgreSQL "PG:host=localhost dbname=gisdb user=postgres"`。
- **先探测版本**：`psql -c "SELECT version(), PostGIS_Full_Version();"` 一次拿到 PostgreSQL、PostGIS、GEOS、PROJ；本技能按 PostGIS 3.6.4、PostgreSQL 12–18 编写，3.7 仍是 RC。连不上先探服务端：`psql -h 127.0.0.1 -U postgres -c "SELECT 1"`，connection refused 是服务端没起而非 SQL 写错；本机无实例时用正文的 `docker run --name pg -e POSTGRES_PASSWORD=pg -p 5432:5432 -d postgis/postgis:17-3.6`。扩展缺失查 `SELECT * FROM pg_available_extensions WHERE name LIKE 'postgis%';`。
- **验证产物**：导入后回读 `SELECT count(*), ST_SRID(geom), ST_IsValid(geom) FROM t GROUP BY 2,3;`，导出后再跑 `ogrinfo -al -so out.geojson` 核对要素数与字段；性能结论必须附 `EXPLAIN (ANALYZE, BUFFERS)` 输出，并指出计划里出现 `poi_geom_idx` 上的 Index/Bitmap Index Scan，没计划就直说未验证。写操作后回读 `\d+ t` 与 `geometry_columns`，别只看 `INSERT 0 n`。
- **风险与权限**：`DROP TABLE/SCHEMA`、整表改写 geom、`VACUUM FULL`、重启 PostgreSQL 都难回滚，先备份并征得同意；口令用 `PGPASSWORD`/`.pgpass` 传入，命令与报告里不要回显。大表建索引会长时间锁表，用 `CREATE INDEX CONCURRENTLY`，且不能包进事务块。
- **常见失败**：`Operation on mixed SRID` 是两边 SRID 不一致让 `&&` 退化为逐行比较，先 `ST_Transform` 统一到 4326 再入库；`CREATE EXTENSION postgis` 报找不到扩展文件是缺对应 `postgis-<pgver>` 包；距离单位不对其实是 4326 下按度算，转 `geography` 或米制投影；多边形无效先 `ST_IsValidReason` 再 `ST_MakeValid`。
