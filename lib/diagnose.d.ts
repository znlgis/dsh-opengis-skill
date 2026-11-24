/** Provider identity; equals the "name" export of the plugin entry point. */
export declare const PROVIDER_ID: "opengis-skill";

/** Options accepted by probeHostVersion(), used by the tests. */
export interface OpenGisHostVersionOptions {
	/** Environment map to read; defaults to process.env. */
	environment?: Record<string, string | undefined>;
	/** Platform id; defaults to process.platform. */
	platform?: string;
	/** Override for "%LOCALAPPDATA%", used by the tests. */
	localAppData?: string;
}

/** Probe the installed DeepSeek Harness version; null when it cannot be detected. */
export declare function probeHostVersion(options?: OpenGisHostVersionOptions): string | null;

/** One degraded skill. */
export interface OpenGisDiagnosisDegradation {
	skill: string;
	reason: string;
}

/** One dangling cross-reference. */
export interface OpenGisDiagnosisDanglingRef {
	from: string;
	ref: string;
}

/** The contract diagnostic object, plain JSON and never undefined. */
export interface OpenGisDiagnosis {
	provider: string;
	packageVersion: string;
	skills: number;
	visible: number;
	missing: string[];
	degraded: OpenGisDiagnosisDegradation[];
	danglingRefs: OpenGisDiagnosisDanglingRef[];
	hashMismatch: string[];
	catalogTokens: number;
	hostVersionHint: string | null;
	healthy: boolean;
	problems: string[];
}

/** Options accepted by diagnose(), used by the tests to point at a fixture tree. */
export interface OpenGisDiagnoseOptions {
	assetRoot?: string;
	adaptationRoot?: string;
	manifestFile?: string;
	packageFile?: string;
	config?: {
		scenario?: string;
		groups?: string[];
		skills?: string[];
		exclude?: string[];
	};
}

/** Produce the read-only diagnostic snapshot; never throws and never writes. */
export declare function diagnose(options?: OpenGisDiagnoseOptions): OpenGisDiagnosis;
