import { Sequelize } from 'sequelize';
import { initNotificationPreferenceModel, NotificationPreference } from '../models/NotificationPreference';
import {
  getOrCreateNotificationPreferences,
  isNotificationEnabled,
  NotificationPreferenceInput,
  upsertNotificationPreferences,
} from './notificationPreferenceService';

const ALL_ENABLED: NotificationPreferenceInput = {
  newMatch: true,
  priceReduction: true,
  openHouse: true,
  statusChange: true,
  backOnMarket: true,
  underContract: true,
  tourConfirmation: true,
};

describe('getOrCreateNotificationPreferences', () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    initNotificationPreferenceModel(sequelize);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('creates and returns a default row (every type enabled) for a user with no prior preferences', async () => {
    const record = await getOrCreateNotificationPreferences(NotificationPreference, 1);

    expect(record).toEqual({ userId: 1, ...ALL_ENABLED });
    expect(await NotificationPreference.count()).toBe(1);
  });

  it('returns the existing row on a second call instead of creating a duplicate', async () => {
    await getOrCreateNotificationPreferences(NotificationPreference, 1);
    await getOrCreateNotificationPreferences(NotificationPreference, 1);

    expect(await NotificationPreference.count()).toBe(1);
  });
});

describe('upsertNotificationPreferences', () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    initNotificationPreferenceModel(sequelize);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('creates a new row for a first-time save', async () => {
    const record = await upsertNotificationPreferences(NotificationPreference, 1, {
      ...ALL_ENABLED,
      tourConfirmation: false,
    });

    expect(record.tourConfirmation).toBe(false);
    expect(await NotificationPreference.count()).toBe(1);
  });

  it('updates the existing row on a second save instead of creating a duplicate', async () => {
    await upsertNotificationPreferences(NotificationPreference, 1, ALL_ENABLED);
    const updated = await upsertNotificationPreferences(NotificationPreference, 1, {
      ...ALL_ENABLED,
      priceReduction: false,
    });

    expect(updated.priceReduction).toBe(false);
    expect(await NotificationPreference.count()).toBe(1);
  });

  it('keeps preferences independent between users', async () => {
    await upsertNotificationPreferences(NotificationPreference, 1, { ...ALL_ENABLED, tourConfirmation: false });
    await upsertNotificationPreferences(NotificationPreference, 2, ALL_ENABLED);

    const userOne = await getOrCreateNotificationPreferences(NotificationPreference, 1);
    const userTwo = await getOrCreateNotificationPreferences(NotificationPreference, 2);

    expect(userOne.tourConfirmation).toBe(false);
    expect(userTwo.tourConfirmation).toBe(true);
  });
});

describe('isNotificationEnabled', () => {
  it('returns true when the matching preference field is true', () => {
    const prefs = { userId: 1, ...ALL_ENABLED };
    expect(isNotificationEnabled(prefs, 'tourConfirmation')).toBe(true);
  });

  it('returns false when the matching preference field is false', () => {
    const prefs = { userId: 1, ...ALL_ENABLED, tourConfirmation: false };
    expect(isNotificationEnabled(prefs, 'tourConfirmation')).toBe(false);
  });
});
