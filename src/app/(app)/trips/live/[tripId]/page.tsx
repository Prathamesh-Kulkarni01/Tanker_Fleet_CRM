
'use client';
import { useParams } from 'next/navigation';
import { LiveMap } from '@/components/driver/live-map';
import type { Trip, Route } from '@/lib/data';
import { useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';

export default function LiveTripPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const firestore = useFirestore();
  const { t } = useI18n();

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
            <p className="z-10 animate-pulse font-semibold">{t('loadingLiveMap')}</p>
        </div>
    );
  }

  if (!trip || !route) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>{t('tripNotFoundLogFirst')}</p>
        </div>
    );
  }


  return (
    <div className="absolute inset-0">
      <LiveMap trip={trip} route={route} />
    </div>
  );
}
