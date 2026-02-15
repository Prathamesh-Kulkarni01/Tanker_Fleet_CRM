'use client';
import { LiveMap } from '@/components/driver/live-map';
import type { Trip, Route } from '@/lib/data';
import { useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function LiveTripPage({ params }: { params: { tripId: string } }) {
  const firestore = useFirestore();
  const { tripId } = params;

  const tripRef = useMemo(() => {
    if (!firestore || !tripId) return null;
    return doc(firestore, 'trips', tripId);
  }, [firestore, tripId]);
  const { data: trip, loading: tripLoading } = useDoc<Trip>(tripRef);

  const routeRef = useMemo(() => {
    if (!firestore || !trip?.routeId) return null;
    return doc(firestore, 'routes', trip.routeId);
  }, [firestore, trip]);
  const { data: route, loading: routeLoading } = useDoc<Route>(routeRef);


  if (tripLoading || routeLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Skeleton className="absolute inset-0" />
            <p className="z-10 animate-pulse font-semibold">Loading Live Map...</p>
        </div>
    );
  }

  if (!trip || !route) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Trip not found. Please log the trip first.</p>
        </div>
    );
  }


  return (
    <div className="absolute inset-0">
      <LiveMap trip={trip} route={route} />
    </div>
  );
}
