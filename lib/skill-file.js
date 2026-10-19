/**
 * Minimal SKILL.md frontmatter reader shared by the plugin, the sync script,
 * and the validation script. The upstream opengis-skills files keep `name` and
 * `description` on single lines, so only scalar fields are read; list fields
 * such as `tags` are ignored.
 *
 * @module @dsh-gis/dsh-opengis-skill/skill-file
 */

/** The YAML frontmatter block at the start of a skill file. */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

/** The public kebab-case skill-name grammar used by the skill registry. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** One `key: value` scalar line inside the frontmatter block. */
const FIELD = /^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/u;

/**
 * Parse one SKILL.md file into the registry fields and the instruction body.
 *
 * @param raw - the complete file contents.
 * @param path - the file path, used in error messages.
 * @returns the validated name and description plus the body without frontmatter.
 * @throws when the frontmatter, the name, or the description is missing or malformed.
 */
export function parseSkillFile(raw, path) {
	const match = FRONTMATTER.exec(raw);
	if (match === null) throw new Error(`${path}: missing YAML frontmatter`);
	const fields = new Map();
	for (const line of match[1].split(/\r?\n/u)) {
		const entry = FIELD.exec(line);
		if (entry === null) continue;
		fields.set(entry[1], unquote(entry[2].trim()));
	}
	const name = fields.get("name");
	const description = fields.get("description");
	if (!isSkillName(name)) throw new Error(`${path}: "name" must be kebab-case, got ${JSON.stringify(name)}`);
	if (typeof description !== "string" || description.length === 0) throw new Error(`${path}: "description" is required`);
	return { name, description, content: raw.slice(match[0].length).trim() };
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

/** Remove one layer of YAML single or double quotes from a scalar value. */
function unquote(value) {
	if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
		return value.slice(1, -1).replace(/\\(["\\])/gu, "$1");
	}
	if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1).replace(/''/gu, "'");
	}
	return value;
}
