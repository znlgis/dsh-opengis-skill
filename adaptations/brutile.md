## DeepSeek Harness 使用建议

- **加载与引用**：单文件技能，无 reference；正文按 BruTile 6.0.0 编写，先读「环境准备 → 版本与目标框架对照」再决定用 6.x 还是 5.0.6，`KnownTileSources` 的命名空间与 `GetTileAsync` 签名以正文表格为准。需要宿主组件时用 `skill` 加载 `mapsui` 或 `sharpmap`，不要 `read` 兄弟目录的 SKILL.md。
- **执行环境**：`dotnet` 命令走 `pwsh`（Windows 下是 `dotnet.cmd`，MSYS bash 里也能调，但 NuGet 缓存与 `$env:NUGET_PACKAGES` 用 PowerShell 省事）。`dotnet add package` 与 `dotnet restore` 要访问 NuGet，首次拉包慢，把 `dotnet build > build.log 2>&1` 放后台作业再 `job_output` 收日志。示例工程建在会话工作区，不要写进 assets/；三步以上（探测 → 建工程 → 取图验证）先 `todo_write` 列清步骤。
- **先探测版本**：`dotnet --list-sdks` 与 `dotnet list package` 一起看。正文按 6.0.0 编写：6.x 只发 net8.0/net9.0，且 `IHttpTileSource.GetTileAsync` 必须显式传 `HttpClient`；5.0.6 才有 netstandard2.0（.NET Framework、SharpMap 1.2 场景）；`BruTile.Desktop` 从 4.0 起已删除，旧代码的 `using BruTile.Desktop` 要换命名空间。TFM 与包版本对不上时降包版本，不要为凑旧包改正文里的 6.x 写法。
- **验证产物**：先跑离线最小用例——`new GlobalSphericalMercator()` 的 `Resolutions.Count` 应为 20，0 级 `GetTileInfos` 只返回 1 张；再接网络取图，判据是字节数大于 0 且 PNG 魔数为 `89 50 4E 47`，只判断「没抛异常」不算验证。把一张瓦片落盘后用 `read_image` 真看一眼内容是不是地图，给用户的出图用 `present` 交付；批量取图先抽检首尾两张再全量跑。
- **风险与权限**：抓第三方瓦片服务前确认使用政策与 key，OSM 等公共服务有速率限制且 `Attribution` 必须显示，示例里不要写死真实 key。安装或升级 BruTile、改 TFM、把 MBTiles 以读写方式打开（正文要求 `SQLiteOpenFlags.ReadOnly`）之前用 `ask_user_question` 给「保持 6.0.0 / 降到 5.0.6 / 先不动」三选项。AOT/裁剪发布要保留 SQLitePCLRaw 原生库。
- **常见失败**：`CS0246: 找不到类型 KnownTileSources` 是漏了 `using BruTile.Predefined;`；`无法加载 sqlite3` 查原生库是否复制到输出目录；瓦片全 404 先查缩放级别与 `{z}/{x}/{y}` 模板顺序，行列整体错位查 `YAxis.OSM` 与 `YAxis.TMS`。日志重定向后用 `grep` 定位第一条错误，不要从头读；连接耗尽先查是不是每次请求都 new 了 `HttpClient`。
