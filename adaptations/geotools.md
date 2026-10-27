## DeepSeek Harness 使用建议

- **加载与引用**：正文 417 行，先按章节标题定位再 `read` 行区间；读写矢量数据展开 `reference/vector-io.md`（Shapefile / GeoPackage / PostGIS 与 GeoJSON、WKT/WKB），GeoTIFF 与 `StreamingRenderer` 出图展开 `reference/raster-rendering.md`，一次任务通常只需其中一个。
- **执行环境**：`mvn` / `java` 走 `ops_bash`；`pom.xml` 里的 `<repository>` 必须指向 `https://repo.osgeo.org/repository/release/`，否则 `gt-*` 一律解析不到。Java 代码里的绝对路径要写 `D:/data/x.shp` 这种 Windows 形式，MSYS 的 `/d/data/x.shp` 传给 JVM 会找不到文件；查 `JAVA_HOME` 用 `pwsh` 的 `$env:JAVA_HOME`。
- **先探测版本**：`java -version` 与 `mvn -v` 都要是 JDK 17，`mvn -v` 显示的才是 Maven 实际用的 JDK；`mvn dependency:tree -Dincludes=org.geotools` 重定向到 `mvn-tree.log` 再 `grep`，确认解析到 35.2 且没被其他依赖压回旧版。
- **验证产物**：`mvn -q -DskipTests package` 只证明能编译；再跑最小 main（`FileDataStoreFinder` → `getFeatures()` → 打印 count 与 CRS）。渲染出的 PNG 直接 `read_image` 看，别只看文件大小。
- **风险与权限**：`store.dispose()` 与 `SimpleFeatureIterator` 必须关闭，否则 Shapefile / GeoPackage 被占用后重写失败；连接 PostGIS、`mvn install` 写 `~/.m2`、覆盖已有输出前先征得用户同意，连接串密码不要回显。
- **常见失败**：`getDataStore()` 返回 null 是 SPI 模块没进 classpath（`gt-shapefile` / `gt-geopkg` 缺失）；`CRS.decode()` 抛异常缺 `gt-epsg-hsql`；出现 `com.vividsolutions.jts` 是包名未升级（GeoTools 20+ 用 `org.locationtech.jts`）。
