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
  /** Optional — only set on properties the backend's stub MLS client seeded with feature data. */
  features?: string[];
  /** Added for STORY-006 (Property Comparison, REQ-011). All optional/nullable — real
   * MLS listings can genuinely lack any of these; never fabricate a value for one. */
  yearBuilt?: number | null;
  /** Raw dimension text from the MLS (e.g. "127X146"), not a computed area. */
  lotSize?: string | null;
  hoaFeeMonthly?: number | null;
  propertyTaxesAnnual?: number | null;
  /** Added for STORY-007 (Interactive Map Exploration, REQ-008/REQ-016). Nullable —
   * a property missing coordinates is simply not placed on the map. */
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * A property's AI-computed match against a buyer's stated search preferences —
 * produced by STORY-003's search (backend match-explanation prompt), reused
 * as-is here rather than a separate scoring system. Only exists in the context
 * of an active search; a property viewed outside of one has no MatchInfo.
 */
export interface MatchInfo {
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  overallFit: 'full-match' | 'partial-match' | 'poor-match';
}
