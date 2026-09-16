import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Field names match prompts/notification-router/v1.0.0.md's `buyerPreferences` shape
// exactly (REQ-012's 7 notification types), so a future wiring of that prompt into a
// real event pipeline can consume this row with no field renaming.
export interface NotificationPreferenceAttributes {
  id: number;
  userId: number;
  newMatch: boolean;
  priceReduction: boolean;
  openHouse: boolean;
  statusChange: boolean;
  backOnMarket: boolean;
  underContract: boolean;
  tourConfirmation: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NotificationPreferenceCreationAttributes = Optional<
  NotificationPreferenceAttributes,
  'id' | 'newMatch' | 'priceReduction' | 'openHouse' | 'statusChange' | 'backOnMarket' | 'underContract' | 'tourConfirmation'
>;

export class NotificationPreference
  extends Model<NotificationPreferenceAttributes, NotificationPreferenceCreationAttributes>
  implements NotificationPreferenceAttributes
{
  declare id: number;
  declare userId: number;
  declare newMatch: boolean;
  declare priceReduction: boolean;
  declare openHouse: boolean;
  declare statusChange: boolean;
  declare backOnMarket: boolean;
  declare underContract: boolean;
  declare tourConfirmation: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initNotificationPreferenceModel(sequelize: Sequelize): typeof NotificationPreference {
  NotificationPreference.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // One preferences row per buyer -- read/update always upserts against this,
        // never creates a second row for the same user.
        unique: true,
      },
      // Default true: a new user receives every notification type until they
      // explicitly opt out, rather than silently receiving nothing.
      newMatch: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      priceReduction: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      openHouse: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      statusChange: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      backOnMarket: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      underContract: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      tourConfirmation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'NotificationPreference',
      tableName: 'notification_preferences',
    },
  );

  return NotificationPreference;
}
