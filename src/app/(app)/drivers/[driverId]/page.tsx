
'use client';
import { notFound, useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayoutInsights } from '@/components/driver/payout-insights';
import { format, startOfMonth } from 'date-fns';
import { Truck, DollarSign, Award, AlertCircle, Briefcase, Play, History, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, query, where, addDoc, Timestamp } from 'firebase/firestore';
import type { Trip, Route, Slab, Driver, Job } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DriverJobManager } from '@/components/driver/DriverJobManager';
import { useToast } from '@/hooks/use-toast';

function DriverPageSkeleton() {
  return (
    <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-8 w-48 mt-4" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
    </div>
  )
}

function AssignedJobsList({ jobs, onStartJob, title, icon }: { jobs: Job[], onStartJob: (job: Job) => void, title: string, icon: React.ReactNode }) {
    const { t } = useI18n();

    if (jobs.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {jobs.map(job => (
                     <Card key={job.id} className="bg-muted/50">
                        <CardHeader>
                            <CardTitle>{job.routeName}</CardTitle>
                            <CardDescription>
                                {t('assignedOn')}: {format(job.assignedAt.toDate(), 'PP')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-end">
                            <Button onClick={() => onStartJob(job)}>
                                {job.status === 'in_progress' ? t('resumeJob') : t('startJob')}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </CardContent>
        </Card>
    )
}


export default function DriverPage() {
  const params = useParams();
  const driverId = params.driverId as string;
  const { t } = useI18n();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);

  const driverRef = useMemo(() => firestore ? doc(firestore, 'users', driverId) : null, [firestore, driverId]);
  const { data: driver, loading: driverLoading, error: driverError } = useDoc<Driver>(driverRef);

  const jobsQuery = useMemo(() => {
    if (!firestore || !driverId) return null;
    return query(
      collection(firestore, 'jobs'),
      where('driverId', '==', driverId),
      where('status', 'in', ['assigned', 'accepted', 'in_progress'])
    );
  }, [firestore, driverId]);
  const { data: jobs, loading: jobsLoading } = useCollection<Job>(jobsQuery);

  const requestedJobsQuery = useMemo(() => {
    if (!firestore || !driverId) return null;
    return query(
      collection(firestore, 'jobs'),
      where('driverId', '==', driverId),
      where('status', '==', 'requested')
    );
  }, [firestore, driverId]);
  const { data: requestedJobsByThisDriver, loading: requestedJobsLoading } = useCollection<Job>(requestedJobsQuery);


  const assignedJobs = useMemo(() => jobs?.filter(j => j.status === 'assigned' || j.status === 'accepted').sort((a,b) => b.assignedAt.toDate() - a.assignedAt.toDate()) || [], [jobs]);
  const inProgressJobs = useMemo(() => jobs?.filter(j => j.status === 'in_progress').sort((a,b) => b.assignedAt.toDate() - a.assignedAt.toDate()) || [], [jobs]);


  const allTripsQuery = useMemo(() => {
    if (!firestore || !driverId) return null;
    return query(
      collection(firestore, 'trips'),
      where('driverId', '==', driverId)
    );
  }, [firestore, driverId]);
  const { data: allTrips, loading: tripsLoading } = useCollection<Trip>(allTripsQuery);
  
  const routesQuery = useMemo(() => {
    if (!firestore || !driver?.ownerId) return null;
    return query(collection(firestore, 'routes'), where('ownerId', '==', driver.ownerId), where('is_active', '==', true));
  }, [firestore, driver?.ownerId]);
  const { data: routes, loading: routesLoading } = useCollection<Route>(routesQuery);

  const slabsQuery = useMemo(() => {
    if (!firestore || !driver?.ownerId) return null;
    return query(collection(firestore, 'payoutSlabs'), where('ownerId', '==', driver.ownerId));
  }, [firestore, driver?.ownerId]);
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
    if (!slabs || slabs.length === 0) return { estimatedPayout: 0 };
    const sortedSlabs = [...slabs].sort((a, b) => a.min_trips - b.min_trips);
    const current = [...sortedSlabs].reverse().find((s) => totalTrips >= s.min_trips);
    const payout = current ? current.payout_amount : 0;
    return { estimatedPayout: payout };
  }, [totalTrips, slabs]);

  const handleRequestJob = async (route: Route) => {
    if (!firestore || !driver) return;

    const alreadyRequested = requestedJobsByThisDriver?.some(j => j.routeId === route.id);
    if (alreadyRequested) {
        toast({ title: t('requestAlreadySent'), description: t('ownerWillApprove') });
        return;
    }
    
    setIsRequesting(route.id);

    try {
        await addDoc(collection(firestore, 'jobs'), {
            ownerId: driver.ownerId,
            driverId: driver.id,
            routeId: route.id,
            routeName: route.name,
            status: 'requested',
            assignedAt: Timestamp.now(),
            events: [],
        });
        toast({ title: t('jobRequested'), description: t('ownerWillBeNotified') });
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: t('error'), description: t('couldNotRequestJob') });
    } finally {
        setIsRequesting(null);
    }
  };


  const isLoading = driverLoading || tripsLoading || routesLoading || slabsLoading || jobsLoading || requestedJobsLoading;

  if (isLoading) {
    return <DriverPageSkeleton />;
  }

  if (driverError || !driver) {
      return (
           <div className="p-4 md:p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('error')}</AlertTitle>
                    <AlertDescription>
                        { driverError ? t('couldNotLoadDriverData') : t('driverNotFound')}
                    </AlertDescription>
                </Alert>
            </div>
      )
  }
  
  const canViewPage = (user?.role === 'driver' && user.id === driverId) || (user?.role === 'owner' && driver.ownerId === user.id);
  
  if (!canViewPage) {
      return notFound();
  }
  
  const activeJobRoute = activeJob ? routes?.find(r => r.id === activeJob.routeId) : null;
  if (activeJob && activeJobRoute) {
    return <DriverJobManager 
      job={activeJob} 
      route={activeJobRoute} 
      driver={driver} 
      onJobFinished={() => setActiveJob(null)} 
    />;
  }

  const noJobsAvailable = assignedJobs.length === 0 && inProgressJobs.length === 0;

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

        {noJobsAvailable && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5"/>
                        {t('noAssignedJobs')}
                    </CardTitle>
                    <CardDescription>{t('noAssignedJobsDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <h4 className="font-semibold mb-4">{t('availableRoutesForRequest')}</h4>
                    {routes && routes.length > 0 ? (
                        <div className="space-y-4">
                            {routes.map(route => {
                                const isRequested = requestedJobsByThisDriver?.some(j => j.routeId === route.id);
                                return (
                                    <div key={route.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                        <div>
                                            <p className="font-semibold">{route.name}</p>
                                            <p className="text-sm text-muted-foreground">₹{route.rate_per_trip}/{t('trip')}</p>
                                        </div>
                                        <Button 
                                            onClick={() => handleRequestJob(route)} 
                                            disabled={isRequested || !!isRequesting}
                                            size="sm"
                                        >
                                            {isRequesting === route.id ? <Loader2 className="animate-spin" /> : (isRequested ? t('requestSent') : t('requestJob'))}
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('noRoutesAvailableToRequest')}</p>
                    )}
                </CardContent>
            </Card>
        )}
        
        <AssignedJobsList jobs={inProgressJobs} onStartJob={setActiveJob} title={t('inProgressJobs')} icon={<History />} />
        <AssignedJobsList jobs={assignedJobs} onStartJob={setActiveJob} title={t('todaysAssignedJobs')} icon={<Play />} />

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
