/** One skill reference inside an adaptation file. */
export interface OpenGisCitationReference {
	/** "pointer" for "加载 `x`", "example" for `skill({ name: "x" })`. */
	kind: "pointer" | "example";
	/** The referenced skill name. */
	ref: string;
}

/** One cross-reference problem found in one adaptation file. */
export interface OpenGisCitationProblem {
	/** Adaptation file label such as "adaptations/gdal.md". */
	from: string;
	/** The missing skill name or version text. */
	ref: string;
	/** "unknown-skill" or "version-drift" for errors, "two-part-version" for warnings. */
	kind: "unknown-skill" | "version-drift" | "two-part-version";
	/** Human-readable message without the "from" prefix. */
	message: string;
}

/** Normalize one Markdown file for citation scanning. */
export declare function normalizeCitationText(text: string): string;

/** List the skills one guidance text points at, in document order. */
export declare function skillReferences(text: string): OpenGisCitationReference[];

/** List the distinct exact (three-part) versions one guidance text cites. */
export declare function exactVersions(text: string): string[];

/** Report whether one skill corpus mentions a version as a whole version token. */
export declare function mentionsVersion(corpus: string, version: string): boolean;

/** Collect the text of one skill: SKILL.md plus every reference file. */
export declare function skillCorpus(directory: string): string;

/** Report every cross-reference problem inside the adaptation layer. */
export declare function citationProblems(options: {
	skills: readonly { name: string; directory: string }[];
	adaptations: readonly { name: string; text: string }[];
	common?: string;
}): { errors: OpenGisCitationProblem[]; warnings: OpenGisCitationProblem[] };
