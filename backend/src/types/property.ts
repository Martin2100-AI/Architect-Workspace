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
  /** Added for STORY-006 (Property Comparison, REQ-011). All optional/nullable —
   * real SimplyRETS listings can genuinely lack any of these, and this must stay
   * honest about that rather than fabricate a value. */
  yearBuilt?: number | null;
  /** Raw dimension text from the MLS (e.g. "127X146"), not a computed area — SimplyRETS
   * does not provide lot size as a clean number, so this stays a display string rather
   * than pretending to be numeric. */
  lotSize?: string | null;
  hoaFeeMonthly?: number | null;
  propertyTaxesAnnual?: number | null;
  /** Added for STORY-007 (Interactive Map Exploration, REQ-008/REQ-016). Nullable —
   * SimplyRETS's `geo` block is not guaranteed present on every listing, and a
   * property missing coordinates is simply not placed on the map rather than
   * plotted at a fabricated location. */
  latitude?: number | null;
  longitude?: number | null;
}
