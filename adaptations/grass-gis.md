## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有 SKILL.md，没有 reference 子目录，模块清单与坑都在正文；分析链较长时不要往 `--exec` 后面堆 `sh -c '...'`，而是用 `write` 把模块序列写成工作区里的 `.py` 或 `.sh` 脚本再执行，既避开多层引号，也便于逐条改参数重跑。
- **执行环境**：`grass ... --exec` 走 `ops_bash`。Windows 上 `grass` 一般来自 OSGeo4W（在 OSGeo4W Shell 里才有）或 conda-forge，`pwsh` 中先 `Get-Command grass` 确认；临时目录用会话工作区而不是 `/tmp`。Docker 方式按镜像名追加 `grass` 子命令：`docker run --rm --user=$(id -u):$(id -g) --env HOME=/data/ -v "$PWD":/data -w /data osgeo/grass-gis grass --tmp-project EPSG:3857 --exec python3 analysis.py`。
- **先探测版本**：`grass --version`（本技能基准 8.5.0，LTR 为 8.4.2），再用 `grass --tmp-project XY --exec g.version -rge` 确认依赖库齐全；8.4 之前没有 `grass.tools`，Python 脚本退回 `gs.run_command`/`gs.parse_command` 写法，回答里要写清按哪个版本。
- **验证产物**：`--tmp-project`/`--tmp-mapset` 结束时会删掉整个目录，所以脚本里必须先 `r.out.gdal input=slope output=... format=GTiff` 或 `v.out.ogr` 导出到工作区，再用 `gdalinfo -json slope.tif` 核对 CRS 与范围；会话内核对区域与地图用 `g.region -p format=json`、`g.list type=raster`。
- **风险与权限**：`g.remove`、`--overwrite`、`t.connect` 会改或删地图集数据；重复运行不加 `--overwrite` 会因地图已存在而报错退出；临时项目里的结果不导出等于白跑；启动 Docker 或改输出属主前先确认写入路径。
- **常见失败**：`--exec` 报 `Exec format error` 是脚本缺 shebang，补 `#!/usr/bin/env python3` 或显式 `--exec python3 script.py`；`Raster map <x> not found` 用 `g.list` 确认地图名与当前地图集，跨地图集用 `map@mapset`；Python 报 `GISBASE not defined` 说明没在 `--exec` 会话里跑，先 `gs.setup.init(path)`；结果范围不对先看 `g.region -p`。GRASS 的失败以 `ERROR:` 开头并返回非零码，定位时看第一条而不是最后一行日志。
