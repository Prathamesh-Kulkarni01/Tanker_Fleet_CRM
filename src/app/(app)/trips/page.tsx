'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Trip, Route, Driver, Job } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { Loader2, Plus, BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';


export default function TripsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  // State for Assign Job Dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Fetch all trips, then sort/slice on client to avoid composite index
  const allTripsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'trips'), 
        where('ownerId', '==', user.uid)
    );
  }, [firestore, user]);
  const { data: allTrips, loading: recentTripsLoading } = useCollection<Trip>(allTripsQuery);

  const recentTrips = useMemo(() => {
      if (!allTrips) return [];
      return [...allTrips]
        .sort((a,b) => b.date.toDate().getTime() - a.date.toDate().getTime())
        .slice(0, 5);
  }, [allTrips]);

  const tripFormSchema = z.object({
    driverId: z.string().min(1, t('driverRequired')),
    date: z.string().min(1, t('dateRequired')).refine(
        (date) => {
            const selectedDate = new Date(date);
            const today = new Date();
            selectedDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            return selectedDate <= today;
        },
        { message: t('dateCannotBeFuture') }
    ),
    routeId: z.string().min(1, t('routeRequired')),
    tripCount: z.coerce.number().positive(t('tripCountPositive')),
  });

  type TripFormValues = z.infer<typeof tripFormSchema>;
  
  const defaultValues: Partial<TripFormValues> = {
      date: new Date().toISOString().substring(0, 10),
      routeId: '',
      driverId: '',
      tripCount: '' as any,
  };

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues,
    mode: 'onChange',
  });
  
  // Fetch drivers and routes for the dropdowns
  const driversQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('ownerId', '==', user.uid), where('role', '==', 'driver'));
  }, [firestore, user]);
  const { data: allDrivers, loading: driversLoading } = useCollection<Driver>(driversQuery);
  const activeDrivers = useMemo(() => allDrivers?.filter(d => d.is_active), [allDrivers]);


  const activeRoutesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'routes'), where('ownerId', '==', user.id), where('is_active', '==', true));
  }, [firestore, user]);
  const { data: activeRoutes, loading: routesLoading } = useCollection<Route>(activeRoutesQuery);
  
  const requestedJobsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'jobs'), where('ownerId', '==', user.uid), where('status', '==', 'requested'));
  }, [firestore, user]);
  const { data: requestedJobs, loading: requestedJobsLoading } = useCollection<Job>(requestedJobsQuery);


  const onSubmit = async (data: TripFormValues) => {
    if (!firestore || !user) return;
    
    const driver = activeDrivers?.find(d => d.id === data.driverId);

    const newTrip = {
        ownerId: user.uid,
        driverId: data.driverId,
        routeId: data.routeId,
        count: data.tripCount,
        date: Timestamp.fromDate(new Date(data.date)),
    };

    try {
        await addDoc(collection(firestore, 'trips'), newTrip);
        toast({
          title: t('tripsSaved'),
          description: t('tripsForDriverSaved', { driverName: driver?.name || '' }),
        });
        form.reset(defaultValues);
        form.setFocus('driverId');
    } catch(error) {
        console.error("Error saving trip:", error);
        toast({
            variant: 'destructive',
            title: t('error'),
            description: "Could not save the trip. Please try again."
        });
    }
  };

  const handleAssignJob = async () => {
    if (!firestore || !user || !selectedDriver || !selectedRoute) {
        toast({ variant: 'destructive', title: t('error'), description: t('pleaseSelectDriverAndRoute') });
        return;
    }
    setIsSubmittingAssign(true);
    try {
        const route = activeRoutes?.find(r => r.id === selectedRoute);
        if (!route) throw new Error("Route not found");

        await addDoc(collection(firestore, 'jobs'), {
            ownerId: user.uid,
            driverId: selectedDriver,
            routeId: selectedRoute,
            routeName: route.name || `${route.source} → ${route.destinations.join(', ')}`,
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
        setIsSubmittingAssign(false);
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
  
  const getDriverName = (driverId: string) => {
      return allDrivers?.find(d => d.id === driverId)?.name || driverId;
  }
  const getRouteName = (routeId: string) => {
      return activeRoutes?.find(r => r.id === routeId)?.name || routeId;
  }

  return (
    <div className="p-4 md:p-8 flex flex-col items-center gap-6">
      
      {requestedJobs && requestedJobs.length > 0 && (
          <Card className="w-full max-w-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellRing />
                    {t('jobRequests')}
                  </CardTitle>
                  <CardDescription>{t('jobRequestsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                   {requestedJobs.map((job) => {
                       const driver = allDrivers?.find(d => d.id === job.driverId);
                       return (
                            <div key={job.id} className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
                                <div className="flex-1">
                                    <p className="font-semibold">{job.routeName}</p>
                                    <p className="text-sm text-muted-foreground">{t('requestedBy', { name: driver?.name || '...' })}</p>
                                </div>
                                <Button onClick={() => handleApproveRequest(job.id)} size="sm" className="shrink-0">{t('approveAndAssign')}</Button>
                            </div>
                       )
                   })}
              </CardContent>
          </Card>
      )}

      <Card className="w-full max-w-lg">
        <CardHeader>
            <div className="flex justify-between items-start gap-4">
                <div>
                    <CardTitle>{t('logCompletedTrips')}</CardTitle>
                    <CardDescription>{t('logCompletedTripsDescription')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('assignNewJob')}
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('driver')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={driversLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={driversLoading ? t('loadingDrivers') : t('selectDriver')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeDrivers?.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="routeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('route')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={routesLoading}>
                         <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={routesLoading ? t('loadingRoutes') : t('selectRoute')} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeRoutes?.map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                              {route.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tripCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tripCount')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={t('eg5')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                {form.formState.isSubmitting ? t('saving') : t('saveAndLogAnother')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {recentTrips && recentTrips.length > 0 && (
          <Card className="w-full max-w-lg">
              <CardHeader>
                  <CardTitle>{t('recentTripsLogged')}</CardTitle>
              </CardHeader>
              <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('driver')}</TableHead>
                                <TableHead>{t('route')}</TableHead>
                                <TableHead className="text-right">{t('trips')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentTrips.map((trip) => (
                                <TableRow key={trip.id}>
                                    <TableCell>
                                        <div className="font-medium">{getDriverName(trip.driverId)}</div>
                                        <div className="text-xs text-muted-foreground">{format(trip.date.toDate(), 'MMM d, yyyy')}</div>
                                    </TableCell>
                                    <TableCell>{getRouteName(trip.routeId)}</TableCell>
                                    <TableCell className="text-right font-semibold">{trip.count}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
              </CardContent>
          </Card>
      )}

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
                              {activeRoutes?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="secondary">{t('cancel')}</Button></DialogClose>
                  <Button onClick={handleAssignJob} disabled={isSubmittingAssign}>
                      {isSubmittingAssign && <Loader2 className="animate-spin mr-2"/>}
                      {t('assignJob')}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
