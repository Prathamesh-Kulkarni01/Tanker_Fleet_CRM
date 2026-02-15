
'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useFirestore } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import type { Trip, Route, Driver, TripEvent } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Anchor, MapPin, Pencil, Send, CheckCircle, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { DriverLocationUpdater } from './driver-location-updater';

interface LiveTripManagerProps {
    route: Route;
    driver: Driver;
    onBack: () => void;
}

export function LiveTripManager({ route, driver, onBack }: LiveTripManagerProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [events, setEvents] = useState<TripEvent[]>([]);
    const [notes, setNotes] = useState('');
    const [submittingAction, setSubmittingAction] = useState<string | null>(null);

    const handleAction = (location: string, action: string) => {
        const newEvent: TripEvent = {
            timestamp: Timestamp.now(),
            location,
            action,
            notes: notes,
        };

        setEvents(prev => [...prev, newEvent]);
        setNotes('');
        toast({ title: t('actionLogged'), description: `${action} at ${location}`});
    };
    
    const handleLogAndResetTrip = async () => {
        if (!firestore || !driver || !route) return;

        setSubmittingAction('log_trip');
        try {
            const tripData: Omit<Trip, 'id'> = {
                ownerId: route.ownerId,
                driverId: driver.id,
                routeId: route.id,
                count: 1, // Each log is one trip
                date: Timestamp.now(), // Log the trip at the time of completion
                events: events, // Archive the events with the trip
            };
            await addDoc(collection(firestore, 'trips'), tripData);
            
            toast({ 
                title: t('tripLogged'),
                description: t('timelineReset')
            });
            
            // Reset local state for the next trip
            setEvents([]);
            setNotes('');

        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: t('couldNotLogTrip') });
        } finally {
            setSubmittingAction(null);
        }
    };
    
    const timelineSteps = [
        { name: route.source, type: 'source' as const }, 
        ...route.destinations.map((dest, i) => ({ name: dest, type: 'destination' as const, index: i+1 }))
    ];

    const isActionLogged = (location: string, action: string) => {
        return events.some(e => e.location === location && e.action.includes(action));
    }

    const isStepComplete = (step: typeof timelineSteps[number]) => {
        const requiredAction = step.type === 'source' ? 'Water Filled' : 'Water Delivered';
        return isActionLogged(step.name, requiredAction);
    }
    
    const allStepsComplete = timelineSteps.every(isStepComplete);
    
    return (
        <div className="space-y-6">
            <DriverLocationUpdater />

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><ArrowLeft/></Button>
                        <div>
                            <CardTitle className="text-2xl font-bold font-headline">{route.name}</CardTitle>
                            <CardDescription className="text-base">{route.source} → {route.destinations.join(', ')} | ₹{route.rate_per_trip}/trip</CardDescription>
                        </div>
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
                            <Card className={cn("transition-all", isComplete ? 'bg-muted/30 border-green-500/30' : 'border-primary/30')}>
                                 <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl">{step.name}</CardTitle>
                                            <CardDescription>{step.type === 'source' ? t('source') : t('destinationNumber', { number: step.index })}</CardDescription>
                                        </div>
                                        {isComplete && <CheckCircle className="text-green-500"/>}
                                    </div>
                                 </CardHeader>
                                 {!isComplete && (
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

            {allStepsComplete && (
                <Card className="bg-green-500/10 border-green-500/50 text-center shadow-lg">
                    <CardHeader>
                        <CardTitle>{t('readyToLogTrip')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">{t('readyToLogTripDescription')}</p>
                        <Button
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleLogAndResetTrip}
                            disabled={!!submittingAction}
                        >
                            {submittingAction === 'log_trip' ? t('logging') : t('logTripAndStartNext')}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
