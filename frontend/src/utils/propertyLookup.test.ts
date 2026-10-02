import { cityOf, lookupProperties, parseAmount, zipOf } from './propertyLookup';
import { Property } from '../types/property';

function makeProperty(overrides: Partial<Property>): Property {
  return {
    id: 'p',
    imageUrl: '',
    listingPrice: 400000,
    address: '1 Main St, Houston, Texas 77018',
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1500,
    propertyType: 'single-family',
    estimatedMonthlyPayment: 2500,
    ...overrides,
  };
}

const small = makeProperty({ id: 'small', listingPrice: 250000, bedrooms: 2, bathrooms: 1, squareFootage: 900, estimatedMonthlyPayment: 1600, address: '9 Elm St, Houston, Texas 77002' });
const mid = makeProperty({ id: 'mid' });
const big = makeProperty({ id: 'big', listingPrice: 900000, bedrooms: 5, bathrooms: 4, squareFootage: 3800, estimatedMonthlyPayment: 5600, address: '5 Oak Dr, Houston, Texas 77018-1234' });
const all = [small, mid, big];

const ids = (field: Parameters<typeof lookupProperties>[1], value: string) => {
  const result = lookupProperties(all, field, value);
  if (!result.ok) throw new Error(result.error);
  return result.properties.map((p) => p.id);
};

describe('parseAmount', () => {
  it.each([
    ['450000', 450000],
    ['$450,000', 450000],
    ['450k', 450000],
    ['1.2m', 1200000],
    [' 3 ', 3],
  ])('reads %p as %p', (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected);
  });

  it.each(['', 'abc', '12x', '-5'])('rejects %p', (raw) => {
    expect(parseAmount(raw)).toBeNull();
  });
});

describe('zipOf', () => {
  it('reads a plain and a ZIP+4 zip from the end of the address', () => {
    expect(zipOf('1 Main St, Houston, Texas 77018')).toBe('77018');
    expect(zipOf('5 Oak Dr, Houston, Texas 77018-1234')).toBe('77018');
  });

  it('returns null when the address has no zip', () => {
    expect(zipOf('1 Test St')).toBeNull();
  });
});

describe('cityOf', () => {
  it('reads the city from "street, City, State ZIP", including multi-word cities', () => {
    expect(cityOf('1 Main St, Houston, Texas 77018')).toBe('Houston');
    expect(cityOf('2 Pine Rd #4, The Woodlands, Texas 77382')).toBe('The Woodlands');
  });

  it('returns null when the address has no city part', () => {
    expect(cityOf('1 Test St')).toBeNull();
  });
});

describe('city lookup', () => {
  const woodlands = makeProperty({ id: 'woodlands', address: '2 Pine Rd, The Woodlands, Texas 77382' });
  const oakRidge = makeProperty({ id: 'oak', address: '3 Elm Ct, Oak Ridge, Texas 77379' });
  const cityIds = (value: string) => {
    const result = lookupProperties([...all, woodlands, oakRidge], 'city', value);
    if (!result.ok) throw new Error(result.error);
    return result.properties.map((p) => p.id);
  };

  it('matches case-insensitively from the start of any word in the city', () => {
    expect(cityIds('houston')).toEqual(['small', 'mid', 'big']);
    expect(cityIds('HOU')).toEqual(['small', 'mid', 'big']);
    expect(cityIds('woodlands')).toEqual(['woodlands']);
    expect(cityIds('The Woodlands')).toEqual(['woodlands']);
    expect(cityIds('oak ridge')).toEqual(['oak']);
  });

  it('does not match mid-word, and returns an empty list for an unknown city', () => {
    expect(cityIds('uston')).toEqual([]);
    expect(cityIds('Dallas')).toEqual([]);
  });

  it('treats regex characters in the input as plain text', () => {
    expect(cityIds('.*ston')).toEqual([]);
    expect(cityIds('(hou')).toEqual([]);
  });

  it('rejects input with no letters', () => {
    expect(lookupProperties(all, 'city', '77018')).toEqual({ ok: false, error: 'Enter a city name, e.g. Houston.' });
  });
});

describe('lookupProperties', () => {
  it('matches zip code exactly, including ZIP+4 addresses', () => {
    expect(ids('zip', '77018')).toEqual(['mid', 'big']);
    expect(ids('zip', '77002')).toEqual(['small']);
  });

  it('treats a single price or monthly payment as a maximum budget', () => {
    expect(ids('price', '400k')).toEqual(['small', 'mid']);
    expect(ids('monthly', '$2,500')).toEqual(['small', 'mid']);
  });

  it('treats a single bedroom, bathroom, or sq ft value as a minimum', () => {
    expect(ids('bedrooms', '3')).toEqual(['mid', 'big']);
    expect(ids('bathrooms', '4')).toEqual(['big']);
    expect(ids('sqft', '1500')).toEqual(['mid', 'big']);
  });

  it('supports inclusive ranges, in either order', () => {
    expect(ids('price', '300k-500k')).toEqual(['mid']);
    expect(ids('bedrooms', '5 to 2')).toEqual(['small', 'mid', 'big']);
    expect(ids('sqft', '900-1500')).toEqual(['small', 'mid']);
  });

  it('returns an empty match list, not an error, when nothing matches', () => {
    expect(ids('zip', '90210')).toEqual([]);
    expect(ids('price', '100')).toEqual([]);
  });

  it('describes what was searched for', () => {
    const result = lookupProperties(all, 'price', '300k-500k');
    expect(result.ok && result.description).toBe('price $300,000 – $500,000');
  });

  it('rejects empty, malformed, and non-5-digit zip input with a helpful message', () => {
    expect(lookupProperties(all, 'zip', '')).toEqual({ ok: false, error: 'Enter a value to search for.' });
    expect(lookupProperties(all, 'zip', '7701')).toMatchObject({ ok: false });
    expect(lookupProperties(all, 'bedrooms', 'three')).toMatchObject({ ok: false });
    expect(lookupProperties(all, 'price', '1-2-3')).toMatchObject({ ok: false });
  });

  it('gives the same result when run twice with the same input', () => {
    expect(ids('price', '450k')).toEqual(ids('price', '450k'));
  });
});
