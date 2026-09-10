import { filterPropertiesInBounds, MapBounds } from './mapBounds';
import { Property } from '../types/property';

function makeProperty(overrides: Partial<Property>): Property {
  return {
    id: 'p1',
    imageUrl: 'https://example.com/photo.jpg',
    listingPrice: 400000,
    address: '1 Test St',
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1500,
    propertyType: 'single-family',
    estimatedMonthlyPayment: 2500,
    latitude: 30,
    longitude: -95,
    ...overrides,
  };
}

const houstonBounds: MapBounds = { north: 30.5, south: 29.5, east: -95, west: -96 };

describe('filterPropertiesInBounds', () => {
  it('includes a property whose coordinates fall inside the bounds', () => {
    const property = makeProperty({ id: 'inside', latitude: 30, longitude: -95.5 });

    expect(filterPropertiesInBounds([property], houstonBounds)).toEqual([property]);
  });

  it('excludes a property whose coordinates fall outside the bounds', () => {
    const property = makeProperty({ id: 'outside', latitude: 40, longitude: -74 });

    expect(filterPropertiesInBounds([property], houstonBounds)).toEqual([]);
  });

  it('includes a property exactly on the boundary edge', () => {
    const property = makeProperty({ id: 'edge', latitude: houstonBounds.north, longitude: houstonBounds.east });

    expect(filterPropertiesInBounds([property], houstonBounds)).toEqual([property]);
  });

  it('excludes a property missing latitude or longitude rather than guessing its position', () => {
    const noLat = makeProperty({ id: 'no-lat', latitude: null });
    const noLng = makeProperty({ id: 'no-lng', longitude: null });

    expect(filterPropertiesInBounds([noLat, noLng], houstonBounds)).toEqual([]);
  });

  it('returns an empty array when given no properties', () => {
    expect(filterPropertiesInBounds([], houstonBounds)).toEqual([]);
  });
});
