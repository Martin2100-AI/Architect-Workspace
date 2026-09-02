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
  /**
   * Optional, and absent from most of the MLS feed today — StubMlsClient sets it
   * on a few sample properties so the AI search feature (prompts/match-explanation)
   * has something to check feature-based criteria against. A real MLS integration
   * would need to populate this from real listing data before feature filters mean
   * anything beyond the stub dataset.
   */
  features?: string[];
}
