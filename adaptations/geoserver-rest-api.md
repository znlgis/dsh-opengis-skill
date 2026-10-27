## DeepSeek Harness 使用建议

- **加载与引用**：完整端点分组清单在 `reference/endpoints.md`（系统管理、工作空间、datastores、coveragestores、styles、security、`/gwc/rest/*`），路径按加载结果的 Base directory 解析；主文件的 10 个示例够用时不必展开参考文件。
- **执行环境**：一律用 `curl.exe`（pwsh 里 `curl` 是别名、参数不同）；正文的 `\` 续行在 PowerShell 无效，请求体先用 `write` 落成 `body.json`，再 `curl.exe --data "@body.json"`，绕开不同 shell 的引号差异；`.zip`/`.tif` 上传用 `--data-binary @文件`，路径写正斜杠。
- **先探测版本**：`curl.exe -s -u admin:geoserver http://localhost:8080/geoserver/rest/about/version.json` 确认是 3.0.2 并顺带看组件版本；这一条同时充当连通性与凭据探测，返回 401 属认证或安全规则问题，不是版本问题。
- **验证产物**：每个写操作后立刻 GET 回读同一资源（`.../rest/workspaces/myws.json`、`.../rest/layers/myws:roads.json`），再发一次 WMS `GetMap` 取 `image/png` 用 `read_image` 确认非空；`?recurse=true` 删除后再 GET 应得 404；201 与退出码 0 都不构成成功。
- **风险与权限**：凭据用环境变量传（`$env:GS_USER`、`$env:GS_PASS`），不要硬编码进脚本文本或回显；`?recurse=true` 删除、`POST /rest/reset`、清 GeoWebCache 缓存不可逆，执行前向用户确认。
- **常见失败**：GET 正常但 POST/PUT 返回 401 是缺认证或 REST 访问规则被安全设置禁用；POST 400 先查单层包装 `{"workspace":{...}}` 与 `Content-Type`；Shapefile 必须打成含 `.shp`/`.shx`/`.dbf`/`.prj` 的 ZIP；改完 SLD 不生效要先 Truncate 该图层缓存。
