/** Extract every relative file link target from one markdown document. */
export declare function relativeMarkdownLinks(markdown: string): string[];

/** Resolve one relative markdown link against its containing file. */
export declare function resolveMarkdownLink(fromFile: string, link: string): { path: string; fragment: string };

/** Report whether one resolved path stays inside a directory. */
export declare function isInsideDirectory(root: string, candidate: string): boolean;

/** Collect every problem with the relative links in one markdown document. */
export declare function findMarkdownLinkProblems(fromFile: string, markdown: string, root: string): string[];
