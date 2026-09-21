/**
 * The one canonical shareable-link format, used both by the email sent here and by
 * the frontend's own copy-link/share-via-text actions (which build the same URL
 * client-side, since those never call the backend) -- see App.tsx's getSharedPropertyIdFromUrl.
 */
export function buildShareUrl(appBaseUrl: string, propertyId: string): string {
  return `${appBaseUrl}/?property=${encodeURIComponent(propertyId)}`;
}
