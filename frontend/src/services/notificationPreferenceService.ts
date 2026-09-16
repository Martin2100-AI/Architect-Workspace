import { getAuthToken } from './authTokenStore';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 8000;

// Must match backend/src/services/notificationPreferenceService.ts's NOTIFICATION_TYPES
// exactly (in turn matching prompts/notification-router/v1.0.0.md's buyerPreferences
// shape); there is no shared package between frontend/backend in this repo, so this is
// kept in sync by hand (same convention as FAVORITE_CATEGORIES/BUYER_PROFILE_PROPERTY_TYPES).
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

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  newMatch: 'New matching properties',
  priceReduction: 'Price reductions',
  openHouse: 'Open houses',
  statusChange: 'Listing status changes',
  backOnMarket: 'Homes returning to market',
  underContract: 'Saved homes going under contract',
  tourConfirmation: 'Tour confirmations',
};

export type NotificationPreferences = Record<NotificationType, boolean>;

export interface NotificationPreferenceRecord extends NotificationPreferences {
  userId: number;
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super('You need to be logged in to manage notification preferences.');
    this.name = 'NotAuthenticatedError';
  }
}

export class NotificationPreferenceValidationError extends Error {
  constructor() {
    super('Please check the highlighted fields and try again.');
    this.name = 'NotificationPreferenceValidationError';
  }
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferenceRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new NotAuthenticatedError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/notification-preferences`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      throw new NotAuthenticatedError();
    }
    if (!res.ok) {
      throw new Error(`Failed to load notification preferences (status ${res.status})`);
    }

    const body = await res.json();
    return body.preferences as NotificationPreferenceRecord;
  } finally {
    clearTimeout(timeout);
  }
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<NotificationPreferenceRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new NotAuthenticatedError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/notification-preferences`, {
      method: 'PUT',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });

    if (res.status === 401) {
      throw new NotAuthenticatedError();
    }
    if (res.status === 400) {
      throw new NotificationPreferenceValidationError();
    }
    if (!res.ok) {
      throw new Error(`Failed to save notification preferences (status ${res.status})`);
    }

    const body = await res.json();
    return body.preferences as NotificationPreferenceRecord;
  } finally {
    clearTimeout(timeout);
  }
}
