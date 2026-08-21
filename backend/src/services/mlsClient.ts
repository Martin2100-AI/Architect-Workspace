import { Property } from '../types/property';

export class MlsUnavailableError extends Error {
  constructor(message = 'MLS API is unavailable') {
    super(message);
    this.name = 'MlsUnavailableError';
  }
}

export interface MlsClient {
  getPropertyFeed(): Promise<Property[]>;
}

/**
 * Placeholder client: returns a small fixed set of sample properties instead of
 * calling a real MLS API. This repo has no MLS provider credentials configured yet
 * (per CLAUDE.md's Tooling Assumptions) — swap this for a real MLS-backed MlsClient
 * before shipping the feed to real users.
 */
export class StubMlsClient implements MlsClient {
  async getPropertyFeed(): Promise<Property[]> {
    return [
      {
        id: 'stub-1',
        imageUrl: 'https://placehold.co/600x400?text=123+Maple+St',
        listingPrice: 425000,
        address: '123 Maple St, Springfield, IL',
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1850,
        propertyType: 'single-family',
        estimatedMonthlyPayment: 2650,
      },
      {
        id: 'stub-2',
        imageUrl: 'https://placehold.co/600x400?text=88+Birch+Ave',
        listingPrice: 310000,
        address: '88 Birch Ave, Springfield, IL',
        bedrooms: 2,
        bathrooms: 2,
        squareFootage: 1200,
        propertyType: 'condo',
        estimatedMonthlyPayment: 1980,
      },
      {
        id: 'stub-3',
        imageUrl: 'https://placehold.co/600x400?text=42+Cedar+Ln',
        listingPrice: 519000,
        address: '42 Cedar Ln, Springfield, IL',
        bedrooms: 4,
        bathrooms: 3,
        squareFootage: 2400,
        propertyType: 'townhouse',
        estimatedMonthlyPayment: 3120,
      },
    ];
  }
}
