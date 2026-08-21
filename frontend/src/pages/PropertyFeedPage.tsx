import React, { useEffect, useState } from 'react';
import { PropertyCard } from '../components/PropertyCard';
import { fetchFavoritePropertyIds } from '../services/favoritesService';
import { fetchPropertyFeed, MlsUnavailableError } from '../services/propertyService';
import { Property } from '../types/property';

type FeedState =
  | { status: 'loading' }
  | { status: 'loaded'; properties: Property[]; favoritedIds: Set<string> }
  | { status: 'mls-unavailable' }
  | { status: 'error' };

export function PropertyFeedPage(): JSX.Element {
  const [feed, setFeed] = useState<FeedState>({ status: 'loading' });

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
        <div className="property-feed__grid">
          {feed.properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              initiallyFavorited={feed.favoritedIds.has(property.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
