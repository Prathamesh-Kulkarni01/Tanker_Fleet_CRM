'use client';
import { useState, useEffect } from 'react';
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
import { drivers, routes, Trip } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { Map } from 'lucide-react';

export default function TripsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [recentTrips, setRecentTrips] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentTrips');
    if (saved) {
      setRecentTrips(JSON.parse(saved));
    }
  }, []);

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
  
  const activeRoutes = routes.filter(r => r.is_active);
  const activeDrivers = drivers.filter(d => d.is_active);

  const onSubmit = (data: TripFormValues) => {
    const driver = activeDrivers.find(d => d.id === data.driverId);
    const route = activeRoutes.find(r => r.id === data.routeId);

    // This is a simulation. In a real app, you'd get a proper ID from the DB.
    const newTrip = {
        ...data,
        id: `trip-${Date.now()}`,
        driverName: driver?.name,
        routeName: route ? `${route.source} → ${route.destinations.join(', ')}` : 'Unknown Route',
    };
    
    setRecentTrips(prev => {
        const updatedRecentTrips = [newTrip, ...prev].slice(0,5);
        localStorage.setItem('recentTrips', JSON.stringify(updatedRecentTrips));
        return updatedRecentTrips;
    });

    toast({
      title: t('tripsSaved'),
      description: t('tripsForDriverSaved', { driverName: driver?.name || '' }),
    });
    form.reset(defaultValues);
     // Keep focus on driver select for faster logging
    form.setFocus('driverId');
  };

  return (
    <div className="p-4 md:p-8 flex flex-col items-center gap-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t('logNewTrips')}</CardTitle>
          <CardDescription>{t('logNewTripsDescription')}</CardDescription>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectDriver')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeDrivers.map((driver) => (
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
                      <Select onValueChange={field.onChange} value={field.value}>
                         <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={t('selectRoute')} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeRoutes.map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                              {route.source} → {route.destinations.join(', ')}
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
                {form.formState.isSubmitting ? t('saving') : t('saveAndLogAnother')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {recentTrips.length > 0 && (
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
                                <TableHead className="text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentTrips.map((trip) => (
                                <TableRow key={trip.id}>
                                    <TableCell>
                                        <div className="font-medium">{trip.driverName}</div>
                                        <div className="text-xs text-muted-foreground">{format(new Date(trip.date), 'MMM d, yyyy')}</div>
                                    </TableCell>
                                    <TableCell>{trip.routeName}</TableCell>
                                    <TableCell className="text-right font-semibold">{trip.tripCount}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/trips/live/${trip.id}`}>
                                                <Map className="mr-2 h-4 w-4" />
                                                Track
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
              </CardContent>
          </Card>
      )}

    </div>
  );
}
