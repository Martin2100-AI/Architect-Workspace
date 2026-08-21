export type PropertyType = 'single-family' | 'condo' | 'townhouse' | 'multi-family';

/**
 * Mirrors backend/src/types/property.ts. Duplicated rather than shared across a
 * frontend/backend boundary with no shared package — keep the two in sync by hand
 * until a shared-types package exists.
 */
export interface Property {
  id: string;
  imageUrl: string;
  listingPrice: number;
  address: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: PropertyType;
  estimatedMonthlyPayment: number;
}
