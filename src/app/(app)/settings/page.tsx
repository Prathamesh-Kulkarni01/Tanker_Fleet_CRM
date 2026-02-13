'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { slabs as initialSlabs, tripTypes as initialTripTypes } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/auth';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const slabSchema = z.object({
  id: z.string(),
  min_trips: z.coerce.number().min(0, "Must be non-negative"),
  max_trips: z.coerce.number().min(0, "Must be non-negative"),
  payout_amount: z.coerce.number().min(0, "Must be non-negative"),
});

const slabsFormSchema = z.object({
  slabs: z.array(slabSchema).refine(
    (slabs) => {
      for (const slab of slabs) {
        if (slab.max_trips < slab.min_trips) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Max trips must be >= min trips.",
    }
  ),
});

const tripTypeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Trip type name cannot be empty.'),
});

const tripTypesFormSchema = z.object({
  tripTypes: z.array(tripTypeSchema),
});

type SlabsFormValues = z.infer<typeof slabsFormSchema>;
type TripTypesFormValues = z.infer<typeof tripTypesFormSchema>;

export default function SettingsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();

  const slabsForm = useForm<SlabsFormValues>({
    resolver: zodResolver(slabsFormSchema),
    defaultValues: {
      slabs: initialSlabs.filter(s => s.payout_amount > 0),
    },
    mode: 'onChange'
  });

  const { fields: slabFields, append: appendSlab, remove: removeSlab } = useFieldArray({
    control: slabsForm.control,
    name: 'slabs',
  });

  const onSlabsSubmit = (data: SlabsFormValues) => {
    console.log('Saving slabs:', data.slabs);
    // In a real app, you'd send this to your backend.
    toast({
      title: t('settingsSaved'),
      description: t('payoutSlabsUpdated'),
    });
  };
  
  const tripTypesForm = useForm<TripTypesFormValues>({
    resolver: zodResolver(tripTypesFormSchema),
    defaultValues: {
      tripTypes: initialTripTypes,
    },
    mode: 'onChange',
  });

  const { fields: tripTypeFields, append: appendTripType, remove: removeTripType } = useFieldArray({
    control: tripTypesForm.control,
    name: 'tripTypes',
  });

  const onTripTypesSubmit = (data: TripTypesFormValues) => {
    console.log('Saving trip types:', data.tripTypes);
    toast({
      title: t('settingsSaved'),
      description: t('tripTypesUpdated'),
    });
  };

  if (!user) return null;

  const defaultValue = user.role === 'owner' ? 'slabs' : 'trip-types';
  const gridCols = user.role === 'owner' ? 'sm:grid-cols-3' : 'sm:grid-cols-1';

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">{t('settings')}</h1>
      <Tabs defaultValue={defaultValue}>
        <TabsList className={`grid w-full max-w-md grid-cols-1 ${gridCols}`}>
          {user.role === 'owner' && <TabsTrigger value="slabs">{t('payoutSlabs')}</TabsTrigger>}
          <TabsTrigger value="trip-types">{t('tripTypes')}</TabsTrigger>
          {user.role === 'owner' && <TabsTrigger value="month-lock">{t('monthLock')}</TabsTrigger>}
        </TabsList>

        {user.role === 'owner' && (
          <TabsContent value="slabs">
            <Form {...slabsForm}>
              <form onSubmit={slabsForm.handleSubmit(onSlabsSubmit)}>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{t('payoutSlabs')}</CardTitle>
                        <p className="text-sm text-muted-foreground pt-1">{t('defineSlabsDescription')}</p>
                      </div>
                      <Button type="submit" size="sm" className="gap-1">
                        {t('saveChanges')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('minimumTrips')}</TableHead>
                          <TableHead>{t('maximumTrips')}</TableHead>
                          <TableHead>{t('payoutAmount')}</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slabFields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <FormField
                                control={slabsForm.control}
                                name={`slabs.${index}.min_trips`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                                <FormField
                                  control={slabsForm.control}
                                  name={`slabs.${index}.max_trips`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input type="number" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={slabsForm.control}
                                name={`slabs.${index}.payout_amount`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input type="number" placeholder="₹" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSlab(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                     <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-4 gap-1"
                        onClick={() => appendSlab({ id: `new-${slabFields.length}`, min_trips: 0, max_trips: 0, payout_amount: 0 })}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        {t('addSlab')}
                      </Button>
                  </CardContent>
                </Card>
              </form>
            </Form>
          </TabsContent>
        )}

        <TabsContent value="trip-types">
           <Form {...tripTypesForm}>
            <form onSubmit={tripTypesForm.handleSubmit(onTripTypesSubmit)}>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{t('tripTypes')}</CardTitle>
                     <Button type="submit" size="sm" className="gap-1">{t('saveChanges')}</Button>
                  </div>
                   <p className="text-sm text-muted-foreground pt-1">{t('tripTypeConfigWillBeHere')}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-w-sm">
                    {tripTypeFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <FormField
                          control={tripTypesForm.control}
                          name={`tripTypes.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTripType(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => appendTripType({ id: `new-${tripTypeFields.length}`, name: '' })}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    {t('addTripType')}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </Form>
        </TabsContent>
        
        {user.role === 'owner' && (
          <TabsContent value="month-lock">
            <Card>
              <CardHeader>
                <CardTitle>{t('monthLock')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{t('monthLockingInterfaceWillBeHere')}</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
