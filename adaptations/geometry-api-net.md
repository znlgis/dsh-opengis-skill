## DeepSeek Harness 使用建议

- **加载与引用**：几何类型体系与 `GeometryEngine` / Operator 两种 API 风格的完整说明在 `reference/geometry-types.md`；主文件的序列化格式与场景示例够用时不要提前展开参考文件。
- **执行环境**：`dotnet` 走 `pwsh`，MSYS bash 会把 `/p:...` 这类参数当路径改写；`dotnet new console -o demo` 起最小工程，示例里的 `samples/OpenGIS.Esri.Geometry.Samples` 是上游仓库 checkout 内的路径，本地没有就别照抄。
- **先探测版本**：`dotnet --version`；库目标 `netstandard2.0`，net6/net8/net9/net10 都能引用。`dotnet add package OpenGIS.Esri.Geometry.Core --version 1.0.9`，需要 `System.Text.Json` 转换器再加 `OpenGIS.Esri.Geometry.Json`；`NU1101` 说明源或版本不可用，不要自己编版本号。
- **验证产物**：`dotnet build` 通过不代表几何正确；`dotnet run > run.log 2>&1` 后 `read` / `grep` 日志，断言 WKT 往返、`GeometryEngine.Contains(polygon, point)` 为 true、`Buffer(point, 5.0).GetEnvelope()` 为 (5, 15, 15, 25)；面积用近似比较，交集实测约 `24.999998`，别断言等于 25。
- **风险与权限**：`dotnet restore` 要访问 NuGet 源，离线先看本地缓存；改全局 `NuGet.config`、装 SDK、写系统目录前先问用户；`bin/`、`obj/` 不要提交。
- **常见失败**：`Polygon.AddRing` 环不闭合会让面积与包含判断异常；集合运算返回 `Geometry` 基类，要按 `Polygon` / `Polyline` 转型；`Simplify` 传 `0.0` 抛 `ArgumentException: Tolerance must be positive`；`GeodesicDistance` 只接受经纬度，投影坐标下结果无意义；`GetRing()` / `GetPath()` 是只读视图，修改前先复制。
