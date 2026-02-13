'use client';
import { LiveMap } from '@/components/driver/live-map';
import { trips, routes, type Trip, type Route } from '@/lib/data';
import { useMemo, useState, useEffect } from 'react';

export default function LiveTripPage({ params }: { params: { tripId: string } }) {
  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [route, setRoute] = useState<Route | undefined>(undefined);

  useEffect(() => {
    let foundTrip = trips.find((t) => t.id === params.tripId);

    if (!foundTrip) {
      const recentTrips = JSON.parse(localStorage.getItem('recentTrips') || '[]') as Trip[];
      foundTrip = recentTrips.find((t) => t.id === params.tripId);
    }
    
    if (foundTrip) {
      setTrip(foundTrip);
      const foundRoute = routes.find((r) => r.id === foundTrip?.routeId);
      setRoute(foundRoute);
    }
  }, [params.tripId]);


  if (!trip || !route) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Trip not found. Please log the trip first.</p>
        </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <LiveMap trip={trip} route={route} />
    </div>
  );
}
