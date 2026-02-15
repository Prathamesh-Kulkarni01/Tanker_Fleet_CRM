'use server';

import { driverPayoutInsights, DriverPayoutInsightsInput } from '@/ai/flows/driver-payout-insights-flow';
import type { Driver, Route, Trip, Slab } from '@/lib/data';
import { format, getMonth, getYear } from 'date-fns';


export async function getDriverInsights(driver: Driver, allTrips: (Omit<Trip, 'date'> & { date: string })[], slabs: Slab[], routes: Route[]) {
  try {
    if (!driver) {
      throw new Error('Driver not found');
    }

    const now = new Date();
    const currentMonthStr = format(now, 'yyyy-MM');

    // 3. Process current month's trips
    const currentMonthTripEntries = allTrips
      .filter(t => {
        const tripDate = new Date(t.date);
        return format(tripDate, 'yyyy-MM') === currentMonthStr;
      })
      .map(t => {
          const route = routes.find(r => r.id === t.routeId);
          return {
            trip_type: route ? `${route.source} → ${route.destinations.join(', ')}` : 'Unknown Route',
            trip_count: t.count,
            date: format(new Date(t.date), 'yyyy-MM-dd'),
          }
      });
    
    const currentMonthTotalTrips = currentMonthTripEntries.reduce((acc, t) => acc + t.trip_count, 0);

    // 4. Process past month summaries
    const pastMonthSummaries: { month: string; total_trips: number; payout: number; }[] = [];
    for (let i = 1; i <= 3; i++) {
        const d = new Date(getYear(now), getMonth(now) - i, 1);
        const year = getYear(d);
        const month = getMonth(d);
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

        const monthTrips = allTrips.filter(t => {
            const tripDate = new Date(t.date);
            return format(tripDate, 'yyyy-MM') === monthStr;
        });

        const total_trips = monthTrips.reduce((acc, t) => acc + t.count, 0);

        if (total_trips > 0) {
            const matchedSlab = [...slabs].sort((a,b) => b.min_trips - a.min_trips).find(s => total_trips >= s.min_trips);
            const payout = matchedSlab ? matchedSlab.payout_amount : 0;
            pastMonthSummaries.push({ month: monthStr, total_trips, payout });
        }
    }


    // Prepare the input for the AI flow
    const input: DriverPayoutInsightsInput = {
      driverId: driver.id,
      currentMonthTotalTrips,
      slabConfiguration: slabs.map(s => ({min_trips: s.min_trips, max_trips: s.max_trips, payout_amount: s.payout_amount})),
      currentMonthTripEntries,
      pastMonthSummaries: pastMonthSummaries,
    };

    // Call the AI flow
    const insights = await driverPayoutInsights(input);

    return { success: true, data: insights };
  } catch (error) {
    console.error("Error getting driver insights:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}
