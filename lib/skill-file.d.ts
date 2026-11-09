/** One parsed SKILL.md file. */
export interface ParsedSkillFile {
	/** Validated kebab-case skill name. */
	name: string;
	/** Required routing description. */
	description: string;
	/** Instruction body with the YAML frontmatter removed. */
	content: string;
	/** SPDX-style license declared by the frontmatter, when present. */
	license?: string;
	/** Nested "metadata" block: category plus the parsed tag list. */
	metadata: { category?: string; tags: string[] };
	/** Top-level frontmatter fields in source order. */
	frontmatterFields: string[];
}

/** Top-level fields the Agent Skills specification allows. */
export declare const LEGAL_FIELDS: readonly string[];

/** Nested "metadata" keys the packaged snapshot relies on. */
export declare const LEGAL_METADATA_FIELDS: readonly string[];

/** Report whether a value is a valid kebab-case skill name. */
export declare function isSkillName(value: unknown): value is string;

/** Parse and validate one SKILL.md file. */
export declare function parseSkillFile(raw: string, path: string): ParsedSkillFile;
