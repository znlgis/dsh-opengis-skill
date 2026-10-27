## DeepSeek Harness 使用建议

- **加载与引用**：先读「安装」表决定装整包还是子包，再读「与 MapLibre / Mapbox 底图集成」——`viewState`/`controller`/`canvas`/`device` 等由 `MapboxOverlay` 内部托管，传了也不生效；需要底图侧细节用 `read` 打开 `../mapbox-gl-js/SKILL.md`。
- **执行环境**：子包多、`npm install` 输出长，放后台作业并把日志重定向到文件再 `grep`；`npm run build` 同样处理；预览用 `npx serve dist` 或 CDN 的 `unpkg.com/deck.gl@9.4.0/dist.min.js` 静态页，服务起后台，验证完 `job_kill`。
- **先探测版本**：`npm ls deck.gl @deck.gl/core @deck.gl/layers @deck.gl/geo-layers @deck.gl/mapbox`；所有 `@deck.gl/*` 必须是同一版本 9.4.0，子包版本不会自动同步，混版典型报错是 `Cannot read properties of undefined`。`grep` `package.json` 里的 `@deck.gl/` 行是最快的核对方式。
- **验证产物**：构建通过不等于渲染——deck.gl 需要 WebGL2，无头与 CI 环境出不了图，此时不要报告「已渲染」；`curl.exe -I http://localhost:5173/` 只能证明静态资源在。要确认效果请在用户机器的浏览器里打开，或让用户给截图后用 `read_image` 看。
- **风险与权限**：装包、起 dev server、把 `dist` 暴露到局域网前先问用户；用 Mapbox 底图要提醒 token 与计费（换 MapLibre 免 token）；单图层约 1600 万项是上限，全量数据直接上传可能把标签页打崩，先用抽样子集验证再放大。
- **常见失败**：空白画布查容器高度与底图；数据变了画面不变是 `data` 引用没变或漏了 `updateTriggers`，别在渲染路径里 `filter`/`map` 造新数组；tooltip 或点击无反应是 `pickable` 默认 `false`；交错模式异常查底图是否 WebGL2 与 `beforeId` 是否存在；卸载用 `map.removeControl(overlay)`，`MapboxOverlay` 没有公开的 `finalize()`。
