## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有主文件，`create-envfile.py` 参数表、`/api/v2/uploads/upload` 的 action 语义与常见问题都在其中；操作前先 `read` 对应小节，不要按通用 REST 直觉拼 `/api/v2/*`，新旧接口返回结构不同。
- **执行环境**：Docker 是主路径，`docker compose build`、`up -d` 放后台作业，`docker compose logs -f django` 用 `job_output` 轮询；Windows 上 curl 写 `curl.exe`，`-F "base_file=@data/roads.zip"` 的路径用正斜杠；Basic 认证可用 `curl.exe -u 用户:密码` 让 curl 自己生成认证头，别在 pwsh 里手算 base64（那里没有 `base64` 命令）。
- **先探测版本**：`curl.exe -s http://localhost/version.txt` 要返回 5.1.1，再 `curl.exe -s "http://localhost/api/v2/resources?page_size=1"` 确认 API 可用；源码分支要与版本对应（5.1.1 对应 `5.1.x`），不要用旧文档的 `5.0.x`。
- **验证产物**：上传返回 201 后不要立刻查，先等日志出现 `Executing UWSGI server uwsgi --ini /usr/src/app/uwsgi.ini`，再轮询 `/api/v2/resources?search=...` 确认异步解析完成，回读资源详情核对 `subtype`、`alternate`、`links[]` 与 `download_url`，最后对 `OGC:WMS` 地址发一次 `GetMap` 并用 `read_image` 看图。
- **风险与权限**：`action=replace` 整体替换数据、删除资源、`migrate`、恢复数据库都不可逆，执行前备份 `geonode` 与 `geonode_data` 两个库并确认 `resource_pk`；`.env` 里的 `ADMIN_PASSWORD`、`clientid`/`clientsecret` 不要回显；`--env_type prod` 会去申请 Let's Encrypt 证书，先在 `dev` 下跑通。
- **常见失败**：compose up 后 502 是 Django 还在迁移或启动失败，先看 `docker compose logs -f django` 的首个 Traceback；上传 401 查 Authorization 头与 base64 内容（必须是 `用户名:密码`），403 是用户缺 `base.add_resourcebase`；资源一直处理中是 Celery 或 Redis 没起来。
