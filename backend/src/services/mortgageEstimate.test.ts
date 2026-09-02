import { estimateMonthlyPayment } from './mortgageEstimate';

describe('estimateMonthlyPayment', () => {
  it('returns a positive number for a typical listing price', () => {
    expect(estimateMonthlyPayment(425000)).toBeGreaterThan(0);
  });

  it('returns a higher estimate for a higher price', () => {
    expect(estimateMonthlyPayment(600000)).toBeGreaterThan(estimateMonthlyPayment(300000));
  });

  it('returns 0 for a listing price of 0', () => {
    expect(estimateMonthlyPayment(0)).toBe(0);
  });
});
