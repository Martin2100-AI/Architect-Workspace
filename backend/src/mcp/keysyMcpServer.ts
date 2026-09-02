import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { MlsClient } from '../services/mlsClient';
import { getPropertyById, PropertyNotFoundError } from '../services/propertyLookupService';
import { InvalidTourDatetimeError, ScheduleTourProgress, scheduleTour } from '../services/tourService';
import { TourRequest } from '../models/TourRequest';
import { startInvocationLog, timeExternalCall } from './mcpLogger';

const MCP_LOGGER_NAME = 'keysy-mcp';

function errorClassName(error: unknown): string {
  return error instanceof Error ? error.constructor.name : 'UnknownError';
}

export interface KeysyMcpServerDeps {
  mlsClient: MlsClient;
  tourRequestModel: typeof TourRequest;
}

const scheduleTourInputShape = {
  property_id: z.string().describe('The property to tour, e.g. stub-1.'),
  requested_datetime: z
    .string()
    .datetime()
    .describe('ISO 8601 datetime for the requested tour, must be in the future.'),
  buyer_email: z.string().email().describe("The buyer's email address."),
  notes: z.string().max(300).optional().describe('Optional short note for the agent leading the tour.'),
};

export function createKeysyMcpServer({ mlsClient, tourRequestModel }: KeysyMcpServerDeps): McpServer {
  // capabilities.logging must be declared here -- omit it and sendLoggingMessage
  // below silently no-ops, with no error to signal the mistake.
  const server = new McpServer({ name: 'keysy', version: '0.1.0' }, { capabilities: { logging: {} } });

  server.registerResource(
    'keysy-property',
    new ResourceTemplate('keysy://properties/{property_id}', { list: undefined }),
    {
      title: 'Property details',
      description:
        'A single property\'s listing details: price, address, beds/baths, square footage, features, and estimated monthly payment.',
      mimeType: 'application/json',
    },
    async (uri, { property_id }) => {
      const propertyId = Array.isArray(property_id) ? property_id[0] : property_id;
      const rl = startInvocationLog(server, MCP_LOGGER_NAME, 'resource', 'keysy-property', {
        property_id: propertyId,
      });
      try {
        const property = await timeExternalCall(rl, 'mls_client', 'get_property_feed', () =>
          getPropertyById(mlsClient, propertyId),
        );
        rl.finish('success');
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(property, null, 2),
            },
          ],
        };
      } catch (error) {
        rl.log('error', 'warning', { error_class: errorClassName(error) });
        rl.finish('failure', { error_class: errorClassName(error) });
        throw error;
      }
    },
  );

  server.registerTool(
    'schedule_property_tour',
    {
      title: 'Schedule a property tour',
      description:
        "Hand a buyer's interest in a property off to Keysy by scheduling a tour. Call this when a buyer has picked a specific property and a specific time -- not for browsing or comparison questions. Scheduling the same property/buyer/time again is safe and will not create a duplicate.",
      inputSchema: scheduleTourInputShape,
    },
    async ({ property_id, requested_datetime, buyer_email, notes }, extra) => {
      const progressToken = extra._meta?.progressToken;
      // buyer_email and notes are deliberately excluded from the logged context below --
      // they're buyer-identifying/free-text, not identifiers safe to put in a log stream.
      const rl = startInvocationLog(server, MCP_LOGGER_NAME, 'tool', 'schedule_property_tour', {
        property_id,
        has_notes: Boolean(notes),
      });
      try {
        const result = await timeExternalCall(rl, 'tour_service', 'schedule_tour', () =>
          scheduleTour(
            tourRequestModel,
            mlsClient,
            {
              propertyId: property_id,
              requestedAt: new Date(requested_datetime),
              buyerEmail: buyer_email,
              notes,
            },
            progressToken === undefined
              ? undefined
              : (progress: ScheduleTourProgress) =>
                  // Only a client that supplied a progress token has something to correlate the notification with.
                  extra.sendNotification({
                    method: 'notifications/progress',
                    params: {
                      progressToken,
                      progress: progress.step,
                      total: progress.total,
                      message: progress.message,
                    },
                  }),
          ),
        );
        rl.finish('success', { already_scheduled: result.alreadyScheduled });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  tour_id: result.tourRequest.id,
                  property_id: result.tourRequest.propertyId,
                  requested_at: result.tourRequest.requestedAt,
                  buyer_email: result.tourRequest.buyerEmail,
                  already_scheduled: result.alreadyScheduled,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        if (error instanceof PropertyNotFoundError || error instanceof InvalidTourDatetimeError) {
          rl.log('error', 'warning', { error_class: errorClassName(error) });
          rl.finish('failure', { error_class: errorClassName(error) });
          return { content: [{ type: 'text', text: error.message }], isError: true };
        }
        rl.log('error', 'error', { error_class: errorClassName(error) });
        rl.finish('failure', { error_class: errorClassName(error) });
        throw error;
      }
    },
  );

  server.registerPrompt(
    'confirm-property-tour',
    {
      title: 'Confirm a property tour',
      description: "Draft a buyer-facing confirmation message for a scheduled property tour.",
      argsSchema: {
        property_id: z.string().describe('The toured property.'),
        requested_datetime: z.string().describe('The scheduled tour datetime, as given to schedule_property_tour.'),
      },
    },
    async ({ property_id, requested_datetime }) => {
      const rl = startInvocationLog(server, MCP_LOGGER_NAME, 'prompt', 'confirm-property-tour', {
        property_id,
      });
      try {
        const property = await timeExternalCall(rl, 'mls_client', 'get_property_feed', () =>
          getPropertyById(mlsClient, property_id),
        );
        rl.finish('success');
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text:
                  'Draft a short, friendly confirmation message for a buyer whose property tour is scheduled.\n\n' +
                  `Property: ${property.address}\n` +
                  `Price: $${property.listingPrice}\n` +
                  `Bedrooms/bathrooms: ${property.bedrooms}/${property.bathrooms}\n` +
                  `Requested tour time: ${requested_datetime}\n\n` +
                  'Confirm the details, mention that a Keysy agent will meet them there, and tell them what to do if they need to reschedule.',
              },
            },
          ],
        };
      } catch (error) {
        rl.log('error', 'warning', { error_class: errorClassName(error) });
        rl.finish('failure', { error_class: errorClassName(error) });
        throw error;
      }
    },
  );

  return server;
}
