## DeepSeek Harness 使用建议

- **加载与引用**：正文给了四条互不从属的入口（Python 包、`geolibre-mcp`、Docker 镜像、源码运行），先按用户目标选一条，不要混搭；走 MCP 时第一个工具是 `list_catalog`，底图、色带、插件 id 以它为准，猜错不会报错只会静默不生效。
- **执行环境**：`pip install geolibre==3.5.1`、`pip show geolibre`、`geolibre-mcp --help`、`docker run --rm -p 8080:80 ...` 都走 `ops_bash`；容器是常驻进程，必须放后台作业，`curl.exe -I http://localhost:8080/healthz` 探活后 `job_kill`。GUI 动作（`Help → About`、`Processing → Jupyter Notebook` 启动中继）agent 点不了，写成步骤交给用户。
- **先探测版本**：先 `pip show geolibre` 与 `geolibre-mcp --help`；正文按 3.5.1，要求 Python >= 3.11，解释器低了会直接装失败，别误判成网络问题；conda-forge 渠道是 3.5.0，与 PyPI 版本不一致时以 3.5.1 行为为准；`GEOLIBRE_MCP_ROOTS` 在 Windows 用分号分隔。
- **验证产物**：工程写完用 `python -c "import json;d=json.load(open('my-map.geolibre.json'));print(len(d.get('layers',[])),'layers')"` 核对图层数，再打开 `export_html` 产出的 HTML 确认能渲染。`export_html` 会剥掉凭据，指向本地文件的图层在别人机器上不加载，要分享就换托管 URL。
- **风险与权限**：MCP 写盘要过几道闸——只写 `.json`/`.html`、不带 overwrite 不覆盖已存在文件、内联 GeoJSON 不超过 50 MB、工程读取不超过 256 MB；`--root` 只给专门放地图的目录，不要给家目录；`export_html` 的 `app_url` 是信任边界，工程内容会被 POST 过去；`GEOLIBRE_CONVERSION_ROOTS` 之外的路径 sidecar 一律拒绝。
- **常见失败**：路径被拒先确认在 `--root` 或 `GEOLIBRE_MCP_ROOTS` 内，且不是指向根外的符号链接；客户端 spawn 找不到 `geolibre-mcp` 时改用 venv 解释器加 `-m geolibre.mcp`；`live_` 工具报未连接是桌面版中继没启动；Linux 空白窗口用 `WEBKIT_DISABLE_DMABUF_RENDERER=1 geolibre-desktop`。
