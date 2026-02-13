'use server';

import { driverPayoutInsights, DriverPayoutInsightsInput } from '@/ai/flows/driver-payout-insights-flow';
import { trips, drivers, slabs, pastMonthSummaries, routes } from './data';
import { format } from 'date-fns';

export async function getDriverInsights(driverId: string) {
  try {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) {
      throw new Error('Driver not found');
    }

    const now = new Date();
    const currentMonthStr = format(now, 'yyyy-MM');

    // Get current month's trip entries
    const currentMonthTripEntries = trips
      .filter(t => t.driverId === driverId && t.date.startsWith(currentMonthStr))
      .map(t => {
          const route = routes.find(r => r.id === t.routeId);
          return {
            trip_type: route ? `${route.source} → ${route.destinations.join(', ')}` : 'Unknown Route',
            trip_count: t.count,
            date: t.date,
          }
      });

    // Calculate total trips for the current month
    const currentMonthTotalTrips = currentMonthTripEntries.reduce((acc, t) => acc + t.trip_count, 0);

    // Get past month summaries for the specific driver
    const driverPastMonthSummaries = pastMonthSummaries
      .filter(s => s.driverId === driverId)
      .map(s => ({
        month: s.month,
        total_trips: s.total_trips,
        payout: s.payout,
      }));

    // Prepare the input for the AI flow
    const input: DriverPayoutInsightsInput = {
      driverId: driver.id,
      currentMonthTotalTrips,
      slabConfiguration: slabs,
      currentMonthTripEntries,
      pastMonthSummaries: driverPastMonthSummaries,
    };

    // Call the AI flow
    const insights = await driverPayoutInsights(input);

    return { success: true, data: insights };
  } catch (error) {
    console.error("Error getting driver insights:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}
