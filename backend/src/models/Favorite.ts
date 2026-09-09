import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// REQ-004's literal fixed list (STORY-005) -- not free-text/user-defined categories,
// per the user's own choice after that ambiguity was flagged.
export const FAVORITE_CATEGORIES = ['favorites', 'maybe', 'want-to-tour', 'offer-candidates'] as const;
export type FavoriteCategory = (typeof FAVORITE_CATEGORIES)[number];

export interface FavoriteAttributes {
  id: number;
  userId: number;
  propertyId: string;
  category: FavoriteCategory;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FavoriteCreationAttributes = Optional<FavoriteAttributes, 'id' | 'category'>;

export class Favorite extends Model<FavoriteAttributes, FavoriteCreationAttributes> implements FavoriteAttributes {
  declare id: number;
  declare userId: number;
  declare propertyId: string;
  declare category: FavoriteCategory;
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
      category: {
        type: DataTypes.ENUM(...FAVORITE_CATEGORIES),
        allowNull: false,
        defaultValue: 'favorites',
      },
    },
    {
      sequelize,
      modelName: 'Favorite',
      tableName: 'favorites',
      // A property can independently sit in more than one category (e.g. both
      // "Favorites" and "Want to Tour") -- the old (userId, propertyId) uniqueness
      // now widens to per-category, so saving the same property to the same
      // category twice is still a no-op, but saving it to a second category is not.
      indexes: [{ unique: true, fields: ['userId', 'propertyId', 'category'] }],
    },
  );

  return Favorite;
}
