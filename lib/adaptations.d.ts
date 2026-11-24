/** Directory (relative to the package root) holding the DSH adaptation files. */
export declare const ADAPTATION_DIRECTORY: "adaptations";

/** File name of the guidance shared by every skill. */
export declare const COMMON_FILE: "common.md";

/** Heading the shared guidance must start with. */
export declare const COMMON_HEADING: "## DeepSeek Harness 通用约定";

/** Heading every per-skill guidance must start with. */
export declare const SKILL_HEADING: "## DeepSeek Harness 使用建议";

/** Separator between the upstream body and the DSH guidance block. */
export declare const SKILL_SEPARATOR: string;

/** Degradation reason: the per-skill guidance file is missing, the skill still loads. */
export declare const DEGRADE_ADAPTATION_MISSING: "adaptation-missing";

/** Report whether one read failure means the path no longer exists. */
export declare function isMissingFile(cause: unknown): boolean;

/** Record one degradation for a skill. */
export declare function recordDegradation(root: string, name: string, reason: string): void;

/** Forget the recorded degradation of one skill, when present. */
export declare function clearDegradation(root: string, name: string): void;

/** List the current degradations of one adaptation root, sorted by skill name. */
export declare function degradationsOf(root: string): { skill: string; reason: string }[];

/** One synchronous adaptation read for diagnostics. */
export interface OpenGisInspectedAdaptation {
	/** Normalized guidance text, empty when the file is missing. */
	text: string;
	/** Degradation reason, null when the guidance is present. */
	reason: string | null;
}

/** Labels every per-skill guidance must keep, in this order. */
export declare const REQUIRED_LABELS: readonly string[];

/** Labels whose bullet must carry a concrete command or tool in backticks. */
export declare const CONCRETE_LABELS: readonly string[];

/** How many required labels must decompose into indented sub-bullets. */
export declare const MIN_NESTED_LABELS: number;

/** Minimum indented sub-bullets across one per-skill guidance file. */
export declare const MIN_NESTED_BULLETS: number;

/** List the indented sub-bullets of one label section, or of the whole file. */
export declare function nestedBullets(text: string, label?: string): string[];

/** DeepSeek Harness tools every supported build exposes; the citation minimums count these. */
export declare const CORE_TOOLS: readonly string[];

/** Optional-plugin tools the guidance may name, but only with a documented fallback. */
export declare const OPTIONAL_TOOLS: readonly string[];

/** Every DeepSeek Harness tool name the guidance may cite: the union of CORE_TOOLS and OPTIONAL_TOOLS. */
export declare const DSH_TOOLS: readonly string[];

/** List the distinct DeepSeek Harness tool names cited in backticks, in citation order. */
export declare function citedTools(text: string): string[];

/** List the distinct core tool names cited in backticks, in citation order. */
export declare function citedCoreTools(text: string): string[];

/** Build the path of one per-skill adaptation file. */
export declare function adaptationFile(root: string, name: string): string;

/** Build the path of the shared adaptation file. */
export declare function commonFile(root: string): string;

/** Read and normalize one per-skill adaptation file (synchronous). */
export declare function readAdaptationSync(root: string, name: string): string;

/** Read and normalize the shared adaptation file (synchronous). */
export declare function readCommonSync(root: string): string;

/** Read one per-skill adaptation file (asynchronous); "" when it is missing (degraded). */
export declare function readAdaptation(root: string, name: string, signal?: AbortSignal): Promise<string>;

/** Read one per-skill adaptation file synchronously for diagnostics. */
export declare function inspectAdaptationSync(root: string, name: string): OpenGisInspectedAdaptation;

/** Read the shared adaptation file (asynchronous). */
export declare function readCommon(root: string, signal?: AbortSignal): Promise<string>;

/** List the adaptation file base names (without ".md"), sorted. */
export declare function listAdaptations(root: string): string[];

/** Append the DSH guidance block to one upstream skill body. */
export declare function composeSkillContent(base: string, adaptation: string, common: string): string;

/** Report every problem with one per-skill adaptation file. */
export declare function adaptationProblems(name: string, text: string): string[];

/** Report every problem with the shared adaptation file. */
export declare function commonProblems(text: string): string[];
