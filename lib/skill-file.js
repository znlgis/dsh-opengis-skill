/**
 * Minimal SKILL.md frontmatter reader shared by the plugin, the sync script,
 * and the validation script.
 *
 * Upstream migrated every skill to the six fields of the Agent Skills open
 * specification: "name", "description", "license", "metadata" (a nested map
 * with "category" and "tags"), plus the optional "compatibility" and
 * "allowed-tools". The reader therefore understands one level of nesting and
 * reports the top-level field order, so the validation script can prove the
 * vendored snapshot still uses only legal fields.
 *
 * Scalar handling stays tolerant on purpose: upstream writes long descriptions
 * with literal inner quotes (invalid YAML, but unambiguous in practice), and
 * the vendored snapshot must stay byte-identical to the upstream git blob.
 * Block scalars are still rejected instead of being silently truncated.
 *
 * @module @dsh-gis/dsh-opengis-skill/skill-file
 */

/** The YAML frontmatter block at the start of a skill file. */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

/** The public kebab-case skill-name grammar used by the skill registry. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** One "key: value" scalar line inside the frontmatter block. */
const FIELD = /^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/u;

/** One "key:" line that opens a nested block, for example "metadata:". */
const NESTED = /^([A-Za-z][A-Za-z0-9_-]*):[ \t]*$/u;

/** One nested "  key: value" line inside a block opened by NESTED. */
const NESTED_FIELD = /^[ \t]+([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/u;

/** One nested sequence item inside a block opened by NESTED. */
const NESTED_ITEM = /^[ \t]+-[ \t]+(.*)$/u;

/** A complete single-line double-quoted YAML scalar. */
const DOUBLE_QUOTED = /^"((?:[^"\\]|\\.)*)"$/u;

/** A complete single-line single-quoted YAML scalar. */
const SINGLE_QUOTED = /^'((?:[^']|'')*)'$/u;

/** One double-quoted escape sequence: \uXXXX, \UXXXXXXXX, \xXX, or \c. */
const DOUBLE_QUOTED_ESCAPE = /\\(u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}|x[0-9A-Fa-f]{2}|[\s\S])/gu;

/** The top-level fields the Agent Skills specification allows. */
export const LEGAL_FIELDS = Object.freeze(["name", "description", "license", "metadata", "compatibility", "allowed-tools"]);

/** The nested "metadata" keys the packaged snapshot relies on. */
export const LEGAL_METADATA_FIELDS = Object.freeze(["category", "tags"]);

/** The one-character YAML escape sequences this reader understands. */
const SIMPLE_ESCAPES = new Map([
	["0", "\0"],
	["a", "\x07"],
	["b", "\b"],
	["t", "\t"],
	["n", "\n"],
	["v", "\v"],
	["f", "\f"],
	["r", "\r"],
	["e", "\x1b"],
	[" ", " "],
	['"', '"'],
	["/", "/"],
	["\\", "\\"],
	["N", "\u0085"],
	["_", "\u00a0"],
	["L", "\u2028"],
	["P", "\u2029"]
]);

/**
 * Parse one SKILL.md file into the registry fields and the instruction body.
 *
 * @param raw - the complete file contents.
 * @param path - the file path, used in error messages.
 * @returns the validated name and description, the optional license and
 *   metadata (category plus tags), the top-level field order, and the body
 *   without frontmatter.
 * @throws when the frontmatter, the name, or the description is missing or malformed.
 */
export function parseSkillFile(raw, path) {
	if (typeof raw !== "string") throw new TypeError(path + ": SKILL.md content must be a string");
	const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
	const match = FRONTMATTER.exec(text);
	if (match === null) throw new Error(path + ": missing YAML frontmatter");
	const { fields, nested, keys } = readFields(match[1], path);
	const name = fields.get("name");
	const description = fields.get("description");
	if (!isSkillName(name)) throw new Error(path + ': "name" must be kebab-case, got ' + JSON.stringify(name));
	if (typeof description !== "string" || description.length === 0) throw new Error(path + ': "description" is required');
	const license = fields.get("license");
	const frontmatter = { fields: keys, metadata: readMetadata(nested.get("metadata"), path) };
	return {
		name,
		description,
		content: normalizeBody(text.slice(match[0].length)),
		license: typeof license === "string" && license.length > 0 ? license : undefined,
		metadata: frontmatter.metadata,
		frontmatterFields: frontmatter.fields
	};
}

/**
 * Read the top-level scalars and the nested blocks of one frontmatter block.
 *
 * A nested block is opened by a "key:" line with no value; its children must
 * be indented "key: value" scalars or "- item" sequence entries.
 *
 * @param block - the text between the frontmatter markers.
 * @param path - the file path, used in error messages.
 * @returns the top-level scalar map and the nested block map.
 * @throws when a nested block is malformed.
 */
function readFields(block, path) {
	const fields = new Map();
	const nested = new Map();
	const keys = [];
	let open = null;
	for (const line of block.split(/\r?\n/u)) {
		const nestedItem = NESTED_ITEM.exec(line);
		if (nestedItem !== null) {
			if (open === null) throw new Error(path + ": sequence item outside a nested block");
			open.items.push(parseScalar(nestedItem[1].trim(), path + ': "' + open.key + '"'));
			continue;
		}
		const nestedField = NESTED_FIELD.exec(line);
		if (nestedField !== null) {
			if (open === null) throw new Error(path + ': indented field "' + nestedField[1] + '" outside a nested block');
			open.values.set(nestedField[1], parseScalar(nestedField[2].trim(), path + ': "' + open.key + '.' + nestedField[1] + '"'));
			continue;
		}
		if (/^[ \t]*-[ \t]/u.test(line) || /^-[ \t]/u.test(line)) throw new Error(path + ": sequence item outside a nested block");
		const entry = FIELD.exec(line);
		if (entry === null) continue;
		const value = entry[2].trim();
		keys.push(entry[1]);
		if (value.length === 0) {
			open = { key: entry[1], values: new Map(), items: [] };
			nested.set(entry[1], open);
			continue;
		}
		open = null;
		fields.set(entry[1], parseScalar(value, path + ': "' + entry[1] + '"'));
	}
	return { fields, nested, keys };
}

/**
 * Normalize one nested "metadata" block into the registry metadata object.
 *
 * @param block - the nested block, or undefined when "metadata:" is absent.
 * @param path - the file path, used in error messages.
 * @returns the metadata object; always an empty object when the block is absent.
 */
function readMetadata(block, path) {
	if (block === undefined) return { tags: [] };
	const metadata = {};
	for (const [key, value] of block.values) metadata[key] = value;
	if (block.items.length > 0) metadata.tags = block.items;
	if (typeof metadata.tags === "string") {
		metadata.tags = metadata.tags.split(/\s*,\s*/u).filter((tag) => tag.length > 0);
	} else if (metadata.tags === undefined) {
		metadata.tags = [];
	}
	if (!Array.isArray(metadata.tags)) throw new Error(path + ': "metadata.tags" must be a comma-separated string or a sequence');
	return metadata;
}

/**
 * Normalize the instruction body: trim the edges and use LF line endings.
 *
 * @param body - the raw text after the closing frontmatter marker.
 * @returns the instruction body handed to the skill registry.
 */
function normalizeBody(body) {
	return body.trim().replace(/\r\n?/gu, "\n");
}

/**
 * Report whether a value is a valid kebab-case skill name.
 *
 * @param value - the candidate value.
 * @returns whether the value matches the public skill-name grammar.
 */
export function isSkillName(value) {
	return typeof value === "string" && SKILL_NAME.test(value);
}

/**
 * Parse one frontmatter scalar value.
 *
 * Only single-line scalars are supported. A leading quote must close on the
 * same line, and a block scalar indicator ("|" or ">") is rejected so that an
 * upstream format change fails loudly instead of silently truncating a
 * description.
 *
 * @param value - the trimmed text after "key:".
 * @param subject - the error-message prefix, for example "file: \"description\"".
 * @returns the decoded scalar text.
 */
function parseScalar(value, subject) {
	if (value.length === 0) return "";
	if (value.startsWith('"')) {
		const quoted = DOUBLE_QUOTED.exec(value);
		if (quoted !== null) return decodeDoubleQuoted(quoted[1], subject, false);
		return decodeLenientDoubleQuoted(value, subject);
	}
	if (value.startsWith("'")) {
		const quoted = SINGLE_QUOTED.exec(value);
		if (quoted === null) throw new Error(subject + ": malformed or unterminated single-quoted scalar");
		return quoted[1].replaceAll("''", "'");
	}
	if (value.startsWith(">") || value.startsWith("|")) {
		throw new Error(subject + ": multi-line block scalars are not supported");
	}
	const comment = value.search(/[ \t]#/u);
	return (comment === -1 ? value : value.slice(0, comment)).trim();
}

/**
 * Decode a double-quoted scalar that carries unescaped inner quotes.
 *
 * Upstream writes long descriptions with literal inner quotes
 * ("... also for validate "not registered" errors ..."), which strict YAML
 * rejects. The text between the outermost quotes is kept, known escapes are
 * decoded, and any other backslash sequence stays literal so technical text
 * such as "\d" or a Windows path survives unchanged.
 *
 * @param value - the trimmed text after "key:", starting and ending with a quote.
 * @param subject - the error-message prefix.
 * @returns the decoded scalar text.
 * @throws when the value does not close with a quote.
 */
function decodeLenientDoubleQuoted(value, subject) {
	if (value.length < 2 || !value.endsWith('"')) throw new Error(subject + ": malformed or unterminated double-quoted scalar");
	return decodeDoubleQuoted(value.slice(1, -1), subject, true);
}

/**
 * Decode the body of a double-quoted YAML scalar.
 *
 * @param body - the text between the surrounding quotes.
 * @param subject - the error-message prefix.
 * @param lenient - whether unknown escape sequences stay literal instead of throwing.
 * @returns the decoded text.
 */
function decodeDoubleQuoted(body, subject, lenient) {
	return body.replace(DOUBLE_QUOTED_ESCAPE, (match, escape) => {
		if (escape.length > 1) {
			const codePoint = Number.parseInt(escape.slice(1), 16);
			if (!Number.isInteger(codePoint) || codePoint > 0x10ffff) {
				throw new Error(subject + ': invalid unicode escape "\\' + escape + '"');
			}
			return String.fromCodePoint(codePoint);
		}
		const simple = SIMPLE_ESCAPES.get(escape);
		if (simple !== undefined) return simple;
		if (lenient) return match;
		throw new Error(subject + ': unsupported escape sequence "\\' + escape + '"');
	});
}