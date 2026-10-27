## DeepSeek Harness 使用建议

- **加载与引用**：本技能没有 `reference/` 目录，全部内容就在正文；排查时先看「版本与目标框架对照」表确定版本分支，再看「常见问题」表。需要联动时用 `read` 打开 `../mapsui/SKILL.md`、`../sharpmap/SKILL.md`（相对 Base directory，即本仓库 `assets/mapsui/SKILL.md`）。
- **执行环境**：`dotnet add package BruTile --version 6.0.0`、`dotnet build`、`dotnet run` 走 `ops_bash`；`dotnet add package` 会改写 `.csproj` 并触发整解决方案 restore，首次 restore 要联网且慢，放后台作业再 `job_output` 看日志。正文的 `Install-Package` 是 Windows PowerShell 的 NuGet 写法，`pwsh` 里不一定可用，优先用 `dotnet add package`。
- **先探测版本**：先 `dotnet list package` 看 BruTile 实际是 6.0.0 还是 5.x——两者的 `GetTileAsync` 签名不同；再用 `grep` 查工程文件的 `TargetFramework`，不是 net8.0/net9.0 就按对照表降到 5.0.6（netstandard2.0 / SharpMap 1.2）。`dotnet add package` 不写 `--version` 会装最新版。
- **验证产物**：先跑正文「验证」段的最小用例——`GlobalSphericalMercator` 加 `GetTileInfos`，0 级应只有 1 张瓦片、`Resolutions.Count` 为 20，再接网络层；取图结果判 `png?.Length > 0`，只看「没抛异常」会把 404 当成成功。MBTiles 用 `SQLiteOpenFlags.ReadOnly` 打开后先读一张 0 级瓦片，确认原生库能加载。
- **风险与权限**：`dotnet add package` 改工程文件、`dotnet run` 抓第三方瓦片服务（消耗对方配额并受 OSM 使用政策约束）都要先说清再执行；Bing/Here 的 `apiKey` 从环境变量读，不要写进示例源码、命令或回答；不要按旧文档去装已删除的 `BruTile.Desktop`。
- **常见失败**：`CS0246: 找不到类型 KnownTileSources` 是缺 `using BruTile.Predefined;`；`GetTileAsync(tileInfo)` 编译失败是 6.x 改成传复用的 `HttpClient`；「无法加载 sqlite3」是 `SQLitePCLRaw` 原生库没随输出目录发布；瓦片 404 查级别与模板，行列错位查 `YAxis.OSM`/`YAxis.TMS`。
