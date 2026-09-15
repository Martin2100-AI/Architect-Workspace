import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { PropertyType } from '../types/property';

// Must stay in sync with PropertyType in ../types/property.ts -- that type has no
// runtime array of its own to reuse (it's TypeScript-only), so this is the one place
// the literal values are duplicated for Sequelize's ENUM to consume.
export const BUYER_PROFILE_PROPERTY_TYPES = ['single-family', 'condo', 'townhouse', 'multi-family'] as const;

export interface BuyerProfileAttributes {
  id: number;
  userId: number;
  preferredLocations: string[];
  minPrice: number;
  maxPrice: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: PropertyType;
  downPayment: number;
  desiredFeatures: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type BuyerProfileCreationAttributes = Optional<BuyerProfileAttributes, 'id' | 'desiredFeatures'>;

export class BuyerProfile
  extends Model<BuyerProfileAttributes, BuyerProfileCreationAttributes>
  implements BuyerProfileAttributes
{
  declare id: number;
  declare userId: number;
  declare preferredLocations: string[];
  declare minPrice: number;
  declare maxPrice: number;
  declare bedrooms: number;
  declare bathrooms: number;
  declare propertyType: PropertyType;
  declare downPayment: number;
  declare desiredFeatures: string[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initBuyerProfileModel(sequelize: Sequelize): typeof BuyerProfile {
  BuyerProfile.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // One profile per buyer -- re-submitting the profile form updates the
        // existing row (upsert) rather than creating a second one.
        unique: true,
      },
      preferredLocations: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      minPrice: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      maxPrice: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      bedrooms: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      bathrooms: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      propertyType: {
        type: DataTypes.ENUM(...BUYER_PROFILE_PROPERTY_TYPES),
        allowNull: false,
      },
      downPayment: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      desiredFeatures: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: 'BuyerProfile',
      tableName: 'buyer_profiles',
    },
  );

  return BuyerProfile;
}
