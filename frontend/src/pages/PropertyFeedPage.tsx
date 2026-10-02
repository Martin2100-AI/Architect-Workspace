import React, { useEffect, useState } from 'react';
import './PropertyFeedPage.css';
import { AiSearchBox } from '../components/AiSearchBox';
import { MapView } from '../components/MapView';
import { PropertyCard } from '../components/PropertyCard';
import { PropertyLookup } from '../components/PropertyLookup';
import { AffordabilityCalculatorPage } from './AffordabilityCalculatorPage';
import { ComparisonPage } from './ComparisonPage';
import { PropertyDetailPage } from './PropertyDetailPage';
import { TourRequestPage } from './TourRequestPage';
import { fetchFavoritePropertyIds } from '../services/favoritesService';
import { fetchPropertyFeed, MlsUnavailableError } from '../services/propertyService';
import { MatchInfo, Property } from '../types/property';
import { LookupField, lookupProperties } from '../utils/propertyLookup';

type FeedState =
  | { status: 'loading' }
  | { status: 'loaded'; properties: Property[]; favoritedIds: Set<string> }
  | { status: 'mls-unavailable' }
  | { status: 'error' };

interface SelectedProperty {
  id: string;
  matchInfo?: MatchInfo;
}

// REQ-008/REQ-016 (STORY-007): explore homes on an interactive map as an alternative to the grid.
type ViewMode = 'grid' | 'map';

// REQ-011 (STORY-006): compare between two and four homes.
const MIN_COMPARE_SELECTION = 2;
const MAX_COMPARE_SELECTION = 4;

export function PropertyFeedPage(): JSX.Element {
  const [feed, setFeed] = useState<FeedState>({ status: 'loading' });
  const [selected, setSelected] = useState<SelectedProperty | null>(null);
  const [tourRequestPropertyId, setTourRequestPropertyId] = useState<string | null>(null);
  const [affordabilityPropertyId, setAffordabilityPropertyId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [lookup, setLookup] = useState<{ field: LookupField; value: string } | null>(null);

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

  if (selected && tourRequestPropertyId) {
    return (
      <TourRequestPage propertyId={tourRequestPropertyId} onBack={() => setTourRequestPropertyId(null)} />
    );
  }

  if (selected && affordabilityPropertyId) {
    return (
      <AffordabilityCalculatorPage
        propertyId={affordabilityPropertyId}
        onBack={() => setAffordabilityPropertyId(null)}
      />
    );
  }

  if (selected) {
    return (
      <PropertyDetailPage
        propertyId={selected.id}
        matchInfo={selected.matchInfo}
        onBack={() => setSelected(null)}
        onRequestTour={setTourRequestPropertyId}
        onCalculateAffordability={setAffordabilityPropertyId}
        allowSharing
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

  // Quick lookup filters the already-loaded feed in the browser — no network call.
  const allProperties = feed.status === 'loaded' ? feed.properties : [];
  const lookupResult = lookup ? lookupProperties(allProperties, lookup.field, lookup.value) : null;
  const visibleProperties = lookupResult?.ok ? lookupResult.properties : allProperties;
  const lookupError = lookupResult && !lookupResult.ok ? lookupResult.error : null;
  const gridHeading = lookupResult?.ok
    ? `${lookupResult.properties.length} of ${allProperties.length} homes match ${lookupResult.description}`
    : 'Browse all homes';

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
          <PropertyLookup
            onSearch={(field, value) => setLookup({ field, value })}
            onClear={() => setLookup(null)}
            error={lookupError}
          />

          <div className="property-feed__view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              aria-pressed={viewMode === 'grid'}
              disabled={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
            >
              Grid view
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'map'}
              disabled={viewMode === 'map'}
              onClick={() => setViewMode('map')}
            >
              Map view
            </button>
          </div>

          {viewMode === 'map' ? (
            <MapView properties={visibleProperties} />
          ) : (
            <>
              <h2 className="property-feed__all-heading" aria-live="polite">
                {gridHeading}
              </h2>
              {lookupResult?.ok && lookupResult.properties.length === 0 && (
                <p role="status">No homes match that search. Try a wider range, or clear the search.</p>
              )}
              <div className="property-feed__grid">
                {visibleProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    initiallyFavorited={feed.favoritedIds.has(property.id)}
                    onViewDetails={handleViewDetails}
                    compareSelection={compareSelectionFor(property.id)}
                  />
                ))}
              </div>
              <details className="property-feed__ai-search">
                <summary>Or describe the home in your own words (AI search)</summary>
                <AiSearchBox
                  favoritedIds={feed.favoritedIds}
                  onViewDetails={handleViewDetails}
                  compareIds={compareIds}
                  onToggleCompare={handleToggleCompare}
                  maxCompareSelection={MAX_COMPARE_SELECTION}
                />
              </details>
            </>
          )}
        </>
      )}
    </main>
  );
}
