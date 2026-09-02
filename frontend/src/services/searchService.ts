import { Property } from '../types/property';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
// AI search does two round-trip calls to Claude server-side (filter extraction,
// then match explanation per result), so it's slower than a plain feed fetch —
// give it more room than propertyService's 8s before treating it as hung.
const REQUEST_TIMEOUT_MS = 20000;

export class AiSearchNotConfiguredError extends Error {
  constructor() {
    super('AI search is not set up on this server yet.');
    this.name = 'AiSearchNotConfiguredError';
  }
}

export class AiSearchUnavailableError extends Error {
  constructor() {
    super('AI search is temporarily unavailable. Please try again.');
    this.name = 'AiSearchUnavailableError';
  }
}

export interface SearchFilters {
  city: string | null;
  zipCode: string | null;
  priceMin: number | null;
  priceMax: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  features: string[];
  assumptions: string[];
  clarificationNeeded: string | null;
}

export interface SearchResultItem {
  property: Property;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  overallFit: 'full-match' | 'partial-match' | 'poor-match';
}

export interface SearchResponse {
  filters: SearchFilters;
  results: SearchResultItem[];
}

export async function searchProperties(
  userQuery: string,
  activeFilters: Record<string, unknown> = {},
): Promise<SearchResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ userQuery, activeFilters }),
    });

    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      if (body.error === 'AiSearchNotConfigured') throw new AiSearchNotConfiguredError();
      throw new AiSearchUnavailableError();
    }
    if (!res.ok) {
      throw new Error(`AI search failed (status ${res.status})`);
    }
    return (await res.json()) as SearchResponse;
  } finally {
    clearTimeout(timeout);
  }
}
