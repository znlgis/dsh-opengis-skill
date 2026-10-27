## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有 SKILL.md，没有 reference 子目录；参数不确定时先跑 `pdal --options filters.smrf` 或 `pdal --drivers` 取运行时定义，不要凭记忆写 stage 参数。管线较长时用 `write` 把 JSON 存成工作区里的 `pipeline.json`，复用与逐条修改都比命令行内联可靠。
- **执行环境**：`pdal info`/`translate`/`pipeline` 走 `ops_bash`；Windows 上 PDAL 一般来自 conda-forge 或 OSGeo4W，`pdal` 不在 PATH 时用 `command -v pdal`（`pwsh` 里 `Get-Command pdal`）定位。正文的 `sudo apt` 不可用，改用 `conda install -c conda-forge pdal python-pdal`，或 `docker run --rm -v "$PWD":/data -w /data pdal/pdal pdal pipeline pipeline.json`，注意容器内路径要按 `/data` 重写。
- **先探测版本**：`pdal --version`（本技能基准 2.10.2）与 `pdal --drivers`。`pip install PDAL` 依赖系统已装 PDAL 库（需 `pdal-config`），拿不到就改用 conda 的 `python-pdal`；PyPI 上 `pdal` 的 3.5.5 与主库 2.10.2 是两套独立版本号，不要混为一谈。`pdal ground` 自 2.6 弃用、2.8 完全移除，见到它一律换成 `filters.smrf` 的管线写法。
- **验证产物**：点云用 `pdal info --summary out.laz` 核对 `num_points`、`bounds`、`srs`；DEM 用 `gdalinfo -json dem.tif` 核对波段数与范围，注意 `writers.gdal` 默认 `output_type: "all"` 会输出多波段，要单波段必须显式写 `idw`/`mean`。管线先 `pdal pipeline --validate` 再实跑，退出码 0 不能证明结果正确。
- **风险与权限**：`pdal translate` 与各 writer 会按 `filename` 覆盖同名输出，先确认目标文件名；`filters.outlier`、`filters.smrf` 需要全局统计、无法流式，大数据先分块，别一次把整片点云读进内存；拉取 Docker 镜像或下载大点云前征得用户同意。
- **常见失败**：`Couldn't create <cls> stage of type '<type>'.` 多为 stage 名拼错或该版本没有此 stage，先 `pdal --drivers` 确认再核对 `readers.*`/`filters.*`/`writers.*` 前缀；`filters.reprojection` 报缺 SRS 时补 `out_srs`，数据无坐标系再补 `in_srs`；重投影后精度变差在 writer 里加 `scale_x/y/z` 与 `offset_x/y/z: "auto"`；Python 里 `pipeline.execute()` 返回的是点数，数据在 `pipeline.arrays`，失败细节看 `pipeline.log` 而不是异常栈。
