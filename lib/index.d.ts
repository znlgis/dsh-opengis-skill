/** Stable Loader identity. */
export declare const name: "opengis-skill";

/** Services that must exist before `apply` runs. */
export declare const inject: readonly ["skills"];

/** Cordis context surface used by this plugin. */
export interface OpenGisSkillHost {
	/** Own a registration so plugin unload removes it. */
	effect(callback: () => unknown, label?: string): unknown;
	/** The skill registry this provider registers on. */
	skills: {
		registerProvider(create: (control: { signal: AbortSignal; invalidate(): void }) => unknown): unknown;
	};
}

/** Register the bundled OpenGIS skill provider on `ctx.skills`. */
export declare function apply(ctx: OpenGisSkillHost): void;
