## DeepSeek Harness 使用建议

- **加载与引用**：React 侧看「Redux 接入」与「KeplerGl 组件」，Python 侧看「Python 小组件」，两套 API 不同：React 的 `theme` 是对象，`theme="dark"` 这种字符串只属于 Python 小组件。需要下钻渲染层时用 `read` 打开 `../deck-gl/SKILL.md`。
- **执行环境**：前端 `npm install`、`npm run build` 与 Python 侧 `pip install keplergl==0.4.0` 都走 `ops_bash`，安装输出重定向到文件再读；Notebook 里的内嵌地图依赖 Jupyter 内核（JupyterLab >= 4.0 或 Notebook >= 7.0），DSH 会话本身不渲染 anywidget，能验证到的是导出的 HTML 与配置文件。
- **先探测版本**：`npm ls kepler.gl @kepler.gl/components @kepler.gl/actions`，三者必须同为 3.3.0-alpha.16，安装时把版本写死（npm `latest` 是 alpha.16，不要拿 GitHub Release 的 alpha.18 当已发布）；Python 侧 `python -c "import keplergl; print(keplergl.__version__)"` 应为 0.4.0，且要求 Python >= 3.9。
- **验证产物**：前端构建后 `npx serve dist` 加 `curl.exe -I` 只证明资源可达；Python 侧跑 `m.save_to_html(file_name="roads_map.html")` 后用 `glob` 确认文件生成、`read` 抽查是否内含数据，再交浏览器确认渲染，有截图用 `read_image` 核对。
- **风险与权限**：`addDataToMap` 一次传几十万行以上会把主线程卡住数秒，先抽样或聚合；Mapbox 官方样式要 token 且计费，默认 CARTO/MapLibre 样式免 token；装包、把工程配置写进 HTML 前先问用户，配置里不要硬编码 token。
- **常见失败**：组件空白并提示 `Could not find ... in the context of Connect(...)` 是 reducer 没挂载或 `getState` 键名不对；有数据没图层查 `datasets.info.id` 与 `config` 里的 `dataId`；`Cannot find module '@kepler.gl/components'` 是整包与子包混用；时间过滤器失效是字段没标 `timestamp` 或缺 `format`。
