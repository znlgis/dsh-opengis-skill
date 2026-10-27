## DeepSeek Harness 使用建议

- **加载与引用**：`reference/vector-raster-layers.md` 收录图层加载、遍历、编辑、`QgsSpatialIndex`、几何运算与格式导出；`reference/processing-rendering.md` 收录 `processing.run()`、渲染与布局导出以及 6 个完整工作流。按需用 `read` 取对应小节，多数任务只读主文件即可。
- **执行环境**：必须用 QGIS 自带解释器（Windows 为 `C:\Program Files\QGIS 4.2\apps\Python312\python.exe`，LTR 在 `QGIS 3.44` 下），路径含空格，`ops_bash` 里要加引号，或改用 `pwsh` 写 `& "C:\...\python.exe" script.py`。多行脚本先用 `write` 落盘成 `.py` 再执行，别在命令行里拼 heredoc；无显示器时 bash 里 `export QT_QPA_PLATFORM=offscreen`，pwsh 里写 `$env:QT_QPA_PLATFORM = "offscreen"`。
- **先探测版本**：`python -c "from qgis.core import Qgis; print(Qgis.QGIS_VERSION)"` 确认是 4.2.3 还是 3.44.15；两个大版本存在 API 差异，回答里要写明按哪个版本写、低版本哪些类不可用。`import qgis.core` 失败先查是不是误用了系统 Python 而不是发行包解释器。
- **验证产物**：独立脚本按 `QgsApplication([], False)` → `setPrefixPath(...)` → `initQgis()` → `Processing.initialize()` → 处理 → `exitQgis()` 的次序写；写出的文件要重新 `QgsVectorLayer(...)` 打开核对 `isValid()`、`featureCount()`、`crs().authid()`，渲染或布局导出的 PNG 用 `read_image` 实际看一眼是否空白。
- **风险与权限**：`startEditing()`/`commitChanges()` 直接改源数据（Shapefile、PostGIS），先备份或把中间结果写 `memory:`；批量循环不要复用同一个 `QgsProject.instance()`；覆盖已有输出、安装 QGIS、写系统目录前先征得用户同意，批量脚本放后台作业跑。
- **常见失败**：图层 `isValid()` 为 false 时打印 `layer.error().message()` 并核对 provider 拼写（`ogr`/`gdal`/`postgres`）；`processing.run()` 报算法不存在多半是漏了 `Processing.initialize()`；3D 模块是 `qgis._3d` 而非 `qgis.3d`；出图空白查 `QgsMapSettings` 的 extent、CRS 与输出尺寸。
