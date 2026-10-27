## DeepSeek Harness 使用建议

- **加载与引用**：`OguLayerUtil` 读写的完整重载与常用任务速查在 `reference/common-tasks.md`；主文件的数据模型、枚举与异常层次够定位时不必展开参考文件。
- **执行环境**：`git clone` 与 `mvn install -DskipTests` 走 `ops_bash`；Windows 下 `~/.m2` 实际是 `%USERPROFILE%\.m2`，`ogu4j-1.0.0.jar` 落在 `~/.m2/repository/com/znlgis/ogu4j/ogu4j/1.0.0/`。Java 代码里的路径写 Windows 形式，MSYS 的 `/d/...` 传进 JVM 会找不到文件。
- **先探测版本**：`java -version` 与 `mvn -version`（JDK 17+、Maven 3.8+），`mvn -v` 显示的 JDK 才是 Maven 实际使用的；`mvn dependency:tree -Dincludes=com.znlgis.ogu4j` 确认坐标；原生 GDAL 用 `java -XshowSettings:properties -version` 查 `java.library.path`，输出重定向到文件再 `grep`。
- **验证产物**：最小 main 用 `OguLayerUtil.readLayer(DataFormatType.SHP, path, null, null, null, GisEngineType.AUTO)` 打印 `getWkid()` 与 `getFeatureCount()`，再 `writeLayer` 成 GeoJSON 回读比对；产物可用 `ogrinfo -so` 复核。
- **风险与权限**：`AUTO` 在本机有原生 GDAL 时会优先走 GDAL，要复现纯 Java 结果必须显式传 `GisEngineType.GEOTOOLS`；PostGIS 连接串里的密码不要回显；`mvn install` 写 `~/.m2`、示例写 `/data` 这类绝对路径，覆盖前先确认并问用户。
- **常见失败**：`UnsatisfiedLinkError: no gdal_jni in java.library.path` 是原生 GDAL 缺失或与 `org.gdal:gdal` 3.13.0 不匹配，改用 GEOTOOLS；`Could not resolve dependencies for org.geotools:*` 是 `pom.xml` 缺 `https://repo.osgeo.org/repository/release/`；FileGDB 只有 GDAL 引擎支持；DBF 字段名超 10 字符会被截断。
