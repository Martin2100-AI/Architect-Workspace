import { MlsClient } from './mlsClient';
import { Property } from '../types/property';

export class PropertyNotFoundError extends Error {
  constructor(propertyId: string) {
    super(`No property found with id ${propertyId}`);
    this.name = 'PropertyNotFoundError';
  }
}

export async function getPropertyById(mlsClient: MlsClient, propertyId: string): Promise<Property> {
  const feed = await mlsClient.getPropertyFeed();
  const property = feed.find((candidate) => candidate.id === propertyId);
  if (!property) {
    throw new PropertyNotFoundError(propertyId);
  }
  return property;
}
