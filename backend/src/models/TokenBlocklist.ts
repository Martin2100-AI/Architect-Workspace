import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface TokenBlocklistAttributes {
  id: number;
  jti: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TokenBlocklistCreationAttributes = Optional<TokenBlocklistAttributes, 'id'>;

export class TokenBlocklist
  extends Model<TokenBlocklistAttributes, TokenBlocklistCreationAttributes>
  implements TokenBlocklistAttributes
{
  declare id: number;
  declare jti: string;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initTokenBlocklistModel(sequelize: Sequelize): typeof TokenBlocklist {
  TokenBlocklist.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      jti: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'TokenBlocklist',
      tableName: 'token_blocklist',
    },
  );

  return TokenBlocklist;
}
