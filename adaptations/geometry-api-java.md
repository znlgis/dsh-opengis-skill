## DeepSeek Harness 使用建议

- **加载与引用**：本技能只有主文件，没有 `reference/` 分册；按「格式转换」「空间操作」「常见问题」等章节标题用 `grep` 定位，再 `read` 行区间，避免整篇占满上下文。
- **执行环境**：`mvn` / `java` 走 `ops_bash`；依赖只有 `com.esri.geometry:esri-geometry-api:2.2.4` 加运行期 `jackson-core`，不需要 OSGeo 仓库。示例工程与输出落到会话工作区，别写死 Linux 绝对目录。
- **先探测版本**：`mvn -v` 与 `java -version`；库要求 JDK 1.7+，本机建议 17/21。先 `mvn dependency:get -Dartifact=com.esri.geometry:esri-geometry-api:2.2.4` 确认可解析——Maven Central 上最新仍是 2.2.4，上游 2.3.1 未发布，解析失败就报告“依赖不可下载”，不要换成 2.3.1。
- **验证产物**：`mvn -q -DskipTests package` 只说明能编译；最小 main 断言三件事——`geometryFromWkt` → `geometryToWkt` 往返、`GeometryEngine.buffer(polygon, sr, 2.0)` 后 `getEnvelope()` 向外扩张、`geometryToGeoJson` 能被 `geoJsonToGeometry` 读回；输出重定向到文件再 `read`。
- **风险与权限**：`mvn` 会写 `~/.m2` 与 `target/`，属预期；`mvn install` / `deploy`、改 `settings.xml`、加未知镜像仓库前先问用户；批量处理时别跨线程复用 `Operator` 实例。
- **常见失败**：`GeometryEngine` 没有 `intersects` 与 WKB 方法，分别用 `OperatorIntersects.local().execute(a, b, sr, null)` 与 `OperatorImportFromWkb` / `OperatorExportToWkb`；面积、长度用 `calculateArea2D()` / `calculateLength2D()`，没有 `getArea()`；`Unsupported class file major version` 是编译与运行 JDK 不一致。
