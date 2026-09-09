import { Property, PropertyType } from '../types/property';
import { estimateMonthlyPayment } from './mortgageEstimate';

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
        features: ['pool', 'garage', 'no-hoa'],
        yearBuilt: 2005,
        lotSize: '60X120',
        hoaFeeMonthly: null,
        propertyTaxesAnnual: 5800,
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
        features: ['garage'],
        yearBuilt: 1998,
        lotSize: null,
        hoaFeeMonthly: 250,
        propertyTaxesAnnual: 3900,
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
        features: ['fireplace', 'backyard', 'no-hoa'],
        yearBuilt: 2015,
        lotSize: '80X140',
        hoaFeeMonthly: null,
        propertyTaxesAnnual: 7200,
      },
    ];
  }
}

const SIMPLYRETS_TIMEOUT_MS = 10000;
const SIMPLYRETS_MAX_ATTEMPTS = 2;

/**
 * Shape of one listing from SimplyRETS's /properties endpoint — only the fields this
 * client actually reads. Untyped fields (agent, tax, school, etc.) are intentionally
 * omitted rather than modeled, since nothing here uses them.
 */
interface SimplyRetsListing {
  mlsId: number;
  address?: {
    full?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  } | null;
  listPrice?: number | null;
  photos?: string[] | null;
  property?: {
    type?: string | null;
    subType?: string | null;
    bedrooms?: number | null;
    bathsFull?: number | null;
    bathsHalf?: number | null;
    area?: number | null;
    pool?: string | null;
    fireplaces?: number | null;
    parking?: { spaces?: number | null } | null;
    yearBuilt?: number | null;
    lotSize?: string | null;
  } | null;
  association?: { fee?: number | null } | null;
  tax?: { taxAnnualAmount?: number | null } | null;
}

function mapPropertyType(subType: string | null | undefined): PropertyType {
  // SimplyRETS's fixed demo dataset never contains a multi-family subtype at all —
  // 'multi-family' is a real value in our own PropertyType, just never produced here.
  switch (subType) {
    case 'Condominium':
      return 'condo';
    case 'Townhouse':
      return 'townhouse';
    case 'SingleFamilyResidence':
      return 'single-family';
    default:
      return 'single-family';
  }
}

function deriveFeatures(listing: SimplyRetsListing): string[] {
  const features: string[] = [];
  if (listing.property?.pool) features.push('pool');
  if ((listing.property?.parking?.spaces ?? 0) > 0) features.push('garage');
  if ((listing.property?.fireplaces ?? 0) > 0) features.push('fireplace');
  if (!listing.association?.fee) features.push('no-hoa');
  return features;
}

/**
 * SimplyRETS's `address.full` is street-only ("74434 East Sweet Bottom Br #18393")
 * — city/state/postalCode are separate fields. Our Property.address is a single
 * free-text string (aiSearchService's city search does a substring match against
 * it), so city must be folded in here or every city search would silently return
 * zero results despite the filter logic itself being correct.
 */
function buildFullAddress(address: NonNullable<SimplyRetsListing['address']>): string | null {
  if (!address.full) return null;
  const cityStateZip = [address.city, [address.state, address.postalCode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return cityStateZip ? `${address.full}, ${cityStateZip}` : address.full;
}

/**
 * Maps one raw SimplyRETS listing into our Property contract. Returns null (rather
 * than throwing) for a listing missing a field our Property type requires as
 * non-optional — this is untrusted external data, so a single malformed listing
 * should be dropped from the feed, not take the whole request down.
 */
function mapListingToProperty(listing: SimplyRetsListing): Property | null {
  const address = listing.address ? buildFullAddress(listing.address) : null;
  const listingPrice = listing.listPrice;
  const bedrooms = listing.property?.bedrooms;
  const area = listing.property?.area;

  if (!address || !listingPrice || bedrooms == null || !area) {
    return null;
  }

  const bathsFull = listing.property?.bathsFull ?? 0;
  const bathsHalf = listing.property?.bathsHalf ?? 0;

  return {
    id: String(listing.mlsId),
    imageUrl: listing.photos?.[0] || 'https://placehold.co/600x400?text=No+Photo+Available',
    listingPrice,
    address,
    bedrooms,
    bathrooms: bathsFull + bathsHalf * 0.5,
    squareFootage: area,
    propertyType: mapPropertyType(listing.property?.subType),
    estimatedMonthlyPayment: estimateMonthlyPayment(listingPrice),
    features: deriveFeatures(listing),
    yearBuilt: listing.property?.yearBuilt ?? null,
    lotSize: listing.property?.lotSize ?? null,
    hoaFeeMonthly: listing.association?.fee ?? null,
    propertyTaxesAnnual: listing.tax?.taxAnnualAmount ?? null,
  };
}

/**
 * Real MLS integration against SimplyRETS's public developer demo API — a fixed,
 * realistic-looking listing dataset purpose-built for exactly this kind of
 * integration testing (see https://docs.simplyrets.com). The demo credentials
 * ('simplyrets'/'simplyrets') are publicly documented by SimplyRETS itself for
 * anyone to use without signing up, so defaulting to them here (below, in env.ts)
 * is not a hardcoded secret — swap SIMPLYRETS_USERNAME/PASSWORD/BASE_URL env vars
 * to point at a real paid account later with no code change. This is real
 * production-shaped MLS data flow (a real HTTP call, real auth, real failure
 * modes) — the underlying listings themselves are SimplyRETS's fixed demo set,
 * not live real-world inventory, which is disclosed everywhere this is described.
 */
export class SimplyRetsMlsClient implements MlsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly username: string,
    private readonly password: string,
  ) {}

  async getPropertyFeed(): Promise<Property[]> {
    const authHeader = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;

    let lastError: unknown;
    for (let attempt = 1; attempt <= SIMPLYRETS_MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SIMPLYRETS_TIMEOUT_MS);

      try {
        const res = await fetch(`${this.baseUrl}/properties?limit=50`, {
          signal: controller.signal,
          headers: { Authorization: authHeader },
        });

        if (!res.ok) {
          throw new Error(`SimplyRETS responded with status ${res.status}`);
        }

        const body = (await res.json()) as SimplyRetsListing[];

        return body
          .filter((listing) => listing.property?.type !== 'RNT') // exclude rentals — this is a buying app
          .map(mapListingToProperty)
          .filter((property): property is Property => property !== null);
      } catch (err) {
        lastError = err;
      } finally {
        clearTimeout(timeout);
      }
    }

    const errorClass = lastError instanceof Error ? lastError.constructor.name : 'UnknownError';
    console.error(JSON.stringify({ level: 'error', event: 'simplyrets_call_failed', error_class: errorClass }));
    throw new MlsUnavailableError();
  }
}
