## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有主文件，服务拆分表、PgConfig 变量、网关路由前缀与排障顺序都在其中，按小节 `read` 即可；compose 与 Helm 两套流程不要混用，先确定目标是本地 compose 还是 K8s。
- **执行环境**：`docker compose up -d`、`helm dependency update`、`kubectl` 都是长跑命令，放后台作业再轮询；下载 compose 文件用 `curl.exe -LO` 而不是 `wget`。先 `docker version`、`helm version`、`kubectl version --client` 确认工具在 PATH，缺工具就如实告诉用户，别假设已装。
- **先探测版本**：`curl.exe -s -u admin:geoserver http://localhost:9090/geoserver/cloud/rest/about/version.json` 读服务版本，`curl.exe -s http://localhost:9090/actuator/health` 要拿到 `{"status":"UP"}`；镜像标签、compose 文件与 Helm chart 保持同一版本号（3.0.2），避免网关与下游服务错配。
- **验证产物**：`docker compose ps` 显示 Up 不等于 OGC 服务可用，要经网关走通 `/geoserver/cloud/rest/workspaces.json` 与一次 WMS `GetMap`，出图用 `read_image` 看；K8s 上逐服务 `kubectl -n gis get pods` 加端口转发再验证。
- **风险与权限**：`docker compose down -v`、`helm uninstall`、删 PVC 或 PgConfig schema 会丢全部配置，执行前必须确认并备份；`admin:geoserver`、`PGCONFIG_PASSWORD`、RabbitMQ 口令不要回显；3.x 已不发布 discovery 镜像，服务发现用 `hashicorp/consul`。
- **常见失败**：网关 502 查 Consul 注册与目标服务健康（`kubectl -n gis logs deploy/<wms>`）；配置改了 WMS 没生效查 RabbitMQ 可达性与 `GEOSERVER_BUS_ENABLED`；瓦片 404 查 gwc 是否部署、`GEOSERVER_BASE_PATH` 前缀是否与请求路径一致；走 config server 时环境变量要加 `SPRING_CLOUD_CONFIG_SERVER_OVERRIDES_` 前缀。
