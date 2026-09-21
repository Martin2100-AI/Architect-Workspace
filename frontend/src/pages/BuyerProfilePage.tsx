import React, { useState } from 'react';
import '../styles/formPage.css';
import {
  BUYER_PROFILE_PROPERTY_TYPES,
  BuyerProfilePropertyType,
  BuyerProfileValidationError,
  createBuyerProfile,
  NotAuthenticatedError,
} from '../services/buyerProfileService';

interface BuyerProfilePageProps {
  onBack: () => void;
}

function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function BuyerProfilePage({ onBack }: BuyerProfilePageProps): JSX.Element {
  const [preferredLocations, setPreferredLocations] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [propertyType, setPropertyType] = useState<BuyerProfilePropertyType>('single-family');
  const [downPayment, setDownPayment] = useState('');
  const [desiredFeatures, setDesiredFeatures] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await createBuyerProfile({
        preferredLocations: parseCommaSeparatedList(preferredLocations),
        minPrice: Number(minPrice),
        maxPrice: Number(maxPrice),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        propertyType,
        downPayment: Number(downPayment),
        desiredFeatures: parseCommaSeparatedList(desiredFeatures),
      });
      setSuccessMessage('Your buyer profile has been saved.');
    } catch (err) {
      setError(
        err instanceof BuyerProfileValidationError || err instanceof NotAuthenticatedError
          ? err.message
          : 'Something went wrong saving your buyer profile.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="buyer-profile-page form-page">
      <div className="form-page__card">
      <h1>Create your buyer profile</h1>
      <p>Tell us what you&apos;re looking for so we can personalize your property search.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="preferredLocations">Preferred cities or neighborhoods (comma-separated)</label>
        <input
          id="preferredLocations"
          type="text"
          value={preferredLocations}
          onChange={(e) => setPreferredLocations(e.target.value)}
          placeholder="Austin, Round Rock"
          required
        />

        <label htmlFor="minPrice">Minimum price</label>
        <input
          id="minPrice"
          type="number"
          min={0}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          required
        />

        <label htmlFor="maxPrice">Maximum price</label>
        <input
          id="maxPrice"
          type="number"
          min={0}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          required
        />

        <label htmlFor="bedrooms">Desired bedrooms</label>
        <input
          id="bedrooms"
          type="number"
          min={0}
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          required
        />

        <label htmlFor="bathrooms">Desired bathrooms</label>
        <input
          id="bathrooms"
          type="number"
          min={0}
          step={0.5}
          value={bathrooms}
          onChange={(e) => setBathrooms(e.target.value)}
          required
        />

        <label htmlFor="propertyType">Property type</label>
        <select id="propertyType" value={propertyType} onChange={(e) => setPropertyType(e.target.value as BuyerProfilePropertyType)}>
          {BUYER_PROFILE_PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label htmlFor="downPayment">Estimated down payment</label>
        <input
          id="downPayment"
          type="number"
          min={0}
          value={downPayment}
          onChange={(e) => setDownPayment(e.target.value)}
          required
        />

        <label htmlFor="desiredFeatures">Desired home features (comma-separated, optional)</label>
        <input
          id="desiredFeatures"
          type="text"
          value={desiredFeatures}
          onChange={(e) => setDesiredFeatures(e.target.value)}
          placeholder="pool, garage"
        />

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save profile'}
        </button>
        {error && (
          <p role="alert" className="buyer-profile-page__error">
            {error}
          </p>
        )}
        {successMessage && <p className="buyer-profile-page__success">{successMessage}</p>}
      </form>
      <button type="button" onClick={onBack}>
        Back
      </button>
      </div>
    </main>
  );
}
