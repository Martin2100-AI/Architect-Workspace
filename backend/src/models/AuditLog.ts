import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface AuditLogAttributes {
  id: number;
  userId: number;
  action: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AuditLogCreationAttributes = Optional<AuditLogAttributes, 'id'>;

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  declare id: number;
  declare userId: number;
  declare action: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initAuditLogModel(sequelize: Sequelize): typeof AuditLog {
  AuditLog.init(
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
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_logs',
    },
  );

  return AuditLog;
}
