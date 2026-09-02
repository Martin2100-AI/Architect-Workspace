import { realpath } from 'fs/promises';
import { fileURLToPath } from 'url';
import { sep } from 'path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/** Stable event name for the log notification emitted on every denial. Do not rename --
 *  operators grep for this string to alert on filesystem-boundary violations. */
export const ROOTS_ACCESS_DENIED_EVENT = 'roots_access_denied';

export class RootsAccessDeniedError extends Error {
  constructor(
    public readonly requestedPath: string,
    public readonly reason: string,
  ) {
    super(`Access denied: "${requestedPath}" is outside every root the client declared (${reason}).`);
    this.name = 'RootsAccessDeniedError';
  }
}

export type RootsDenialLogger = (event: {
  eventName: string;
  requestedPath: string;
  reason: string;
}) => void;

/**
 * Confirms a filesystem path a tool is about to touch really sits inside one of the
 * roots the CONNECTED CLIENT declared, before any read/write happens.
 *
 * The order is the whole control -- resolve first, compare second:
 *   1. `fs.realpath` resolves `candidatePath` to its canonical form, collapsing every
 *      ".."/"." segment AND dereferencing every symlink in the chain, in one step.
 *   2. Each declared root is realpath'd too (a root itself could be a symlink).
 *   3. Only the two *resolved* strings are compared.
 *
 * A plain string prefix check on the raw, unresolved path (`candidatePath.startsWith(root)`)
 * is NOT an equivalent substitute and must not be used here, for three independent reasons:
 *   - ".." segments make the raw string say one thing while the OS opens another. A root
 *     of "/docs" and a candidate of "/docs/../../etc/passwd" *does* start with "/docs" as a
 *     string, so a prefix check would wave it through -- but the file the OS actually opens
 *     is /etc/passwd. The traversal is invisible until something walks the path components.
 *   - A file fully inside the root can itself be a symlink whose target lives outside it
 *     (e.g. property-documents/p-1/disclosure.txt -> /etc/shadow). The raw path string is
 *     completely clean; only dereferencing the symlink reveals where the read really lands.
 *   - Sibling directories collide under naive prefix matching: root "/docs" would wrongly
 *     admit "/docs-private" because the *string* "/docs-private" starts with the *string*
 *     "/docs". Comparing resolved-root-plus-separator (or exact equality) avoids this;
 *     comparing raw prefixes does not.
 * `fs.realpath` is what forces the ".." collapse and the symlink dereference to happen
 * BEFORE the comparison runs, which is the only order that makes the comparison meaningful.
 *
 * Fails closed: if the client never declared the `roots` capability, refuses to answer
 * `roots/list`, or declares zero roots, every path is denied. There is nothing safe to
 * compare against otherwise.
 */
export async function assertPathWithinDeclaredRoots(
  server: McpServer,
  candidatePath: string,
  logDenial: RootsDenialLogger,
): Promise<string> {
  const deny = (reason: string): never => {
    logDenial({ eventName: ROOTS_ACCESS_DENIED_EVENT, requestedPath: candidatePath, reason });
    throw new RootsAccessDeniedError(candidatePath, reason);
  };

  if (!server.server.getClientCapabilities()?.roots) {
    return deny('client did not declare the roots capability');
  }

  let declaredRoots: { uri: string }[];
  try {
    const result = await server.server.listRoots(undefined, { timeout: 5_000 });
    declaredRoots = result.roots;
  } catch (error) {
    return deny(`roots/list request failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  if (declaredRoots.length === 0) {
    return deny('client declared zero roots');
  }

  // Resolve the candidate itself. A nonexistent target throws ENOENT here -- that is a
  // plain "not found", not a security decision, and callers should surface it as such
  // rather than falling back to the unresolved candidatePath for any later filesystem call.
  const resolvedCandidate = await realpath(candidatePath);

  const resolvedRoots = await Promise.all(
    declaredRoots.map(async (root) => {
      try {
        return await realpath(fileURLToPath(root.uri));
      } catch {
        // A declared root that doesn't exist on disk admits nothing; skip it rather than
        // failing the whole check for an unrelated root's misconfiguration.
        return undefined;
      }
    }),
  );

  // Windows paths are case-insensitive at the filesystem level, so a case-only difference
  // must not defeat the comparison even though both sides are already realpath'd.
  const normalize = (p: string): string => (process.platform === 'win32' ? p.toLowerCase() : p);
  const normalizedCandidate = normalize(resolvedCandidate);

  const isWithinRoot = resolvedRoots.some((root) => {
    if (!root) return false;
    const normalizedRoot = normalize(root);
    return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(normalizedRoot + sep);
  });

  if (!isWithinRoot) {
    return deny('resolved path falls outside every declared root');
  }

  return resolvedCandidate;
}
