'use client';
import { notFound } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import type { Job, Route } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Check, Truck, MapPin, Anchor } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

function JobPageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
    )
}

export default function JobPage({ params: { jobId } }: { params: { jobId: string } }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [notes, setNotes] = useState('');
    const [submittingAction, setSubmittingAction] = useState<string | null>(null);

    const jobRef = useMemo(() => firestore ? doc(firestore, 'jobs', jobId) : null, [firestore, jobId]);
    const { data: job, loading: jobLoading } = useDoc<Job>(jobRef);

    const routeRef = useMemo(() => (firestore && job) ? doc(firestore, 'routes', job.routeId) : null, [firestore, job]);
    const { data: route, loading: routeLoading } = useDoc<Route>(routeRef);

    const handleAction = async (location: string, action: string, isFinalStep: boolean) => {
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
        if (isFinalStep) {
            updates.status = 'completed';
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

    if (jobLoading || routeLoading) {
        return <JobPageSkeleton />;
    }
    
    if (!job || !route) {
        return notFound();
    }

    const timelineSteps = [
        { name: route.source, type: 'source' as const }, 
        ...route.destinations.map((dest, i) => ({ name: dest, type: 'destination' as const }))
    ];

    const isActionLogged = (location: string, action: string) => {
        return job.events.some(e => e.location === location && e.action.includes(action));
    }

    const isStepComplete = (location: string, type: 'source' | 'destination') => {
        if (type === 'source') {
            return isActionLogged(location, 'Filled');
        }
        return isActionLogged(location, 'Delivered');
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{t('trip')}: {job.routeName}</CardTitle>
                            <CardDescription>{t('assignedOn')}: {format(job.assignedAt.toDate(), 'PPp')}</CardDescription>
                        </div>
                        <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>{t(job.status)}</Badge>
                    </div>
                </CardHeader>
            </Card>

            <div className="space-y-4">
                <h2 className="text-xl font-bold font-headline">{t('tripTimeline')}</h2>
                 <div className="flex flex-col gap-6">
                    {timelineSteps.map((step, index) => {
                        const isComplete = isStepComplete(step.name, step.type);
                        const isFinalStep = index === timelineSteps.length - 1;

                        const sourceActions = [
                            { name: 'Arrived at Source', logged: isActionLogged(step.name, 'Arrived')},
                            { name: 'Water Filled', logged: isActionLogged(step.name, 'Filled')},
                        ];
                         const destActions = [
                            { name: 'Arrived at Destination', logged: isActionLogged(step.name, 'Arrived')},
                            { name: 'Water Delivered', logged: isActionLogged(step.name, 'Delivered')},
                        ];
                        const actions = step.type === 'source' ? sourceActions : destActions;

                        return (
                        <Card key={index} className={isComplete ? 'bg-muted/50 border-green-500/50' : ''}>
                             <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className={`flex items-center justify-center h-10 w-10 rounded-full ${isComplete ? 'bg-green-500' : 'bg-primary'} text-primary-foreground`}>
                                        {isComplete ? <Check /> : (step.type === 'source' ? <Anchor/> : <MapPin/>)}
                                    </div>
                                    <div>
                                        <CardTitle>{step.name}</CardTitle>
                                        <CardDescription>{step.type === 'source' ? t('source') : `${t('destination')} ${index}`}</CardDescription>
                                    </div>
                                </div>
                             </CardHeader>
                             {job.status !== 'completed' && !isComplete && (
                                <CardContent className="space-y-4 pt-0">
                                    <div className="space-y-2">
                                        {actions.map(action => (
                                            <Button 
                                                key={action.name}
                                                variant={action.logged ? "secondary" : "default"}
                                                className="w-full justify-start gap-2 h-12 text-base"
                                                onClick={() => handleAction(step.name, action.name, isFinalStep && action.name.includes('Delivered'))}
                                                disabled={action.logged || !!submittingAction}
                                            >
                                                {action.logged ? <Check className="text-green-500"/> : <Truck/>}
                                                {t(action.name.toLowerCase().replace(/\s/g, ''))}
                                            </Button>
                                        ))}
                                    </div>
                                    <Textarea 
                                        placeholder={t('addOptionalNote')}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        disabled={!!submittingAction}
                                    />
                                </CardContent>
                             )}
                        </Card>
                    )})}
                 </div>
            </div>
        </div>
    );
}
