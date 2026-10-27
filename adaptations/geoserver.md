## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有主文件，部署方式、SLD 示例、GeoWebCache seed 与常见问题都在其中；要批量建 workspace/store/layer 时配合 `geoserver-rest-api` 技能，不要在本技能里手写 REST 流程。
- **执行环境**：`sh bin/startup.sh`、`unzip`、`wget` 都是 Linux 写法；Windows 下最省事的是 Docker 镜像 `docker.osgeo.org/geoserver:3.0.2`，`$PWD` 换成 `(Get-Location)`，下载用 `curl.exe -LO`、解压用 `Expand-Archive`。服务是长驻进程，起容器或 startup 脚本用后台作业，再轮询日志与端口。
- **先探测版本**：`java -version` 必须是 17 或 21，低于 17 启动 3.0.2 会直接报 `UnsupportedClassVersionError`；起来后 `curl -s -u admin:geoserver http://localhost:8080/geoserver/rest/about/version.json` 核对 GeoServer、GeoWebCache 与 JVM 版本。
- **验证产物**：发布图层后 `curl -s -o out.png -w "%{http_code} %{size_download}\n" "...request=GetMap&layers=my_ws:poi&..."` 要 200 且字节数大于 0，再用 `read_image` 看图不是空白；同时拉一次 `GetCapabilities` 确认图层已注册，不要只凭 Web UI 回显。
- **风险与权限**：`admin:geoserver` 与数据库口令不要进命令行回显或报告，用环境变量传入；seed 大范围瓦片会迅速吃满磁盘，先用小 zoom 范围试；删除 workspace、清 GWC 缓存、改 `-Xmx`、重启容器前先征得用户同意。
- **常见失败**：WMS 空白图先查 native bounds 与 SRS 是否对不上；改完 SLD 预览不变是被 GeoWebCache 缓存，Truncate 该图层或给 GetMap 加 `&tiled=false`；Shapefile 中文乱码改 Store 的 `charset`（`UTF-8` 或 `GBK`）；扩展 jar 放进 `webapps/geoserver/WEB-INF/lib/` 后要重启。
