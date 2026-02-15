'use client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PayoutInsights } from '@/components/driver/payout-insights';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Truck, DollarSign, Award, TrendingUp, Calendar, MapPin, Phone, ShieldCheck, Banknote, Map, Briefcase, BookOpen, User as UserIcon, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useFirestore } from '@/firebase';
import { useCollection, useDoc } from '@/firebase/firestore';
import { collection, doc, query, where, Timestamp, updateDoc } from 'firebase/firestore';
import type { Trip, Route, Slab, Driver, Job } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


function AssignedJobs({ driverId, ownerId }: { driverId: string; ownerId: string; }) {
    const { t } = useI18n();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const jobsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'jobs'),
            where('driverId', '==', driverId),
            where('status', 'in', ['assigned', 'accepted', 'in_progress'])
        );
    }, [firestore, driverId]);

    const { data: jobs, loading: jobsLoading } = useCollection<Job>(jobsQuery);
    
    const handleAcceptJob = async (jobId: string) => {
        if (!firestore) return;
        setIsSubmitting(jobId);
        const jobRef = doc(firestore, 'jobs', jobId);
        try {
            await updateDoc(jobRef, { status: 'accepted' });
            toast({ title: t('jobAccepted'), description: t('youCanStartTheTrip') });
        } catch (e) {
            toast({ variant: 'destructive', title: t('error'), description: t('couldNotAcceptJob') });
            console.error("Error accepting job: ", e);
        } finally {
            setIsSubmitting(null);
        }
    }
    
    if (jobsLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    if (!jobs || jobs.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">{t('noAssignedJobs')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('noAssignedJobsDescription')}</p>
                    <Button className="mt-4" disabled>{t('requestAJob')}</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {jobs.map(job => (
                 <Card key={job.id}>
                    <CardHeader>
                        <CardTitle>{job.routeName}</CardTitle>
                        <CardDescription>Assigned: {format(job.assignedAt.toDate(), 'PPpp')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                         <Badge variant={
                            job.status === 'assigned' ? 'default' :
                            job.status === 'accepted' ? 'secondary' :
                            'outline'
                         }>{t(job.status)}</Badge>
                         <div>
                            {job.status === 'assigned' && (
                                <Button onClick={() => handleAcceptJob(job.id)} disabled={isSubmitting === job.id}>
                                    {isSubmitting === job.id ? t('accepting') : t('accept')}
                                </Button>
                            )}
                            {job.status === 'accepted' && (
                                 <Button asChild>
                                    <Link href={`/jobs/${job.id}`}>{t('startTrip')}</Link>
                                 </Button>
                            )}
                             {job.status === 'in_progress' && (
                                 <Button asChild>
                                    <Link href={`/jobs/${job.id}`}>{t('continueTrip')}</Link>
                                 </Button>
                            )}
                         </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function DriverPageSkeleton() {
  return (
    <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-10 w-48 mt-4" />
            <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm mx-auto" />
        <Skeleton className="h-64 w-full" />
    </div>
  )
}


export default function DriverPage({ params }: { params: { driverId: string } }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { driverId } = params;

  const driverRef = useMemo(() => firestore ? doc(firestore, 'users', driverId) : null, [firestore, driverId]);
  const { data: driver, loading: driverLoading, error: driverError } = useDoc<Driver>(driverRef);

  const ownerId = driver?.ownerId || user?.uid;

  const allTripsQuery = useMemo(() => {
    if (!firestore || !driverId) return null;
    return query(
      collection(firestore, 'trips'),
      where('driverId', '==', driverId)
    );
  }, [firestore, driverId]);
  const { data: allTrips, loading: tripsLoading } = useCollection<Trip>(allTripsQuery);
  
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

  if (driverError || !driver) {
      return (
           <div className="p-4 md:p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        { driverError ? "Could not load driver data." : "Driver not found."}
                    </AlertDescription>
                </Alert>
            </div>
      )
  }
  
  const canViewPage = user?.role === 'driver' && user.id === driverId || user?.role === 'owner' && driver.ownerId === user.id;
  
  if (!canViewPage) {
      return notFound();
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

       <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview"><UserIcon className="mr-2" />{t('overview')}</TabsTrigger>
          <TabsTrigger value="jobs"><Briefcase className="mr-2"/>{t('assignedJobs')}</TabsTrigger>
          <TabsTrigger value="logbook"><BookOpen className="mr-2"/>{t('logbook')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6 space-y-6">
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
        </TabsContent>
        <TabsContent value="jobs" className="mt-6">
            <AssignedJobs driverId={driverId} ownerId={ownerId} />
        </TabsContent>
        <TabsContent value="logbook" className="mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
