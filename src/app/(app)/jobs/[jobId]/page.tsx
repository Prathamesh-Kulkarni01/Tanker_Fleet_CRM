'use client';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { useAuth } from '@/contexts/auth';
import { doc, updateDoc, arrayUnion, Timestamp, addDoc, collection } from 'firebase/firestore';
import type { Job, Route, Trip } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Check, Truck, MapPin, Anchor, AlertCircle, Pencil, Send, CheckCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DriverLocationUpdater } from '@/components/driver/driver-location-updater';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';


function JobPageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
    )
}

export default function JobPage() {
    const params = useParams();
    const jobId = params.jobId as string;
    const { t } = useI18n();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useAuth();
    const router = useRouter();

    const [notes, setNotes] = useState('');
    const [submittingAction, setSubmittingAction] = useState<string | null>(null);

    const jobRef = useMemo(() => firestore ? doc(firestore, 'jobs', jobId) : null, [firestore, jobId]);
    const { data: job, loading: jobLoading } = useDoc<Job>(jobRef);

    const routeRef = useMemo(() => (firestore && job) ? doc(firestore, 'routes', job.routeId) : null, [firestore, job]);
    const { data: route, loading: routeLoading } = useDoc<Route>(routeRef);

    const handleCompleteTrip = async () => {
        if (!firestore || !job || !user || !route) return;

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
            router.push(`/drivers/${user.id}`);

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
    
    const isLoading = jobLoading || routeLoading;

    if (isLoading) {
        return <JobPageSkeleton />;
    }
    
    if (!job) {
        return notFound();
    }

    const canView = (user?.role === 'driver' && user.id === job.driverId) || (user?.role === 'owner' && user.id === job.ownerId);
    if (!canView) {
        return notFound();
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
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-bold font-headline">{job.routeName}</CardTitle>
                            <CardDescription className="text-base">{t('assignedOn')}: {format(job.assignedAt.toDate(), 'PPp')}</CardDescription>
                        </div>
                        <Badge variant={job.status === 'completed' ? 'default' : 'secondary'} className="text-lg px-4 py-1">{t(job.status)}</Badge>
                    </div>
                </CardHeader>
            </Card>

            <div className="space-y-8">
                <h2 className="text-2xl font-bold font-headline">{t('tripTimeline')}</h2>
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
