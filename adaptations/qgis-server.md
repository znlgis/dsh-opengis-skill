## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有主文件，`MAP` 参数、`QGIS_SERVER_*` 变量表、Apache/Nginx 片段与排障表都在其中，按小节用 `read` 定位即可；请求 URL 直接按正文示例替换 `MAP` 与 `LAYERS`。
- **执行环境**：验证请求走 `ops_bash`，Windows 上要写 `curl.exe`（`curl` 是别名，参数不同）。本会话改不了远端 Apache/Nginx，只能在本机或容器里验证：正文的容器写法是 `docker run -d --rm --name qgis-server --net=qgis -v $(pwd)/data:/data:ro -e QGIS_PROJECT_FILE=/data/osm.qgs qgis-server:latest`，用后台作业跑，再另起 `curl` 打 FastCGI 端口。
- **先探测版本**：用同一安装的 `qgis --version` / `qgis_process --version`，或 `dpkg -l qgis-server`、容器镜像 tag 确认服务端版本；正文基准是 4.2.3 与 LTR 3.44.15，生成项目的 QGIS Desktop 必须与服务端大版本一致。直接执行 `/usr/lib/cgi-bin/qgis_mapserv.fcgi` 返回 `ServiceExceptionReport` 只说明二进制可用，不代表部署正确。
- **验证产物**：先 `curl "http://localhost/cgi-bin/qgis_mapserv.fcgi?MAP=/data/world.qgz&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"` 存盘后 `grep` 图层名核对，再取 `GetMap` 的 `FORMAT=image/png` 用 `read_image` 看是否空白，最后才测 `GetFeature` 与 WMTS `GetTile`。
- **风险与权限**：`QGIS_SERVER_*` 改完要重启 FCGI 进程或容器才生效，`QGIS_SERVER_LOG_FILE` 已废弃，日志统一用 `QGIS_SERVER_LOG_STDERR=1`；项目文件可能内嵌数据库凭证，命令与报告里不要回显；开端口、改 Web 服务器配置、起容器前先向用户确认。
- **常见失败**：`GetMap` 空白先查 `MAP` 路径可读性与 `OWS Server` 页的 `published` 勾选，再查 CRS 与 `BBOX`；`GetCapabilities` 里图层名是长 ID 说明开了 Use layer ids as names；`GetPrint` 在无 X 的 Linux 上要 `Xvfb` 加 `DISPLAY=:99`；OAPIF 在 `/wfs3`，按正文不要用 `MAP`，改 `QGIS_PROJECT_FILE`。
