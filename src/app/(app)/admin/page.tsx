'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useI18n } from '@/lib/i18n';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

import { AlertCircle, KeyRound, CalendarIcon, Copy, Check } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { cn } from '@/lib/utils';

const keySchema = z.object({
  keyId: z.string().min(3, { message: 'Key ID must be at least 3 characters.' }),
  expiresAt: z.date({
    required_error: "An expiry date is required.",
  }),
});

type KeyFormValues = z.infer<typeof keySchema>;

function SubscriptionKeysList({ keys, loading }: { keys: any[] | null, loading: boolean }) {
    const { t } = useI18n();
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const handleCopy = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    if (loading) {
        return <p>{t('loadingKeys')}...</p>;
    }

    if (!keys || keys.length === 0) {
        return <p>{t('noKeysFound')}</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('subscriptionKey')}</TableHead>
                    <TableHead>{t('expiresOn')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {keys.map((key) => (
                    <TableRow key={key.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                            {key.id}
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(key.id)}>
                                {copiedKey === key.id ? <Check className="text-green-500" /> : <Copy />}
                            </Button>
                        </TableCell>
                        <TableCell>{key.expiresAt ? format(key.expiresAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                        <TableCell>
                            {key.isUsed ? `${t('usedBy')} ${key.usedBy ? key.usedBy.slice(0, 8) : ''}...` : t('notUsed')}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}


export default function AdminPage() {
    const { t } = useI18n();
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const keysCollectionRef = useMemo(() => firestore ? collection(firestore, 'subscriptionKeys') : null, [firestore]);
    const { data: keys, loading: keysLoading, error: keysError } = useCollection(keysCollectionRef);
    
    const sortedKeys = useMemo(() => {
        if (!keys) return [];
        return [...keys].sort((a,b) => b.expiresAt.toDate() - a.expiresAt.toDate());
    }, [keys]);

    const form = useForm<KeyFormValues>({
        resolver: zodResolver(keySchema),
        defaultValues: {
            keyId: `KEY-${uuidv4().slice(0, 8).toUpperCase()}`,
            expiresAt: addYears(new Date(), 1),
        }
    });

    const onSubmit = async (data: KeyFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            const keyRef = doc(firestore, 'subscriptionKeys', data.keyId);
            await setDoc(keyRef, {
                isUsed: false,
                usedBy: null,
                expiresAt: Timestamp.fromDate(data.expiresAt),
            });
            toast({
                title: t('keyCreated'),
                description: t('keyHasBeenAdded', { key: data.keyId }),
            });
            form.reset({
                keyId: `KEY-${uuidv4().slice(0, 8).toUpperCase()}`,
                expiresAt: addYears(new Date(), 1),
            });
        } catch (error) {
            console.error("Error creating key: ", error);
            toast({
                variant: 'destructive',
                title: t('error'),
                description: t('couldNotCreateKey'),
            });
        } finally {
            setIsSubmitting(false);
        }
    }


    if (user?.role !== 'admin') {
        return (
          <div className="p-4 md:p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('accessDenied')}</AlertTitle>
              <AlertDescription>
                {t('noPermissionToViewPage')}
              </AlertDescription>
            </Alert>
          </div>
        );
    }
    
    return (
        <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-2xl font-bold font-headline sm:text-3xl">{t('adminDashboard')}</h1>

            <Card>
                <CardHeader>
                    <CardTitle>{t('createSubscriptionKey')}</CardTitle>
                    <CardDescription>{t('generateNewKeyForOwners')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid sm:grid-cols-3 gap-4 items-end">
                        <div className="grid gap-2">
                            <Label htmlFor="keyId">{t('subscriptionKey')}</Label>
                            <Input id="keyId" {...form.register('keyId')} disabled={isSubmitting} />
                            {form.formState.errors.keyId && <p className="text-sm text-destructive">{form.formState.errors.keyId.message}</p>}
                        </div>
                        <div className="grid gap-2">
                             <Label htmlFor="expiresAt">{t('expiresOn')}</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="expiresAt"
                                    variant={"outline"}
                                    className={cn("justify-start text-left font-normal", !form.watch('expiresAt') && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {form.watch('expiresAt') ? format(form.watch('expiresAt'), "PPP") : <span>{t('pickADate')}</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={form.watch('expiresAt')}
                                    onSelect={(date) => form.setValue('expiresAt', date as Date)}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                             {form.formState.errors.expiresAt && <p className="text-sm text-destructive">{form.formState.errors.expiresAt.message}</p>}
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            {isSubmitting ? t('creating') : t('createKey')}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('existingKeys')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {keysError ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('error')}</AlertTitle>
                            <AlertDescription>{t('failedToLoadKeys')}</AlertDescription>
                        </Alert>
                    ) : (
                        <SubscriptionKeysList keys={sortedKeys} loading={keysLoading} />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
