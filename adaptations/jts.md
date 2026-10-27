## DeepSeek Harness 使用建议

- **加载与引用**：主文件给核心类与工厂用法，谓词、集合运算、简化、WKT/WKB/GeoJSON、STRtree 与线性参考的完整签名在 `reference/geometry-operations.md`；改代码前按小节定位再 `read` 片段，不要整篇展开。
- **执行环境**：`mvn`、`gradle`、`javac`、`java` 走 `ops_bash`；classpath 分隔符在 Windows 是分号，写路径别照抄 Linux 的冒号。构建工具不可用时用 `javac -cp jts-core-1.20.0.jar Main.java && java -cp ".;jts-core-1.20.0.jar" Main`（PowerShell 里引号规则更严）；`org.locationtech.jts:jts-core:1.20.0` 在 Maven Central 直接可解析，不需要额外仓库。
- **先探测版本**：`mvn -v` 与 `java -version`（JDK 8+ 即可），有工程时 `mvn dependency:tree -Dincludes=org.locationtech.jts` 确认解析到 1.20.0；同时确认 classpath 里没有遗留的 `com.vividsolutions.jts` 旧包——1.15+ 已迁到 `org.locationtech.jts`，两套包名并存会编译或加载冲突。GeoJSON 需要额外引 `org.locationtech.jts.io:jts-io-common:1.20.0`（`groupId` 是 `org.locationtech.jts.io`，与主库不同），它运行期依赖 `json-simple`。
- **验证产物**：`mvn -q test`，或最小 `main` 做 WKT 往返 + `geom.isValid()` + `buffer(0)` 断言；导出 GeoJSON 后用 `GeoJsonReader` 读回比对坐标数，构建成功不等于结果正确。
- **风险与权限**：`WKTReader`/`WKTWriter`、`GeoJsonWriter` 不是线程安全，别多线程共享，每线程独立创建；`GeometryFactory` 与 `Geometry` 才是线程安全的。SRID 在 JTS 里只是元数据、所有运算在笛卡尔平面进行，跨投影要先自己转换再计算。新建工程、装依赖、写用户目录前征得同意，示例里别写真实数据路径。
- **常见失败**：`TopologyException` 换 `OverlayNGRobust.overlay()`；`isValid()` 为 false 先 `GeometryFixer.fix()`；结果为空或与预期偏差大，多半把坐标写成了 `(lat, lon)`（JTS 是 `(x, y)` = 经纬度）；手拼 classpath 写 GeoJSON 抛 `NoClassDefFoundError: org/json/simple/JSONAware` 是漏了 `json-simple`，用 Maven/Gradle 引入让传递依赖生效。批量判断用 `PreparedGeometry` 前后各计时一次，用 `System.nanoTime()` 的数据证明优化有效。
