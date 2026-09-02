import '../config/loadEnv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSequelize } from '../config/database';
import { initTourRequestModel } from '../models/TourRequest';
import { StubMlsClient } from '../services/mlsClient';
import { createKeysyMcpServer } from './keysyMcpServer';

async function main(): Promise<void> {
  const sequelize = createSequelize();
  const tourRequestModel = initTourRequestModel(sequelize);
  await sequelize.sync();

  // StubMlsClient is a placeholder, same as the HTTP backend -- replace with a real
  // MLS-backed MlsClient before this reflects real inventory.
  const mlsClient = new StubMlsClient();

  const server = createKeysyMcpServer({ mlsClient, tourRequestModel });
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error('Keysy MCP server failed to start:', error);
  process.exit(1);
});
