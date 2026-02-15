'use client';
import { notFound, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayoutInsights } from '@/components/driver/payout-insights';
import { format, startOfMonth } from 'date-fns';
import { Truck, DollarSign, Award, Briefcase, AlertCircle, Check, MapPin, Anchor, Pencil, Send, CheckCircle, ArrowLeft, RotateCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, query, where, updateDoc, arrayUnion, Timestamp, addDoc } from 'firebase/firestore';
import type { Trip, Route, Slab, Driver, Job } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DriverLocationUpdater } from '@/components/driver/driver-location-updater';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';


function DriverTripTimeline({ jobId, onBack }: { jobId: string, onBack: () => void }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useAuth();
    
    const [notes, setNotes] = useState('');
    const [submittingAction, setSubmittingAction] = useState<string | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);

    const jobRef = useMemo(() => firestore ? doc(firestore, 'jobs', jobId) : null, [firestore, jobId]);
    const { data: job, loading: jobLoading } = useDoc<Job>(jobRef);

    const routeRef = useMemo(() => (firestore && job) ? doc(firestore, 'routes', job.routeId) : null, [firestore, job]);
    const { data: route, loading: routeLoading } = useDoc<Route>(routeRef);
    
    const handleCompleteTrip = async () => {
        if (!firestore || !job || !user || !route || !jobRef) return;

        setSubmittingAction('complete_trip');
        try {
            // 1. Log the final "completed" event
            const event = {
                timestamp: Timestamp.now(),
                location: 'Trip End',
                action: 'Trip Completed by Driver',
                notes: '',
            };
            const jobUpdatePromise = updateDoc(jobRef, {
                status: 'completed',
                events: arrayUnion(event),
            });

            // 2. Create a trip entry for reporting and payroll
            const tripData: Omit<Trip, 'id'> = {
                ownerId: job.ownerId,
                driverId: job.driverId,
                routeId: job.routeId,
                count: 1, // Each job is counted as 1 trip
                date: job.assignedAt, // Use the date the job was assigned for consistency
            };
            const tripAddPromise = addDoc(collection(firestore, 'trips'), tripData);

            await Promise.all([jobUpdatePromise, tripAddPromise]);
            
            toast({ 
                title: t('tripCompleted'),
                description: t('yourTripHasBeenLogged')
            });
            setIsCompleted(true);

        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: t('couldNotCompleteTrip') });
        } finally {
            setSubmittingAction(null);
        }
    };
    
    const handleAction = async (location: string, action: string) => {
        if (!firestore || !jobRef) return;
        setSubmittingAction(action);
        
        const event = {
            timestamp: Timestamp.now(),
            location,
            action,
            notes: notes,
        };

        const updates: any = {
            events: arrayUnion(event)
        };

        if (job?.status === 'accepted') {
            updates.status = 'in_progress';
        }
        
        try {
            await updateDoc(jobRef, updates);
            toast({ title: t('actionLogged'), description: `${action} at ${location}`});
            setNotes('');
        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: t('couldNotLogAction')});
        } finally {
            setSubmittingAction(null);
        }
    };

    const handleRequestAgain = async () => {
        if (!firestore || !user || !job) return;
        setSubmittingAction('request_again');
        try {
            await addDoc(collection(firestore, 'jobs'), {
                ownerId: job.ownerId,
                driverId: job.driverId,
                routeId: job.routeId,
                routeName: job.routeName,
                status: 'requested',
                assignedAt: Timestamp.now(),
                events: [],
            });
            toast({ title: t('tripRequested'), description: t('ownerHasBeenNotified') });
            onBack(); // Go back to job list
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: t('couldNotRequestTrip') });
        } finally {
            setSubmittingAction(null);
        }
    };
    
    const isLoading = jobLoading || routeLoading;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        )
    }
    
    if (!job) {
        return notFound();
    }
    
    if (isCompleted || job.status === 'completed') {
        return (
            <Card className="text-center">
                <CardHeader>
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <CardTitle className="text-2xl">{t('tripCompleted')}</CardTitle>
                    <CardDescription>{t('yourTripHasBeenLogged')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button onClick={handleRequestAgain} disabled={!!submittingAction}>
                        <RotateCw className="mr-2 h-4 w-4" />
                        {submittingAction === 'request_again' ? t('requesting') : t('requestSameTripAgain')}
                    </Button>
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('backToJobs')}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (!route) {
        return (
            <div className="p-4 md:p-8">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('error')}</AlertTitle>
                  <AlertDescription>
                    Could not load route data for this job. The route may have been deleted.
                  </AlertDescription>
                </Alert>
            </div>
        )
    }

    const timelineSteps = [
        { name: route.source, type: 'source' as const }, 
        ...route.destinations.map((dest, i) => ({ name: dest, type: 'destination' as const, index: i+1 }))
    ];

    const isActionLogged = (location: string, action: string) => {
        return job.events.some(e => e.location === location && e.action.includes(action));
    }

    const isStepComplete = (step: typeof timelineSteps[number]) => {
        const requiredAction = step.type === 'source' ? 'Water Filled' : 'Water Delivered';
        return isActionLogged(step.name, requiredAction);
    }
    
    const allStepsComplete = timelineSteps.every(isStepComplete);

    return (
        <div className="space-y-6">
            {user?.role === 'driver' && <DriverLocationUpdater />}

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><ArrowLeft/></Button>
                            <div>
                                <CardTitle className="text-2xl font-bold font-headline">{job.routeName}</CardTitle>
                                <CardDescription className="text-base">{t('assignedOn')}: {format(job.assignedAt.toDate(), 'PPp')}</CardDescription>
                            </div>
                        </div>
                        <Badge variant={job.status === 'completed' ? 'default' : 'secondary'} className="text-lg px-4 py-1">{t(job.status)}</Badge>
                    </div>
                </CardHeader>
            </Card>

            <div className="space-y-8">
                 <div className="relative flex flex-col gap-8 pl-6 before:absolute before:left-6 before:top-5 before:h-full before:w-0.5 before:bg-border">
                    {timelineSteps.map((step, index) => {
                        const isComplete = isStepComplete(step);
                        const actions = step.type === 'source' 
                            ? [{ name: 'Arrived at Source', logged: isActionLogged(step.name, 'Arrived')}, { name: 'Water Filled', logged: isActionLogged(step.name, 'Filled')}]
                            : [{ name: 'Arrived at Destination', logged: isActionLogged(step.name, 'Arrived')}, { name: 'Water Delivered', logged: isActionLogged(step.name, 'Delivered')}];

                        return (
                        <div key={index} className="relative">
                            <div className={`absolute -left-9 flex items-center justify-center h-6 w-6 rounded-full ${isComplete ? 'bg-green-500' : 'bg-primary'} text-primary-foreground`}>
                                {isComplete ? <Check size={16} /> : (step.type === 'source' ? <Anchor size={16}/> : <MapPin size={16}/>)}
                            </div>
                            <Card className={cn("transition-all", isComplete ? 'bg-muted/30 border-green-500/30' : 'border-primary/30', job.status === 'completed' && 'bg-muted/30')}>
                                 <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl">{step.name}</CardTitle>
                                            <CardDescription>{step.type === 'source' ? t('source') : `${t('destination')} ${step.index}`}</CardDescription>
                                        </div>
                                        {isComplete && <CheckCircle className="text-green-500"/>}
                                    </div>
                                 </CardHeader>
                                 {job.status !== 'completed' && !isComplete && (
                                    <CardContent className="space-y-4 pt-0">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {actions.map(action => (
                                                <Button 
                                                    key={action.name}
                                                    variant={action.logged ? "secondary" : "default"}
                                                    className="w-full justify-center gap-2 h-14 text-base"
                                                    onClick={() => handleAction(step.name, action.name)}
                                                    disabled={action.logged || !!submittingAction}
                                                >
                                                    {action.logged ? <Check className="text-green-500"/> : <Truck/>}
                                                    {t(action.name.toLowerCase().replace(/\s/g, ''))}
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <Pencil className="text-muted-foreground"/>
                                            <Textarea 
                                                placeholder={t('addOptionalNote')}
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                disabled={!!submittingAction}
                                                rows={1}
                                                className="resize-none"
                                            />
                                            <Button variant="ghost" size="icon" disabled={!notes || !!submittingAction} onClick={() => handleAction(step.name, "Note Added")}>
                                                <Send/>
                                            </Button>
                                        </div>
                                    </CardContent>
                                 )}
                            </Card>
                        </div>
                    )})}
                 </div>
            </div>

            {job.status !== 'completed' && allStepsComplete && (
                <Card className="bg-green-500/10 border-green-500/50 text-center shadow-lg">
                    <CardHeader>
                        <CardTitle>All Destinations Covered!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">You have completed all steps. Ready to complete the trip?</p>
                        <Button
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleCompleteTrip}
                            disabled={!!submittingAction}
                        >
                            {submittingAction === 'complete_trip' ? 'Completing...' : 'Complete & Log Trip'}
                        </Button>
                    </CardContent>
                </Card>
            )}

             {job.status === 'completed' && (
                <Alert>
                  <Truck className="h-4 w-4" />
                  <AlertTitle>Trip Completed</AlertTitle>
                  <AlertDescription>
                    This trip is logged and marked as completed.
                  </AlertDescription>
                </Alert>
             )}
        </div>
    );
}

function AssignedJobs({ driverId, onStartTrip }: { driverId: string; onStartTrip: (jobId: string) => void; }) {
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
                                 <Button onClick={() => onStartTrip(job.id)}>
                                     {job.status === 'accepted' ? t('startTrip') : t('continueTrip')}
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


export default function DriverPage() {
  const params = useParams();
  const driverId = params.driverId as string;
  const { t } = useI18n();
  const { user } = useAuth();
  const firestore = useFirestore();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

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

  if (activeJobId) {
    return <DriverTripTimeline jobId={activeJobId} onBack={() => setActiveJobId(null)} />;
  }

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
            <CardContent className="pt-6">
                <AssignedJobs driverId={driverId} onStartTrip={setActiveJobId} />
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
