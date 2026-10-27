## DeepSeek Harness 使用建议

- **加载与引用**：本技能没有 `reference/` 分册，正文 269 行可一次读完；算子参数与方案字段以正文表格为准。仓库里的 `docs/plan-config-guide.md`、`docs/operator-reference.md` 要 clone 上游才存在，别当成技能目录内的文件去 `read`。
- **执行环境**：`dotnet` 走 `pwsh`；`git clone --recurse-submodules` 走 `ops_bash`，漏了 `--recurse-submodules` 会缺 `opengis-utils-for-net` 子模块、编译期报 GDAL 绑定类型缺失。Windows 用 `.\build.ps1` 与 `demo/run-demo.ps1`，Linux 才是 `./build.sh`。
- **先探测版本**：`dotnet --version` 必须是 10.0（`global.json` 锁定 10.0.301）；`dotnet run --project src/OpenGisDAF.Cli -- help` 确认 CLI 可用。本项目无 NuGet 包，不要写 `dotnet add package OpenGisDAF`。
- **验证产物**：先 `daf validate --plan plans/my.json` 再 `daf run --plan plans/my.json`，退出码 `0` 才是成功（失败或跳过都返回 1）；只有 QC 方案才生成 `{plan}.qc-report.json`，看 `totalChecked` / `failed` / `passRate`。测试必须 `dotnet build OpenGisDAF.slnx --configuration Release` 加 `dotnet test OpenGisDAF.slnx --configuration Release --no-build`，同一条 `dotnet test` 会“运行了零个测试”并退出码 5。
- **风险与权限**：`daf plan` 写 `%APPDATA%\opengis-daf\plans`；PostGIS 输出的 `encryptedPassword` 只接受当前用户生成的 DPAPI / AES-256-GCM 密文，明文直接失败；输出表已存在会报 `Layer already exists` 而不是覆盖，删表前先问用户。
- **常见失败**：`buffer` 的 `distance` 单位随数据坐标系，EPSG:4326 下 800 就是 800 度，先 `coordinate_transform` 转米制；插件目录里出现 `OpenGisDAF.Core.dll` 会让 `IOperator` 类型不同源、算子被静默跳过，csproj 必须 `Private="false" ExcludeAssets="runtime"`；`daf operator import` 只对当前进程有效，要让插件参与 `daf run` 得用 `demo/plugin/OpenGisDAF.PluginHostDemo` 同进程宿主。
