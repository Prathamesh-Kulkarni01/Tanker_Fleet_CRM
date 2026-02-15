'use client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayoutInsights } from '@/components/driver/payout-insights';
import { format, startOfMonth } from 'date-fns';
import { Truck, DollarSign, Award, Briefcase, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, query, where, updateDoc } from 'firebase/firestore';
import type { Trip, Route, Slab, Driver, Job } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


function AssignedJobs({ driverId }: { driverId: string; }) {
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
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }

    if (!jobs || jobs.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">{t('noAssignedJobs')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('checkBackLaterForNewJobs')}</p>
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
                            {(job.status === 'accepted' || job.status === 'in_progress') && (
                                 <Button asChild>
                                    <Link href={`/jobs/${job.id}`}>
                                        {job.status === 'accepted' ? t('startTrip') : t('continueTrip')}
                                    </Link>
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
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-8 w-48 mt-4" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
    </div>
  )
}


export default function DriverPage({ params: { driverId } }: { params: { driverId: string } }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const firestore = useFirestore();

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

  const totalTrips = useMemo(() => {
    return currentMonthTrips?.reduce((acc, t) => acc + t.count, 0) || 0;
  }, [currentMonthTrips]);
  
  const { estimatedPayout } = useMemo(() => {
    if (!slabs || slabs.length === 0) return { progressToNextSlab: 0 };
    const sortedSlabs = [...slabs].sort((a, b) => a.min_trips - b.min_trips);
    const current = [...sortedSlabs].reverse().find((s) => totalTrips >= s.min_trips);
    const payout = current ? current.payout_amount : 0;
    return { estimatedPayout: payout };
  }, [totalTrips, slabs]);

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
  
  const canViewPage = (user?.role === 'driver' && user.id === driverId) || (user?.role === 'owner' && driver.ownerId === user.id);
  
  if (!canViewPage) {
      return notFound();
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-lg">
          <AvatarImage
            src={driver.avatar?.imageUrl}
            alt={driver.name}
            data-ai-hint={driver.avatar?.imageHint}
          />
          <AvatarFallback className="text-4xl">{driver.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h1 className="mt-4 text-3xl font-bold font-headline sm:text-4xl">{driver.name}</h1>
        <p className="text-muted-foreground">{t('welcomeBack')}</p>
      </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5"/>
                    {t('assignedJobs')}
                </CardTitle>
                <CardDescription>
                    {t('acceptAndStartYourTrips')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AssignedJobs driverId={driverId} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5"/>
                    {t('monthlyPerformance')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Truck className="w-8 h-8 text-primary" />
                    <div>
                        <p className="text-muted-foreground">{t('currentMonthTrips')}</p>
                        <p className="font-bold text-lg">{totalTrips}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <DollarSign className="w-8 h-8 text-green-500" />
                    <div>
                        <p className="text-muted-foreground">{t('estimatedPayout')}</p>
                        <p className="font-bold text-lg">₹{estimatedPayout?.toLocaleString('en-IN') || 0}</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {!isLoading && driver && allTrips && routes && slabs && user?.role === 'driver' && (
            <PayoutInsights driver={driver} allTrips={allTrips} routes={routes} slabs={slabs} />
        )}
    </div>
  );
}
