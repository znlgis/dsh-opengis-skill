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
	/** Scenario preset ("web", "server", "data" or "all"); unions with "groups". */
	scenario?: string;
	/** Groups to union with the scenario preset; ignored when "skills" is non-empty. */
	groups?: string[];
	/** Explicit skill allow list; wins over "scenario"/"groups". */
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

/** One degraded skill: it loads with the upstream body and the shared guidance only. */
export interface OpenGisDiagnosisDegradation {
	/** Kebab-case skill name. */
	skill: string;
	/** Stable reason, currently "adaptation-missing". */
	reason: string;
}

/** One cross-reference that points at something the package does not ship. */
export interface OpenGisDiagnosisDanglingRef {
	/** Source label such as "adaptations/gdal.md". */
	from: string;
	/** The missing skill name or version text. */
	ref: string;
}

/**
 * Read-only diagnostic snapshot; plain JSON, never undefined.
 *
 * "healthy" is the mechanical conclusion of missing/degraded/danglingRefs and
 * hashMismatch being empty, exactly as the cross-package contract defines it.
 * "problems" is an extra field summarising internal failures (unreadable
 * manifest, malformed adaptation, bad plugin config); it does not change
 * "healthy".
 */
export interface OpenGisDiagnosis {
	/** Provider identity; equals the "name" export. */
	provider: string;
	/** Package version read from package.json. */
	packageVersion: string;
	/** Skills found under assets/. */
	skills: number;
	/** Skills visible under the configured selection. */
	visible: number;
	/** Names listed by upstream.json but missing from assets/. */
	missing: string[];
	/** Skills loading without their per-skill DSH guidance. */
	degraded: OpenGisDiagnosisDegradation[];
	/** Adaptation cross-references that point at nothing. */
	danglingRefs: OpenGisDiagnosisDanglingRef[];
	/** Vendored files whose SHA-256 disagrees with upstream.json. */
	hashMismatch: string[];
	/** Estimated tokens of the visible catalog (see lib/diagnose.js for the formula). */
	catalogTokens: number;
	/** Installed DeepSeek Harness version, or null when it cannot be detected. */
	hostVersionHint: string | null;
	/** missing/degraded/danglingRefs/hashMismatch are all empty. */
	healthy: boolean;
	/** Internal failures that do not fit the contract fields. */
	problems: string[];
}

/** Options accepted by diagnose(), used by the tests to point at a fixture tree. */
export interface OpenGisDiagnoseOptions {
	/** Absolute asset root; defaults to the packaged "assets/". */
	assetRoot?: string;
	/** Absolute adaptation root; defaults to the packaged "adaptations/". */
	adaptationRoot?: string;
	/** Absolute integrity manifest; defaults to the packaged "upstream.json". */
	manifestFile?: string;
	/** Absolute package.json; defaults to the packaged one. */
	packageFile?: string;
	/** Plugin config that decides "visible". */
	config?: OpenGisSkillConfig;
}

/** Produce the read-only diagnostic snapshot; never throws and never writes. */
export declare function diagnose(options?: OpenGisDiagnoseOptions): OpenGisDiagnosis;

/** Register the bundled provider on "ctx.skills"; called by the Cordis loader. */
export declare function apply(ctx: { skills: { registerProvider(create: (control?: { signal?: AbortSignal }) => OpenGisSkillProvider): () => void } }, config?: OpenGisSkillConfig): void;
