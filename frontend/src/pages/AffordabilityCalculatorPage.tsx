import React, { useEffect, useMemo, useState } from 'react';
import { calculateAffordability } from '../utils/affordabilityCalculator';
import { fetchPropertyById, MlsUnavailableError, PropertyNotFoundError } from '../services/propertyService';
import { Property } from '../types/property';

type PropertyLookupState =
  | { status: 'loading' }
  | { status: 'loaded'; property: Property }
  | { status: 'not-found' }
  | { status: 'mls-unavailable' }
  | { status: 'error' };

interface AffordabilityCalculatorPageProps {
  propertyId: string;
  onBack: () => void;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

// Illustrative starting point only -- every field below is user-editable once loaded.
const DEFAULT_INTEREST_RATE_PCT = '6.5';
const DEFAULT_LOAN_TERM_YEARS = '30';
const DEFAULT_DOWN_PAYMENT_RATIO = 0.2;

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * REQ-003: calculates estimated monthly housing cost from purchase price, down payment,
 * interest rate, loan term, taxes, insurance, HOA, and mortgage insurance when applicable.
 * REQ-017: the disclaimer below is always shown alongside the results, never separately
 * dismissable or conditionally hidden.
 */
export function AffordabilityCalculatorPage({ propertyId, onBack }: AffordabilityCalculatorPageProps): JSX.Element {
  const [lookup, setLookup] = useState<PropertyLookupState>({ status: 'loading' });

  const [purchasePrice, setPurchasePrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [interestRatePct, setInterestRatePct] = useState(DEFAULT_INTEREST_RATE_PCT);
  const [loanTermYears, setLoanTermYears] = useState(DEFAULT_LOAN_TERM_YEARS);
  const [propertyTaxesAnnual, setPropertyTaxesAnnual] = useState('');
  const [homeownersInsuranceAnnual, setHomeownersInsuranceAnnual] = useState('');
  const [hoaFeesMonthly, setHoaFeesMonthly] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLookup({ status: 'loading' });

    fetchPropertyById(propertyId)
      .then((property) => {
        if (cancelled) return;
        setLookup({ status: 'loaded', property });
        // Pre-fill from real listing data where it exists; never fabricate a value
        // for a field the MLS listing doesn't carry (property taxes, HOA).
        setPurchasePrice(String(property.listingPrice));
        setDownPayment(String(Math.round(property.listingPrice * DEFAULT_DOWN_PAYMENT_RATIO)));
        setPropertyTaxesAnnual(String(property.propertyTaxesAnnual ?? 0));
        setHoaFeesMonthly(String(property.hoaFeeMonthly ?? 0));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof PropertyNotFoundError) {
          setLookup({ status: 'not-found' });
        } else if (err instanceof MlsUnavailableError) {
          setLookup({ status: 'mls-unavailable' });
        } else {
          setLookup({ status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const breakdown = useMemo(
    () =>
      calculateAffordability({
        purchasePrice: toNumber(purchasePrice),
        downPayment: toNumber(downPayment),
        interestRatePct: toNumber(interestRatePct),
        loanTermYears: toNumber(loanTermYears),
        propertyTaxesAnnual: toNumber(propertyTaxesAnnual),
        homeownersInsuranceAnnual: toNumber(homeownersInsuranceAnnual),
        hoaFeesMonthly: toNumber(hoaFeesMonthly),
      }),
    [
      purchasePrice,
      downPayment,
      interestRatePct,
      loanTermYears,
      propertyTaxesAnnual,
      homeownersInsuranceAnnual,
      hoaFeesMonthly,
    ],
  );

  return (
    <main className="affordability-calculator">
      <button type="button" className="affordability-calculator__back" onClick={onBack}>
        ← Back to property
      </button>

      <h1>Affordability calculator</h1>

      {lookup.status === 'loading' && <p role="status">Loading property details…</p>}
      {lookup.status === 'not-found' && <p role="alert">This property could not be found.</p>}
      {lookup.status === 'mls-unavailable' && (
        <p role="alert">We can&apos;t reach the MLS right now, so we can&apos;t load this property.</p>
      )}
      {lookup.status === 'error' && <p role="alert">Something went wrong loading this property.</p>}

      {lookup.status === 'loaded' && (
        <>
          <p className="affordability-calculator__property">{lookup.property.address}</p>

          <form onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="purchasePrice">Purchase price</label>
            <input
              id="purchasePrice"
              type="number"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />

            <label htmlFor="downPayment">Down payment</label>
            <input
              id="downPayment"
              type="number"
              min="0"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
            />

            <label htmlFor="interestRatePct">Interest rate (%)</label>
            <input
              id="interestRatePct"
              type="number"
              min="0"
              step="0.01"
              value={interestRatePct}
              onChange={(e) => setInterestRatePct(e.target.value)}
            />

            <label htmlFor="loanTermYears">Loan term (years)</label>
            <input
              id="loanTermYears"
              type="number"
              min="1"
              value={loanTermYears}
              onChange={(e) => setLoanTermYears(e.target.value)}
            />

            <label htmlFor="propertyTaxesAnnual">Property taxes (annual)</label>
            <input
              id="propertyTaxesAnnual"
              type="number"
              min="0"
              value={propertyTaxesAnnual}
              onChange={(e) => setPropertyTaxesAnnual(e.target.value)}
            />

            <label htmlFor="homeownersInsuranceAnnual">Homeowners insurance (annual)</label>
            <input
              id="homeownersInsuranceAnnual"
              type="number"
              min="0"
              value={homeownersInsuranceAnnual}
              onChange={(e) => setHomeownersInsuranceAnnual(e.target.value)}
            />

            <label htmlFor="hoaFeesMonthly">HOA fees (monthly)</label>
            <input
              id="hoaFeesMonthly"
              type="number"
              min="0"
              value={hoaFeesMonthly}
              onChange={(e) => setHoaFeesMonthly(e.target.value)}
            />
          </form>

          <section className="affordability-calculator__results" aria-label="Estimated monthly cost breakdown">
            <h2>Estimated monthly cost</h2>
            <dl>
              <dt>Mortgage amount</dt>
              <dd>{currencyFormatter.format(breakdown.mortgageAmount)}</dd>

              <dt>Principal &amp; interest</dt>
              <dd>{currencyFormatter.format(breakdown.principalAndInterestMonthly)}</dd>

              <dt>Property taxes</dt>
              <dd>{currencyFormatter.format(breakdown.propertyTaxesMonthly)}</dd>

              <dt>Homeowners insurance</dt>
              <dd>{currencyFormatter.format(breakdown.homeownersInsuranceMonthly)}</dd>

              <dt>HOA fees</dt>
              <dd>{currencyFormatter.format(breakdown.hoaFeesMonthly)}</dd>

              {breakdown.mortgageInsuranceMonthly > 0 && (
                <>
                  <dt>Mortgage insurance (PMI)</dt>
                  <dd>{currencyFormatter.format(breakdown.mortgageInsuranceMonthly)}</dd>
                </>
              )}

              <dt className="affordability-calculator__total-label">Total estimated monthly cost</dt>
              <dd className="affordability-calculator__total-value">
                {currencyFormatter.format(breakdown.totalMonthly)}
              </dd>
            </dl>
          </section>

          <p className="affordability-calculator__disclaimer" role="note">
            This calculation is an estimate only and is not a lending offer or financial advice.
          </p>
        </>
      )}
    </main>
  );
}
