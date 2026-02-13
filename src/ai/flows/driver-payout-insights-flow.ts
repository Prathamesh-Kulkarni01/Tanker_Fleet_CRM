'use server';
/**
 * @fileOverview This file implements a Genkit flow for providing driver payout insights.
 *
 * - driverPayoutInsights - An async wrapper function to call the Genkit flow.
 * - DriverPayoutInsightsInput - The input type for the flow.
 * - DriverPayoutInsightsOutput - The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const SlabConfigSchema = z.object({
  min_trips: z.number().describe('Minimum number of trips for this slab.'),
  max_trips: z.number().describe('Maximum number of trips for this slab.'),
  payout_amount: z.number().describe('Payout amount for this slab.'),
});

const TripEntrySchema = z.object({
  trip_type: z.string().describe('Type of the trip (e.g., "ABC", "XYZ").'),
  trip_count: z.number().describe('Number of trips of this type.'),
  date: z.string().describe('Date of the trip entry (YYYY-MM-DD format).'),
});

const PastMonthSummarySchema = z.object({
  month: z.string().describe('Month of the summary (YYYY-MM format).'),
  total_trips: z.number().describe('Total trips in that month.'),
  payout: z.number().describe('Final payout for that month.'),
});

const DriverPayoutInsightsInputSchema = z.object({
  driverId: z.string().describe('The unique identifier for the driver.'),
  currentMonthTotalTrips: z.number().describe('Total trips recorded for the current month so far.'),
  slabConfiguration: z.array(SlabConfigSchema).describe('Array of all defined payout slabs.'),
  currentMonthTripEntries: z.array(TripEntrySchema).describe('Detailed trip entries for the current month.'),
  pastMonthSummaries: z.array(PastMonthSummarySchema).describe('Summaries of the driver\'s past monthly performance.'),
});

export type DriverPayoutInsightsInput = z.infer<typeof DriverPayoutInsightsInputSchema>;

// Output Schema
const CurrentSlabDetailsSchema = SlabConfigSchema.extend({
  // Optionally add more derived fields if needed for UI, but for prompt, basic SlabConfig is enough
}).nullable();

const NextSlabTargetSchema = SlabConfigSchema.extend({
  trips_needed: z.number().describe('Number of additional trips required to reach this slab.'),
}).nullable();

const DriverPayoutInsightsOutputSchema = z.object({
  currentMonthTotalTrips: z.number().describe('Total trips recorded for the current month.'),
  currentSlabDetails: CurrentSlabDetailsSchema.describe('Details of the slab the driver is currently matched with, or null if no slab is matched yet.'),
  estimatedPayout: z.number().describe('The estimated payout for the current month based on matched slab.'),
  progressToNextSlab: z.string().describe('A human-readable description of the driver\'s progress towards the next payout slab.'),
  nextSlabTarget: NextSlabTargetSchema.describe('Details of the next achievable payout slab and trips needed, or null if already in the highest slab.'),
  aiInsights: z.array(z.string()).describe('AI-generated actionable insights and suggestions for the driver to reach the next payout slab, based on past performance and end-of-month trends.'),
});

export type DriverPayoutInsightsOutput = z.infer<typeof DriverPayoutInsightsOutputSchema>;

// Helper function to find matching slab
function findMatchingSlab(totalTrips: number, slabs: z.infer<typeof SlabConfigSchema>[]) {
  // Sort slabs by min_trips to ensure correct matching
  const sortedSlabs = [...slabs].sort((a, b) => a.min_trips - b.min_trips);
  for (const slab of sortedSlabs) {
    if (totalTrips >= slab.min_trips && totalTrips <= slab.max_trips) {
      return slab;
    }
  }
  return null;
}

// Helper function to find the next slab
function findNextSlab(totalTrips: number, slabs: z.infer<typeof SlabConfigSchema>[]) {
  const sortedSlabs = [...slabs].sort((a, b) => a.min_trips - b.min_trips);
  for (const slab of sortedSlabs) {
    if (totalTrips < slab.min_trips) {
      return slab;
    }
  }
  return null; // Already in the highest slab or no higher slab exists
}

const driverPayoutInsightsPrompt = ai.definePrompt({
  name: 'driverPayoutInsightsPrompt',
  input: {
    schema: z.object({
      driverId: z.string().describe('The unique identifier for the driver.'),
      currentMonthTotalTrips: z.number().describe('Total trips recorded for the current month so far.'),
      currentSlabDescription: z.string().describe('Human-readable description of the current slab progress and payout.'),
      estimatedPayout: z.number().describe('The estimated payout for the current month based on matched slab.'),
      nextSlabDescription: z.string().describe('Human-readable description of the next slab target and trips needed.'),
      tripsNeededForNextSlab: z.number().nullable().describe('Number of additional trips required to reach the next slab, or null if already in highest.'),
      currentMonthTripEntriesJson: z.string().describe('JSON string of detailed trip entries for the current month.'),
      pastMonthSummariesJson: z.string().describe('JSON string of summaries of the driver\'s past monthly performance.'),
    }),
  },
  output: {
    schema: z.object({
      aiInsights: z.array(z.string()).describe('Actionable insights and suggestions for the driver.'),
    }),
  },
  prompt: `You are an AI assistant for a water tanker business, providing insights to drivers to help them optimize their trips and reach higher payout slabs.
Analyze the provided driver data and generate actionable insights and suggestions.

Here is the current performance for Driver ID: {{{driverId}}}
Current month's total trips: {{{currentMonthTotalTrips}}}
Current slab progress: {{{currentSlabDescription}}}
Estimated payout for this month: ₹{{{estimatedPayout}}}
Next slab target: {{{nextSlabDescription}}}
Trips needed for next slab: {{{tripsNeededForNextSlab}}}

Current month's detailed trip entries:
JSON
{{{currentMonthTripEntriesJson}}}

Past month's performance summaries:
JSON
{{{pastMonthSummariesJson}}}

Based on this information, provide specific, actionable insights and suggestions for the driver to reach the next payout slab. Consider:
- Current performance patterns (e.g., types of trips, days with more trips).
- Historical performance trends from past months (e.g., if they typically increase trips towards the end of the month, or if they consistently miss a higher slab by a small margin).
- General strategies to increase trip count towards the end of the month.
- Emphasize achieving the '{{nextSlabDescription}}' if '{{tripsNeededForNextSlab}}' is not null.

Format your suggestions as an array of concise, actionable points. If the driver is already in the highest slab or no further slab is immediately reachable, provide encouragement or general tips for maintaining high performance.
`,
});

const driverPayoutInsightsFlow = ai.defineFlow(
  {
    name: 'driverPayoutInsightsFlow',
    inputSchema: DriverPayoutInsightsInputSchema,
    outputSchema: DriverPayoutInsightsOutputSchema,
  },
  async (input) => {
    const { driverId, currentMonthTotalTrips, slabConfiguration, currentMonthTripEntries, pastMonthSummaries } = input;

    // Sort slabs by min_trips for consistent logic
    const sortedSlabs = [...slabConfiguration].sort((a, b) => a.min_trips - b.min_trips);

    // Calculate current slab details
    let currentSlabDetails: z.infer<typeof CurrentSlabDetailsSchema> = null;
    let estimatedPayout = 0;
    let currentSlabDescription = `No slab matched yet for ${currentMonthTotalTrips} trips.`;

    const matchedSlab = findMatchingSlab(currentMonthTotalTrips, sortedSlabs);
    if (matchedSlab) {
      currentSlabDetails = matchedSlab;
      estimatedPayout = matchedSlab.payout_amount;
      currentSlabDescription = `You are currently in the ${matchedSlab.min_trips}-${matchedSlab.max_trips} trips slab (₹${matchedSlab.payout_amount}).`;
    }

    // Calculate next slab target
    let nextSlabTarget: z.infer<typeof NextSlabTargetSchema> = null;
    let tripsNeededForNextSlab: number | null = null;
    let nextSlabDescription = 'You have reached the highest payout slab.';
    let progressToNextSlab = `You are currently at ${currentMonthTotalTrips} trips.`;

    const nextPotentialSlab = findNextSlab(currentMonthTotalTrips, sortedSlabs);

    if (nextPotentialSlab) {
        tripsNeededForNextSlab = nextPotentialSlab.min_trips - currentMonthTotalTrips;
        nextSlabTarget = { ...nextPotentialSlab, trips_needed: tripsNeededForNextSlab };
        nextSlabDescription = `The next slab is ${nextPotentialSlab.min_trips}-${nextPotentialSlab.max_trips} trips (₹${nextPotentialSlab.payout_amount}).`;
        progressToNextSlab = `You need ${tripsNeededForNextSlab} more trips to reach the ${nextPotentialSlab.min_trips} trips slab (₹${nextPotentialSlab.payout_amount}).`;
    } else if (currentSlabDetails) {
      // If no next slab, and we are in a slab, user is at max.
      progressToNextSlab = `You have reached the highest payout slab! Keep up the great work.`;
    }

    const promptInput = {
      driverId,
      currentMonthTotalTrips,
      currentSlabDescription,
      estimatedPayout,
      nextSlabDescription,
      tripsNeededForNextSlab,
      currentMonthTripEntriesJson: JSON.stringify(currentMonthTripEntries, null, 2),
      pastMonthSummariesJson: JSON.stringify(pastMonthSummaries, null, 2),
    };

    const { output } = await driverPayoutInsightsPrompt(promptInput);

    return {
      currentMonthTotalTrips,
      currentSlabDetails,
      estimatedPayout,
      progressToNextSlab,
      nextSlabTarget,
      aiInsights: output?.aiInsights || [],
    };
  }
);

export async function driverPayoutInsights(input: DriverPayoutInsightsInput): Promise<DriverPayoutInsightsOutput> {
  return driverPayoutInsightsFlow(input);
}
