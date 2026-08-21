import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface FavoriteAttributes {
  id: number;
  userId: number;
  propertyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FavoriteCreationAttributes = Optional<FavoriteAttributes, 'id'>;

export class Favorite extends Model<FavoriteAttributes, FavoriteCreationAttributes> implements FavoriteAttributes {
  declare id: number;
  declare userId: number;
  declare propertyId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initFavoriteModel(sequelize: Sequelize): typeof Favorite {
  Favorite.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      propertyId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Favorite',
      tableName: 'favorites',
      indexes: [{ unique: true, fields: ['userId', 'propertyId'] }],
    },
  );

  return Favorite;
}
