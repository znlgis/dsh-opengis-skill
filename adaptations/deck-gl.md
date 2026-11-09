## DeepSeek Harness 使用建议

- **加载与引用**：单文件技能，无 reference；正文按 deck.gl 9.4.1 编写，先读「环境准备 → 安装」的子包对照表再决定装整包还是子包，图层属性查「核心 API」各层小节，「最佳实践」与「常见问题」可直接当调优与排错清单。底图细节用 `skill` 加载 `mapbox-gl-js`，三维对照用 `skill` 加载 `cesiumjs`，需要相邻技能就重新加载，不要 `read` 兄弟目录。
- **执行环境**：`npm install` 与 `npm run build` 走 `ops_bash`（Windows 上 `npm` 是 `npm.cmd`，MSYS bash 用 `cmd //c npm run build` 更稳）；子包多、安装输出长，先重定向到 `install.log` 再用 `grep` 或 `read` 分段看。`vite`、`serve` 这类常驻进程必须用后台作业起，`job_output` 收启动行拿真实端口，验证后 `job_kill`；装 5 个以上子包这种流水线先 `todo_write` 记步骤。
- **先探测版本**：`npm ls deck.gl @deck.gl/core @deck.gl/layers @deck.gl/geo-layers @deck.gl/mapbox` 一次看全；所有 `@deck.gl/*` 必须同为 9.4.1，混版最典型的症状是 `Cannot read properties of undefined`。整包安装最省事，子包安装要手动对齐版本；`maplibre-gl` 与 `@deck.gl/mapbox` 也可能互相牵连，报类型错时先降版本而不是改图层代码。
- **验证产物**：`npm run build` 后 `npx serve dist`，用 `curl.exe -I http://localhost:5173/` 确认入口与静态资源；WebGL 是否真出图无法用退出码判断——环境允许截图时用 `read_image` 看画面，否则把 URL 交给用户并明说「构建通过但未验证渲染」。数据正确性可以单独校验：把 `getRenderedFeatures()` 或 `deck.pickObject()` 的结果打到控制台，核对条数与坐标，再和源数据对一遍；无头 CI 里 WebGL 不可用，构建通过不等于渲染正确，不要据此报「已渲染」。成品页面或截图用 `present` 交付。
- **风险与权限**：装包、起 dev server、占端口前用 `ask_user_question` 征得同意；用 Mapbox 底图要提醒 `accessToken` 与计费，token 走环境变量、不进源码与报告。`interleaved: true` 要求底图是 WebGL2 上下文，改渲染模式前先确认底图版本与 `beforeId` 指向的图层确实存在；生产环境不要开 luma.gl 的 debug 模式。
- **常见失败**：空白画布先查容器有没有显式高度（canvas 本身是透明层）；数据变了画面不变是 `data` 引用没变或访问器依赖未声明，用 `updateTriggers` 或换新数组；tooltip 与点击无反应是 `pickable` 默认 `false`，点太小可调大 `pickingRadius`；百万点位卡顿先开 `gpuAggregation` 并让访问器保持轻量，图层数控制在百级以内。
