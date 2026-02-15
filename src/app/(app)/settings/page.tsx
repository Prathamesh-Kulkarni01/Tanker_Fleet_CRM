'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/auth';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { query, collection, where, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import type { Slab } from '@/lib/data';
import { useState, useMemo } from 'react';

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
        if (slab.min_trips > slab.max_trips) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Max trips must be greater than or equal to min trips for all slabs.",
    }
  ).refine(
      (slabs) => {
          for (let i = 0; i < slabs.length - 1; i++) {
              if (slabs[i].max_trips >= slabs[i+1].min_trips) {
                  return false;
              }
          }
          return true;
      },
      {
          message: "Slab ranges cannot overlap. Please ensure each slab's min trips is greater than the previous slab's max trips."
      }
  )
});

type SlabsFormValues = z.infer<typeof slabsFormSchema>;

export default function SettingsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slabsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'payoutSlabs'), where('ownerId', '==', user.uid));
  }, [firestore, user]);
  const { data: initialSlabs, loading: slabsLoading } = useCollection<Slab>(slabsQuery);


  const slabsForm = useForm<SlabsFormValues>({
    resolver: zodResolver(slabsFormSchema),
    defaultValues: {
      slabs: [],
    },
    mode: 'onChange'
  });
  
  const { fields: slabFields, append: appendSlab, remove: removeSlab, move: moveSlab, replace: replaceSlabs } = useFieldArray({
    control: slabsForm.control,
    name: 'slabs',
    keyName: 'formId'
  });

  // When firestore data loads, update the form
  useMemo(() => {
    if(initialSlabs) {
        replaceSlabs(initialSlabs.sort((a,b) => a.min_trips - b.min_trips));
    }
  }, [initialSlabs, replaceSlabs]);

  const onSlabsSubmit = async (data: SlabsFormValues) => {
    if (!firestore || !user) return;

    setIsSubmitting(true);
    try {
        for (const slab of data.slabs) {
            const { id, ...slabData } = slab;
            if (id.startsWith('new-')) {
                await addDoc(collection(firestore, 'payoutSlabs'), {
                    ...slabData,
                    ownerId: user.uid,
                });
            } else {
                const slabRef = doc(firestore, 'payoutSlabs', id);
                await updateDoc(slabRef, slabData);
            }
        }

        toast({
            title: t('settingsSaved'),
            description: t('payoutSlabsUpdated'),
        });
    } catch(e) {
        console.error("Error saving slabs:", e);
        toast({
          variant: 'destructive',
          title: t('error'),
          description: t('couldNotSaveSlabs'),
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRemoveSlab = async (index: number) => {
    if (!firestore) return;
    const slabId = slabFields[index].id;
    removeSlab(index); // Remove from UI immediately

    if (!slabId.startsWith('new-')) {
        try {
            await deleteDoc(doc(firestore, 'payoutSlabs', slabId));
            toast({
              title: "Slab removed",
              description: "The payout slab has been deleted.",
            });
        } catch(e) {
            console.error("Error removing slab: ", e);
            toast({
              variant: 'destructive',
              title: "Error",
              description: "Could not remove slab from the database.",
            });
        }
    }
  }
  
  if (!user) return null;

  if (user.role !== 'owner') {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (slabsLoading) {
      return <div className="p-4 md:p-8">Loading settings...</div>
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">{t('settings')}</h1>
      <Tabs defaultValue="slabs">
        <TabsList className={`grid w-full max-w-sm grid-cols-2`}>
          <TabsTrigger value="slabs">{t('payoutSlabs')}</TabsTrigger>
          <TabsTrigger value="month-lock">{t('monthLock')}</TabsTrigger>
        </TabsList>

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
                    <Button type="submit" size="sm" className="gap-1" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="animate-spin" />}
                      {t('saveChanges')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {slabFields.map((field, index) => (
                            <Card key={field.formId} className="p-4 flex items-center gap-2 sm:gap-4 bg-muted/50">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField
                                        control={slabsForm.control}
                                        name={`slabs.${index}.min_trips`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label>{t('minimumTrips')}</Label>
                                                <FormControl>
                                                    <Input type="number" placeholder="e.g. 0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={slabsForm.control}
                                        name={`slabs.${index}.max_trips`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label>{t('maximumTrips')}</Label>
                                                <FormControl>
                                                    <Input type="number" placeholder="e.g. 50" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={slabsForm.control}
                                        name={`slabs.${index}.payout_amount`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label>{t('payoutAmount')} (₹)</Label>
                                                <FormControl>
                                                    <Input type="number" placeholder="e.g. 5000" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="flex flex-col items-center border-l pl-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={index === 0}
                                        onClick={() => moveSlab(index, index - 1)}
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={index === slabFields.length - 1}
                                        onClick={() => moveSlab(index, index + 1)}
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveSlab(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </Card>
                        ))}
                    </div>
                   <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-4 gap-1"
                      onClick={() => {
                        const lastSlabMax = slabFields.length > 0 ? slabFields[slabFields.length - 1].max_trips : -1;
                        appendSlab({ id: `new-${slabFields.length}`, min_trips: lastSlabMax + 1, max_trips: lastSlabMax + 51, payout_amount: 0 })
                      }}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      {t('addSlab')}
                    </Button>
                    {slabsForm.formState.errors.slabs && (
                        <p className="text-sm font-medium text-destructive mt-2">
                            {slabsForm.formState.errors.slabs.root?.message}
                        </p>
                    )}
                </CardContent>
              </Card>
            </form>
          </Form>
        </TabsContent>
        
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
      </Tabs>
    </div>
  );
}
