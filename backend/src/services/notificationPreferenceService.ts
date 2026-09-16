import { NotificationPreference } from '../models/NotificationPreference';

// Matches prompts/notification-router/v1.0.0.md's `buyerPreferences` field names
// exactly (REQ-012's 7 notification types) so a future event pipeline for the other
// 6 types can consume this record with no field renaming.
export const NOTIFICATION_TYPES = [
  'newMatch',
  'priceReduction',
  'openHouse',
  'statusChange',
  'backOnMarket',
  'underContract',
  'tourConfirmation',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationPreferenceInput = Record<NotificationType, boolean>;

export type NotificationPreferenceRecord = { userId: number } & NotificationPreferenceInput;

function toRecord(pref: NotificationPreference): NotificationPreferenceRecord {
  return {
    userId: pref.userId,
    newMatch: pref.newMatch,
    priceReduction: pref.priceReduction,
    openHouse: pref.openHouse,
    statusChange: pref.statusChange,
    backOnMarket: pref.backOnMarket,
    underContract: pref.underContract,
    tourConfirmation: pref.tourConfirmation,
  };
}

/**
 * Reads a buyer's notification preferences, creating the default row (every type
 * enabled) on first access -- so a user who has never visited the settings page still
 * gets a real, persisted row back rather than an undefined/empty response.
 */
export async function getOrCreateNotificationPreferences(
  notificationPreferenceModel: typeof NotificationPreference,
  userId: number,
): Promise<NotificationPreferenceRecord> {
  const [pref] = await notificationPreferenceModel.findOrCreate({ where: { userId } });
  return toRecord(pref);
}

/**
 * One preferences row per buyer -- re-saving the settings page updates the existing
 * row instead of erroring or creating a duplicate, per this repo's idempotency rule
 * for side effects. Looked up by userId (unique index on NotificationPreference)
 * rather than Sequelize's built-in upsert(), matching upsertBuyerProfile's convention.
 */
export async function upsertNotificationPreferences(
  notificationPreferenceModel: typeof NotificationPreference,
  userId: number,
  input: NotificationPreferenceInput,
): Promise<NotificationPreferenceRecord> {
  const existing = await notificationPreferenceModel.findOne({ where: { userId } });

  if (existing) {
    await existing.update(input);
    return toRecord(existing);
  }

  const created = await notificationPreferenceModel.create({ userId, ...input });
  return toRecord(created);
}

/**
 * The gate every real send path must consult before firing a notification. Pure and
 * synchronous by design: no DB/network access here, so it's trivial to unit-test the
 * "disabled -> not sent" acceptance criterion in isolation from any actual send logic.
 */
export function isNotificationEnabled(
  preferences: NotificationPreferenceRecord,
  type: NotificationType,
): boolean {
  return preferences[type];
}
