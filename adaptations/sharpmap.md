## DeepSeek Harness 使用建议

- **加载与引用**：本技能无 `reference/` 分册，正文 344 行；渲染、PostGIS、瓦片三条路径按「典型工作流」定位，样式与主题细节看「主题样式」与「常见问题」两节。
- **执行环境**：`dotnet` 走 `pwsh`；WinForms 控件 `SharpMap.UI` 只有 .NET Framework 4.7.2，工程 `TargetFramework` 必须写 `net472`，不能套 net8.0。`dotnet add package SharpMap --version 1.2.0` 前先确认工程目录，别在技能目录里执行。
- **先探测版本**：`dotnet --version` 与 `dotnet restore`；`restore` 伴随 NU1902 / NU1903 / NU1904 漏洞告警是 1.2.0 的已知状态，不要当安装失败，但要向用户说明。坐标变换用 `ProjNet4GeoAPI` 1.4.1，ProjNet 2.x 与 SharpMap 1.2 类型不兼容。
- **验证产物**：`dotnet build` 通过不算完成；跑出 `map.GetMap()` 保存的 PNG，再用 `read_image` 看按人口分色的面、标注文字和底图瓦片是否都在，空白或整体偏移都要继续查。
- **风险与权限**：GDI+ 的 `Brush` / `Pen` / `Bitmap` 必须 `using` 或 `Dispose`，否则长时间运行内存持续上涨；连接 PostGIS、装包、新建工程前先问用户，连接串里的密码不要写进代码或回答。
- **常见失败**：无图先查 `map.SRID` 与图层 SRID 是否一致、有没有 `ZoomToExtents()`；Shapefile 中文乱码要 `shp.Encoding = Encoding.GetEncoding("GBK")`（构造函数没有 Encoding 重载）；`TileAsyncLayer` 在 `SharpMap.Layers.BruTile` 包；`SharpMap.UI.WinForms` 这个包名不存在，控件在 `SharpMap.UI`。
