import React, { useEffect, useState } from 'react';
import {
  fetchNotificationPreferences,
  NotAuthenticatedError,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPES,
  NotificationPreferences,
  NotificationPreferenceValidationError,
  updateNotificationPreferences,
} from '../services/notificationPreferenceService';

interface NotificationPreferencesPageProps {
  onBack: () => void;
}

type LoadState = { status: 'loading' } | { status: 'loaded' } | { status: 'error' };

export function NotificationPreferencesPage({ onBack }: NotificationPreferencesPageProps): JSX.Element {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchNotificationPreferences()
      .then((record) => {
        if (cancelled) return;
        const { userId: _userId, ...rest } = record;
        setPreferences(rest);
        setLoadState({ status: 'loaded' });
      })
      .catch(() => {
        if (!cancelled) setLoadState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(type: keyof NotificationPreferences): void {
    setPreferences((current) => (current ? { ...current, [type]: !current[type] } : current));
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!preferences) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const saved = await updateNotificationPreferences(preferences);
      const { userId: _userId, ...rest } = saved;
      setPreferences(rest);
      setSuccessMessage('Your notification preferences have been saved.');
    } catch (err) {
      setError(
        err instanceof NotificationPreferenceValidationError || err instanceof NotAuthenticatedError
          ? err.message
          : 'Something went wrong saving your notification preferences. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="notification-preferences-page">
      <h1>Notification preferences</h1>
      <p>Choose which updates you&apos;d like to receive. Turn off anything you don&apos;t want.</p>

      {loadState.status === 'loading' && <p role="status">Loading your preferences…</p>}

      {loadState.status === 'error' && (
        <p role="alert">Something went wrong loading your notification preferences. Please try again.</p>
      )}

      {loadState.status === 'loaded' && preferences && (
        <form onSubmit={handleSubmit}>
          {NOTIFICATION_TYPES.map((type) => (
            <label key={type} htmlFor={`notification-${type}`} className="notification-preferences-page__row">
              <input
                id={`notification-${type}`}
                type="checkbox"
                checked={preferences[type]}
                onChange={() => toggle(type)}
              />
              {NOTIFICATION_TYPE_LABELS[type]}
            </label>
          ))}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save preferences'}
          </button>
          {error && (
            <p role="alert" className="notification-preferences-page__error">
              {error}
            </p>
          )}
          {successMessage && <p className="notification-preferences-page__success">{successMessage}</p>}
        </form>
      )}

      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
