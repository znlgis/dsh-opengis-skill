/** The coarse groups a plugin config may select from. */
export declare const GROUP_IDS: readonly string[];

/** One-line description of every group. */
export declare const GROUP_DESCRIPTIONS: Readonly<Record<string, string>>;

/** The groups one skill belongs to. */
export declare function groupsOf(name: string): string[];

/** The trigger keywords of one skill. */
export declare function keywordsOf(name: string): string[];

/** One routing score for one skill. */
export interface OpenGisRoutingScore {
	/** Kebab-case skill name. */
	name: string;
	/** Weighted hits: 3 per keyword match, 1 per description token match. */
	score: number;
}

/** Score every catalog entry against one lowercased request. */
export declare function keywordScores(skills: readonly { name: string; description?: string }[], query: string): OpenGisRoutingScore[];

/** Report taxonomy entries that disagree with the catalog. */
export declare function taxonomyProblems(names: readonly string[]): string[];

/** The normalized plugin selection. */
export interface OpenGisSkillSelection {
	/** Groups to union; ignored when "only" is non-empty. */
	groups: string[];
	/** Explicit skill allow list; wins over "groups". */
	only: string[];
	/** Skill deny list, applied last. */
	exclude: string[];
}

/** Validate and normalize the raw plugin config. */
export declare function normalizeSelection(config: unknown, skills: readonly { name: string }[]): OpenGisSkillSelection;

/** Apply one selection to the catalog, keeping the catalog order. */
export declare function selectSkills<T extends { name: string }>(skills: readonly T[], selection: OpenGisSkillSelection): T[];
