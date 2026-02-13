'use server';
/**
 * @fileOverview A Genkit flow for generating a natural language summary of a driver's monthly ledger report.
 *
 * - ownerMonthlyReportSummary - A function that generates the summary.
 * - OwnerMonthlyReportSummaryInput - The input type for the summary generation.
 * - OwnerMonthlyReportSummaryOutput - The return type for the summary generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OwnerMonthlyReportSummaryInputSchema = z.object({
  driverName: z.string().describe('The name of the driver.'),
  currentMonth: z
    .string()
    .describe("The current month for which the summary is being generated (e.g., 'September 2024')."),
  currentMonthSummary: z
    .object({
      totalTrips: z.number().describe('Total trips for the current month.'),
      slabMatched: z
        .string()
        .describe("The payout slab matched for the current month (e.g., '100 Trips')."),
      payout: z.number().describe('The total payout amount for the current month.'),
    })
    .describe('Summary data for the current month.'),
  previousMonthSummary: z
    .object({
      month: z.string().describe("The previous month (e.g., 'August 2024')."),
      totalTrips: z.number().describe('Total trips for the previous month.'),
      slabMatched: z.string().describe('The payout slab matched for the previous month.'),
      payout: z.number().describe('The total payout amount for the previous month.'),
    })
    .optional()
    .describe('Optional summary data for the previous month, if available for comparison.'),
});
export type OwnerMonthlyReportSummaryInput = z.infer<
  typeof OwnerMonthlyReportSummaryInputSchema
>;

const OwnerMonthlyReportSummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      "A natural language summary of the driver's monthly performance, highlighting total trips, achieved slab, payout, and comparisons to previous months if available."
    ),
});
export type OwnerMonthlyReportSummaryOutput = z.infer<
  typeof OwnerMonthlyReportSummaryOutputSchema
>;

export async function ownerMonthlyReportSummary(
  input: OwnerMonthlyReportSummaryInput
): Promise<OwnerMonthlyReportSummaryOutput> {
  return ownerMonthlyReportSummaryFlow(input);
}

const ownerMonthlyReportSummaryPrompt = ai.definePrompt({
  name: 'ownerMonthlyReportSummaryPrompt',
  input: { schema: OwnerMonthlyReportSummaryInputSchema },
  output: { schema: OwnerMonthlyReportSummaryOutputSchema },
  prompt: `You are a concise business analyst providing a summary of driver performance.
Summarize the monthly ledger report for {{driverName}} for {{currentMonth}}.

Current Month Performance ({{currentMonth}}):
- Total Trips: {{currentMonthSummary.totalTrips}}
- Slab Matched: {{currentMonthSummary.slabMatched}}
- Payout: ₹{{currentMonthSummary.payout}}

{{#if previousMonthSummary}}
Previous Month Performance ({{previousMonthSummary.month}}):
- Total Trips: {{previousMonthSummary.totalTrips}}
- Slab Matched: {{previousMonthSummary.slabMatched}}
- Payout: ₹{{previousMonthSummary.payout}}

Compare {{driverName}}'s performance in {{currentMonth}} against {{previousMonthSummary.month}}, highlighting any significant changes in trips, slab achievement, or payout.
{{/if}}

Provide a natural language summary that covers total trips, achieved slab, payout, and any noteworthy performance aspects or deviations (especially if comparing to the previous month).`,
});

const ownerMonthlyReportSummaryFlow = ai.defineFlow(
  {
    name: 'ownerMonthlyReportSummaryFlow',
    inputSchema: OwnerMonthlyReportSummaryInputSchema,
    outputSchema: OwnerMonthlyReportSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await ownerMonthlyReportSummaryPrompt(input);
    return output!;
  }
);
