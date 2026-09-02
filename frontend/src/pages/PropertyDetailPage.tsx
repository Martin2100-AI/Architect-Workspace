import React, { useEffect, useState } from 'react';
import { fetchPropertyById, MlsUnavailableError, PropertyNotFoundError } from '../services/propertyService';
import { MatchInfo, Property } from '../types/property';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const overallFitLabel: Record<MatchInfo['overallFit'], string> = {
  'full-match': 'Full match',
  'partial-match': 'Partial match',
  'poor-match': 'Poor match',
};

type DetailState =
  | { status: 'loading' }
  | { status: 'loaded'; property: Property }
  | { status: 'not-found' }
  | { status: 'mls-unavailable' }
  | { status: 'error' };

interface PropertyDetailPageProps {
  propertyId: string;
  onBack: () => void;
  /** Only present when this property was reached from a search result. */
  matchInfo?: MatchInfo;
}

export function PropertyDetailPage({ propertyId, onBack, matchInfo }: PropertyDetailPageProps): JSX.Element {
  const [state, setState] = useState<DetailState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetchPropertyById(propertyId)
      .then((property) => {
        if (!cancelled) setState({ status: 'loaded', property });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof PropertyNotFoundError) {
          setState({ status: 'not-found' });
        } else if (err instanceof MlsUnavailableError) {
          setState({ status: 'mls-unavailable' });
        } else {
          setState({ status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return (
    <main className="property-detail">
      <button type="button" className="property-detail__back" onClick={onBack}>
        ← Back to results
      </button>

      {state.status === 'loading' && <p role="status">Loading property details…</p>}

      {state.status === 'not-found' && <p role="alert">This property could not be found.</p>}

      {state.status === 'mls-unavailable' && (
        <p role="alert">We can&apos;t reach the MLS right now, so we can&apos;t show this property.</p>
      )}

      {state.status === 'error' && <p role="alert">Something went wrong loading this property.</p>}

      {state.status === 'loaded' && (
        <article className="property-detail__body" data-testid="property-detail">
          <img
            className="property-detail__image"
            src={state.property.imageUrl}
            alt={state.property.address}
          />
          <h1 className="property-detail__price">{currencyFormatter.format(state.property.listingPrice)}</h1>
          <p className="property-detail__address">{state.property.address}</p>
          <p className="property-detail__stats">
            {state.property.bedrooms} bd · {state.property.bathrooms} ba ·{' '}
            {state.property.squareFootage.toLocaleString()} sqft · {state.property.propertyType}
          </p>
          <p className="property-detail__payment">
            Est. {currencyFormatter.format(state.property.estimatedMonthlyPayment)}/mo
          </p>
          <p className="property-detail__disclaimer">
            Estimated monthly payments are estimates only and are not lending offers or financial advice.
          </p>

          {matchInfo ? (
            <section
              className={`property-detail__match property-detail__match--${matchInfo.overallFit}`}
              aria-label="Match score"
            >
              <h2 className="property-detail__match-score">{overallFitLabel[matchInfo.overallFit]}</h2>
              {matchInfo.matchedCriteria.length > 0 && (
                <p className="property-detail__match-detail">
                  Matches what you&apos;re looking for: {matchInfo.matchedCriteria.join(', ')}
                </p>
              )}
              {matchInfo.unmatchedCriteria.length > 0 && (
                <p className="property-detail__match-detail">
                  Doesn&apos;t match: {matchInfo.unmatchedCriteria.join(', ')}
                </p>
              )}
            </section>
          ) : (
            <p className="property-detail__match-missing" role="status">
              Search to see how well this matches what you&apos;re looking for.
            </p>
          )}

          {state.property.features && state.property.features.length > 0 && (
            <ul className="property-detail__features">
              {state.property.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          )}
        </article>
      )}
    </main>
  );
}
