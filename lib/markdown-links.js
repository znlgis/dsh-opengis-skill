/**
 * Markdown link helpers shared by the validation script and the tests.
 *
 * Only relative file links are inspected: scheme links, fragment-only links,
 * and absolute URLs are ignored. Resolution is lexical, so a link must stay
 * inside the directory the caller allows.
 *
 * @module @dsh-gis/dsh-opengis-skill/markdown-links
 */

import { existsSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

/** One inline markdown link target, as written. */
const LINK = /\]\(([^)]+)\)/gu;

/** A link with a URI scheme or a fragment-only target is not a file link. */
const NON_FILE_LINK = /^(?:[a-z][a-z0-9+.-]*:|#)/iu;

/**
 * Extract every relative file link target from one markdown document.
 *
 * @param markdown - the complete markdown text.
 * @returns the targets still carrying their optional fragment or query text.
 */
export function relativeMarkdownLinks(markdown) {
	const links = [];
	for (const match of markdown.matchAll(LINK)) {
		const target = match[1].trim();
		if (target.length === 0 || NON_FILE_LINK.test(target)) continue;
		links.push(target);
	}
	return links;
}

/**
 * Resolve one relative markdown link against its containing file.
 *
 * @param fromFile - the markdown file that contains the link.
 * @param link - a relative link target, optionally with a "#fragment".
 * @returns the absolute target path and the fragment without its "#".
 * @throws when the target contains invalid percent-encoding.
 */
export function resolveMarkdownLink(fromFile, link) {
	const hash = link.indexOf("#");
	const pathPart = hash === -1 ? link : link.slice(0, hash);
	const fragment = hash === -1 ? "" : link.slice(hash + 1);
	if (pathPart.length === 0) return { path: fromFile, fragment };
	let decoded;
	try {
		decoded = decodeURIComponent(pathPart);
	} catch (cause) {
		throw new Error('invalid URL encoding in link "' + link + '"', { cause });
	}
	if (decoded.length === 0) return { path: fromFile, fragment };
	return { path: resolve(dirname(fromFile), decoded), fragment };
}

/**
 * Report whether one resolved path stays inside a directory.
 *
 * @param root - the allowed directory.
 * @param candidate - the resolved path to test.
 * @returns whether the candidate equals or is below the root.
 */
export function isInsideDirectory(root, candidate) {
	const rootKey = pathKey(root);
	const candidateKey = pathKey(candidate);
	return candidateKey === rootKey || candidateKey.startsWith(rootKey + sep);
}

/**
 * Collect every problem with the relative links in one markdown document.
 *
 * @param fromFile - the markdown file that contains the links; also used in messages.
 * @param markdown - the complete markdown text.
 * @param root - the directory every link must stay inside.
 * @returns human-readable problems, empty when every link is valid.
 */
export function findMarkdownLinkProblems(fromFile, markdown, root) {
	const problems = [];
	for (const link of relativeMarkdownLinks(markdown)) {
		let resolved;
		try {
			resolved = resolveMarkdownLink(fromFile, link);
		} catch (cause) {
			problems.push(fromFile + ": " + cause.message);
			continue;
		}
		if (!isInsideDirectory(root, resolved.path)) {
			problems.push(fromFile + ": link escapes " + root + ": " + link);
			continue;
		}
		if (!existsSync(resolved.path)) problems.push(fromFile + ": broken link " + link);
	}
	return problems;
}

/** Normalize one path for comparison, folding case on Windows. */
function pathKey(value) {
	const normalized = resolve(value);
	return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
