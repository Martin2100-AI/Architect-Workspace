import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface TourRequestAttributes {
  id: number;
  propertyId: string;
  buyerEmail: string;
  requestedAt: Date;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TourRequestCreationAttributes = Optional<TourRequestAttributes, 'id' | 'notes'>;

export class TourRequest
  extends Model<TourRequestAttributes, TourRequestCreationAttributes>
  implements TourRequestAttributes
{
  declare id: number;
  declare propertyId: string;
  declare buyerEmail: string;
  declare requestedAt: Date;
  declare notes: string | null;
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
