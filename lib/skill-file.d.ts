/** One parsed SKILL.md file. */
export interface ParsedSkillFile {
	/** Validated kebab-case skill name. */
	name: string;
	/** Required routing description. */
	description: string;
	/** Instruction body with the YAML frontmatter removed. */
	content: string;
}

/** Report whether a value is a valid kebab-case skill name. */
export declare function isSkillName(value: unknown): value is string;

/** Parse and validate one SKILL.md file. */
export declare function parseSkillFile(raw: string, path: string): ParsedSkillFile;
