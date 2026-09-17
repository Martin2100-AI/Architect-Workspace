import { AffordabilityInputs, calculateAffordability } from './affordabilityCalculator';

function makeInputs(overrides: Partial<AffordabilityInputs> = {}): AffordabilityInputs {
  return {
    purchasePrice: 400000,
    downPayment: 80000, // 20%
    interestRatePct: 6,
    loanTermYears: 30,
    propertyTaxesAnnual: 4800,
    homeownersInsuranceAnnual: 1200,
    hoaFeesMonthly: 50,
    ...overrides,
  };
}

describe('calculateAffordability', () => {
  it('computes a principal-and-interest payment that fully amortizes the loan to zero over the loan term', () => {
    // Independent correctness check, not a restatement of the formula under test:
    // if the payment is right, paying it every month for the full term drives the
    // balance to exactly zero.
    const inputs = makeInputs();
    const result = calculateAffordability(inputs);
    const monthlyRate = inputs.interestRatePct / 100 / 12;

    let balance = result.mortgageAmount;
    for (let i = 0; i < inputs.loanTermYears * 12; i++) {
      balance = balance * (1 + monthlyRate) - result.principalAndInterestMonthly;
    }

    expect(balance).toBeCloseTo(0, 6);
  });

  it('displays every cost component, and they sum to the total', () => {
    const result = calculateAffordability(makeInputs());

    expect(result.mortgageAmount).toBe(320000);
    expect(result.principalAndInterestMonthly).toBeGreaterThan(0);
    expect(result.propertyTaxesMonthly).toBeCloseTo(400, 6);
    expect(result.homeownersInsuranceMonthly).toBeCloseTo(100, 6);
    expect(result.hoaFeesMonthly).toBe(50);
    expect(result.totalMonthly).toBeCloseTo(
      result.principalAndInterestMonthly +
        result.propertyTaxesMonthly +
        result.homeownersInsuranceMonthly +
        result.hoaFeesMonthly +
        result.mortgageInsuranceMonthly,
      6,
    );
  });

  it('applies mortgage insurance when the down payment is below 20%', () => {
    const result = calculateAffordability(makeInputs({ downPayment: 40000 })); // 10%

    expect(result.mortgageInsuranceMonthly).toBeGreaterThan(0);
  });

  it('does not apply mortgage insurance exactly at the 20% down payment threshold', () => {
    const result = calculateAffordability(makeInputs({ downPayment: 80000 })); // exactly 20%

    expect(result.mortgageInsuranceMonthly).toBe(0);
  });

  it('does not apply mortgage insurance above the 20% down payment threshold', () => {
    const result = calculateAffordability(makeInputs({ downPayment: 120000 })); // 30%

    expect(result.mortgageInsuranceMonthly).toBe(0);
  });

  it('produces different results when an input changes, so the UI can update live', () => {
    const base = calculateAffordability(makeInputs());
    const higherRate = calculateAffordability(makeInputs({ interestRatePct: 7 }));
    const biggerDownPayment = calculateAffordability(makeInputs({ downPayment: 200000 }));

    expect(higherRate.totalMonthly).not.toBeCloseTo(base.totalMonthly, 2);
    expect(biggerDownPayment.totalMonthly).not.toBeCloseTo(base.totalMonthly, 2);
    expect(biggerDownPayment.mortgageAmount).toBe(200000);
  });

  it('handles a 0% interest rate as a straight-line payment, without NaN or Infinity', () => {
    const result = calculateAffordability(makeInputs({ interestRatePct: 0 }));

    expect(result.principalAndInterestMonthly).toBeCloseTo(320000 / 360, 6);
    expect(Number.isFinite(result.principalAndInterestMonthly)).toBe(true);
  });

  it('never lets mortgage amount go negative when the down payment exceeds the purchase price', () => {
    const result = calculateAffordability(makeInputs({ purchasePrice: 100000, downPayment: 150000 }));

    expect(result.mortgageAmount).toBe(0);
    expect(result.principalAndInterestMonthly).toBe(0);
  });

  it('does not divide by zero when purchase price is 0', () => {
    const result = calculateAffordability(makeInputs({ purchasePrice: 0, downPayment: 0 }));

    expect(Number.isFinite(result.mortgageInsuranceMonthly)).toBe(true);
    expect(result.mortgageAmount).toBe(0);
  });
});
