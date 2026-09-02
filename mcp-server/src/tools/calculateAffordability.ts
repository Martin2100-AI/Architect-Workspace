import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { startInvocationLog } from '../mcpLogger';

const MCP_LOGGER_NAME = 'mcp-server';

// Declared once and reused as both the tool's public input schema (what the
// model sees) and its runtime validator (what actually gets checked before
// the handler runs) -- one definition, no drift between the two.
export const calculateAffordabilityInputShape = {
  annual_income: z.number().positive().describe('Gross annual household income, in dollars.'),
  monthly_debts: z
    .number()
    .nonnegative()
    .describe(
      'Required minimum monthly debt payments in dollars (credit cards, student loans, auto loans) -- not including rent or a mortgage.',
    ),
  down_payment: z.number().nonnegative().describe('Cash available for a down payment, in dollars.'),
  interest_rate_pct: z
    .number()
    .positive()
    .max(20)
    .default(6.5)
    .describe('Assumed annual mortgage interest rate as a percentage, e.g. 6.5 for 6.5%. Optional, defaults to 6.5.'),
  loan_term_years: z
    .number()
    .int()
    .positive()
    .max(40)
    .default(30)
    .describe('Loan term in years, e.g. 30. Optional, defaults to 30.'),
};

export interface AffordabilityEstimate {
  max_price_estimate: number;
  estimated_monthly_payment: number;
  assumptions: {
    interest_rate_pct: number;
    loan_term_years: number;
    back_end_dti_ceiling_pct: number;
  };
  disclaimer: string;
}

const BACK_END_DTI_CEILING_PCT = 36;

// Required by GUARDRAIL-AFFORDABILITY-DISCLAIMER in .colaberry/plan.json.
const DISCLAIMER =
  'This is an estimate only, based on the numbers provided and a standard 36% debt-to-income ceiling. ' +
  'It is not a lending offer, a pre-approval, or financial advice.';

export function calculateAffordability(input: {
  annual_income: number;
  monthly_debts: number;
  down_payment: number;
  interest_rate_pct: number;
  loan_term_years: number;
}): AffordabilityEstimate {
  const monthlyIncome = input.annual_income / 12;
  const maxTotalDebtPayment = monthlyIncome * (BACK_END_DTI_CEILING_PCT / 100);
  const maxHousingPayment = Math.max(0, maxTotalDebtPayment - input.monthly_debts);

  const monthlyRate = input.interest_rate_pct / 100 / 12;
  const numPayments = input.loan_term_years * 12;
  const loanAmount =
    maxHousingPayment === 0 ? 0 : (maxHousingPayment * (1 - Math.pow(1 + monthlyRate, -numPayments))) / monthlyRate;

  return {
    max_price_estimate: Math.round(loanAmount + input.down_payment),
    estimated_monthly_payment: Math.round(maxHousingPayment),
    assumptions: {
      interest_rate_pct: input.interest_rate_pct,
      loan_term_years: input.loan_term_years,
      back_end_dti_ceiling_pct: BACK_END_DTI_CEILING_PCT,
    },
    disclaimer: DISCLAIMER,
  };
}

export function registerCalculateAffordabilityTool(server: McpServer): void {
  server.registerTool(
    'calculate_affordability',
    {
      title: 'Calculate home affordability',
      description:
        "Estimate a buyer's maximum home price and monthly payment from their income, debts, and down payment. " +
        "Call this when a buyer wants to know what they can afford in general -- not for pricing a specific " +
        'property, and never as a substitute for a real lender\'s pre-approval.',
      inputSchema: calculateAffordabilityInputShape,
    },
    async (args) => {
      const result = calculateAffordability(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
