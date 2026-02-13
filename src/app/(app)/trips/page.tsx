'use client';
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
import { drivers, tripTypes } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

export default function TripsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const tripFormSchema = z.object({
    driverId: z.string().min(1, t('driverRequired')),
    date: z.string().min(1, t('dateRequired')).refine(
        (date) => new Date(date) <= new Date(),
        { message: t('dateCannotBeFuture') }
    ),
    tripType: z.string().min(1, t('tripTypeRequired')),
    tripCount: z.coerce.number().positive(t('tripCountPositive')),
  });

  type TripFormValues = z.infer<typeof tripFormSchema>;
  
  const defaultValues: Partial<TripFormValues> = {
      date: new Date().toISOString().substring(0, 10),
      tripType: tripTypes[0]?.name || '',
      driverId: '',
      tripCount: '' as any,
  };

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const onSubmit = (data: TripFormValues) => {
    console.log('New trip data:', data);
    // In a real app, this would be sent to a server action to be stored in a database.
    // For now, we simulate success and reset the form.
    toast({
      title: t('tripsSaved'),
      description: t('tripsForDriverSaved', { driverName: drivers.find(d => d.id === data.driverId)?.name || '' }),
    });
    form.reset(defaultValues);
  };

  return (
    <div className="p-4 md:p-8 flex justify-center">
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
                        {drivers.map((driver) => (
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
                  name="tripType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tripType')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                         <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={t('selectTripType')} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tripTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.name}
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
                      <FormLabel>{t('numberOfTrips')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={t('eg5')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t('saving') : t('saveTrips')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
