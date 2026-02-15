
'use client';
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useI18n } from '@/lib/i18n';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import type { Job, Driver, Route } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus, Briefcase, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

function JobCard({ job, driverName, onApprove }: { job: Job, driverName?: string, onApprove?: (jobId: string) => void }) {
    const { t } = useI18n();
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{job.routeName}</CardTitle>
                        <CardDescription>
                            {t('assignedTo')}: <span className="font-medium">{driverName || '...'}</span>
                        </CardDescription>
                    </div>
                     <Badge variant={
                        job.status === 'requested' ? 'outline' :
                        job.status === 'assigned' ? 'default' :
                        job.status === 'accepted' ? 'secondary' :
                        job.status === 'in_progress' ? 'outline' :
                        'destructive'
                     }>{t(job.status)}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    {t(job.status === 'requested' ? 'requestedOn' : 'assignedOn')}: {format(job.assignedAt.toDate(), 'PPp')}
                </p>
            </CardContent>
             <CardFooter>
                 {job.status === 'requested' && onApprove ? (
                     <Button onClick={() => onApprove(job.id)} size="sm">{t('assignToDriver')}</Button>
                 ) : (
                    <Button asChild variant="secondary" size="sm">
                        <Link href={`/drivers/${job.driverId}`}>{t('viewDriver')}</Link>
                    </Button>
                 )}
            </CardFooter>
        </Card>
    );
}

function JobsList({ jobs, drivers, onApprove }: { jobs: Job[] | null; drivers: Driver[] | null, onApprove?: (jobId: string) => void }) {
    const { t } = useI18n();

    if (!jobs || jobs.length === 0) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <div className="mx-auto max-w-xs">
                        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">{t('noJobsHere')}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{t('noJobsHereDescription')}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map(job => {
                const driver = drivers?.find(d => d.id === job.driverId);
                return <JobCard key={job.id} job={job} driverName={driver?.name} onApprove={onApprove} />;
            })}
        </div>
    );
}


export default function JobsPage() {
    const { t } = useI18n();
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedRoute, setSelectedRoute] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const jobsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'jobs'), where('ownerId', '==', user.uid));
    }, [firestore, user]);
    const { data: allJobs, loading: jobsLoading } = useCollection<Job>(jobsQuery);

    const driversQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'users'), where('ownerId', '==', user.uid), where('role', '==', 'driver'), where('is_active', '==', true));
    }, [firestore, user]);
    const { data: activeDrivers, loading: driversLoading } = useCollection<Driver>(driversQuery);

    const routesQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'routes'), where('ownerId', '==', user.id), where('is_active', '==', true));
    }, [firestore, user]);
    const { data: activeRoutes, loading: routesLoading } = useCollection<Route>(routesQuery);

    const requestedJobs = useMemo(() => allJobs?.filter(j => j.status === 'requested'), [allJobs]);
    const assignedJobs = useMemo(() => allJobs?.filter(j => j.status === 'assigned' || j.status === 'accepted'), [allJobs]);
    const inProgressJobs = useMemo(() => allJobs?.filter(j => j.status === 'in_progress'), [allJobs]);
    const completedJobs = useMemo(() => allJobs?.filter(j => j.status === 'completed'), [allJobs]);

    const handleAssignJob = async () => {
        if (!firestore || !user || !selectedDriver || !selectedRoute) {
            toast({ variant: 'destructive', title: t('error'), description: t('pleaseSelectDriverAndRoute') });
            return;
        }
        setIsSubmitting(true);
        try {
            const route = activeRoutes?.find(r => r.id === selectedRoute);
            if (!route) throw new Error("Route not found");

            await addDoc(collection(firestore, 'jobs'), {
                ownerId: user.uid,
                driverId: selectedDriver,
                routeId: selectedRoute,
                routeName: `${route.source} → ${route.destinations.join(', ')}`,
                status: 'assigned',
                assignedAt: Timestamp.now(),
                events: [],
            });
            toast({ title: t('jobAssigned'), description: t('driverWillBeNotified') });
            setIsAssignDialogOpen(false);
            setSelectedDriver('');
            setSelectedRoute('');
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: t('couldNotAssignJob') });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleApproveRequest = async (jobId: string) => {
        if (!firestore) return;
        const jobRef = doc(firestore, 'jobs', jobId);
        try {
            await updateDoc(jobRef, { status: 'assigned' });
            toast({ title: t('jobAssigned'), description: t('driverWillBeNotified') });
        } catch (e) {
            console.error("Error approving request: ", e);
            toast({ variant: 'destructive', title: t('error'), description: t('couldNotAssignJob') });
        }
    };

    if (user?.role !== 'owner') {
        return (
            <div className="p-4 md:p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('accessDenied')}</AlertTitle>
                    <AlertDescription>{t('noPermissionToViewPage')}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    const isLoading = jobsLoading || driversLoading || routesLoading;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline sm:text-3xl">{t('jobManagement')}</h1>
                <Button onClick={() => setIsAssignDialogOpen(true)}><Plus className="mr-2" />{t('assignJob')}</Button>
            </div>
            
            <Tabs defaultValue="assigned">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="requested">{t('requested')} {requestedJobs && requestedJobs.length > 0 && `(${requestedJobs.length})`}</TabsTrigger>
                    <TabsTrigger value="assigned">{t('assigned')}</TabsTrigger>
                    <TabsTrigger value="in_progress">{t('inProgress')}</TabsTrigger>
                    <TabsTrigger value="completed">{t('completed')}</TabsTrigger>
                </TabsList>
                {isLoading ? <Skeleton className="h-64 w-full mt-4" /> : <>
                    <TabsContent value="requested" className="mt-6">
                        <JobsList jobs={requestedJobs || []} drivers={activeDrivers} onApprove={handleApproveRequest} />
                    </TabsContent>
                    <TabsContent value="assigned" className="mt-6">
                        <JobsList jobs={assignedJobs || []} drivers={activeDrivers} />
                    </TabsContent>
                    <TabsContent value="in_progress" className="mt-6">
                        <JobsList jobs={inProgressJobs || []} drivers={activeDrivers} />
                    </TabsContent>
                    <TabsContent value="completed" className="mt-6">
                        <JobsList jobs={completedJobs || []} drivers={activeDrivers} />
                    </TabsContent>
                </>}
            </Tabs>

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('assignNewJob')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="driver">{t('driver')}</Label>
                            <Select value={selectedDriver} onValueChange={setSelectedDriver} disabled={driversLoading}>
                                <SelectTrigger id="driver">
                                    <SelectValue placeholder={t('selectDriver')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeDrivers?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="route">{t('route')}</Label>
                            <Select value={selectedRoute} onValueChange={setSelectedRoute} disabled={routesLoading}>
                                <SelectTrigger id="route">
                                    <SelectValue placeholder={t('selectRoute')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeRoutes?.map(r => <SelectItem key={r.id} value={r.id}>{r.source} → {r.destinations.join(', ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">{t('cancel')}</Button></DialogClose>
                        <Button onClick={handleAssignJob} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                            {t('assignJob')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    