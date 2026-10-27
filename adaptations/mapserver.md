## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有主文件，`MAP`/`LAYER`/`CLASS`/`STYLE` 层次、`WEB.METADATA` 关键字与排障表都在其中；写 mapfile 前先 `read` 最小示例那一段，按它的缩进、引号与 `END` 闭合方式照做。
- **执行环境**：`mapserv`、`map2img`、`shp2img` 来自 `mapserver-bin`，Windows 用 OSGeo4W 的 `mapserv.exe`，命令统一走 `ops_bash`。mapfile 用 `write` 写成 UTF-8、LF；正文的 `sudo apt install cgi-mapserver mapserver-bin` 在 Windows 无效，装包前先问用户。
- **先探测版本**：`mapserv -v` 要出现 `MapServer version 8.6.6`，并检查 `SUPPORTS=` 里有没有需要的 `WMS_SERVER`/`WFS_SERVER`；缺项说明该构建没把对应库编进去，此时改 mapfile 无用，只能换构建。
- **验证产物**：不必先有 Web 服务器，先离线 `map2img -m demo.map -o out.png -s 600 400` 看渲染，再用 `mapserv -nh "QUERY_STRING=map=/abs/demo.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities"` 抓能力文档并 `grep` 图层名，最后才 `curl` 打 CGI 确认 `Content-Type: image/png`；出图用 `read_image` 判断空白。
- **风险与权限**：`map=` 能读任意路径是 MapServer 最典型的误配置，生产必须设 `MS_MAP_PATTERN` 或 `MS_MAP_NO_PATH`；改 Apache 配置、`chmod o+x mapserv`、重启服务前先向用户确认。
- **常见失败**：返回 `No query information to decode` 属正常提示，说明 CGI 可用、只是缺 `SERVICE`/`REQUEST`；空白图查 `EXTENT`、`BBOX`、`PROJECTION` 与 `STATUS ON` 是否自洽；能力文档缺图层查 `wms_enable_request`、`wfs_enable_request` 与 `NAME` 是否字母开头；WFS 结果没有属性字段是 8.x 默认行为，补 `gml_include_items`。
