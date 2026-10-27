## DeepSeek Harness 使用建议

- **加载与引用**：正文的「典型工作流」是最完整的示例（全部 import 加 `dataProjection`/`featureProjection`），直接照它起步比自己拼 `ol/...` 更稳；要联动服务端时用 `read` 打开 `../geoserver/SKILL.md`，三维对照看 `../cesiumjs/SKILL.md`。
- **执行环境**：`npm install ol`、`npm run build` 走 `ops_bash`；Windows 下 `npm` 实为 `npm.cmd`，长构建放后台作业并把输出重定向到文件再 `grep`；预览用 `npx serve dist` 或 `python -m http.server 5173 -d dist` 起后台，验证完 `job_kill`。
- **先探测版本**：`npm ls ol`，未装再 `npm view ol version`；正文按 10.11.0，只用 `ol/Map.js`、`ol/layer/Tile.js`、`ol/source/OSM.js` 这类 ESM 子路径。动手改前用 `grep` 搜代码里的 `ol.source.`、`ol.layer.` 全量命名空间写法，混用会在打包或运行时报错。
- **验证产物**：`npm run build` 通过只代表编译过；再确认 `curl.exe -I http://localhost:5173/` 与产物里的 `assets/*.js` 为 200。图层是否显示看不到，把预期写清楚交给用户：底图与行政区面同现、画一个多边形后控制台输出 EPSG:4326 的 GeoJSON；有截图再用 `read_image` 核对。
- **风险与权限**：矢量图层不 `setStyle()` 默认不渲染，别把空白当数据没加载；经纬度必须 `fromLonLat()` 转 EPSG:3857，自定义投影先 `register(proj4)`；内网 WMS 地址与凭据不要写进示例；起 dev server、对外暴露端口前先问用户。
- **常见失败**：WMS 空白查 CORS、`LAYERS` 全名与 `SRS`；MVT 属性缺失用 `MVT({ featureClass: Feature })`；容器尺寸变化后调 `map.updateSize()`；`ol/...` 模块找不到是打包器没按 ESM 解析（或改用 `dist/ol.js`）。
