## DeepSeek Harness 使用建议

- **加载与引用**：单文件技能，没有 reference 子目录；代码块密集，先按章节标题（几何工厂、空间关系与运算、WKT/WKB/GeoJSON、STRtree、EF Core、ProjNet）定位再 `read` 片段，比整篇读省上下文。跨投影转 `projnet4geoapi`，Java 侧对照转 `jts`。
- **执行环境**：`dotnet add package`、`dotnet build`、`dotnet run` 走 `ops_bash`；首次 restore 需要访问 NuGet，离线或受限时先说明再换源，不要反复重试。中文输出建议写进文件再用 `read` 看，避免控制台编码干扰判断。
- **先探测版本**：`dotnet --version` 确认 SDK 6.0+，工程里 `dotnet list package` 核对 `NetTopologySuite` 2.6.0、`NetTopologySuite.IO.GeoJSON`（或 `IO.GeoJSON4STJ`）4.0.0、`NetTopologySuite.IO.Esri.Shapefile` 1.2.0、`ProjNet` 2.1.0；IO 包与主库错配是这类工程最常见的编译/运行期报错源。
- **验证产物**：`dotnet build` 后跑 `dotnet test`，或最小控制台做 WKT 往返 + `IsValid` 断言；`GeoJsonConverterFactory` 序列化后再反序列化，比对坐标数与 `IsValid`，只打日志不算验证。
- **风险与权限**：`WKBWriter` 默认丢 Z/M，需要就用 `HandleOrdinates`；SRID 只是元数据、计算在平面进行，跨投影交给 ProjNet；`GeometryFixer.Fix` 可能把无效面拆成 `MultiPolygon`，不要照抄正文那种 `(Polygon)GeometryFixer.Fix(poly)` 强转，否则遇到拆分的输入会抛转换异常，改用 `Geometry` 接收。EF Core 里不要同时引 `Microsoft.SqlServer.Types`，类型冲突会直接报错。装包、建工程、连数据库前征得用户同意。
- **常见失败**：`TopologyException` 先 `GeometryFixer.Fix`；`TypeInitializationException` 或程序集加载失败多半是 IO 包版本与主库不匹配；`GeoJsonConverterFactory` 找不到说明装的是 Newtonsoft 版 `IO.GeoJSON`，该类只在 `IO.GeoJSON4STJ`；Shapefile 读取报错通常是用了 `NetTopologySuite.IO.Esri.Shapefile` 之外的包或命名空间。
