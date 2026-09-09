import { getAuthToken } from './authTokenStore';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 8000;

// REQ-004's literal fixed list (STORY-005) — must match backend/src/models/Favorite.ts's
// FAVORITE_CATEGORIES exactly; there is no shared package between frontend/backend in
// this repo, so this is kept in sync by hand.
export const FAVORITE_CATEGORIES = ['favorites', 'maybe', 'want-to-tour', 'offer-candidates'] as const;
export type FavoriteCategory = (typeof FAVORITE_CATEGORIES)[number];

export interface FavoriteRecord {
  propertyId: string;
  category: FavoriteCategory;
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super('You need to be logged in to save a property.');
    this.name = 'NotAuthenticatedError';
  }
}

// Throws on failure, same as every other function in this file — callers decide how
// to handle that. (Loading an empty array on a real failure would make "the fetch
// failed" indistinguishable from "you have no favorites," which the dedicated Saved
// Homes view needs to tell apart to satisfy STORY-005's "retrieved accurately"
// acceptance criterion.)
export async function fetchFavorites(): Promise<FavoriteRecord[]> {
  const token = getAuthToken();
  if (!token) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/favorites`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to load favorites (status ${res.status})`);
    }

    const body = await res.json();
    return body.favorites as FavoriteRecord[];
  } finally {
    clearTimeout(timeout);
  }
}

// Kept for the existing plain heart-toggle callers, which only ever need "is this
// property saved anywhere" — not which category. A property saved to two categories
// only produces one id here, since Set(...) on the caller side already dedupes.
// Unlike fetchFavorites() itself, this one still swallows failures to an empty array:
// it backs a non-critical overlay on the main feed, which must keep rendering even if
// this check fails, exactly the behavior this repo already had and tested for it.
export async function fetchFavoritePropertyIds(): Promise<string[]> {
  try {
    const favorites = await fetchFavorites();
    return favorites.map((favorite) => favorite.propertyId);
  } catch {
    return [];
  }
}

export async function saveFavorite(propertyId: string, category?: FavoriteCategory): Promise<void> {
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
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(category ? { category } : {}),
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

export async function removeFavorite(propertyId: string, category: FavoriteCategory): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new NotAuthenticatedError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/favorites/${encodeURIComponent(propertyId)}`, {
      method: 'DELETE',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });

    if (res.status === 401) {
      throw new NotAuthenticatedError();
    }
    if (!res.ok) {
      throw new Error(`Failed to remove property (status ${res.status})`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
