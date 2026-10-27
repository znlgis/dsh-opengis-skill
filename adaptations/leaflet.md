## DeepSeek Harness 使用建议

- **加载与引用**：本技能没有 `reference/` 目录，正文的「插件生态」「与 Vue / React 集成」「常见问题」三段覆盖了多数真实需求；要对照其他库时用 `read` 打开 `../openlayers/SKILL.md`、`../cesiumjs/SKILL.md`（即 `assets/openlayers/SKILL.md` 这类路径）。
- **执行环境**：`npm install leaflet` 走 `ops_bash`；纯静态页用 `python -m http.server 5173`（没有 `python` 时用 `py -3 -m http.server 5173`）起在后台作业，`curl.exe -I http://localhost:5173/` 通过后 `job_kill` 收尾，不要把静态服务器当前台命令跑。正文里的 `curl.exe` 保持原样，MSYS bash 下也能直接调。
- **先探测版本**：`npm ls leaflet`，未装再 `npm view leaflet version`；正文按 1.9.4，CDN 的 `integrity` SRI 哈希只对应 1.9.4，换版本必须同步换哈希，否则浏览器直接拒绝加载脚本。
- **验证产物**：`npm run build` 后用 `curl.exe -I` 探入口与产物 JS 是否 200，再用 `grep` 确认 `leaflet.css` 被打进产物；地图是否真渲染在 DSH 里看不到，把 URL 和预期（底图、圆点、点击弹窗）交给用户，请其截图后再用 `read_image` 看。
- **风险与权限**：容器高度、`map.invalidateSize()`、`map.remove()` 决定「看不到地图」和「内存增长」两类问题，改代码前先核对；`L.Icon.Default` 的 `iconUrl`/`iconRetinaUrl`/`shadowUrl` 要在打包器里显式指向，否则生产环境图标 404；天地图等服务的 `tk` 不要硬编码进提交的前端代码。
- **常见失败**：地图空白先查 `#map` 高度与 `invalidateSize()`；`L is not defined` 是脚本顺序或 CDN 失败；点位跑到别处是 `[lat, lng]` 与 GeoJSON 的 `[lng, lat]` 弄反，用 `coordsToLatLng` 转换；组件卸载不调 `map.remove()` 会持续泄漏。
