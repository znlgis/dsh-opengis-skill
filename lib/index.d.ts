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
}

/** One loaded skill body returned by the provider. */
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

/** Cordis context surface used by this plugin. */
export interface OpenGisSkillHost {
	skills: {
		registerProvider(create: (control: { signal: AbortSignal; invalidate(): void }) => OpenGisSkillProvider): unknown;
	};
}

/** Register the bundled OpenGIS skill provider on "ctx.skills". */
export declare function apply(ctx: OpenGisSkillHost): void;
