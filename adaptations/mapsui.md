## DeepSeek Harness 使用建议

- **加载与引用**：本技能无 `reference/` 分册，正文按「安装」「核心概念」「典型工作流」「常见问题」定位即可；`Mapsui.Rendering.Skia.MapRenderer` 的参数正文没有完整签名，写渲染脚本前以 IntelliSense 或官方文档核对，不要凭记忆填。
- **执行环境**：`dotnet` 走 `pwsh`；工程目标框架必须 net8.0 / net9.0（`Mapsui.Wpf` 为 net8.0-windows / net9.0-windows），`Mapsui.*` 子包版本全部写 5.1.0，混版会在运行时抛类型加载异常。
- **先探测版本**：`dotnet --list-sdks` 确认有 .NET 8/9 SDK，`dotnet restore` 能解析 5.1.0，`dotnet build` 通过后才进入渲染验证；`dotnet add package Mapsui.Wpf --version 5.1.0` 这类命令要先确认工程目录，别在技能目录里执行。
- **验证产物**：`dotnet build` 不等于出图；无头环境用 `MapRenderer` 把 `map` 渲成 PNG 落盘，再用 `read_image` 直接看有没有底图、要素和标注；WPF / WinForms 窗口本会话看不到，需要用户运行后提供截图。
- **风险与权限**：新建工程、装 NuGet 包、运行桌面程序前先征得用户同意；PostGIS 连接串与瓦片服务 token 不要写进代码或回显。
- **常见失败**：`MapControl` 空白先查是否赋值 `MapControl.Map`；MAUI 空白查 `MauiProgram` 里 `UseSkiaSharp()` 与 `UseMapsui()`；坐标没用 `SphericalMercator.FromLonLat` 会画到南太平洋；Shapefile 中文乱码要 `new ShapeFile(path, true) { Encoding = Encoding.GetEncoding("GBK") }`（属性赋值，不是构造参数）；`GeometryFeature` 找不到装 `Mapsui.Nts`，瓦片类型找不到装 `Mapsui.Tiling`。
