import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCalculateAffordabilityTool } from './tools/calculateAffordability';
import { registerReadPropertyDocumentTool } from './tools/readPropertyDocument';
import { registerFavoritesResource } from './resources/favorites';
import { registerDraftPropertyShareMessagePrompt } from './prompts/draftPropertyShareMessage';

// capabilities.logging must be declared here -- omit it and sendLoggingMessage
// calls throughout src/ silently no-op, with no error to signal the mistake.
const server = new McpServer({ name: 'mcp-server', version: '0.1.0' }, { capabilities: { logging: {} } });

registerCalculateAffordabilityTool(server);
registerReadPropertyDocumentTool(server);
registerFavoritesResource(server);
registerDraftPropertyShareMessagePrompt(server);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  // stdout is reserved for the server's protocol messages -- writing this
  // to stderr instead is what keeps it visible in the terminal without
  // corrupting that channel.
  console.error('mcp-server is running and waiting for a client to connect. Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('mcp-server failed to start:', error);
  process.exit(1);
});
