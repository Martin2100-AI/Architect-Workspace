import { join } from 'path';

// Sibling to src/, not inside it -- these are real files on disk this tool reads, not
// TypeScript stub data, so they live outside tsconfig's rootDir.
export const PROPERTY_DOCUMENTS_ROOT = join(__dirname, '..', '..', 'property-documents');

const knownPropertyIds = new Set(['p-1', 'p-2', 'p-3']);

export function findPropertyDocumentsDir(propertyId: string): string | undefined {
  if (!knownPropertyIds.has(propertyId)) {
    return undefined;
  }
  return join(PROPERTY_DOCUMENTS_ROOT, propertyId);
}
