import React, { useState } from 'react';
import { NotAuthenticatedError, saveFavorite } from '../services/favoritesService';
import { Property } from '../types/property';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

interface PropertyCardProps {
  property: Property;
  initiallyFavorited: boolean;
}

export function PropertyCard({ property, initiallyFavorited }: PropertyCardProps): JSX.Element {
  const [isFavorited, setIsFavorited] = useState(initiallyFavorited);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // There is no "unfavorite" endpoint yet, so once a property is saved the button
  // becomes a disabled confirmation rather than pretending it can be un-saved.
  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      await saveFavorite(property.id);
      setIsFavorited(true);
    } catch (err) {
      setError(err instanceof NotAuthenticatedError ? 'Log in to save homes.' : "Couldn't save this property.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="property-card" data-testid="property-card">
      <img className="property-card__image" src={property.imageUrl} alt={property.address} />
      <div className="property-card__body">
        <div className="property-card__header">
          <span className="property-card__price">{currencyFormatter.format(property.listingPrice)}</span>
          <button
            type="button"
            className="property-card__favorite"
            aria-pressed={isFavorited}
            aria-label={isFavorited ? 'Saved to favorites' : 'Save to favorites'}
            disabled={isFavorited || isSaving}
            onClick={handleSave}
          >
            {isFavorited ? '♥' : '♡'}
          </button>
        </div>
        <p className="property-card__address">{property.address}</p>
        <p className="property-card__stats">
          {property.bedrooms} bd · {property.bathrooms} ba · {property.squareFootage.toLocaleString()} sqft ·{' '}
          {property.propertyType}
        </p>
        <p className="property-card__payment">
          Est. {currencyFormatter.format(property.estimatedMonthlyPayment)}/mo
        </p>
        {error && (
          <p className="property-card__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
