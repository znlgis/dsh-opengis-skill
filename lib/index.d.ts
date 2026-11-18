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

/**
 * Routing metadata carried on a candidate.
 *
 * The DeepSeek Harness skill registry keeps candidate metadata as opaque,
 * provider-specific data: it validates the candidate fields it owns and never
 * reads or forwards "metadata" to the model. The pack exposes the upstream tags
 * and the local groups/keywords here so a host that knows that convention can
 * use them; nothing in the model-facing catalog depends on it.
 */
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

/** One skill summary returned by the provider catalog. Frozen; treat as readonly. */
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

/** Lookup options the registry hands to one load. */
export interface OpenGisSkillLookupOptions {
	/** Workspace selector; unused by this provider, accepted per the registry contract. */
	cwd?: string;
	/** Cancels the load together with the registration lifecycle signal. */
	signal?: AbortSignal;
}

/**
 * The borrowed provider object the skill registry holds.
 *
 * "list" always resolves a complete array (the registry's complete-discovery
 * shorthand). "get" resolves "undefined" when the instruction file or the
 * selected catalog no longer holds that skill, as the registry contract asks.
 */
export interface OpenGisSkillProvider {
	name: string;
	list(options?: OpenGisSkillLookupOptions): Promise<readonly OpenGisSkillCandidate[]>;
	get(candidate: Pick<OpenGisSkillCandidate, "name">, options?: OpenGisSkillLookupOptions): Promise<OpenGisSkillDefinition | undefined>;
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

/** Options accepted by the testable provider factory. */
export interface OpenGisProviderOptions {
	/** Absolute asset root; defaults to the packaged "assets/" directory. */
	assetRoot?: string;
	/** Absolute adaptation root; defaults to the packaged "adaptations/" directory. */
	adaptationRoot?: string;
	/** Plugin config applied to the catalog. */
	config?: OpenGisSkillConfig;
	/** Registration lifecycle signal; aborts in-flight loads on disposal. */
	signal?: AbortSignal;
}

/**
 * Create the skill provider over one asset root.
 *
 * The plugin entry point calls this with the packaged roots and the
 * registration's lifecycle signal. It is exported so tests and embedders can
 * drive the exact provider the registry sees against a fixture tree.
 */
export declare function createProvider(options?: OpenGisProviderOptions): OpenGisSkillProvider;

/** Register the bundled provider on "ctx.skills"; called by the Cordis loader. */
export declare function apply(ctx: { skills: { registerProvider(create: (control?: { signal?: AbortSignal }) => OpenGisSkillProvider): () => void } }, config?: OpenGisSkillConfig): void;
