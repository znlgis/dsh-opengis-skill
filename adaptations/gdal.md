## DeepSeek Harness 使用建议

- **加载与引用**：先按本技能正文定位工具，再按需 `read` `reference/vector-tools.md`、`reference/raster-tools.md`、`reference/data-formats.md`（路径相对 Base directory）；一次批量转换任务通常只需 vector 或 raster 其中一个参考文件。
- **执行环境**：命令走 `ops_bash`；Windows 下示例里的 `apt-get install`/`sudo` 不可用，改用 conda-forge（`conda install -c conda-forge gdal`）或 `docker run --rm -v "$PWD:/data" -w /data osgeo/gdal:latest`，容器内路径与宿主路径要分开写。
- **先探测版本**：`gdalinfo --version`、`ogrinfo --version`，再决定用新版统一 CLI 还是传统命令——本技能按 3.13.3 编写，`gdal raster`/`gdal vector` 需 3.11+，`gdal dataset check` 需 3.13+；缺 Python 绑定时 `gdal_calc.py`、`gdal_merge.py` 会不可用。
- **验证产物**：栅格用 `gdalinfo -json out.tif` 核对驱动、尺寸、CRS 与 NoData，矢量用 `ogrinfo -so out.gpkg layer`（或 `ogrinfo -json`）核对要素数与几何类型；批量任务至少抽查一个输出，不要只看循环退出码。
- **风险与权限**：`-overwrite`/`-append`、`gdal_edit.py`、写已有目标路径会就地改写数据，先备份或换输出名；访问 `/vsis3/` 需要真实凭据，安装 GDAL、改 `GDAL_DATA`/`PROJ_LIB` 前先征得用户同意。
- **常见失败**：`ERROR 4: ... not recognized as a supported file format` 先查路径、扩展名与 `gdalinfo --formats`；驱动或投影异常时开 `CPL_DEBUG=ON` 并把输出重定向到日志，再用 `grep` 定位第一条错误。
