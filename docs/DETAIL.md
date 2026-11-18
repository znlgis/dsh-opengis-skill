# OpenGIS 技能包（@dsh-gis/dsh-opengis-skill）

把 [opengis-skills](https://github.com/znlgis/opengis-skills) 的 `gis/` 技能打包成 DeepSeek Harness 的 bundle：**45 个 GIS 技能**，从 GDAL、QGIS、GeoServer、PostGIS 到 CesiumJS、OpenLayers、deck.gl、OpenDroneMap 与 STAC/COG。

## 它做什么

- **按需加载**：注册 `ctx.skills` provider；会话技能目录只列出名称与描述，正文与 `reference/*.md` 在调用 `skill` 时读取。
- **只加这层 harness 需要的东西**：上游正文逐字节保留，`adaptations/` 里的 DSH 执行约定（工具映射、Windows 改写、后台作业、产物验证、风险与权限、可选插件退路）在加载时追加。
- **可裁剪**：插件配置 `groups` / `skills` / `exclude` 把目录裁到当前任务需要的范围，浏览器地图会话不必为服务端与数据库技能付上下文。
- **可启停**：单包同时是 bundle 与插件（`dsh.bundle.patch`），在 **Plugins** 里启用或停用即可。

## 适合谁

需要在本机真正跑 GIS 工作流、又想让会话带着领域约定的使用者：数据转换与重投影、服务发布、空间数据库、几何运算、三维与 Web 地图、无人机重建、影像编目。

## 不做什么

它只提供知识与执行约定，**不会**替你安装 GDAL/QGIS/GeoServer，也不绕过沙箱与审批；缺工具时会告诉你缺什么、怎么装。
