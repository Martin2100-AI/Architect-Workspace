/** REQ-003's nine inputs, minus mortgage amount (derived as purchasePrice - downPayment). */
export interface AffordabilityInputs {
  purchasePrice: number;
  downPayment: number;
  /** Annual mortgage interest rate as a percentage, e.g. 6.5 for 6.5%. */
  interestRatePct: number;
  loanTermYears: number;
  propertyTaxesAnnual: number;
  homeownersInsuranceAnnual: number;
  hoaFeesMonthly: number;
}

export interface AffordabilityBreakdown {
  mortgageAmount: number;
  principalAndInterestMonthly: number;
  propertyTaxesMonthly: number;
  homeownersInsuranceMonthly: number;
  hoaFeesMonthly: number;
  /** 0 when downPayment / purchasePrice is 20% or more -- PMI is not "applicable" below that threshold. */
  mortgageInsuranceMonthly: number;
  totalMonthly: number;
}

const PMI_DOWN_PAYMENT_THRESHOLD_RATIO = 0.2;
/** Standard illustrative PMI rate (annual, % of loan amount) charged while under the 20%-down threshold. */
const PMI_ANNUAL_RATE_PCT = 0.5;

/**
 * Pure, synchronous, no I/O -- safe to call on every keystroke so the UI can update
 * results live as inputs change (STORY-010's second acceptance criterion).
 */
export function calculateAffordability(inputs: AffordabilityInputs): AffordabilityBreakdown {
  const mortgageAmount = Math.max(0, inputs.purchasePrice - inputs.downPayment);

  const monthlyRate = inputs.interestRatePct / 100 / 12;
  const numPayments = inputs.loanTermYears * 12;
  const principalAndInterestMonthly =
    monthlyRate === 0 || numPayments === 0
      ? mortgageAmount / Math.max(numPayments, 1)
      : (mortgageAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments));

  const propertyTaxesMonthly = inputs.propertyTaxesAnnual / 12;
  const homeownersInsuranceMonthly = inputs.homeownersInsuranceAnnual / 12;

  const downPaymentRatio = inputs.purchasePrice === 0 ? 1 : inputs.downPayment / inputs.purchasePrice;
  const mortgageInsuranceMonthly =
    downPaymentRatio < PMI_DOWN_PAYMENT_THRESHOLD_RATIO ? (mortgageAmount * (PMI_ANNUAL_RATE_PCT / 100)) / 12 : 0;

  const totalMonthly =
    principalAndInterestMonthly +
    propertyTaxesMonthly +
    homeownersInsuranceMonthly +
    inputs.hoaFeesMonthly +
    mortgageInsuranceMonthly;

  return {
    mortgageAmount,
    principalAndInterestMonthly,
    propertyTaxesMonthly,
    homeownersInsuranceMonthly,
    hoaFeesMonthly: inputs.hoaFeesMonthly,
    mortgageInsuranceMonthly,
    totalMonthly,
  };
}
