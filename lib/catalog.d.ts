/** One validated skill entry read from disk. */
export interface SkillEntry {
	/** Validated kebab-case skill name. */
	name: string;
	/** Required routing description. */
	description: string;
	/** Absolute skill directory. */
	directory: string;
	/** Absolute path to SKILL.md. */
	path: string;
}

/** The instruction file name inside one skill directory. */
export declare const SKILL_FILE: "SKILL.md";

/** Read one skill directory, or undefined when it has no SKILL.md. */
export declare function readSkillEntry(directory: string, expectedName?: string): SkillEntry | undefined;

/** Read every skill directory under one asset root, sorted by name. */
export declare function readSkillCatalog(assetRoot: string): SkillEntry[];

/** Render one skill directory as a registry resource base. */
export declare function resourceBaseOf(directory: string): { kind: "directory"; path: string };

/** Render the generated README skill-count section. */
export declare function renderSkillCount(skills: readonly unknown[]): string;

/** Render the generated README skill table. */
export declare function renderSkillTable(skills: readonly { name: string; description: string }[]): string;

/** Read the generated README sections including their markers. */
export declare function readGeneratedSections(markdown: string): { count: string; table: string };

/** Regenerate both README sections in place. */
export declare function replaceGeneratedSections(
	markdown: string,
	skills: readonly { name: string; description: string }[]
): string;

/** List every regular file under one directory as sorted POSIX-style relative paths. */
export declare function listFiles(root: string): string[];

/** Hash one file with SHA-256 and return the lowercase hexadecimal digest. */
export declare function hashFile(path: string): string;

/** Hash every regular file under one directory. */
export declare function hashFiles(root: string): Record<string, string>;

/** Normalize one vendored file to the upstream git blob form (CRLF to LF, binary untouched). */
export declare function canonicalVendoredBytes(buffer: Buffer): Buffer;
