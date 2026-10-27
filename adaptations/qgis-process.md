## DeepSeek Harness 使用建议

- **加载与引用**：主文件给高频用法，算法 ID、参数类型与工作流示例在 `reference/algorithm-cheatsheet.md`，路径按加载结果的 Base directory 解析，用 `read` 分段取需要的段落，不要整份读入。
- **执行环境**：`qgis_process` 走 `ops_bash`；Windows 上它只在 `C:\Program Files\QGIS 4.2\bin`（LTR 为 `C:\Program Files\QGIS 3.44\bin`）或 OSGeo4W Shell 的 PATH 里，bash 找不到时改用 `pwsh` 调带引号的绝对路径。无本地安装时按正文用容器 `docker run --rm -v "$PWD:/data" qgis/qgis:ltr qgis_process --version`，宿主路径与容器内 `/data` 要一一对应。
- **先探测版本**：先 `qgis_process --version`（正文基准 4.2.3 与 LTR 3.44.15；`qgis_process` 自 3.16 才存在，更老的安装只能退回 PyQGIS），再 `qgis_process list` 确认要用的 provider 前缀在列表里；每次 `run` 之前先用 `qgis_process help <id> --json` 拿参数名与默认值，别凭记忆拼参数。
- **验证产物**：从 `run ... --json` 的 `results.OUTPUT` 取实际绝对路径（不要自己拼），再 `ogrinfo -so out.gpkg 图层名` 或 `gdalinfo -json out.tif` 核对要素数、CRS、范围；`log` 数组里出现 `returned non-zero` 时进程退出码仍是 0，必须按失败处理。
- **风险与权限**：`OUTPUT=` 指向已存在文件会被直接覆盖，先换名或备份；`DISTANCE` 的单位跟图层 CRS 走，地理坐标系下 50 表示 50 度而不是 50 米，必要时先跑 `native:reprojectlayer`；`--project_path` 会加载项目里的数据源与凭证，不要把含密码的 `.qgs` 交给外部环境；装 QGIS、拉镜像前先问用户。
- **常见失败**：`Algorithm <id> not found!` 查 provider 前缀（`native:`、`gdal:`、`grass:`）与 `qgis_process list`；枚举参数报错是没传数字索引，回看 `help --json` 的 `available_options`；`File ... is not a valid Processing model!` 或 `not available for use outside of the QGIS desktop application` 说明该模型或脚本无法脱离桌面，改走 PyQGIS。
