## DeepSeek Harness 使用建议

- **加载与引用**：单文件技能；WKT 来源优先交给 `proj` 技能生成（正文用 `projinfo EPSG:4547 -o WKT2:2019`），几何转换流程可以直接复用正文的 CSV 工作流。需要 NTS 侧接口时转 `nettopologysuite`，老项目渲染转 `sharpmap`。
- **执行环境**：`dotnet add package`、`dotnet run` 走 `ops_bash`，首次 restore 需要访问 NuGet。正文的 `Install-Package` 只适用于 Visual Studio 的 Package Manager Console，命令行会话里用 `dotnet add package ProjNet --version 2.1.0`。WKT 文件用工作区相对路径，示例里的占位路径不要改成用户真实数据目录。
- **先探测版本**：`dotnet list package` 区分 `ProjNet` 2.1.0 与 `ProjNet4GeoAPI` 1.4.1——两者命名空间与接口完全不同，写代码前必须确认，不要凭 `using ProjNet.CoordinateSystems` 猜。两个包的程序集都叫 `ProjNET.dll` 且不能同时引用，SharpMap 1.2 这类要 GeoAPI 接口的老项目只能用 1.4.1。
- **验证产物**：跑正文那条最小断言，`116.397, 39.908` 转 Web Mercator 应约 `(12957254.80, 4852582.10)`；高斯投影东坐标是 6 位数（含带号 8 位），若结果还是 116/39 量级，说明坐标系取错或 WKT 解析失败被静默跳过。
- **风险与权限**：ProjNet 不做轴序交换，输入一律按 `[x, y]`（经度在前），WKT 里的 `AXIS` 声明要自己判断；它也不自带 EPSG 数据库，`CoordinateSystemServices` 默认只有 4326 与 3857，其余必须自行注册 WKT。缺网格文件时偏差固定在几十米量级，高精度场景换 SharpProj 或 GDAL，不要硬调参数。新建工程、装包前征得用户同意。
- **常见失败**：`GetCoordinateSystem(4490)` 返回 `null` 是没注册；"注册了但查不到"优先怀疑 WKT 不受支持，因为 `CreateCoordinateSystem` 会吞掉解析异常，先用 `new CoordinateSystemFactory().CreateFromWkt(wkt)` 单独验证；`CreateFromCoordinateSystems` 返回 `null` 或抛异常是源/目标组合不受支持，改成"地理 → 投影"或先转 WGS84；经纬度结果反了就是把 `[lat, lon]` 当成了 `[x, y]`。
