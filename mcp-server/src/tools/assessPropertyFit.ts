import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { startInvocationLog, timeExternalCall } from '../mcpLogger';
import { createProgressReporter, reportHeartbeatWhilePending } from '../progress';
import { findProperty, StubProperty } from '../data/stubListings';

const MCP_LOGGER_NAME = 'mcp-server';

// Deliberately small: this is a short opinion, not a report. Keeps latency and
// cost on the client's model call predictable.
const SAMPLING_MAX_TOKENS = 500;

const SYSTEM_PROMPT =
  "You are a candid real estate assistant helping a home buyer weigh a specific listing against what they " +
  'said matters to them. Reason honestly about fit and tradeoffs using only the facts given -- do not invent ' +
  'amenities, condition, schools, or neighborhood details that were not provided. Call out anything a real ' +
  'estate agent should verify in person. Keep the answer under 200 words.';

export const assessPropertyFitInputShape = {
  property_id: z.string().describe('The property to assess, e.g. p-1.'),
  buyer_priorities: z
    .array(z.string())
    .min(1)
    .describe('What matters most to this buyer, in their own words, e.g. "home office", "walkable neighborhood".'),
  buyer_dealbreakers: z
    .array(z.string())
    .default([])
    .describe('Things that would rule the property out for this buyer, e.g. "no yard", "busy street". Optional.'),
};

export interface PropertyFitAssessment {
  property_id: string;
  fit_assessment: string;
  // Lets a caller (or a UI) distinguish a real judgment call from the
  // fallback, rather than silently presenting a canned answer as reasoning.
  source: 'model_reasoning' | 'degraded_fallback';
}

function buildUserPrompt(property: StubProperty, priorities: string[], dealbreakers: string[]): string {
  return (
    'Listing:\n' +
    `- Address: ${property.address}\n` +
    `- Price: $${property.price.toLocaleString()}\n` +
    `- Bedrooms: ${property.bedrooms}\n` +
    `- Bathrooms: ${property.bathrooms}\n\n` +
    `Buyer priorities: ${priorities.join(', ')}\n` +
    `Buyer dealbreakers: ${dealbreakers.length > 0 ? dealbreakers.join(', ') : 'none stated'}\n\n` +
    'How well does this listing fit this buyer? Call out tradeoffs and anything unknown that should be verified.'
  );
}

// Used when the client has no sampling capability, or declines the request.
// Still useful, still honest about what it is -- never an empty or fabricated answer.
function buildDegradedFallback(property: StubProperty, priorities: string[], dealbreakers: string[]): string {
  const lines = [
    'Unable to generate a reasoned fit assessment right now (this client does not support or allow model sampling).',
    `Raw facts for ${property.address}: $${property.price.toLocaleString()}, ${property.bedrooms} bed / ${property.bathrooms} bath.`,
    `Buyer priorities: ${priorities.join(', ')}.`,
  ];
  if (dealbreakers.length > 0) {
    lines.push(`Buyer dealbreakers: ${dealbreakers.join(', ')}.`);
  }
  lines.push('Compare these facts against the stated priorities and dealbreakers yourself, or retry later.');
  return lines.join('\n');
}

export function registerAssessPropertyFitTool(server: McpServer): void {
  server.registerTool(
    'assess_property_fit',
    {
      title: 'Assess how well a property fits a buyer',
      description:
        "Judge how well a specific listing fits a buyer's stated priorities and dealbreakers, and explain the " +
        'tradeoffs and open questions -- this is a reasoned opinion, not a data lookup. Call this when a buyer ' +
        'asks something like "is this place right for me", not when they just want the listing facts.',
      inputSchema: assessPropertyFitInputShape,
    },
    async ({ property_id, buyer_priorities, buyer_dealbreakers }, extra) => {
      const rl = startInvocationLog(server, MCP_LOGGER_NAME, 'tool', 'assess_property_fit', { property_id });
      const progress = createProgressReporter(extra);

      // Real data fetch first, no model involved -- a bad property_id fails fast
      // and never reaches the sampling request.
      const property = findProperty(property_id);
      if (!property) {
        rl.finish('failure', { error_class: 'PropertyNotFoundError' });
        return {
          content: [{ type: 'text', text: `No property found with id "${property_id}".` }],
          isError: true,
        };
      }

      try {
        // >>> This is where the request leaves the server for the client: the
        // server owns no model or API key, and only the client decides whether,
        // and with which model, to answer it.
        const samplingCall = timeExternalCall(rl, 'mcp-client', 'sampling.createMessage', () =>
          server.server.createMessage({
            messages: [
              { role: 'user', content: { type: 'text', text: buildUserPrompt(property, buyer_priorities, buyer_dealbreakers) } },
            ],
            systemPrompt: SYSTEM_PROMPT,
            maxTokens: SAMPLING_MAX_TOKENS,
            includeContext: 'none',
          }),
        );
        // No total here on purpose: how long the client takes to sample a model is entirely
        // its own call, with no sub-steps this server can see -- a heartbeat, not a percentage.
        const result = await reportHeartbeatWhilePending(
          progress,
          'Waiting on the client to sample a model response -- duration unknown, no fixed total.',
          samplingCall,
        );

        const fitAssessment =
          result.content.type === 'text'
            ? result.content.text
            : '(Client returned a non-text sampling response, which this tool cannot render.)';

        const assessment: PropertyFitAssessment = { property_id, fit_assessment: fitAssessment, source: 'model_reasoning' };
        rl.finish('success');
        return { content: [{ type: 'text', text: JSON.stringify(assessment, null, 2) }] };
      } catch (error) {
        // Client has no sampling capability, the user declined the request, or
        // it timed out/errored -- none of that should crash the tool or hand
        // back nothing. Warn, degrade to the facts we already fetched, move on.
        const errorClass = error instanceof Error ? error.constructor.name : 'UnknownError';
        rl.log('sampling_unavailable', 'warning', { error_class: errorClass });

        const assessment: PropertyFitAssessment = {
          property_id,
          fit_assessment: buildDegradedFallback(property, buyer_priorities, buyer_dealbreakers),
          source: 'degraded_fallback',
        };
        rl.finish('success', { degraded: true, error_class: errorClass });
        return { content: [{ type: 'text', text: JSON.stringify(assessment, null, 2) }] };
      }
    },
  );
}
