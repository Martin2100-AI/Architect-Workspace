import React, { useEffect, useState } from 'react';
import { AiSearchBox } from '../components/AiSearchBox';
import { PropertyCard } from '../components/PropertyCard';
import { ComparisonPage } from './ComparisonPage';
import { PropertyDetailPage } from './PropertyDetailPage';
import { fetchFavoritePropertyIds } from '../services/favoritesService';
import { fetchPropertyFeed, MlsUnavailableError } from '../services/propertyService';
import { MatchInfo, Property } from '../types/property';

type FeedState =
  | { status: 'loading' }
  | { status: 'loaded'; properties: Property[]; favoritedIds: Set<string> }
  | { status: 'mls-unavailable' }
  | { status: 'error' };

interface SelectedProperty {
  id: string;
  matchInfo?: MatchInfo;
}

// REQ-011 (STORY-006): compare between two and four homes.
const MIN_COMPARE_SELECTION = 2;
const MAX_COMPARE_SELECTION = 4;

export function PropertyFeedPage(): JSX.Element {
  const [feed, setFeed] = useState<FeedState>({ status: 'loading' });
  const [selected, setSelected] = useState<SelectedProperty | null>(null);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  function handleToggleCompare(propertyId: string): void {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else if (next.size < MAX_COMPARE_SELECTION) {
        next.add(propertyId);
      }
      return next;
    });
  }

  function compareSelectionFor(propertyId: string) {
    return {
      selected: compareIds.has(propertyId),
      disabled: compareIds.size >= MAX_COMPARE_SELECTION && !compareIds.has(propertyId),
      onToggle: handleToggleCompare,
    };
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchPropertyFeed(), fetchFavoritePropertyIds()])
      .then(([properties, favoritedIds]) => {
        if (!cancelled) setFeed({ status: 'loaded', properties, favoritedIds: new Set(favoritedIds) });
      })
      .catch((err) => {
        if (cancelled) return;
        setFeed({ status: err instanceof MlsUnavailableError ? 'mls-unavailable' : 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (selected) {
    return (
      <PropertyDetailPage
        propertyId={selected.id}
        matchInfo={selected.matchInfo}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (showComparison) {
    return (
      <ComparisonPage
        propertyIds={Array.from(compareIds)}
        onRemove={handleToggleCompare}
        onBack={() => setShowComparison(false)}
      />
    );
  }

  function handleViewDetails(propertyId: string, matchInfo?: MatchInfo): void {
    setSelected({ id: propertyId, matchInfo });
  }

  return (
    <main className="property-feed">
      <h1>Homes for you</h1>
      <p className="property-feed__disclaimer">
        Estimated monthly payments are estimates only and are not lending offers or financial advice.
      </p>

      {compareIds.size > 0 && (
        <button
          type="button"
          className="property-feed__compare-trigger"
          disabled={compareIds.size < MIN_COMPARE_SELECTION}
          onClick={() => setShowComparison(true)}
        >
          Compare ({compareIds.size})
        </button>
      )}

      {feed.status === 'loading' && <p role="status">Loading properties…</p>}

      {feed.status === 'mls-unavailable' && (
        <p role="alert">
          We can&apos;t reach the MLS right now, so we can&apos;t show listings. Please try again shortly.
        </p>
      )}

      {feed.status === 'error' && <p role="alert">Something went wrong loading the property feed.</p>}

      {feed.status === 'loaded' && (
        <>
          <AiSearchBox
            favoritedIds={feed.favoritedIds}
            onViewDetails={handleViewDetails}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            maxCompareSelection={MAX_COMPARE_SELECTION}
          />
          <h2 className="property-feed__all-heading">Browse all homes</h2>
          <div className="property-feed__grid">
            {feed.properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                initiallyFavorited={feed.favoritedIds.has(property.id)}
                onViewDetails={handleViewDetails}
                compareSelection={compareSelectionFor(property.id)}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
