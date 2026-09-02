export interface StubProperty {
  property_id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
}

export const stubProperties: StubProperty[] = [
  { property_id: 'p-1', address: '128 Maple St, Springfield', price: 385000, bedrooms: 3, bathrooms: 2 },
  { property_id: 'p-2', address: '47 River Rd, Springfield', price: 512000, bedrooms: 4, bathrooms: 3 },
  { property_id: 'p-3', address: '9 Birchwood Ln, Springfield', price: 299000, bedrooms: 2, bathrooms: 1 },
];

export const stubFavoritesByBuyer: Record<string, string[]> = {
  'buyer-1': ['p-1', 'p-3'],
  'buyer-2': ['p-2'],
};

export function findProperty(propertyId: string): StubProperty | undefined {
  return stubProperties.find((property) => property.property_id === propertyId);
}
