import { MlsUnavailableError, SimplyRetsMlsClient } from './mlsClient';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

const singleFamilyListing = {
  mlsId: 1005192,
  // Real shape: `full` is street-only, city/state are separate fields — see the
  // 'folds city into the address' regression test below for why this matters.
  address: { full: '74434 East Sweet Bottom Br #18393', city: 'Houston', state: 'Texas', postalCode: '77096' },
  listPrice: 420000,
  photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
  property: {
    type: 'RES',
    subType: 'SingleFamilyResidence',
    bedrooms: 3,
    bathsFull: 2,
    bathsHalf: 1,
    area: 1850,
    pool: 'Association,Private,In Ground',
    fireplaces: 1,
    parking: { spaces: 2 },
    yearBuilt: 1998,
    lotSize: '127X146',
  },
  association: { fee: 1000 },
  tax: { taxAnnualAmount: 3180 },
};

const rentalListing = {
  mlsId: 9999999,
  address: { full: '1 Rental Rd' },
  listPrice: 2000,
  photos: [],
  property: { type: 'RNT', subType: null, bedrooms: 2, bathsFull: 1, bathsHalf: 0, area: 900 },
};

const malformedListing = {
  mlsId: 111,
  address: null, // missing required field
  listPrice: 300000,
  photos: [],
  property: { type: 'RES', subType: 'Condominium', bedrooms: 2, bathsFull: 1, bathsHalf: 0, area: 800 },
};

describe('SimplyRetsMlsClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps a real-shaped SimplyRETS listing into our Property contract', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse([singleFamilyListing]));
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'simplyrets', 'simplyrets');

    const properties = await client.getPropertyFeed();

    expect(properties).toEqual([
      {
        id: '1005192',
        imageUrl: 'https://example.com/photo1.jpg',
        listingPrice: 420000,
        address: '74434 East Sweet Bottom Br #18393, Houston, Texas 77096',
        bedrooms: 3,
        bathrooms: 2.5,
        squareFootage: 1850,
        propertyType: 'single-family',
        estimatedMonthlyPayment: expect.any(Number),
        features: expect.arrayContaining(['pool', 'garage', 'fireplace']),
        yearBuilt: 1998,
        lotSize: '127X146',
        hoaFeeMonthly: 1000,
        propertyTaxesAnnual: 3180,
      },
    ]);
  });

  it('maps a listing missing year built, lot size, HOA fee, and taxes to null rather than fabricating a value', async () => {
    const sparseListing = {
      ...singleFamilyListing,
      property: { ...singleFamilyListing.property, yearBuilt: null, lotSize: null },
      association: undefined,
      tax: undefined,
    };
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse([sparseListing]));
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'simplyrets', 'simplyrets');

    const properties = await client.getPropertyFeed();

    expect(properties[0].yearBuilt).toBeNull();
    expect(properties[0].lotSize).toBeNull();
    expect(properties[0].hoaFeeMonthly).toBeNull();
    expect(properties[0].propertyTaxesAnnual).toBeNull();
  });

  it('folds the city into the address string, since address.full alone is street-only', async () => {
    // Regression: a live end-to-end run found city search returning zero results,
    // because SimplyRETS's address.full never includes the city — only city search
    // (aiSearchService's filterProperties, a substring match against this string)
    // was affected; this proves the mapped address actually contains it now.
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse([singleFamilyListing]));
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'simplyrets', 'simplyrets');

    const properties = await client.getPropertyFeed();

    expect(properties[0].address.toLowerCase()).toContain('houston');
  });

  it('excludes rental listings from the feed', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse([singleFamilyListing, rentalListing]));
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'simplyrets', 'simplyrets');

    const properties = await client.getPropertyFeed();

    expect(properties).toHaveLength(1);
    expect(properties[0].id).toBe('1005192');
  });

  it('drops a listing missing a required field instead of throwing', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse([singleFamilyListing, malformedListing]));
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'simplyrets', 'simplyrets');

    const properties = await client.getPropertyFeed();

    expect(properties).toHaveLength(1);
  });

  it('falls back to a placeholder image when a listing has no photos', async () => {
    const noPhotoListing = { ...singleFamilyListing, photos: [] };
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse([noPhotoListing]));
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'simplyrets', 'simplyrets');

    const properties = await client.getPropertyFeed();

    expect(properties[0].imageUrl).toContain('placehold.co');
  });

  it('sends HTTP Basic auth built from the given credentials', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse([]));
    global.fetch = fetchMock;
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'myuser', 'mypass');

    await client.getPropertyFeed();

    const [, options] = fetchMock.mock.calls[0];
    const expectedAuth = `Basic ${Buffer.from('myuser:mypass').toString('base64')}`;
    expect(options.headers.Authorization).toBe(expectedAuth);
  });

  it('throws MlsUnavailableError after retrying once on a non-ok response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'unauthorized' }, false, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'unauthorized' }, false, 401));
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'wrong', 'wrong');

    await expect(client.getPropertyFeed()).rejects.toThrow(MlsUnavailableError);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws MlsUnavailableError after retrying once on a network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'simplyrets', 'simplyrets');

    await expect(client.getPropertyFeed()).rejects.toThrow(MlsUnavailableError);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('succeeds on the second attempt after one transient failure', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient blip'))
      .mockResolvedValueOnce(jsonResponse([singleFamilyListing]));
    const client = new SimplyRetsMlsClient('https://api.simplyrets.com', 'simplyrets', 'simplyrets');

    const properties = await client.getPropertyFeed();

    expect(properties).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
