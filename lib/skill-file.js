/**
 * Minimal SKILL.md frontmatter reader shared by the plugin, the sync script,
 * and the validation script.
 *
 * Vendored opengis-skills files keep "name" and "description" on single lines,
 * so only scalar fields are read; list fields such as "tags" are ignored.
 * Multi-line block scalars are rejected instead of being silently truncated,
 * and double-quoted scalars support the common YAML escape sequences.
 *
 * @module @dsh-gis/dsh-opengis-skill/skill-file
 */

/** The YAML frontmatter block at the start of a skill file. */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

/** The public kebab-case skill-name grammar used by the skill registry. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** One "key: value" scalar line inside the frontmatter block. */
const FIELD = /^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/u;

/** A complete single-line double-quoted YAML scalar. */
const DOUBLE_QUOTED = /^"((?:[^"\\]|\\.)*)"$/u;

/** A complete single-line single-quoted YAML scalar. */
const SINGLE_QUOTED = /^'((?:[^']|'')*)'$/u;

/** One double-quoted escape sequence: \uXXXX, \UXXXXXXXX, \xXX, or \c. */
const DOUBLE_QUOTED_ESCAPE = /\\(u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}|x[0-9A-Fa-f]{2}|[\s\S])/gu;

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
 * @returns the validated name and description plus the body without frontmatter.
 * @throws when the frontmatter, the name, or the description is missing or malformed.
 */
export function parseSkillFile(raw, path) {
	if (typeof raw !== "string") throw new TypeError(path + ": SKILL.md content must be a string");
	const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
	const match = FRONTMATTER.exec(text);
	if (match === null) throw new Error(path + ": missing YAML frontmatter");
	const fields = new Map();
	for (const line of match[1].split(/\r?\n/u)) {
		const entry = FIELD.exec(line);
		if (entry === null) continue;
		fields.set(entry[1], parseScalar(entry[2].trim(), path + ': "' + entry[1] + '"'));
	}
	const name = fields.get("name");
	const description = fields.get("description");
	if (!isSkillName(name)) throw new Error(path + ': "name" must be kebab-case, got ' + JSON.stringify(name));
	if (typeof description !== "string" || description.length === 0) throw new Error(path + ': "description" is required');
	return { name, description, content: normalizeBody(text.slice(match[0].length)) };
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
		if (quoted === null) throw new Error(subject + ": malformed or unterminated double-quoted scalar");
		return unescapeDoubleQuoted(quoted[1], subject);
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
 * Decode the body of a double-quoted YAML scalar.
 *
 * @param body - the text between the surrounding quotes.
 * @param subject - the error-message prefix.
 * @returns the decoded text.
 */
function unescapeDoubleQuoted(body, subject) {
	return body.replace(DOUBLE_QUOTED_ESCAPE, (match, escape) => {
		if (escape.length > 1) {
			const codePoint = Number.parseInt(escape.slice(1), 16);
			if (!Number.isInteger(codePoint) || codePoint > 0x10ffff) {
				throw new Error(subject + ': invalid unicode escape "\\' + escape + '"');
			}
			return String.fromCodePoint(codePoint);
		}
		const simple = SIMPLE_ESCAPES.get(escape);
		if (simple === undefined) throw new Error(subject + ': unsupported escape sequence "\\' + escape + '"');
		return simple;
	});
}
