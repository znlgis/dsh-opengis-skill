## DeepSeek Harness 使用建议

- **加载与引用**：`OguLayerUtil`、`GeometryUtil`、`CrsUtil`、`ShpUtil`、`PostgisUtil` 的完整签名在 `reference/util-classes.md`，从零构造图层等模式在 `reference/code-patterns.md`；主文件 490 行，先按章节定位再分段 `read`。
- **执行环境**：`dotnet` 走 `pwsh`；正文里的 `findstr` 是 Windows cmd 写法，MSYS 下等价 `grep`。GDAL 原生运行时由 `MaxRev.Gdal.Universal` 随包分发，不要手写 `GdalConfiguration.ConfigureGdal()`。
- **先探测版本**：`dotnet --version`；`dotnet restore` 能解析即包可用，`dotnet list package --include-transitive` 过滤 `OpenGIS.Utils` 核对 1.1.2；`NU1101` / `NU1102` 表示源或版本不可用，如实报告而不是改版本号重试。
- **验证产物**：`dotnet build` 成功只说明编译通过，GDAL 原生库是运行期才加载；`dotnet run > run.log 2>&1` 后 `read` 日志，确认 `ReadLayer` 打印的 `GetFeatureCount()` 与 `Wkid`，再 `WriteLayer` 写出 GeoJSON 回读比对，必要时 `ogrinfo -so` 复核。
- **风险与权限**：写 Shapefile / GeoPackage 会覆盖同名文件，先确认目标路径；PostGIS 连接串与 GDAL 配置里的密码不要回显；`dotnet restore`、改 `NuGet.config`、装 SDK 前先问用户。
- **常见失败**：`DllNotFoundException` / `Unable to load DLL 'gdal'` 多是 RID 与运行环境不一致，`dotnet publish -r win-x64` 后跑发布目录；`Geojson2Wkt` 传整份 FeatureCollection 文件会抛 `ArgumentException`，整文件走 `OguLayerUtil.ReadLayer`；GBK 乱码先 `Encoding.RegisterProvider(CodePagesEncodingProvider.Instance)`；`GisEngineType.GEOTOOLS` 在 .NET 版实际重定向到 GDAL。
