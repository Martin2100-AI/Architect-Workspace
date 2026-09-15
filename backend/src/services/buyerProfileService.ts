import { BuyerProfile } from '../models/BuyerProfile';
import { PropertyType } from '../types/property';

export interface BuyerProfileInput {
  preferredLocations: string[];
  minPrice: number;
  maxPrice: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: PropertyType;
  downPayment: number;
  desiredFeatures?: string[];
}

export interface BuyerProfileRecord {
  userId: number;
  preferredLocations: string[];
  minPrice: number;
  maxPrice: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: PropertyType;
  downPayment: number;
  desiredFeatures: string[];
}

function toRecord(profile: BuyerProfile): BuyerProfileRecord {
  return {
    userId: profile.userId,
    preferredLocations: profile.preferredLocations,
    minPrice: profile.minPrice,
    maxPrice: profile.maxPrice,
    bedrooms: profile.bedrooms,
    bathrooms: profile.bathrooms,
    propertyType: profile.propertyType,
    downPayment: profile.downPayment,
    desiredFeatures: profile.desiredFeatures,
  };
}

/**
 * One profile per buyer -- re-submitting the profile form updates the existing row
 * instead of erroring or creating a duplicate, per this repo's idempotency rule for
 * side effects. Looked up by userId (unique index on BuyerProfile) rather than using
 * Sequelize's built-in upsert(), which doesn't cleanly report create-vs-update and
 * isn't needed here.
 */
export async function upsertBuyerProfile(
  buyerProfileModel: typeof BuyerProfile,
  userId: number,
  input: BuyerProfileInput,
): Promise<BuyerProfileRecord> {
  const desiredFeatures = input.desiredFeatures ?? [];
  const existing = await buyerProfileModel.findOne({ where: { userId } });

  if (existing) {
    await existing.update({ ...input, desiredFeatures });
    return toRecord(existing);
  }

  const created = await buyerProfileModel.create({ userId, ...input, desiredFeatures });
  return toRecord(created);
}
