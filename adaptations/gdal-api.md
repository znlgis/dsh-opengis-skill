## DeepSeek Harness 使用建议

- **加载与引用**：主文件已给出四种语言的类名对照、轴序与典型场景，只有需要可复制代码模板时才 `read` `reference/raster-api.md` 或 `reference/vector-api.md`；两份参考都按主题分节，每节内部再给 C++/Python/Java/C# 四种写法，只读目标语言那一段即可，不要整篇读入七百多行的 vector-api。
- **执行环境**：Python 脚本与 Java/.NET 工程的编译运行都走 `ops_bash`，`gdal-config --cflags --libs`、`mvn`、`dotnet` 同样在 `ops_bash` 里跑；只有需要 PowerShell 专有语法（`Get-ChildItem`、`$env:PATH`）时才改用 `pwsh`。Windows 上 `pip install GDAL` 依赖系统已装的 GDAL 库，优先 `conda install -c conda-forge gdal`；.NET 项目装 `MaxRev.Gdal.Core` 时还要补对应平台运行时包，Windows 是 `MaxRev.Gdal.WindowsRuntime.Minimal`。
- **先探测版本**：`ogrinfo --version`，`python -c "from osgeo import gdal; print(gdal.VersionInfo())"`（返回 `3130300` 这类数字），`mvn -v`，`dotnet --version`。本技能按 GDAL 3.13.3、Java 绑定 3.13.0 编写；.NET 侧用 `dotnet list package` 核对 `MaxRev.Gdal.Core` 与运行时包是否同一主版本，版本不齐时先对齐再写代码。
- **验证产物**：写完后按语言正确释放（Python `ds = None`、C++ `GDALClose()`、Java `.delete()`、C# `.Dispose()`），再重新打开核对——Python 里打印驱动短名、`RasterCount` 与 `GetSpatialRef().GetAuthorityCode(None)`，矢量用 `ogrinfo -al -so out.gpkg` 看图层名、要素数与字段。脚本跑通不等于数据落盘。
- **风险与权限**：`gdal.GA_Update` 或 `GDALOpen(..., GA_Update)` 会就地改写原文件，覆盖已有输出前先确认路径；`pip install`、`apt-get install libgdal-dev`、`dotnet add package` 会改变环境，装之前征得用户同意；改 `java.library.path`、`PATH`、`GDAL_DATA` 会影响同机其它工具。
- **常见失败**：报“驱动未注册”先补注册调用（C++/Python `GDALAllRegister()`，Java/C# `AllRegister()`，矢量另需 `OGRRegisterAll()`/`ogr.RegisterAll()`）；`UnsatisfiedLinkError` 说明 `gdalalljni` 不在 `java.library.path`，Windows 下是 `gdalalljni.dll`；Python 出错却不抛异常是没开 `gdal.UseExceptions()`；坐标整体错位先查 GDAL 3+ 纬度在前的默认轴序，需要经度在前时设 `OAMS_TRADITIONAL_GIS_ORDER`。
