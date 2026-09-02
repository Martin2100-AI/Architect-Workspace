import { AiClient } from './anthropicClient';
import { explainMatch, extractSearchFilters, filterProperties, searchProperties, SearchFilters } from './aiSearchService';
import { Property } from '../types/property';

const springfieldHouse: Property = {
  id: 'stub-1',
  imageUrl: 'https://example.com/1.jpg',
  listingPrice: 425000,
  address: '123 Maple St, Springfield, IL',
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1850,
  propertyType: 'single-family',
  estimatedMonthlyPayment: 2650,
  features: ['pool', 'garage'],
};

const springfieldCondo: Property = {
  id: 'stub-2',
  imageUrl: 'https://example.com/2.jpg',
  listingPrice: 310000,
  address: '88 Birch Ave, Springfield, IL',
  bedrooms: 2,
  bathrooms: 2,
  squareFootage: 1200,
  propertyType: 'condo',
  estimatedMonthlyPayment: 1980,
  features: ['garage'],
};

function emptyFilters(overrides: Partial<SearchFilters> = {}): SearchFilters {
  return {
    city: null,
    zipCode: null,
    priceMin: null,
    priceMax: null,
    bedrooms: null,
    bathrooms: null,
    propertyType: null,
    features: [],
    assumptions: [],
    clarificationNeeded: null,
    ...overrides,
  };
}

function fakeAiClient(response: string): AiClient {
  return { complete: async () => response };
}

describe('filterProperties (deterministic, no AI call)', () => {
  const properties = [springfieldHouse, springfieldCondo];

  it('keeps only properties matching every set criterion', () => {
    const result = filterProperties(properties, emptyFilters({ bedrooms: 3, features: ['pool'] }));
    expect(result.map((p) => p.id)).toEqual(['stub-1']);
  });

  it('matches city as a case-insensitive substring of the free-text address', () => {
    const result = filterProperties(properties, emptyFilters({ city: 'springfield' }));
    expect(result.map((p) => p.id)).toEqual(['stub-1', 'stub-2']);
  });

  it('excludes a property missing a requested feature', () => {
    const result = filterProperties(properties, emptyFilters({ features: ['pool'] }));
    expect(result.map((p) => p.id)).toEqual(['stub-1']);
  });

  it('returns everything when no criteria are set', () => {
    const result = filterProperties(properties, emptyFilters());
    expect(result).toHaveLength(2);
  });
});

describe('extractSearchFilters', () => {
  it('parses the AI response into a SearchFilters object', async () => {
    const aiClient = fakeAiClient(
      JSON.stringify({
        city: 'Dallas',
        zipCode: null,
        priceMin: null,
        priceMax: 500000,
        bedrooms: 3,
        bathrooms: null,
        propertyType: null,
        features: ['pool'],
        assumptions: [],
        clarificationNeeded: null,
      }),
    );
    const filters = await extractSearchFilters(aiClient, '3 bedroom homes in Dallas under $500k with a pool', {});
    expect(filters.city).toBe('Dallas');
    expect(filters.priceMax).toBe(500000);
  });

  it('tolerates commentary around the JSON in the AI response', async () => {
    const aiClient = fakeAiClient(`Sure, here you go:\n${JSON.stringify(emptyFilters({ city: 'Austin' }))}\nHope that helps!`);
    const filters = await extractSearchFilters(aiClient, 'homes in Austin', {});
    expect(filters.city).toBe('Austin');
  });
});

describe('explainMatch', () => {
  it('parses the AI response into a MatchResult object', async () => {
    const aiClient = fakeAiClient(
      JSON.stringify({ matchedCriteria: ['city', 'bedrooms'], unmatchedCriteria: [], overallFit: 'full-match' }),
    );
    const result = await explainMatch(aiClient, emptyFilters({ city: 'Springfield', bedrooms: 3 }), springfieldHouse);
    expect(result.overallFit).toBe('full-match');
    expect(result.matchedCriteria).toEqual(['city', 'bedrooms']);
  });
});

describe('searchProperties (end-to-end orchestration with a fake AiClient)', () => {
  it('short-circuits with no results when the filter step asks for clarification', async () => {
    let callCount = 0;
    const aiClient: AiClient = {
      complete: async () => {
        callCount += 1;
        return JSON.stringify(emptyFilters({ clarificationNeeded: 'Which city, ZIP code, or neighborhood should this search cover?' }));
      },
    };

    const outcome = await searchProperties(aiClient, [springfieldHouse, springfieldCondo], '3 bedroom homes', {});

    expect(outcome.filters.clarificationNeeded).not.toBeNull();
    expect(outcome.results).toEqual([]);
    expect(callCount).toBe(1); // never calls the match-explanation step
  });

  it('filters then explains each matched property', async () => {
    const filterResponse = JSON.stringify(emptyFilters({ city: 'Springfield', bedrooms: 3 }));
    const matchResponse = JSON.stringify({ matchedCriteria: ['city', 'bedrooms'], unmatchedCriteria: [], overallFit: 'full-match' });
    let callCount = 0;
    const aiClient: AiClient = {
      complete: async () => {
        callCount += 1;
        return callCount === 1 ? filterResponse : matchResponse;
      },
    };

    const outcome = await searchProperties(aiClient, [springfieldHouse, springfieldCondo], '3 bedroom homes in Springfield', {});

    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0].property.id).toBe('stub-1');
    expect(outcome.results[0].overallFit).toBe('full-match');
  });
});
