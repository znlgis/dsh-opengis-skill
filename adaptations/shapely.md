## DeepSeek Harness 使用建议

- **加载与引用**：完整 API 在 `reference/operations-reference.md`，按小节取用（Constructive Operations、Spatial Predicates、Set-Theoretic Operations、Measurements、STRtree、Geometry Accessors、Affine/Coordinate Transforms、Linear Referencing）；主文件示例够用时不必展开。
- **执行环境**：纯 Python 库、无外部二进制，命令走 `ops_bash` 的解释器；wheel 自带 GEOS，conda 版可能与之版本不同，同一会话别混用两个环境。WKT/坐标输出很长时写文件再 `read` 分段看，或只打 `geom_type`、`get_num_geometries()` 摘要。
- **先探测版本**：`python -c "import shapely; print(shapely.__version__, shapely.geos_version)"`；`geos_version` 是元组，用它做版本门控比 try/except 清楚——`concave_hull`、`remove_repeated_points` 需 GEOS >= 3.11，`coverage_simplify`、`has_m` 需 >= 3.12，`coverage_clean` 需 >= 3.14，顶层 `split` 需 >= 3.15（低版本回退 `shapely.ops.split`）。本技能按 2.2.0、wheel 内含 GEOS 3.14 编写，探测低于门槛就直接说明该算子不可用。
- **验证产物**：`is_valid` 与 `is_valid_reason` 一起看；往返 `shapely.from_wkt(shapely.to_wkt(g, rounding_precision=-1)).equals(g)`；面积/长度做量级断言，改过几何再核 `geom_type` 与 `get_num_geometries()`；写出的 GeoJSON 用 `shapely.from_geojson()` 读回。
- **风险与权限**：`set_coordinates()`、`shapely.prepare()` 都是原地修改，保留原件先 `.copy()`，且任何产生新几何的运算后预处理状态失效；无效几何不要用 `buffer(0)` 兜底，先 `make_valid()`（可 `method="structure"`）；`shapely.ops.transform` 2.2 起弃用，换 `shapely.transform` 或 `transform_coordseq`。装库前征得用户同意，精确坐标可能反推位置，输出前确认敏感性。
- **常见失败**：`TopologyException: side location conflict` 基本是输入自相交，`is_valid_reason` 定位后 `make_valid()`；`contains` 对边界点返回 False 是语义如此，改用 `covers()`/`intersects()`；OOP 与函数式结果不一致是 `buffer` 默认 `quad_segs` 不同（`Point.buffer` 16、`shapely.buffer` 8），比较前显式传参；`to_geojson` 丢 Z、WKB 丢 LinearRing 是格式限制而非 bug。
