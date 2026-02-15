'use client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PayoutInsights } from '@/components/driver/payout-insights';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Truck, DollarSign, Award, TrendingUp, Calendar, MapPin, Phone, ShieldCheck, Banknote, Map } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useFirestore } from '@/firebase';
import { useCollection, useDoc } from '@/firebase/firestore';
import { collection, doc, query, where, Timestamp } from 'firebase/firestore';
import type { Trip, Route, Slab, Driver } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

function DriverPageSkeleton() {
  return (
    <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-10 w-48 mt-4" />
            <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
    </div>
  )
}


export default function DriverPage({ params }: { params: { driverId: string } }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const firestore = useFirestore();

  // Fetch driver data
  const driverRef = useMemo(() => firestore ? doc(firestore, 'users', params.driverId) : null, [firestore, params.driverId]);
  const { data: driver, loading: driverLoading } = useDoc<Driver>(driverRef);

  const ownerId = driver?.ownerId || user?.uid;

  // Fetch ALL trips for the driver, then filter by month on the client
  const allTripsQuery = useMemo(() => {
    if (!firestore || !params.driverId) return null;
    return query(
      collection(firestore, 'trips'),
      where('driverId', '==', params.driverId)
    );
  }, [firestore, params.driverId]);
  const { data: allTrips, loading: tripsLoading } = useCollection<Trip>(allTripsQuery);
  
  // Fetch owner's routes and slabs
  const routesQuery = useMemo(() => {
    if (!firestore || !ownerId) return null;
    return query(collection(firestore, 'routes'), where('ownerId', '==', ownerId));
  }, [firestore, ownerId]);
  const { data: routes, loading: routesLoading } = useCollection<Route>(routesQuery);

  const slabsQuery = useMemo(() => {
    if (!firestore || !ownerId) return null;
    return query(collection(firestore, 'payoutSlabs'), where('ownerId', '==', ownerId));
  }, [firestore, ownerId]);
  const { data: slabs, loading: slabsLoading } = useCollection<Slab>(slabsQuery);


  const currentMonthTrips = useMemo(() => {
    if (!allTrips) return [];
    const now = new Date();
    const monthStart = startOfMonth(now);
    return allTrips.filter(t => t.date.toDate() >= monthStart);
  }, [allTrips]);

  const latestTrip = useMemo(() => {
    if (!currentMonthTrips || currentMonthTrips.length === 0) return null;
    return [...currentMonthTrips].sort((a,b) => b.date.toDate().getTime() - a.date.toDate().getTime())[0];
  }, [currentMonthTrips]);

  const totalTrips = useMemo(() => {
    return currentMonthTrips?.reduce((acc, t) => acc + t.count, 0) || 0;
  }, [currentMonthTrips]);
  
  const { currentSlab, nextSlab, estimatedPayout, progressToNextSlab } = useMemo(() => {
    if (!slabs || slabs.length === 0) return { progressToNextSlab: 0 };
    const sortedSlabs = [...slabs].sort((a, b) => a.min_trips - b.min_trips);
    const current = [...sortedSlabs].reverse().find((s) => totalTrips >= s.min_trips);
    const next = sortedSlabs.find((s) => totalTrips < s.min_trips);
    const payout = current ? current.payout_amount : 0;
    const progress = next ? (totalTrips / next.min_trips) * 100 : 100;
    return { currentSlab: current, nextSlab: next, estimatedPayout: payout, progressToNextSlab: progress };
  }, [totalTrips, slabs]);


  const getRouteName = (routeId: string) => {
    if (!routes) return '...';
    const route = routes.find(r => r.id === routeId);
    return route ? `${route.source} → ${route.destinations.join(', ')}` : 'Unknown Route';
  }

  const isLoading = driverLoading || tripsLoading || routesLoading || slabsLoading;

  if (isLoading) {
    return <DriverPageSkeleton />;
  }

  if (!driver) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-lg">
          <AvatarImage
            src={driver.avatar?.imageUrl}
            alt={driver.name}
            data-ai-hint={driver.avatar?.imageHint}
          />
          <AvatarFallback className="text-5xl">{driver.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h1 className="mt-4 text-3xl font-bold font-headline sm:text-4xl">{driver.name}</h1>
        <p className="text-muted-foreground">{t('driverPerformanceOverview')}</p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-4">
              <Phone className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t('phoneNumber')}</p>
                <p className="font-bold text-lg">{driver.phone}</p>
              </div>
            </div>
             <div className="flex items-center gap-4">
              <ShieldCheck className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t('status')}</p>
                <Badge variant={driver.is_active ? 'secondary' : 'outline'}>
                    {driver.is_active ? t('active') : t('inactive')}
                </Badge>
              </div>
            </div>
             <div className="flex items-center gap-4">
              <Banknote className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t('paymentStatus')}</p>
                 <Badge variant='outline'>
                    {t('pending')}
                </Badge>
              </div>
            </div>
            {latestTrip && driver.is_active && (
                <div className="flex items-center gap-4">
                  <Map className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Live Location</p>
                    <Button asChild size="sm">
                        <Link href={`/trips/live/${latestTrip.id}`}>
                            Track Driver
                        </Link>
                    </Button>
                  </div>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <Truck className="w-8 h-8 text-primary" />
              <div>
                <p className="text-muted-foreground">{t('currentMonthTrips')}</p>
                <p className="font-bold text-lg">{totalTrips}</p>
              </div>
            </li>
            <Separator />
            <li className="flex items-center gap-4">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-muted-foreground">{t('estimatedPayout')}</p>
                <p className="font-bold text-lg">₹{estimatedPayout?.toLocaleString('en-IN') || 0}</p>
              </div>
            </li>
            <Separator />
            <li className="flex items-center gap-4">
              <Award className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-muted-foreground">{t('currentSlab')}</p>
                <p className="font-bold text-lg">
                  {currentSlab && currentSlab.payout_amount > 0
                    ? `${currentSlab.min_trips} - ${currentSlab.max_trips} trips`
                    : t('noSlabYet')}
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {nextSlab && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-primary" />
              {t('nextPayoutSlab')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-1">
              <p className="text-muted-foreground">
                <span className="font-bold text-foreground">
                  {t('needMoreTrips', { count: nextSlab.min_trips - totalTrips })}
                </span>
              </p>
              <p className="font-bold text-primary text-lg">
                ₹{nextSlab.payout_amount.toLocaleString('en-IN')}
              </p>
            </div>
            <Progress value={progressToNextSlab} />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {t('target', { count: nextSlab.min_trips })}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && driver && allTrips && routes && slabs && (
        <PayoutInsights driver={driver} allTrips={allTrips} routes={routes} slabs={slabs} />
      )}


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('currentMonthLog')}
          </CardTitle>
          <CardDescription>{t('currentMonthLogDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('route')}</TableHead>
                <TableHead className="text-right">{t('trips')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMonthTrips && [...currentMonthTrips]
                .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())
                .map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">
                      {format(trip.date.toDate(), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {getRouteName(trip.routeId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {trip.count}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
