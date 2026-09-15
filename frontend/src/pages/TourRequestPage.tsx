import React, { useEffect, useState } from 'react';
import { fetchPropertyById, MlsUnavailableError, PropertyNotFoundError } from '../services/propertyService';
import {
  NotAuthenticatedError,
  requestTour,
  TourRequestValidationError,
} from '../services/tourRequestService';
import { Property } from '../types/property';

type PropertyLookupState =
  | { status: 'loading' }
  | { status: 'loaded'; property: Property }
  | { status: 'not-found' }
  | { status: 'mls-unavailable' }
  | { status: 'error' };

interface TourRequestPageProps {
  propertyId: string;
  onBack: () => void;
}

export function TourRequestPage({ propertyId, onBack }: TourRequestPageProps): JSX.Element {
  const [lookup, setLookup] = useState<PropertyLookupState>({ status: 'loading' });

  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLookup({ status: 'loading' });

    fetchPropertyById(propertyId)
      .then((property) => {
        if (!cancelled) setLookup({ status: 'loaded', property });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof PropertyNotFoundError) {
          setLookup({ status: 'not-found' });
        } else if (err instanceof MlsUnavailableError) {
          setLookup({ status: 'mls-unavailable' });
        } else {
          setLookup({ status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await requestTour({
        propertyId,
        preferredDate,
        preferredTime,
        buyerName,
        phoneNumber,
        email,
        message: message.trim().length > 0 ? message : undefined,
      });
      setSuccessMessage(
        result.confirmationSent
          ? `Your tour request has been submitted. A confirmation email has been sent to ${email}.`
          : 'Your tour request has been submitted. We could not send a confirmation email right now, but your request was received.',
      );
    } catch (err) {
      setError(
        err instanceof TourRequestValidationError || err instanceof NotAuthenticatedError
          ? err.message
          : 'Something went wrong requesting this tour.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="tour-request-page">
      <button type="button" className="tour-request-page__back" onClick={onBack}>
        ← Back to property
      </button>

      <h1>Request a tour</h1>

      {lookup.status === 'loading' && <p role="status">Loading property details…</p>}
      {lookup.status === 'not-found' && <p role="alert">This property could not be found.</p>}
      {lookup.status === 'mls-unavailable' && (
        <p role="alert">We can&apos;t reach the MLS right now, so we can&apos;t confirm this property.</p>
      )}
      {lookup.status === 'error' && <p role="alert">Something went wrong loading this property.</p>}

      {lookup.status === 'loaded' && (
        <>
          <p className="tour-request-page__property">{lookup.property.address}</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="preferredDate">Preferred date</label>
            <input
              id="preferredDate"
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              required
            />

            <label htmlFor="preferredTime">Preferred time</label>
            <input
              id="preferredTime"
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              required
            />

            <label htmlFor="buyerName">Your name</label>
            <input
              id="buyerName"
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              required
            />

            <label htmlFor="phoneNumber">Phone number</label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />

            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <label htmlFor="message">Message (optional)</label>
            <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} />

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Request tour'}
            </button>
            {error && (
              <p role="alert" className="tour-request-page__error">
                {error}
              </p>
            )}
            {successMessage && <p className="tour-request-page__success">{successMessage}</p>}
          </form>
        </>
      )}
    </main>
  );
}
