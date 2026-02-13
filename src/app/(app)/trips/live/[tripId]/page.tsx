'use client';
import { LiveMap } from '@/components/driver/live-map';
import { trips, routes } from '@/lib/data';
import { useMemo } from 'react';

export default function LiveTripPage({ params }: { params: { tripId: string } }) {
  const trip = useMemo(() => trips.find((t) => t.id === params.tripId), [
    params.tripId,
  ]);
  const route = useMemo(() => routes.find((r) => r.id === trip?.routeId), [
    trip,
  ]);

  // A more robust solution would check this before hooks or in a parent component
  if (!trip || !route) {
    // A real-world app would have a proper loading/error state management
    const simulatedTrip = recentTrips.find(t => t.id === params.tripId);
     if (simulatedTrip) {
         const foundRoute = routes.find(r => r.id === simulatedTrip.routeId);
         if (foundRoute) {
            return (
                <div className="h-screen w-screen">
                    <LiveMap trip={simulatedTrip} route={foundRoute} />
                </div>
            );
         }
     }
    
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Trip not found. Please log the trip first.</p>
        </div>
    );
  }

  // Find the trip from the global trips array or recent trips if not found
  // This logic is simplified for this demo.
  const recentTrips = (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('recentTrips') || '[]')) || [];
  const finalTrip = trips.find(t => t.id === params.tripId) || recentTrips.find(t => t.id === params.tripId);


  return (
    <div className="h-screen w-screen">
      <LiveMap trip={trip} route={route} />
    </div>
  );
}
