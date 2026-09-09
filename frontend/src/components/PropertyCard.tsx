import React, { useState } from 'react';
import { FAVORITE_CATEGORIES, FavoriteCategory, NotAuthenticatedError, saveFavorite } from '../services/favoritesService';
import { MatchInfo, Property } from '../types/property';

const CATEGORY_LABELS: Record<FavoriteCategory, string> = {
  favorites: 'Favorites',
  maybe: 'Maybe',
  'want-to-tour': 'Want to Tour',
  'offer-candidates': 'Offer Candidates',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

interface PropertyCardProps {
  property: Property;
  initiallyFavorited: boolean;
  /** Only present when this card is rendered from an AI search result. */
  matchInfo?: MatchInfo;
  /** Only present when the card is rendered somewhere that has a detail view to link to. */
  onViewDetails?: (propertyId: string, matchInfo?: MatchInfo) => void;
}

const overallFitLabel: Record<MatchInfo['overallFit'], string> = {
  'full-match': 'Full match',
  'partial-match': 'Partial match',
  'poor-match': 'Poor match',
};

export function PropertyCard({
  property,
  initiallyFavorited,
  matchInfo,
  onViewDetails,
}: PropertyCardProps): JSX.Element {
  const [isFavorited, setIsFavorited] = useState(initiallyFavorited);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The one-click heart is a shortcut for the default "Favorites" category; the
  // category picker below is the general path (see STORY-005) for saving to any of
  // the 4 categories, including "Favorites" again if the user picks it there too.
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

  const [selectedCategory, setSelectedCategory] = useState<FavoriteCategory>('favorites');
  const [savedCategories, setSavedCategories] = useState<Set<FavoriteCategory>>(new Set());
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const alreadySavedToSelectedCategory = savedCategories.has(selectedCategory);

  async function handleSaveToCategory(): Promise<void> {
    setIsSavingCategory(true);
    setCategoryError(null);
    try {
      await saveFavorite(property.id, selectedCategory);
      setSavedCategories((prev) => new Set(prev).add(selectedCategory));
    } catch (err) {
      setCategoryError(err instanceof NotAuthenticatedError ? 'Log in to save homes.' : "Couldn't save this property.");
    } finally {
      setIsSavingCategory(false);
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
        {onViewDetails && (
          <button
            type="button"
            className="property-card__details"
            onClick={() => onViewDetails(property.id, matchInfo)}
          >
            View details
          </button>
        )}
        {matchInfo && (
          <div className={`property-card__match property-card__match--${matchInfo.overallFit}`}>
            <span className="property-card__match-badge">{overallFitLabel[matchInfo.overallFit]}</span>
            {matchInfo.matchedCriteria.length > 0 && (
              <p className="property-card__match-detail">Matches: {matchInfo.matchedCriteria.join(', ')}</p>
            )}
            {matchInfo.unmatchedCriteria.length > 0 && (
              <p className="property-card__match-detail">Doesn&apos;t match: {matchInfo.unmatchedCriteria.join(', ')}</p>
            )}
          </div>
        )}
        {error && (
          <p className="property-card__error" role="alert">
            {error}
          </p>
        )}
        <div className="property-card__category-save">
          <label htmlFor={`category-select-${property.id}`} className="property-card__category-label">
            Save to category
          </label>
          <select
            id={`category-select-${property.id}`}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as FavoriteCategory)}
          >
            {FAVORITE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSaveToCategory}
            disabled={isSavingCategory || alreadySavedToSelectedCategory}
          >
            {alreadySavedToSelectedCategory ? `Saved to ${CATEGORY_LABELS[selectedCategory]}` : 'Save'}
          </button>
        </div>
        {categoryError && (
          <p className="property-card__error" role="alert">
            {categoryError}
          </p>
        )}
      </div>
    </article>
  );
}
