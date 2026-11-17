/** Stable Loader identity. */
export declare const name: "opengis-skill";

/** Services that must exist before "apply" runs. */
export declare const inject: readonly ["skills"];

/** Invocation controls shared by the model-facing and user-facing surfaces. */
export interface OpenGisInvocation {
	modelInvocable: boolean;
	userInvocable: boolean;
}

/** Directory resource base handed to the model with a loaded skill. */
export interface OpenGisResourceBase {
	kind: "directory";
	path: string;
}

/** Routing metadata carried on a candidate (never on a definition). */
export interface OpenGisSkillMetadata {
	/** Upstream category directory, always "gis" for this pack. */
	category?: string;
	/** Parsed upstream metadata.tags. */
	tags: string[];
	/** Coarse groups from lib/taxonomy.js, used by the plugin config filter. */
	groups: string[];
	/** Local trigger phrases from lib/taxonomy.js, in request wording. */
	keywords: string[];
}

/** One skill summary returned by the provider catalog. */
export interface OpenGisSkillCandidate {
	name: string;
	description: string;
	invocation: OpenGisInvocation;
	source: string;
	provider: string;
	rank: number;
	locator: string;
	path: string;
	resourceBase: OpenGisResourceBase;
	metadata: OpenGisSkillMetadata;
}

/** One loaded skill body returned by the provider; "content" also carries the DSH guidance. */
export interface OpenGisSkillDefinition {
	name: string;
	description: string;
	invocation: OpenGisInvocation;
	source: string;
	provider: string;
	resourceBase: OpenGisResourceBase;
	path: string;
	content: string;
}

/** The borrowed provider object the skill registry holds. */
export interface OpenGisSkillProvider {
	name: string;
	list(options?: { signal?: AbortSignal }): Promise<readonly OpenGisSkillCandidate[]>;
	get(candidate: OpenGisSkillCandidate, options?: { signal?: AbortSignal }): Promise<OpenGisSkillDefinition>;
}

/** Plugin config: trim the bundled catalog without editing the package. */
export interface OpenGisSkillConfig {
	/** Groups to union; ignored when "skills" is non-empty. */
	groups?: string[];
	/** Explicit skill allow list; wins over "groups". */
	skills?: string[];
	/** Skill deny list, applied last. */
	exclude?: string[];
}
