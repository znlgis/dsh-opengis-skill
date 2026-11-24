/**
 * Catalog taxonomy for the bundled GIS skills: the groups a session can filter
 * on and the local trigger keywords that make an English description reachable
 * from a Chinese request.
 *
 * Upstream frontmatter stays the single source of truth for *what* a skill
 * covers. This module only carries two things the vendored snapshot cannot
 * express without breaking byte-identity with the upstream git blob:
 *
 * - "GROUPS" a coarse, deployment-shaped partition. A session that only builds
 *   browser maps can hide the GeoServer and PostGIS skills without editing the
 *   package, which keeps the session catalog small.
 * - "SCENARIO_PRESETS" named presets over those groups ("web", "server", "data",
 *   "all"), so the common cases do not require memorizing group ids. A preset is
 *   only a shorthand for a group set; "groups" still unions with it, an explicit
 *   "skills" allow list still wins, and "exclude" still applies last.
 * - "KEYWORDS" short phrases, mostly Chinese, that a user actually types. The
 *   upstream descriptions are English "Use when ..." sentences, so a Chinese
 *   request reaches the right skill only through the model's own translation.
 *   Keywords remove that hop: the provider exposes them on the candidate
 *   metadata and the routing test scores candidate matches against them.
 *
 * Keywords are matched as substrings, so they must be short and phrased the way
 * a request phrases them ("点云滤波", not "滤波处理能力"). Overlap between two
 * skills is expected and allowed; discrimination comes from the number of hits.
 *
 * @module @dsh-gis/dsh-opengis-skill/taxonomy
 */

/** The coarse groups a plugin config may select from. */
export const GROUP_IDS = Object.freeze([
	"desktop",
	"server",
	"data",
	"geometry",
	"web",
	"dotnet",
	"java",
	"pipeline",
	"meta"
]);

/**
 * The named scenario presets a plugin config may select from.
 *
 * Order is the order the README documents. "all" is the default behavior when
 * neither "scenario" nor "groups" is set, so a config never needs to write it.
 */
export const SCENARIO_IDS = Object.freeze(["web", "server", "data", "all"]);

/**
 * Group set behind every scenario preset.
 *
 * These are the task-shaped slices users actually ask for: browser maps,
 * publishing OGC services, and data processing. "all" maps to every group, which
 * keeps it honest when a new group is added to GROUP_IDS.
 */
export const SCENARIO_PRESETS = Object.freeze({
	web: Object.freeze(["web"]),
	server: Object.freeze(["server"]),
	data: Object.freeze(["data"]),
	all: GROUP_IDS
});

/** One-line description of every group, used in diagnostics and docs. */
export const GROUP_DESCRIPTIONS = Object.freeze({
	desktop: "QGIS 桌面与桌面端应用",
	server: "服务端发布、目录与 OGC 服务",
	data: "数据读写、栅格与矢量处理、空间数据库",
	geometry: "几何算法与几何库",
	web: "Web / 3D 前端可视化与地图控件",
	dotnet: ".NET 技术栈专用的 GIS 库",
	java: "Java 技术栈专用的 GIS 库",
	pipeline: "流程编排、自动化管线与无人机重建",
	meta: "跨技能的索引与流程总览"
});

/**
 * Group membership per skill. A skill may belong to several groups; filtering
 * unions the selected groups.
 */
const SKILL_GROUPS = Object.freeze({
	brutile: ["web", "dotnet"],
	cesiumjs: ["web"],
	"deck-gl": ["web"],
	"duckdb-spatial": ["data"],
	gdal: ["data"],
	"gdal-api": ["data"],
	geolibre: ["desktop", "web"],
	"geometry-api-java": ["geometry", "java"],
	"geometry-api-net": ["geometry", "dotnet"],
	geonode: ["server"],
	geopandas: ["data"],
	"geopipe-agent": ["pipeline"],
	geos: ["geometry"],
	geoserver: ["server"],
	"geoserver-cloud": ["server"],
	"geoserver-rest-api": ["server"],
	geotools: ["geometry", "java"],
	"grass-gis": ["data"],
	jts: ["geometry", "java"],
	"kepler-gl": ["web"],
	leaflet: ["web"],
	"mapbox-gl-js": ["web"],
	"maplibre-gl-js": ["web"],
	"maplibre-native": ["web"],
	mapserver: ["server"],
	mapsui: ["dotnet"],
	nettopologysuite: ["geometry", "dotnet"],
	opendronemap: ["pipeline"],
	"opengis-all": ["meta"],
	"opengis-daf": ["pipeline"],
	"opengis-utils-for-java": ["geometry", "java"],
	"opengis-utils-for-net": ["geometry", "dotnet"],
	openlayers: ["web"],
	pdal: ["data"],
	postgis: ["data"],
	proj: ["data"],
	projnet4geoapi: ["geometry", "dotnet"],
	pyqgis: ["desktop"],
	"qgis-process": ["desktop"],
	"qgis-server": ["server"],
	shapely: ["geometry"],
	sharpmap: ["dotnet"],
	spatialite: ["data"],
	"stac-cog-titiler": ["data", "server"],
	"whitebox-tools": ["data"]
});

/**
 * Trigger phrases per skill, in the wording a request uses. English product
 * names and acronyms are included where a Chinese request would keep them.
 */
const SKILL_KEYWORDS = Object.freeze({
	brutile: ["瓦片", "底图", "切片方案", "MBTiles", "离线地图"],
	cesiumjs: ["三维地球", "3D Tiles", "倾斜摄影", "CZML", "模型贴地"],
	"deck-gl": ["大数据可视化", "六边形聚合", "WebGL 图层", "轨迹热力"],
	"duckdb-spatial": ["DuckDB", "Parquet", "列式分析", "空间函数"],
	gdal: ["格式转换", "重投影", "镶嵌", "栅格裁剪", "重采样", "COG"],
	"gdal-api": ["GDAL 绑定", "Python 绑定", "驱动注册", "异常处理"],
	geolibre: ["GeoLibre", "桌面应用", "本地项目"],
	"geometry-api-java": ["Esri 几何", "GeometryEngine", "Java 几何"],
	"geometry-api-net": ["Esri 几何", "反序列化几何", "WKB", "GeoJSON 转几何"],
	geonode: ["GeoNode", "元数据", "数据目录"],
	geopandas: ["GeoDataFrame", "空间连接", "叠加分析", "出图"],
	"geopipe-agent": ["GeoPipeAgent", "YAML 流程", "管线编排"],
	geos: ["GEOS", "拓扑异常", "叠加失败", "C 接口"],
	geoserver: ["GeoServer", "WMS", "WFS", "图层发布", "样式配置"],
	"geoserver-cloud": ["微服务", "集群部署", "Kubernetes"],
	"geoserver-rest-api": ["REST 发布", "批量建图层", "自动化发布"],
	geotools: ["GeoTools", "要素读取", "渲染出图"],
	"grass-gis": ["GRASS", "区域设置", "流域分析", "栅格代数"],
	jts: ["JTS", "空间关系判断", "精度问题"],
	"kepler-gl": ["Kepler.gl", "时空可视化", "出行轨迹"],
	leaflet: ["Leaflet", "网页地图", "标记弹窗"],
	"mapbox-gl-js": ["Mapbox", "样式表达式", "矢量瓦片渲染", "三维建筑"],
	"maplibre-gl-js": ["MapLibre", "免密钥", "地形夸张"],
	"maplibre-native": ["移动端地图", "离线地图包", "Android 地图"],
	mapserver: ["MapServer", "mapfile", "地图服务发布"],
	mapsui: ["Mapsui", "WPF 地图", "MAUI 地图"],
	nettopologysuite: ["NetTopologySuite", "NTS", "EF Core 空间"],
	opendronemap: ["无人机", "正射影像", "三维重建", "空三"],
	"opengis-all": ["全流程", "技术选型", "链路串联"],
	"opengis-daf": ["OpenGisDAF", "JSON 计划", "DAG 执行"],
	"opengis-utils-for-java": ["OGU4J", "CGCS2000", "拓扑校验"],
	"opengis-utils-for-net": ["OguLayerUtil", "格式互转", "GBK 乱码"],
	openlayers: ["OpenLayers", "前端地图", "绘制编辑"],
	pdal: ["点云滤波", "LAS", "地面分类", "PDAL"],
	postgis: ["PostGIS", "空间数据库", "空间索引", "几何字段"],
	proj: ["PROJ", "坐标转换", "投影参数", "EPSG"],
	projnet4geoapi: ["ProjNet", "坐标转换", "EPSG 解析"],
	pyqgis: ["PyQGIS", "QGIS 脚本", "QGIS 环境", "initQgis", "图层自动化"],
	"qgis-process": ["qgis_process", "命令行算法", "无界面运行"],
	"qgis-server": ["QGIS Server", "fcgi", "服务参数调优"],
	shapely: ["Shapely", "缓冲区", "相交判断", "有效性修复"],
	sharpmap: ["SharpMap", "WinForms 地图", "专题渲染"],
	spatialite: ["SpatiaLite", "SQLite", "空间 SQL"],
	"stac-cog-titiler": ["STAC", "TiTiler", "动态切片", "影像编目", "云优化影像"],
	"whitebox-tools": ["WhiteboxTools", "洼地填充", "汇流累积", "地形指数"]
});

/**
 * Score every catalog entry against one lowercased request.
 *
 * Two signals, both taken from what the provider actually exposes:
 *
 * - A keyword hit is worth three points, because the keywords are written in
 *   request wording and are the strongest evidence available.
 * - A Latin token of the description is worth one point. Product names and
 *   acronyms (GDAL, PostGIS, MapLibre) survive a Chinese request untouched, so
 *   they separate neighbouring skills the keywords alone cannot.
 *
 * Description tokens shorter than three characters and pure numbers are
 * ignored: they match too much and carry no routing signal.
 *
 * @param skills - the catalog entries; a description is optional but improves
 *   scoring when present.
 * @param query - the request text, already lowercased.
 * @returns one { name, score } entry per skill, in catalog order.
 */
export function keywordScores(skills, query) {
	return skills.map((skill) => {
		let score = 0;
		for (const keyword of keywordsOf(skill.name)) {
			if (containsTerm(query, keyword)) score += 3;
		}
		for (const token of descriptionTokens(skill.description)) {
			if (containsTerm(query, token)) score += 1;
		}
		return { name: skill.name, score };
	});
}

/**
 * Report whether one lowercased query contains a term as a whole word.
 *
 * A bare "includes" match is a substring test: "geos" fires inside
 * "geoserver" and "jts" inside a version string, which makes two neighbouring
 * skills score identically and turns routing into a coin flip. A term is
 * therefore required to start and end at a non-alphanumeric boundary. The
 * keywords are mostly Chinese, where word boundaries do not exist, so the
 * check keeps the plain substring test whenever the term has no ASCII letter.
 *
 * @param query - the lowercased request text.
 * @param term - the keyword or description token to look for.
 * @returns whether the term occurs in the query.
 */
function containsTerm(query, term) {
	const needle = term.toLowerCase();
	if (!/[a-z]/u.test(needle)) return query.includes(needle);
	let index = query.indexOf(needle);
	while (index !== -1) {
		const before = index === 0 ? "" : query[index - 1];
		const after = query[index + needle.length] ?? "";
		if (!isTermCharacter(before) && !isTermCharacter(after)) return true;
		index = query.indexOf(needle, index + 1);
	}
	return false;
}

/**
 * Report whether one character continues a Latin term.
 *
 * @param character - one character, or the empty string at an edge.
 * @returns whether the character is an ASCII letter or digit.
 */
function isTermCharacter(character) {
	return character.length > 0 && /[a-z0-9]/u.test(character);
}

/**
 * Extract the Latin tokens of one description.
 *
 * Short tokens and pure numbers are dropped: they match too much ("use", "id")
 * or carry no routing signal, and a two-character token would fire on every
 * version string in a request.
 *
 * @param description - the upstream description, when known.
 * @returns the lowercased tokens, deduplicated.
 */
function descriptionTokens(description) {
	if (typeof description !== "string") return [];
	const tokens = new Set();
	for (const match of description.toLowerCase().matchAll(/[a-z][a-z0-9+#.-]{2,}/gu)) {
		if (/^\d+$/u.test(match[0])) continue;
		tokens.add(match[0]);
	}
	return [...tokens];
}

/**
 * The groups one skill belongs to.
 *
 * @param name - kebab-case skill name.
 * @returns the group ids, empty when the taxonomy has no entry.
 */
export function groupsOf(name) {
	const groups = SKILL_GROUPS[name];
	return groups === undefined ? [] : [...groups];
}

/**
 * The trigger keywords of one skill.
 *
 * @param name - kebab-case skill name.
 * @returns the keywords, empty when the taxonomy has no entry.
 */
export function keywordsOf(name) {
	const keywords = SKILL_KEYWORDS[name];
	return keywords === undefined ? [] : [...keywords];
}

/**
 * Report every skill the taxonomy does not describe, and every key it describes
 * that the catalog does not ship.
 *
 * @param names - the catalog skill names.
 * @returns human-readable problems, empty when the taxonomy matches the catalog.
 */
export function taxonomyProblems(names) {
	const problems = [];
	const catalog = new Set(names);
	for (const name of names) {
		if (groupsOf(name).length === 0) problems.push("lib/taxonomy.js: \"" + name + "\" has no group; add it to SKILL_GROUPS");
		if (keywordsOf(name).length < 3) problems.push("lib/taxonomy.js: \"" + name + "\" has fewer than 3 keywords; add trigger phrases to SKILL_KEYWORDS");
	}
	for (const name of Object.keys(SKILL_GROUPS)) {
		if (!catalog.has(name)) problems.push("lib/taxonomy.js: SKILL_GROUPS names \"" + name + "\", which is not a bundled skill");
		for (const group of SKILL_GROUPS[name]) {
			if (!GROUP_IDS.includes(group)) problems.push("lib/taxonomy.js: \"" + name + "\" lists unknown group \"" + group + "\"");
		}
	}
	for (const name of Object.keys(SKILL_KEYWORDS)) {
		if (!catalog.has(name)) problems.push("lib/taxonomy.js: SKILL_KEYWORDS names \"" + name + "\", which is not a bundled skill");
		const seen = new Set();
		for (const keyword of SKILL_KEYWORDS[name]) {
			if (keyword.trim().length === 0) problems.push("lib/taxonomy.js: \"" + name + "\" carries an empty keyword");
			if (seen.has(keyword)) problems.push("lib/taxonomy.js: \"" + name + "\" repeats the keyword \"" + keyword + "\"");
			seen.add(keyword);
		}
	}
	for (const group of GROUP_IDS) {
		if (!Object.values(SKILL_GROUPS).some((groups) => groups.includes(group))) problems.push("lib/taxonomy.js: group \"" + group + "\" has no members");
	}
	return problems;
}

/**
 * Read one optional string list from the plugin config.
 *
 * @param config - the raw plugin config, possibly undefined.
 * @param key - the field to read.
 * @returns the list, empty when the field is absent.
 * @throws when the field is present but is not an array of non-empty strings.
 */
function readList(config, key) {
	const value = config?.[key];
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
		throw new Error('opengis-skill: plugin config field "' + key + '" must be an array of non-empty strings');
	}
	return [...value];
}

/**
 * Read one optional scenario preset name.
 *
 * @param config - the raw plugin config, possibly undefined.
 * @returns the scenario name, or null when the field is absent.
 * @throws when the field is present but does not name a known preset, so a typo
 *   ("webb") fails loudly instead of silently selecting nothing.
 */
function readScenario(config) {
	const value = config?.scenario;
	if (value === undefined || value === null) return null;
	if (typeof value !== "string" || !SCENARIO_IDS.includes(value)) {
		throw new Error('opengis-skill: unknown scenario "' + String(value) + '"; valid scenarios are ' + SCENARIO_IDS.join(", "));
	}
	return value;
}

/**
 * Union two group lists, keeping the first-seen order.
 *
 * @param left - the groups to start from (the scenario preset).
 * @param right - the groups to append ("groups" from the config).
 * @returns the union.
 */
function unionGroups(left, right) {
	const union = new Set(left);
	for (const group of right) union.add(group);
	return [...union];
}

/**
 * Validate and normalize the plugin config into a selection.
 *
 * The four fields compose as: "scenario" expands to its preset group set and
 * unions with "groups"; "skills" wins over that union when both are given; and
 * "exclude" is always applied last. Unknown scenario names, group ids and skill
 * names are rejected instead of being silently ignored, because a typo in a
 * filter silently returns the wrong catalog.
 *
 * @param config - the raw plugin config, possibly undefined.
 * @param skills - the catalog entries the plugin loaded.
 * @returns the normalized selection.
 * @throws when a field is malformed or names an unknown scenario, group or skill.
 */
export function normalizeSelection(config, skills) {
	const available = new Set(skills.map((skill) => skill.name));
	const scenario = readScenario(config);
	const groups = unionGroups(scenario === null ? [] : SCENARIO_PRESETS[scenario], readList(config, "groups"));
	const only = readList(config, "skills");
	const exclude = readList(config, "exclude");
	for (const group of groups) {
		if (!GROUP_IDS.includes(group)) {
			throw new Error('opengis-skill: unknown group "' + group + '"; valid groups are ' + GROUP_IDS.join(", "));
		}
	}
	for (const name of [...only, ...exclude]) {
		if (!available.has(name)) throw new Error('opengis-skill: unknown skill "' + name + '" in the plugin config; the catalog ships ' + skills.length + " skills");
	}
	return { groups, only, exclude, scenario };
}

/**
 * Apply one selection to the catalog, keeping the catalog order.
 *
 * @param skills - the catalog entries the plugin loaded.
 * @param selection - the normalized selection.
 * @returns the visible catalog entries.
 * @throws when the selection hides every skill.
 */
export function selectSkills(skills, selection) {
	const wanted = new Set(selection.only);
	const excluded = new Set(selection.exclude);
	const selected = skills.filter((skill) => {
		if (excluded.has(skill.name)) return false;
		if (wanted.size > 0) return wanted.has(skill.name);
		if (selection.groups.length === 0) return true;
		return groupsOf(skill.name).some((group) => selection.groups.includes(group));
	});
	if (selected.length === 0) {
		throw new Error("opengis-skill: the plugin config selects no skill; widen \"groups\" or drop \"exclude\"");
	}
	return selected;
}
