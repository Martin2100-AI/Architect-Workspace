import { MlsClient } from './mlsClient';
import { getPropertyById, PropertyNotFoundError } from './propertyLookupService';
import { Property } from '../types/property';

const sampleProperty: Property = {
  id: 'stub-1',
  imageUrl: 'https://example.com/1.jpg',
  listingPrice: 425000,
  address: '123 Maple St, Springfield, IL',
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1850,
  propertyType: 'single-family',
  estimatedMonthlyPayment: 2650,
};

function fakeMlsClient(properties: Property[]): MlsClient {
  return { getPropertyFeed: async () => properties };
}

describe('getPropertyById', () => {
  it('returns the matching property', async () => {
    const property = await getPropertyById(fakeMlsClient([sampleProperty]), 'stub-1');
    expect(property).toEqual(sampleProperty);
  });

  it('throws PropertyNotFoundError for an unknown id', async () => {
    await expect(getPropertyById(fakeMlsClient([sampleProperty]), 'stub-999')).rejects.toThrow(
      PropertyNotFoundError,
    );
  });
});
