## DeepSeek Harness 使用建议

- **加载与引用**：主文件给高频用法，完整参数表与高级示例在 `reference/core-api.md`（含 GeoDataFrame、GeoSeries、共享几何属性、SpatialIndex 四节）；先按 `###` 小节标题 `grep` 再 `read` 对应片段，不要整篇展开。底层几何报错转 `shapely`，命令行转换转 `gdal`。
- **执行环境**：示例都走 `ops_bash` 里的解释器，不要假设 `python` 就是装了 geopandas 的那个——先 `python -c "import sys; print(sys.executable, sys.version)"`，conda、miniforge 等发行版自带的解释器常常不在 PATH 首位。长脚本写进工作区的 `.py` 文件再执行，比把几十行塞进 `-c` 稳定；写图产物用 `savefig` 落盘，再用 `read_image` 看。
- **先探测版本**：`python -c "import geopandas as gpd; print(gpd.__version__, gpd.options.io_engine)"`，再查依赖后端 `python -c "import pyogrio, pyproj; print(pyogrio.__version__, pyproj.datadir.get_data_dir())"`。本技能按 1.2.0、Python >= 3.11 编写；低于 1.2 会缺 `to_arrow`、`to_parquet(geometry_encoding=...)`、`tiles=` 与 `legend_kwds={"colorbar": True}`，答问时说明差异，别硬写 1.2 语法。
- **验证产物**：写完立即重开核对，`gdf = gpd.read_file("out.gpkg", layer="result"); print(gdf.crs, len(gdf), gdf.is_valid.all(), gdf.total_bounds)`；面积/长度必须是在投影坐标系下算的（`to_crs(gdf.estimate_utm_crs())` 之后再算），并确认量级与输入同阶，否则说明还在用度。
- **风险与权限**：`set_crs()` 只标记不转换、`to_crs()` 才重算坐标，混淆会静默出错；`to_file()` 默认整表覆盖同名文件，`to_postgis(if_exists="replace")` 会删表重建，执行前确认目标路径与表名；Shapefile 字段名超 10 字符会被截断，需要长字段名就换 `.gpkg`。`pip install` 装依赖、写系统目录或覆盖生产库前先征得用户同意，连接串里的口令不要回显。
- **常见失败**：`CRSError: Invalid projection` 先看 `pyproj.datadir.get_data_dir()` 是否为空或不存在（PROJ 数据目录缺失/多套 PROJ 混用）；`ValueError: GeoDataFrame does not support multiple columns using the geometry column name 'geometry'` 是读入或合并时重名，用 `set_geometry()` 或给列改名；`sjoin` 一条不出先比对两边 `crs` 是否一致；`GeoSeries.buffer` 报 `resolution` 弃用改传 `quad_segs`。
