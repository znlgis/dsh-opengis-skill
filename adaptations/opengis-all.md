## DeepSeek Harness 使用建议

- **加载与引用**：这是索引型技能，先按四个阶段定位要用的工具，再加载对应子技能（`gdal`、`gdal-api`、`qgis-process`、`pyqgis`、`geoserver-rest-api`、`openlayers`）读细节，不要指望本文件给全参数。参考文件较长：`reference/data-stages.md` 按阶段一至阶段四的标题分段读，`reference/workflow-cheatsheets.md` 只取端到端示例、内置算法速查与 GDAL 命令速查三节。
- **执行环境**：四个阶段的命令都在 `ops_bash` 里跑；GeoServer 这类要起服务的阶段用后台作业启动 `docker run -d -p 8080:8080 docker.osgeo.org/geoserver:3.0.2`，再用 `curl` 轮询 `/geoserver/rest/about/version.json` 确认就绪，不要让一次调用阻塞。`QT_QPA_PLATFORM=offscreen` 在 bash 写成命令前缀，在 `pwsh` 写成 `$env:QT_QPA_PLATFORM = "offscreen"`。
- **先探测版本**：`gdalinfo --version`、`ogrinfo --version`、`qgis_process --version`（本技能按 QGIS 3.44 LTR 或 4.x 编写，`qgis_process` 自 3.16 起可用）、`curl -u admin:geoserver "http://localhost:8080/geoserver/rest/about/version.json"`。缺哪个阶段的工具就直接加载相邻技能，不要在工具缺失时硬编整条链路。
- **验证产物**：每阶段产物落盘到工作区（GeoPackage/COG/GeoJSON），下一阶段只读产物；转换后用 `ogrinfo -so`、`gdalinfo -json` 核对 CRS、范围与要素数；发布后用 `curl -u admin:geoserver "$BASE/layers/demo:roads_buffer.json"` 回读，确认 HTTP 200 且含 `"enabled": true`，或查 `GetCapabilities`。任一步失败先修当前阶段的产物，不要带着坏数据往下走。
- **风险与权限**：`gdal_edit.py`、`?recurse=true` 删除、覆盖已有输出都不可逆，先备份并确认路径；GeoServer 默认 `admin:geoserver` 只适合本地演示，真实凭据不要写进命令行或回复里；`GDAL_DATA`、`PROJ_LIB`、`QT_QPA_PLATFORM` 等环境变量会影响同机其它工具，改动前征得用户同意。
- **常见失败**：`qgis_process` 在无显示器环境崩溃是缺 `QT_QPA_PLATFORM=offscreen`；GeoServer 上传 Shapefile 失败要把数据打成 ZIP 且根目录含 `.shp`/`.shx`/`.dbf`/`.prj`；REST 返回 401/403 先查 HTTP Basic Auth 与用户权限；分析结果整体错位是全链路 CRS 没统一，用 `ogr2ogr -t_srs`、`gdalwarp -t_srs` 或 `native:reprojectlayer` 对齐；找不到 `gdal_calc.py` 是缺 Python 绑定，可改用 `qgis_process run gdal:rastercalculator`。
