import { getAuthToken } from './authTokenStore';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 8000;

// Must match backend/src/models/BuyerProfile.ts's BUYER_PROFILE_PROPERTY_TYPES exactly;
// there is no shared package between frontend/backend in this repo, so this is kept in
// sync by hand (same convention as FAVORITE_CATEGORIES in favoritesService.ts).
export const BUYER_PROFILE_PROPERTY_TYPES = ['single-family', 'condo', 'townhouse', 'multi-family'] as const;
export type BuyerProfilePropertyType = (typeof BUYER_PROFILE_PROPERTY_TYPES)[number];

export interface BuyerProfileInput {
  preferredLocations: string[];
  minPrice: number;
  maxPrice: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: BuyerProfilePropertyType;
  downPayment: number;
  desiredFeatures: string[];
}

export interface BuyerProfileRecord extends BuyerProfileInput {
  userId: number;
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super('You need to be logged in to create a buyer profile.');
    this.name = 'NotAuthenticatedError';
  }
}

export class BuyerProfileValidationError extends Error {
  constructor() {
    super('Please check the highlighted fields and try again.');
    this.name = 'BuyerProfileValidationError';
  }
}

export async function createBuyerProfile(input: BuyerProfileInput): Promise<BuyerProfileRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new NotAuthenticatedError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (res.status === 401) {
      throw new NotAuthenticatedError();
    }
    if (res.status === 400) {
      throw new BuyerProfileValidationError();
    }
    if (!res.ok) {
      throw new Error(`Failed to create buyer profile (status ${res.status})`);
    }

    const body = await res.json();
    return body.profile as BuyerProfileRecord;
  } finally {
    clearTimeout(timeout);
  }
}
