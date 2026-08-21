export type PropertyType = 'single-family' | 'condo' | 'townhouse' | 'multi-family';

/**
 * Fields per REQ-002. Match score is intentionally omitted — that's STORY-004's
 * scope (Property Details and Match Score), not this story's. Favorite status is
 * also not here: it's a per-user overlay joined in later, not MLS-sourced data.
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
