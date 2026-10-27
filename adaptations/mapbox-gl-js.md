## DeepSeek Harness 使用建议

- **加载与引用**：先读正文「获取 access token」与「常见问题」两段，401、`Style is not done loading`、feature-state 不生效都有对应格；要与 MapLibre 底座配合时用 `read` 打开 `../deck-gl/SKILL.md` 看 `MapboxOverlay` 的用法。
- **执行环境**：`npm install mapbox-gl`、`npm run build` 走 `ops_bash`；token 用环境变量注入——bash 里 `VITE_MAPBOX_TOKEN=... npm run build`，`pwsh` 里先 `$env:VITE_MAPBOX_TOKEN = "..."` 再构建。token 值只从用户环境取，命令、日志、回答里都不要再回显。
- **先探测版本**：`npm ls mapbox-gl`，未装再 `npm view mapbox-gl version`；正文按 3.33.0，CDN 的 `mapbox-gl.js` 与 `mapbox-gl.css` 必须同为 `v3.33.0`；联网时 `curl.exe -I https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.js` 应为 200，可顺带确认该版本仍可取到。
- **验证产物**：构建后先 `grep` 产物里有没有 `sk.` 开头的字符串——有就是 secret token 泄进了前端，必须停下来修；再 `curl.exe -I` 确认入口 200。地图是否真加载、有没有 401 只能看浏览器 Network 的 `api.mapbox.com`，DSH 里没有浏览器画面，请用户确认或截图后用 `read_image` 看。
- **风险与权限**：v2+ 是 Mapbox 专有许可，免费层每月 50,000 次 map loads，任何会真实加载地图的验证都可能产生费用，跑之前先告知用户；`sk.` token 只能留在服务端；用户要求开源或免 token 时改 MapLibre（`maplibregl` 替换 `mapboxgl`、`mapbox://` 样式换自建瓦片），这属于方案变更，先确认再动手。
- **常见失败**：401 或 `A valid Mapbox access token is required` 查 `mapboxgl.accessToken` 是否 `pk.` 开头、是否失效或超配额；`Style is not done loading` 是把 `addSource`/`addLayer` 写在了 `load` 之前；空白先查容器高度与 `map.resize()`；`e.features` 只在回调内有效，需要留存就拷贝 `properties`。
