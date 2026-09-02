import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type McpLogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

export type McpInvocationSurface = 'tool' | 'resource' | 'prompt';

export interface McpInvocationLogger {
  correlationId: string;
  log(event: string, level: McpLogLevel, data?: Record<string, unknown>): void;
  finish(outcome: 'success' | 'failure', data?: Record<string, unknown>): void;
}

/**
 * Starts a per-invocation logger: one correlation id shared by every log line this
 * tool/resource/prompt call emits, so a single request can be traced across every
 * boundary it touches. Requires the server to be constructed with
 * `capabilities: { logging: {} }` -- without that, sendLoggingMessage silently drops
 * every call and nothing errors.
 */
export function startInvocationLog(
  server: McpServer,
  loggerName: string,
  surface: McpInvocationSurface,
  name: string,
  context: Record<string, unknown> = {},
): McpInvocationLogger {
  const correlationId = randomUUID();
  const startedAt = Date.now();

  const log = (event: string, level: McpLogLevel, data: Record<string, unknown> = {}): void => {
    void server.sendLoggingMessage({
      level,
      logger: loggerName,
      data: { event, correlation_id: correlationId, surface, name, ...data },
    });
  };

  log('invocation_start', 'info', context);

  return {
    correlationId,
    log,
    finish(outcome, data = {}) {
      log('invocation_finished', outcome === 'success' ? 'info' : 'warning', {
        outcome,
        duration_ms: Date.now() - startedAt,
        ...data,
      });
    },
  };
}

/**
 * Times a single external call (a real network/DB boundary) and logs its start and
 * finish, including duration and outcome. `dependency`/`operation` are fixed, stable
 * labels, never request/response payloads.
 */
export async function timeExternalCall<T>(
  logger: McpInvocationLogger,
  dependency: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  logger.log('external_call_start', 'debug', { dependency, operation });
  const startedAt = Date.now();
  try {
    const result = await fn();
    logger.log('external_call_finished', 'info', {
      dependency,
      operation,
      duration_ms: Date.now() - startedAt,
      outcome: 'success',
    });
    return result;
  } catch (error) {
    logger.log('external_call_finished', 'warning', {
      dependency,
      operation,
      duration_ms: Date.now() - startedAt,
      outcome: 'failure',
      error_class: error instanceof Error ? error.constructor.name : 'UnknownError',
    });
    throw error;
  }
}
