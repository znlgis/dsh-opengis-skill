## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有 SKILL.md，没有 reference 子目录，工具清单与坑都在正文；`projinfo` 的 WKT 输出动辄上百行，重定向到文件再分段 `read`/`grep`，或直接加 `-q`（只出字符串本体）、`-o PROJJSON -q`（结构化），不要把整段 WKT 贴进上下文。
- **执行环境**：`projinfo`、`cs2cs`、`proj`、`cct`、`projsync`、`geod` 都在 `ops_bash` 里跑；正文的 heredoc（`<<'EOF'`）在 bash 可用、在 `pwsh` 不可用，Windows 会话优先用管道 `echo 39.907 116.391 | cs2cs EPSG:4326 EPSG:32650`，或把坐标写成文件再重定向。设数据目录在 bash 是 `export PROJ_DATA=...`，在 `pwsh` 是 `$env:PROJ_DATA = "C:\OSGeo4W\share\proj"`。
- **先探测版本**：`projinfo --version` 会同时打印版本与 `proj.db` 路径，是最可靠的入口；`projinfo --searchpaths` 看搜索路径。`proj` 直接执行会进交互模式，不能当版本检查用。本技能按 PROJ 9.9.0 编写：9.1 起变量是 `PROJ_DATA`（旧名 `PROJ_LIB` 仍兼容），9.3 起 `proj` 才能直接接受 `EPSG:xxxx`。Windows 上 PROJ 一般随 GDAL/QGIS 安装包自带，`command -v projinfo` 或 `Get-Command projinfo` 找不到时先定位 OSGeo4W 或 conda 的 bin 目录。
- **验证产物**：用已知点对拍——`echo 39.907 116.391 | cs2cs EPSG:4326 EPSG:32650` 应得到东坐标约 44 万、北坐标约 442 万，量级明显不对通常是轴序或单位问题；转换路径用 `projinfo -s EPSG:4326 -t EPSG:4547 --summary` 看候选操作与精度，结构化核对用 `projinfo -o PROJJSON -q EPSG:4326`。
- **风险与权限**：`projsync --all` 会从 CDN 下载数 GB 网格，`PROJ_NETWORK=ON` 也会联网，先确认网络与磁盘；`sqlite3 proj.db` 只做只读查询，不要写库；改 `PROJ_DATA` 会连带影响同机 GDAL/QGIS/PostGIS 的坐标运算，动手前征得用户同意。
- **常见失败**：`Cannot find proj.db` 用 `projinfo --searchpaths` 核对目录；`DATABASE.LAYOUT.VERSION` 不匹配是系统、conda、PostGIS 多套 PROJ 混用，统一 `PROJ_DATA` 指向与所用库一致的库文件；`The EPSG code is unknown` 说明本地 `proj.db` 太旧，先用 `projinfo --list-crs` 确认；输出轴序与预期相反时用 `-r` 反转输入、`-s` 反转输出。
