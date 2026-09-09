import React, { useEffect, useState } from 'react';
import { fetchPropertyById } from '../services/propertyService';
import { Property } from '../types/property';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

interface ComparisonEntry {
  propertyId: string;
  // null means the fetch for this property failed -- the rest of the comparison
  // must still render (see "comparison view does not load" failure path).
  property: Property | null;
}

interface ComparisonRow {
  label: string;
  render: (property: Property) => string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: 'Price', render: (p) => currencyFormatter.format(p.listingPrice) },
  { label: 'Est. monthly payment', render: (p) => `${currencyFormatter.format(p.estimatedMonthlyPayment)}/mo` },
  { label: 'Bedrooms', render: (p) => String(p.bedrooms) },
  { label: 'Bathrooms', render: (p) => String(p.bathrooms) },
  { label: 'Square footage', render: (p) => `${p.squareFootage.toLocaleString()} sqft` },
  {
    label: 'Price per sqft',
    render: (p) => (p.squareFootage > 0 ? currencyFormatter.format(p.listingPrice / p.squareFootage) : 'Not available'),
  },
  { label: 'Lot size', render: (p) => p.lotSize ?? 'Not available' },
  { label: 'HOA', render: (p) => (p.hoaFeeMonthly ? `${currencyFormatter.format(p.hoaFeeMonthly)}/mo` : 'No HOA') },
  {
    label: 'Property taxes (annual)',
    render: (p) => (p.propertyTaxesAnnual != null ? currencyFormatter.format(p.propertyTaxesAnnual) : 'Not available'),
  },
  { label: 'Year built', render: (p) => (p.yearBuilt != null ? String(p.yearBuilt) : 'Not available') },
  { label: 'Key features', render: (p) => (p.features && p.features.length > 0 ? p.features.join(', ') : 'None listed') },
];

type PageState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; entries: ComparisonEntry[] };

interface ComparisonPageProps {
  propertyIds: string[];
  onRemove: (propertyId: string) => void;
  onBack: () => void;
}

export function ComparisonPage({ propertyIds, onRemove, onBack }: ComparisonPageProps): JSX.Element {
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    Promise.all(
      propertyIds.map((propertyId) =>
        fetchPropertyById(propertyId)
          .then((property): ComparisonEntry => ({ propertyId, property }))
          .catch((): ComparisonEntry => ({ propertyId, property: null })),
      ),
    )
      .then((entries) => {
        if (!cancelled) setState({ status: 'loaded', entries });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [propertyIds]);

  return (
    <main className="comparison">
      <button type="button" className="comparison__back" onClick={onBack}>
        ← Back to search
      </button>
      <h1>Compare Homes</h1>
      <p className="comparison__disclaimer">
        Estimated monthly payments are estimates only and are not lending offers or financial advice.
      </p>
      {/* REQ-011 asks for commute and match score alongside the fields below. Neither
          is shown here: this app has no mapping/directions API or reference address to
          compute a commute from, and a match score only exists relative to whatever
          search produced it -- comparing scores from different searches side by side
          would imply they're on the same scale when they aren't. Both are disclosed
          gaps, not silent omissions. */}
      <p className="comparison__gap-notice" role="note">
        Commute time isn&apos;t shown — no mapping service is connected yet. Match score isn&apos;t shown here since
        it depends on which search produced it.
      </p>

      {state.status === 'loading' && <p role="status">Loading comparison…</p>}
      {state.status === 'error' && <p role="alert">Something went wrong loading this comparison.</p>}

      {state.status === 'loaded' && state.entries.length === 0 && <p>No properties selected for comparison.</p>}

      {state.status === 'loaded' && state.entries.length > 0 && (
        <div className="comparison__table-wrapper">
          <table className="comparison__table">
            <thead>
              <tr>
                <th scope="col">Field</th>
                {state.entries.map((entry) => (
                  <th key={entry.propertyId} scope="col">
                    {entry.property ? entry.property.address : 'Unavailable'}
                    <button type="button" onClick={() => onRemove(entry.propertyId)}>
                      Remove
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => {
                const loadedValues = state.entries
                  .filter((e): e is ComparisonEntry & { property: Property } => e.property !== null)
                  .map((e) => row.render(e.property));
                const allSame = loadedValues.every((v) => v === loadedValues[0]);

                return (
                  <tr key={row.label} className={!allSame ? 'comparison__row--different' : undefined}>
                    <th scope="row">{row.label}</th>
                    {state.entries.map((entry) => (
                      <td key={entry.propertyId}>
                        {entry.property ? (
                          row.render(entry.property)
                        ) : (
                          <span role="alert">This property could not be loaded.</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
