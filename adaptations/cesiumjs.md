## DeepSeek Harness 使用建议

- **加载与引用**：正文「1.146 变更」决定了 import 从哪来——数学/几何/时间/工具类已拆到 `@cesium/core@^0.1.0`，从 `cesium` 主包导入不受影响，按子路径引用 `@cesium/engine` 的代码要改。动手前用 `grep` 搜源码里的 `@cesium/engine` 与 `CESIUM_BASE_URL`。
- **执行环境**：`npm install cesium`、`npm run build` 走 `ops_bash`；Windows 下 `npm` 是 `npm.cmd`，正文建议脚本里写 `cmd /c npm run build`；装包与大构建放后台作业，日志重定向后再 `grep`。预览用 `python -m http.server 5173 -d dist` 或 `npx serve dist` 起后台，`job_kill` 收尾。
- **先探测版本**：`npm ls cesium`，未装再 `npm view cesium version`；正文按 1.146.0，低于该版本的工程不要照搬 `@cesium/core` 迁移建议；同时 `grep` 构建配置确认用的是 `vite-plugin-cesium` 还是手工拷 `Workers`/`Assets`/`Widgets`，这决定静态资源怎么发布。
- **验证产物**：`npm run build` 后 `curl.exe -I http://localhost:5173/Cesium/Workers/createVerticesFromHeightmap.js` 与 `.../Cesium/Widgets/widgets.css` 都返回 200，才算 Workers/Assets/Widgets 真进了产物；返回 404 或 text/html 说明没拷进去。黑屏要靠浏览器控制台定位，DSH 无浏览器画面，请用户看控制台或给截图后用 `read_image`。
- **风险与权限**：`Cesium.Ion.defaultAccessToken` 从环境变量注入（Vite 用 `import.meta.env.VITE_CESIUM_ION_TOKEN`），不要写进源码、日志或回答；不需要 ion 就不要设 token；`tileset.destroy()`、`viewer.destroy()` 不调用会持续占显存，卸载逻辑要一起交付。
- **常见失败**：黑屏先看是否报 `Unable to determine Cesium base URL automatically`，按提示设 `window.CESIUM_BASE_URL`；`WebGL 2 context is required` 是环境没有 WebGL2；国内底图整体偏移是 GCJ-02，先纠偏再查坐标；ion 服务 401/403 是 token 未设或已失效。
