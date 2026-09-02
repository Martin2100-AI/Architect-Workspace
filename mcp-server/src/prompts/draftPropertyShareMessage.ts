import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { findProperty } from '../data/stubListings';

export function registerDraftPropertyShareMessagePrompt(server: McpServer): void {
  server.registerPrompt(
    'draft-property-share-message',
    {
      title: 'Draft a property share message',
      description: 'Draft a short, friendly message a buyer can send a friend or partner about a specific listing.',
      argsSchema: {
        property_id: z.string().describe('The property to share, e.g. p-1.'),
      },
    },
    async ({ property_id }) => {
      const property = findProperty(property_id);
      if (!property) {
        throw new Error(`No property found with id "${property_id}"`);
      }
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                'Draft a short, casual message a home buyer could text or email to a friend or partner, ' +
                'sharing this listing. Keep it under 3 sentences, friendly, no pressure.\n\n' +
                `Address: ${property.address}\n` +
                `Price: $${property.price.toLocaleString()}\n` +
                `Bedrooms/bathrooms: ${property.bedrooms}/${property.bathrooms}`,
            },
          },
        ],
      };
    },
  );
}
