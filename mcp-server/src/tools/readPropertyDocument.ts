import { readFile } from 'fs/promises';
import { join } from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { startInvocationLog } from '../mcpLogger';
import { findPropertyDocumentsDir } from '../data/propertyDocuments';
import { assertPathWithinDeclaredRoots, RootsAccessDeniedError } from '../security/pathRootsGuard';

const MCP_LOGGER_NAME = 'mcp-server';

function errorClassName(error: unknown): string {
  return error instanceof Error ? error.constructor.name : 'UnknownError';
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export const readPropertyDocumentInputShape = {
  property_id: z.string().describe('The property whose document to read, e.g. p-1.'),
  document_name: z
    .string()
    .describe("The document's file name within that property's folder, e.g. disclosure.txt."),
};

export function registerReadPropertyDocumentTool(server: McpServer): void {
  server.registerTool(
    'read_property_document',
    {
      title: 'Read a property document',
      description:
        "Read the text of a disclosure or inspection document on file for a specific property. " +
        'Call this when a buyer asks what a specific document says -- not for general property details.',
      inputSchema: readPropertyDocumentInputShape,
    },
    async ({ property_id, document_name }) => {
      const rl = startInvocationLog(server, MCP_LOGGER_NAME, 'tool', 'read_property_document', {
        property_id,
      });

      const documentsDir = findPropertyDocumentsDir(property_id);
      if (!documentsDir) {
        rl.finish('failure', { error_class: 'PropertyNotFoundError' });
        return { content: [{ type: 'text', text: `No property found with id "${property_id}".` }], isError: true };
      }

      // This join is deliberately naive -- document_name may contain "../" segments.
      // It is NOT the safety boundary. assertPathWithinDeclaredRoots below is: it
      // resolves this candidate to its real, canonical path and checks *that* against
      // the client's declared roots before anything is read.
      const candidatePath = join(documentsDir, document_name);

      try {
        const realPath = await assertPathWithinDeclaredRoots(server, candidatePath, (event) => {
          rl.log(event.eventName, 'warning', {
            requested_path: event.requestedPath,
            reason: event.reason,
          });
        });
        const text = await readFile(realPath, 'utf8');
        rl.finish('success');
        return { content: [{ type: 'text', text }] };
      } catch (error) {
        if (error instanceof RootsAccessDeniedError) {
          rl.finish('failure', { error_class: 'RootsAccessDeniedError' });
          return { content: [{ type: 'text', text: error.message }], isError: true };
        }
        if (isNotFoundError(error)) {
          rl.finish('failure', { error_class: 'DocumentNotFoundError' });
          return {
            content: [
              { type: 'text', text: `No document named "${document_name}" found for property "${property_id}".` },
            ],
            isError: true,
          };
        }
        rl.log('error', 'error', { error_class: errorClassName(error) });
        rl.finish('failure', { error_class: errorClassName(error) });
        throw error;
      }
    },
  );
}
