import React, { useEffect, useState } from 'react';
import { AiSearchBox } from '../components/AiSearchBox';
import { PropertyCard } from '../components/PropertyCard';
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

export function PropertyFeedPage(): JSX.Element {
  const [feed, setFeed] = useState<FeedState>({ status: 'loading' });
  const [selected, setSelected] = useState<SelectedProperty | null>(null);

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

  function handleViewDetails(propertyId: string, matchInfo?: MatchInfo): void {
    setSelected({ id: propertyId, matchInfo });
  }

  return (
    <main className="property-feed">
      <h1>Homes for you</h1>
      <p className="property-feed__disclaimer">
        Estimated monthly payments are estimates only and are not lending offers or financial advice.
      </p>

      {feed.status === 'loading' && <p role="status">Loading properties…</p>}

      {feed.status === 'mls-unavailable' && (
        <p role="alert">
          We can&apos;t reach the MLS right now, so we can&apos;t show listings. Please try again shortly.
        </p>
      )}

      {feed.status === 'error' && <p role="alert">Something went wrong loading the property feed.</p>}

      {feed.status === 'loaded' && (
        <>
          <AiSearchBox favoritedIds={feed.favoritedIds} onViewDetails={handleViewDetails} />
          <h2 className="property-feed__all-heading">Browse all homes</h2>
          <div className="property-feed__grid">
            {feed.properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                initiallyFavorited={feed.favoritedIds.has(property.id)}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
