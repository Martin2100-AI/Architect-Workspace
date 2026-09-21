import { getAuthToken } from './authTokenStore';
import { MlsUnavailableError, PropertyNotFoundError } from './propertyService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 8000;

export class NotAuthenticatedError extends Error {
  constructor() {
    super('You need to be logged in to share a property.');
    this.name = 'NotAuthenticatedError';
  }
}

export class ShareValidationError extends Error {
  constructor() {
    super('Please enter a valid email address.');
    this.name = 'ShareValidationError';
  }
}

// Failure path: email does not send. Distinct from ShareValidationError -- the request
// was valid, the delivery itself failed, so the user should be told to try again rather
// than to fix a field.
export class ShareEmailFailedError extends Error {
  constructor() {
    super('We could not send that email right now. Please try again.');
    this.name = 'ShareEmailFailedError';
  }
}

export interface SharePropertyResult {
  shared: boolean;
  shareUrl: string;
}

/**
 * The same canonical link format the backend's ResendEmailSender builds (see
 * buildShareUrl in backend/src/services/propertyShareService.ts) -- built here too
 * since copy-link and share-via-text never call the backend at all.
 */
export function buildShareUrl(propertyId: string): string {
  return `${window.location.origin}/?property=${encodeURIComponent(propertyId)}`;
}

export async function sharePropertyByEmail(propertyId: string, recipientEmail: string): Promise<SharePropertyResult> {
  const token = getAuthToken();
  if (!token) {
    throw new NotAuthenticatedError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/share`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      // A fresh requestId per call -- see backend PropertyShareDetails: it's what lets a
      // network-level retry of this exact request be deduped, without blocking a genuine
      // second share (which calls this function again and gets a new id).
      body: JSON.stringify({ recipientEmail, requestId: crypto.randomUUID() }),
    });

    if (res.status === 401) {
      throw new NotAuthenticatedError();
    }
    if (res.status === 400) {
      throw new ShareValidationError();
    }
    if (res.status === 404) {
      throw new PropertyNotFoundError();
    }
    if (res.status === 503) {
      throw new MlsUnavailableError();
    }
    if (res.status === 502) {
      throw new ShareEmailFailedError();
    }
    if (!res.ok) {
      throw new Error(`Failed to share property (status ${res.status})`);
    }

    return (await res.json()) as SharePropertyResult;
  } finally {
    clearTimeout(timeout);
  }
}
