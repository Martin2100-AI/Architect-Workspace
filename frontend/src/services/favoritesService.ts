import { getAuthToken } from './authTokenStore';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 8000;

export class NotAuthenticatedError extends Error {
  constructor() {
    super('You need to be logged in to save a property.');
    this.name = 'NotAuthenticatedError';
  }
}

export async function fetchFavoritePropertyIds(): Promise<string[]> {
  const token = getAuthToken();
  if (!token) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/favorites`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return [];

    const body = await res.json();
    return body.propertyIds as string[];
  } catch {
    // Favorites are a non-critical overlay on the feed — if this call fails, the feed
    // still renders, just with nothing shown as pre-saved.
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function saveFavorite(propertyId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new NotAuthenticatedError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/favorites/${encodeURIComponent(propertyId)}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      throw new NotAuthenticatedError();
    }
    if (!res.ok) {
      throw new Error(`Failed to save property (status ${res.status})`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
