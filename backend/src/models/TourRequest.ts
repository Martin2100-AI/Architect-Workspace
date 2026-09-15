import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface TourRequestAttributes {
  id: number;
  propertyId: string;
  buyerEmail: string;
  requestedAt: Date;
  notes: string | null;
  // Nullable/additive (STORY-008, REQ-005) -- the pre-existing MCP `schedule_property_tour`
  // tool has no concept of these fields, so they stay optional at the DB level rather than
  // forcing a breaking change onto that existing consumer. The REST route STORY-008 adds
  // requires them at the Zod validation layer instead.
  buyerName: string | null;
  phoneNumber: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TourRequestCreationAttributes = Optional<
  TourRequestAttributes,
  'id' | 'notes' | 'buyerName' | 'phoneNumber'
>;

export class TourRequest
  extends Model<TourRequestAttributes, TourRequestCreationAttributes>
  implements TourRequestAttributes
{
  declare id: number;
  declare propertyId: string;
  declare buyerEmail: string;
  declare requestedAt: Date;
  declare notes: string | null;
  declare buyerName: string | null;
  declare phoneNumber: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initTourRequestModel(sequelize: Sequelize): typeof TourRequest {
  TourRequest.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      propertyId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      buyerEmail: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      requestedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      notes: {
        type: DataTypes.STRING(300),
        allowNull: true,
        defaultValue: null,
      },
      buyerName: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      modelName: 'TourRequest',
      tableName: 'tour_requests',
      indexes: [{ unique: true, fields: ['propertyId', 'buyerEmail', 'requestedAt'] }],
    },
  );

  return TourRequest;
}
