## DeepSeek Harness 使用建议

- **加载与引用**：主文件的步骤表足以定位 `use:` 的 ID，只有需要完整参数时才 `read` `reference/steps-reference.md` 的对应类别小节（共八百多行，不要整篇读入）；现成 YAML 看 `reference/workflows.md`，后端可用性看 `reference/backends.md`，能力缺口走 `reference/self-extension.md`。
- **执行环境**：`geopipe-agent` 走 `ops_bash`。正文提醒 `python` 可能指向 QGIS/GDAL 自带解释器，所以在工作区建独立 venv 再 `pip install -e ".[analysis,network]"`；该包未发布到 PyPI，写 `pip install geopipe-agent` 一定 404，只能 `git clone https://github.com/znlgis/GeoPipeAgent.git` 后源码安装。确认装好用 `pip show geopipe-agent`。
- **先探测版本**：`geopipe-agent --help`、`geopipe-agent backends`（当前环境可用的后端，默认 `native_python`）、`geopipe-agent list-steps --format json`（拿真实步骤 ID；本技能基准 0.1.0，36 个步骤）。`qgis_process`/`pyqgis` 后端通常只在 OSGeo4W、QGIS 自带 Python 或 conda 环境可用，没装就不要在 YAML 里指定。
- **验证产物**：先 `geopipe-agent validate pipeline.yaml` 再 `run pipeline.yaml`，然后看 JSON 报告里的 `qc_summary` 与各步骤统计，最后重开输出核对——`geopipe-agent info output/result.geojson`，有 GDAL 时也可 `ogrinfo -so output/result.geojson result`，确认要素数与 CRS。
- **风险与权限**：`network.geocode`、`http.request`、`curl_api` 会把数据发到外部服务，执行前确认是否允许出网并检查 `user_agent` 与凭据；`gdal.cli` 直通步骤的 `output_path` 必须落在 workspace 内，`args` 里的相对路径以进程工作目录为基准，建议写绝对路径；`scaffold step` 默认 dry-run，加 `--allow-author` 才写盘。
- **常见失败**：`validate` 报 `not registered` 是能力缺口而非参数错，先用 `geopipe-agent resolve "<需求>"` 与 `knowledge search` 走五步闭环，不要猜参数；`when` 引用了不存在的 `$step.attr` 会按 false 静默跳过，条件步骤不执行先查这一条；步骤 ID 不能含点号，`$step_id` 必须由更早步骤提供；`backend:` 只有声明了 backends 的 6 个矢量步骤会读取；QC 步骤是“检查即透传”，`output` 就是输入，结论在 `$step.issues`；`analysis.*`/`network.*` 报 ImportError 是缺可选依赖，补 `pip install -e ".[analysis,network]"`。
