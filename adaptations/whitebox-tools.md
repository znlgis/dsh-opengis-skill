## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有 SKILL.md，没有 reference 子目录；工具名与参数不要凭记忆写，先 `whitebox_tools --listtools <关键词>` 找 CamelCase 名称，再 `whitebox_tools --toolparameters=<Tool>` 取 JSON 参数定义，最后才拼 `--run=` 命令行。`--listtools` 输出很长，重定向到工作区文件后再 `grep` 取需要的行。
- **执行环境**：`whitebox_tools`（Windows 为 `whitebox_tools.exe`）走 `ops_bash`，路径含空格要加引号；正文的 `cd /opt/WBT` 在 Windows 换成解压目录，用 `./whitebox_tools.exe --version`（`pwsh` 里是 `.\whitebox_tools.exe --version`）。源码编译 `python build.py` 要跑几分钟，放后台作业，用 `job_output` 看进度。
- **先探测版本**：`whitebox_tools --version` 输出核心库版本（本技能基准 2.4.0），`python -c "import whitebox; print(whitebox.__version__)"` 输出 Python 封装版本（2.3.6）；两者不一致是设计如此，能力以二进制为准，汇报时要说明用的是哪一个。`pip install whitebox` 首次调用会联网下载二进制，离线环境必须提前备好 WBT 目录。
- **验证产物**：先用 `glob` 或 `ls -l` 确认输出文件真的生成，再用 GDAL 读数值——`gdalinfo -json slope.tif` 看范围与 NoData，必要时读数组断言坡度量级；只看退出码判断不了分析对错。水文链路要额外检查 `accum.tif` 的极值是否与流域面积量级相符，全为 1 通常意味着上游没决口或单位不一致。
- **风险与权限**：编译、`pip install`、下载二进制前征得用户同意，批量处理前确认磁盘占用；显式设定 `--wd` 或全部用绝对路径，否则相对路径会落到意外目录；DEM 水平与垂直单位不同时显式传 `--zfactor`，不要假设两者一致。
- **常见失败**：跑完既无输出也无报错，几乎都是 `--wd` 与相对路径不匹配；`--run` 报工具不存在是名字大小写错，用 `--listtools` 核对；参数被忽略多是照抄了别的工具的参数名，用 `--toolparameters` 复核；平坦区大片无流向给 `FillDepressions` 打开 `--fix_flats=true`，或改用 `BreachDepressions`；LiDAR 工具只吃 LAS/LAZ，其它点云格式先用 PDAL 转换。
