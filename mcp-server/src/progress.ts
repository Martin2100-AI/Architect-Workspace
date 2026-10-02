import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';

type ToolRequestHandlerExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

export interface ProgressReporter {
  /**
   * Emits one `notifications/progress` tick. Omit `total` whenever the real total isn't
   * known -- never fabricate one just to render a percentage. A no-op (by construction,
   * not by a runtime check tools have to remember) when the client sent no progress token.
   */
  tick(progress: number, options?: { total?: number; message?: string }): void;
}

const NOOP_REPORTER: ProgressReporter = { tick: () => {} };

/**
 * The one place a tool needs to touch to report progress. Reads the progress token out of
 * the request's `_meta` -- if the client didn't send one, every `tick()` call is silently
 * a no-op, so a tool's control flow never has to branch on whether progress is wanted.
 */
export function createProgressReporter(extra: ToolRequestHandlerExtra): ProgressReporter {
  const progressToken = extra._meta?.progressToken;
  if (progressToken === undefined) {
    return NOOP_REPORTER;
  }
  return {
    tick(progress, options = {}) {
      void extra.sendNotification({
        method: 'notifications/progress',
        params: { progressToken, progress, total: options.total, message: options.message },
      });
    },
  };
}

/**
 * Ticks `reporter` once per `intervalMs` for as long as `work` is still pending, then stops --
 * for operations with no countable steps (waiting on a single opaque external call, e.g. an
 * MCP sampling round trip). Reports elapsed heartbeats with no `total`, since none exists;
 * `message` should say so explicitly rather than let a bare number imply one.
 */
export async function reportHeartbeatWhilePending<T>(
  reporter: ProgressReporter,
  message: string,
  work: Promise<T>,
  intervalMs = 500,
): Promise<T> {
  let heartbeats = 0;
  const timer = setInterval(() => {
    heartbeats += 1;
    reporter.tick(heartbeats, { message });
  }, intervalMs);
  try {
    return await work;
  } finally {
    clearInterval(timer);
  }
}
