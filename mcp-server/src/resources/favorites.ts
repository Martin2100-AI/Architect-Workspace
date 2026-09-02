import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findProperty, stubFavoritesByBuyer } from '../data/stubListings';

// Read-only by construction: this handler only ever looks data up and
// returns it. It never writes to stubFavoritesByBuyer or anything else --
// that's what keeps it a resource rather than a tool in disguise.
export function registerFavoritesResource(server: McpServer): void {
  server.registerResource(
    'buyer-favorites',
    new ResourceTemplate('keysy://buyers/{buyer_id}/favorites', { list: undefined }),
    {
      title: 'Buyer favorites',
      description: "A buyer's saved list of favorited properties.",
      mimeType: 'application/json',
    },
    async (uri, { buyer_id }) => {
      const buyerId = Array.isArray(buyer_id) ? buyer_id[0] : buyer_id;
      const favoriteIds = stubFavoritesByBuyer[buyerId];
      if (!favoriteIds) {
        throw new Error(`No buyer found with id "${buyerId}"`);
      }
      const favorites = favoriteIds
        .map((id) => findProperty(id))
        .filter((property): property is NonNullable<typeof property> => property !== undefined);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ buyer_id: buyerId, favorites }, null, 2),
          },
        ],
      };
    },
  );
}
