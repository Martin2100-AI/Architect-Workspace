import { Property } from '../types/property';

/**
 * Deterministic single-field property lookup — runs entirely in the browser over the
 * already-loaded feed, so it works instantly and never depends on the AI search backend.
 *
 * Matching rules (a single number vs. a "low-high" range):
 * - zip:       exact 5-digit match against the ZIP at the end of the address
 * - city:      case-insensitive match from the start of any word in the city name
 *              ("katy" -> Katy, "woodlands" -> The Woodlands, "hou" -> Houston)
 * - bedrooms / bathrooms / sqft:  single number = "at least"; range = between (inclusive)
 * - price / monthly:              single number = "at most" (a budget); range = between
 */
export type LookupField = 'zip' | 'city' | 'sqft' | 'monthly' | 'bedrooms' | 'bathrooms' | 'price';

export const LOOKUP_FIELDS: { value: LookupField; label: string; placeholder: string }[] = [
  { value: 'zip', label: 'Zip code', placeholder: 'e.g. 77018' },
  { value: 'city', label: 'City', placeholder: 'e.g. Houston or Katy' },
  { value: 'price', label: 'Price (max)', placeholder: 'e.g. 450000, 450k, or 300k-500k' },
  { value: 'monthly', label: 'Monthly payment (max)', placeholder: 'e.g. 2500 or 2000-3000' },
  { value: 'bedrooms', label: 'Bedrooms (min)', placeholder: 'e.g. 3 or 3-4' },
  { value: 'bathrooms', label: 'Bathrooms (min)', placeholder: 'e.g. 2 or 2-3' },
  { value: 'sqft', label: 'Square feet (min)', placeholder: 'e.g. 1500 or 1500-2500' },
];

export type LookupResult =
  | { ok: true; properties: Property[]; description: string }
  | { ok: false; error: string };

interface Range {
  min: number | null;
  max: number | null;
}

const ZIP_PATTERN = /^\d{5}$/;
const ADDRESS_ZIP_PATTERN = /(\d{5})(?:-\d{4})?\s*$/;

/** Parses "450000", "$450,000", "450k", "1.2m" into a number; null when not a number. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase().replace(/[$,\s]/g, '');
  const match = /^(\d+(?:\.\d+)?)([km])?$/.exec(cleaned);
  if (!match) return null;
  const multiplier = match[2] === 'k' ? 1_000 : match[2] === 'm' ? 1_000_000 : 1;
  return Number(match[1]) * multiplier;
}

/** A single number or a "low-high" range; null when the input can't be read. */
function parseRange(raw: string, singleMeans: 'min' | 'max'): Range | null {
  const parts = raw.split(/\s*(?:-|–|to)\s*/i).filter((p) => p !== '');
  if (parts.length === 1) {
    const value = parseAmount(parts[0]);
    if (value === null) return null;
    return singleMeans === 'min' ? { min: value, max: null } : { min: null, max: value };
  }
  if (parts.length === 2) {
    const low = parseAmount(parts[0]);
    const high = parseAmount(parts[1]);
    if (low === null || high === null) return null;
    return { min: Math.min(low, high), max: Math.max(low, high) };
  }
  return null;
}

function inRange(value: number, range: Range): boolean {
  return (range.min === null || value >= range.min) && (range.max === null || value <= range.max);
}

export function zipOf(address: string): string | null {
  const match = ADDRESS_ZIP_PATTERN.exec(address);
  return match ? match[1] : null;
}

/** Addresses are "street, City, State ZIP" — the city is the second-to-last comma part. */
export function cityOf(address: string): string | null {
  const parts = address.split(',').map((p) => p.trim());
  return parts.length >= 3 ? parts[parts.length - 2] : null;
}

function cityMatches(city: string, query: string): boolean {
  const words = city.toLowerCase().split(/\s+/);
  const q = query.toLowerCase().replace(/\s+/g, ' ');
  return words.some((_, i) => words.slice(i).join(' ').startsWith(q));
}

function describeRange(range: Range, unit: (n: number) => string): string {
  if (range.min !== null && range.max !== null) return `${unit(range.min)} – ${unit(range.max)}`;
  if (range.min !== null) return `${unit(range.min)} or more`;
  return `up to ${unit(range.max as number)}`;
}

const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const plain = (n: number) => n.toLocaleString('en-US');

const NUMERIC_FIELDS: Record<
  Exclude<LookupField, 'zip' | 'city'>,
  { valueOf: (p: Property) => number; singleMeans: 'min' | 'max'; unit: (n: number) => string; noun: string }
> = {
  price: { valueOf: (p) => p.listingPrice, singleMeans: 'max', unit: dollars, noun: 'price' },
  monthly: { valueOf: (p) => p.estimatedMonthlyPayment, singleMeans: 'max', unit: (n) => `${dollars(n)}/mo`, noun: 'est. monthly payment' },
  bedrooms: { valueOf: (p) => p.bedrooms, singleMeans: 'min', unit: plain, noun: 'bedrooms' },
  bathrooms: { valueOf: (p) => p.bathrooms, singleMeans: 'min', unit: plain, noun: 'bathrooms' },
  sqft: { valueOf: (p) => p.squareFootage, singleMeans: 'min', unit: (n) => `${plain(n)} sq ft`, noun: 'size' },
};

export function lookupProperties(properties: Property[], field: LookupField, rawValue: string): LookupResult {
  const value = rawValue.trim();
  if (!value) return { ok: false, error: 'Enter a value to search for.' };

  if (field === 'zip') {
    if (!ZIP_PATTERN.test(value)) return { ok: false, error: 'Enter a 5-digit zip code, e.g. 77018.' };
    return {
      ok: true,
      properties: properties.filter((p) => zipOf(p.address) === value),
      description: `zip code ${value}`,
    };
  }

  if (field === 'city') {
    if (!/[a-z]/i.test(value)) return { ok: false, error: 'Enter a city name, e.g. Houston.' };
    return {
      ok: true,
      properties: properties.filter((p) => {
        const city = cityOf(p.address);
        return city !== null && cityMatches(city, value);
      }),
      description: `city "${value}"`,
    };
  }

  const spec = NUMERIC_FIELDS[field];
  const range = parseRange(value, spec.singleMeans);
  if (!range) {
    return { ok: false, error: 'Enter a number (e.g. 3 or 450k) or a range (e.g. 300k-500k).' };
  }
  return {
    ok: true,
    properties: properties.filter((p) => inRange(spec.valueOf(p), range)),
    description: `${spec.noun} ${describeRange(range, spec.unit)}`,
  };
}
