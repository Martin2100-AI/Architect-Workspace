const ASSUMED_DOWN_PAYMENT_RATIO = 0.2;
const ASSUMED_ANNUAL_INTEREST_RATE = 0.065;
const LOAN_TERM_MONTHS = 360;

/**
 * Rough principal-and-interest-only estimate (20% down, 6.5%/30yr, both illustrative
 * constants) — intentionally simple. STORY-010 (Affordability Calculator) owns the
 * real, user-input-driven breakdown (taxes, insurance, HOA, adjustable down payment);
 * this exists only so the property feed has a plausible per-listing number to show
 * alongside the disclaimer already on that page.
 */
export function estimateMonthlyPayment(listingPrice: number): number {
  const principal = listingPrice * (1 - ASSUMED_DOWN_PAYMENT_RATIO);
  const monthlyRate = ASSUMED_ANNUAL_INTEREST_RATE / 12;
  const growth = Math.pow(1 + monthlyRate, LOAN_TERM_MONTHS);
  return Math.round((principal * monthlyRate * growth) / (growth - 1));
}
