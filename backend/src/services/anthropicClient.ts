import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_TIMEOUT_MS = 20000;
const ANTHROPIC_MAX_RETRIES = 2;

export class AnthropicNotConfiguredError extends Error {
  constructor(message = 'ANTHROPIC_API_KEY is not configured') {
    super(message);
    this.name = 'AnthropicNotConfiguredError';
  }
}

export class AnthropicUpstreamError extends Error {
  constructor(message = 'The AI search service is temporarily unavailable') {
    super(message);
    this.name = 'AnthropicUpstreamError';
  }
}

export interface AiClient {
  complete(prompt: string): Promise<string>;
}

/**
 * Thin wrapper around the Anthropic SDK. Timeout and retry count are set explicitly
 * on the client (per CLAUDE.md's external-call rules — every outbound call needs a
 * bounded timeout and a capped retry policy). Errors are caught and re-thrown as
 * AnthropicUpstreamError so the raw SDK error (which could include response detail)
 * never reaches a route's JSON response; only the error class, never the message or
 * the API key, is logged server-side.
 */
export class AnthropicAiClient implements AiClient {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({
      apiKey,
      timeout: ANTHROPIC_TIMEOUT_MS,
      maxRetries: ANTHROPIC_MAX_RETRIES,
    });
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    let response;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (err) {
      const errorClass = err instanceof Error ? err.constructor.name : 'UnknownError';
      console.error(JSON.stringify({ level: 'error', event: 'anthropic_call_failed', error_class: errorClass }));
      throw new AnthropicUpstreamError();
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      console.error(
        JSON.stringify({ level: 'error', event: 'anthropic_response_not_text', error_class: 'UnexpectedResponseShape' }),
      );
      throw new AnthropicUpstreamError('The AI search service returned an unexpected response.');
    }
    return textBlock.text;
  }
}

/**
 * Used when ANTHROPIC_API_KEY isn't configured. Boots the rest of the app normally
 * (login and the plain property feed don't need this) — only routes that actually
 * call complete() find out AI search isn't available, and they do so through this
 * typed error rather than the app failing to start at all.
 */
export class StubAiClient implements AiClient {
  async complete(_prompt: string): Promise<string> {
    throw new AnthropicNotConfiguredError();
  }
}
