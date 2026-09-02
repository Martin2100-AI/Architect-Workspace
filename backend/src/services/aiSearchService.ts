import path from 'path';
import { AiClient } from './anthropicClient';
import { loadPromptTemplate } from './promptLoader';
import { Property } from '../types/property';

const PROMPTS_ROOT = path.resolve(__dirname, '../../../prompts');
const filterPrompt = loadPromptTemplate(path.join(PROMPTS_ROOT, 'ai-home-finder-filters', 'v1.1.0.md'));
const matchPrompt = loadPromptTemplate(path.join(PROMPTS_ROOT, 'match-explanation', 'v1.0.0.md'));

const MAX_PROPERTIES_TO_EXPLAIN = 10;

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

export interface MatchResult {
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  overallFit: 'full-match' | 'partial-match' | 'poor-match';
}

export interface SearchResultItem extends MatchResult {
  property: Property;
}

export interface SearchOutcome {
  filters: SearchFilters;
  results: SearchResultItem[];
}

export class AiResponseParseError extends Error {
  constructor(context: string) {
    super(`Could not parse a JSON object out of the AI's response (${context})`);
    this.name = 'AiResponseParseError';
  }
}

export async function extractSearchFilters(
  aiClient: AiClient,
  userQuery: string,
  activeFilters: Record<string, unknown>,
): Promise<SearchFilters> {
  const prompt = filterPrompt.fill({ userQuery, activeFilters });
  const raw = await aiClient.complete(prompt);
  const parsed = extractJsonObject(raw);
  if (!parsed) throw new AiResponseParseError('filter extraction');
  return parsed as unknown as SearchFilters;
}

export async function explainMatch(
  aiClient: AiClient,
  buyerFilters: SearchFilters,
  property: Property,
): Promise<MatchResult> {
  // city is echoed back from buyerFilters rather than re-derived from the
  // property's free-text address: filterProperties() already confirmed the
  // address contains the buyer's requested city (substring match) before this
  // is ever called, so treating it as satisfied here is consistent with that
  // decision rather than risking a contradictory "unmatched" from a second,
  // independent (and stricter, exact-match) city comparison.
  const propertyData = {
    city: buyerFilters.city,
    zipCode: null,
    price: property.listingPrice,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    propertyType: property.propertyType,
    features: property.features ?? [],
  };
  const prompt = matchPrompt.fill({ buyerFilters, propertyData });
  const raw = await aiClient.complete(prompt);
  const parsed = extractJsonObject(raw);
  if (!parsed) throw new AiResponseParseError('match explanation');
  return parsed as unknown as MatchResult;
}

/**
 * Deterministic pre-filter against the property feed, run before any (paid,
 * slower) match-explanation call is spent on a property that couldn't possibly
 * qualify. Property.address is one free-text string in the current stub data
 * (no separate city field), so city matching is a case-insensitive substring
 * check — a real MLS integration with structured address fields would do an
 * exact comparison instead.
 */
export function filterProperties(properties: Property[], filters: SearchFilters): Property[] {
  return properties.filter((property) => {
    if (filters.city && !property.address.toLowerCase().includes(filters.city.toLowerCase())) {
      return false;
    }
    if (filters.priceMin !== null && property.listingPrice < filters.priceMin) return false;
    if (filters.priceMax !== null && property.listingPrice > filters.priceMax) return false;
    if (filters.bedrooms !== null && property.bedrooms < filters.bedrooms) return false;
    if (filters.bathrooms !== null && property.bathrooms < filters.bathrooms) return false;
    if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
    const propertyFeatures = property.features ?? [];
    if (filters.features.some((feature) => !propertyFeatures.includes(feature))) return false;
    return true;
  });
}

export async function searchProperties(
  aiClient: AiClient,
  allProperties: Property[],
  userQuery: string,
  activeFilters: Record<string, unknown>,
): Promise<SearchOutcome> {
  const filters = await extractSearchFilters(aiClient, userQuery, activeFilters);

  if (filters.clarificationNeeded) {
    return { filters, results: [] };
  }

  const matched = filterProperties(allProperties, filters).slice(0, MAX_PROPERTIES_TO_EXPLAIN);

  const results = await Promise.all(
    matched.map(async (property) => {
      const matchResult = await explainMatch(aiClient, filters, property);
      return { property, ...matchResult };
    }),
  );

  return { filters, results };
}

// Mirrors scripts/score_prompt.py's extract_json_object: try a clean parse of
// the whole response first, then fall back to the first {...} slice, since the
// model is instructed to return only JSON but isn't guaranteed to.
function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // fall through to the brace-slice fallback below
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
