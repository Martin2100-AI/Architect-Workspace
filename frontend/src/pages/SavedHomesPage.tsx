import React, { useEffect, useState } from 'react';
import {
  FAVORITE_CATEGORIES,
  FavoriteCategory,
  FavoriteRecord,
  fetchFavorites,
  removeFavorite,
} from '../services/favoritesService';
import { fetchPropertyById } from '../services/propertyService';
import { Property } from '../types/property';

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

interface SavedEntry {
  propertyId: string;
  category: FavoriteCategory;
  // null means the property lookup failed -- most likely it dropped out of the MLS
  // feed since it was saved. The entry still shows (with its id) and can still be
  // removed; it just can't render photo/price/address it no longer has.
  property: Property | null;
  removeError: string | null;
}

type PageState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; entries: SavedEntry[] };

interface SavedHomesPageProps {
  onBack: () => void;
}

async function loadEntry(favorite: FavoriteRecord): Promise<SavedEntry> {
  try {
    const property = await fetchPropertyById(favorite.propertyId);
    return { propertyId: favorite.propertyId, category: favorite.category, property, removeError: null };
  } catch (err) {
    // A single unavailable/removed listing (PropertyNotFoundError, MlsUnavailableError,
    // or anything else) must not take down the rest of the saved list -- see the
    // "saved properties disappear" failure path this story calls out explicitly.
    return { propertyId: favorite.propertyId, category: favorite.category, property: null, removeError: null };
  }
}

export function SavedHomesPage({ onBack }: SavedHomesPageProps): JSX.Element {
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetchFavorites()
      .then((favorites) => Promise.all(favorites.map(loadEntry)))
      .then((entries) => {
        if (!cancelled) setState({ status: 'loaded', entries });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRemove(propertyId: string, category: FavoriteCategory): Promise<void> {
    if (state.status !== 'loaded') return;
    try {
      await removeFavorite(propertyId, category);
      setState({
        status: 'loaded',
        entries: state.entries.filter((e) => !(e.propertyId === propertyId && e.category === category)),
      });
    } catch {
      setState({
        status: 'loaded',
        entries: state.entries.map((e) =>
          e.propertyId === propertyId && e.category === category
            ? { ...e, removeError: "Couldn't remove this property. Please try again." }
            : e,
        ),
      });
    }
  }

  return (
    <main className="saved-homes">
      <button type="button" className="saved-homes__back" onClick={onBack}>
        ← Back to search
      </button>
      <h1>Saved Homes</h1>

      {state.status === 'loading' && <p role="status">Loading your saved homes…</p>}
      {state.status === 'error' && <p role="alert">Something went wrong loading your saved homes.</p>}

      {state.status === 'loaded' &&
        FAVORITE_CATEGORIES.map((category) => {
          const entriesInCategory = state.entries.filter((e) => e.category === category);
          return (
            <section key={category} className="saved-homes__category" aria-label={CATEGORY_LABELS[category]}>
              <h2>{CATEGORY_LABELS[category]}</h2>
              {entriesInCategory.length === 0 && <p>No properties saved here yet.</p>}
              {entriesInCategory.map((entry) => (
                <article key={entry.propertyId} className="saved-homes__entry" data-testid="saved-homes-entry">
                  {entry.property ? (
                    <>
                      <p className="saved-homes__address">{entry.property.address}</p>
                      <p className="saved-homes__price">{currencyFormatter.format(entry.property.listingPrice)}</p>
                    </>
                  ) : (
                    <p role="alert">This saved property is no longer available.</p>
                  )}
                  <button type="button" onClick={() => handleRemove(entry.propertyId, entry.category)}>
                    Remove
                  </button>
                  {entry.removeError && <p role="alert">{entry.removeError}</p>}
                </article>
              ))}
            </section>
          );
        })}
    </main>
  );
}
