'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useI18n } from '@/lib/i18n';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, Timestamp, query, where, getDoc, updateDoc } from 'firebase/firestore';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

import { AlertCircle, KeyRound, CalendarIcon, Copy, Check, Users, BadgeCheck, BadgeX } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const keySchema = z.object({
  keyId: z.string().min(3, { message: 'Key ID must be at least 3 characters.' }),
  expiresAt: z.date({
    required_error: "An expiry date is required.",
  }),
});

type KeyFormValues = z.infer<typeof keySchema>;

const assignKeySchema = z.object({
  keyId: z.string().min(1, { message: 'Subscription key is required.' }),
});

type AssignKeyFormValues = z.infer<typeof assignKeySchema>;


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
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState<any | null>(null);

    const keysCollectionRef = useMemo(() => firestore ? collection(firestore, 'subscriptionKeys') : null, [firestore]);
    const { data: keys, loading: keysLoading, error: keysError } = useCollection(keysCollectionRef);
    
    const ownersCollectionRef = useMemo(() => firestore ? query(collection(firestore, 'users'), where('role', '==', 'owner')) : null, [firestore]);
    const { data: owners, loading: ownersLoading, error: ownersError } = useCollection(ownersCollectionRef);

    const sortedKeys = useMemo(() => {
        if (!keys) return [];
        return [...keys].sort((a,b) => b.expiresAt.toDate() - a.expiresAt.toDate());
    }, [keys]);

    const keyForm = useForm<KeyFormValues>({
        resolver: zodResolver(keySchema),
        defaultValues: {
            keyId: `KEY-${uuidv4().slice(0, 8).toUpperCase()}`,
            expiresAt: addYears(new Date(), 1),
        }
    });

    const assignKeyForm = useForm<AssignKeyFormValues>({
        resolver: zodResolver(assignKeySchema),
    });

    const onKeySubmit = async (data: KeyFormValues) => {
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
            keyForm.reset({
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

    const handleAssignClick = (owner: any) => {
        setSelectedOwner(owner);
        assignKeyForm.reset();
        setIsAssignDialogOpen(true);
    };

    const handleAssignKey = async (data: AssignKeyFormValues) => {
        if (!firestore || !selectedOwner) return;
        setIsSubmitting(true);

        try {
            const keyRef = doc(firestore, 'subscriptionKeys', data.keyId);
            const keyDoc = await getDoc(keyRef);

            if (!keyDoc.exists() || keyDoc.data().isUsed) {
                assignKeyForm.setError('keyId', { type: 'manual', message: 'Key is invalid or already used.' });
                return;
            }

            const keyData = keyDoc.data();
            const ownerRef = doc(firestore, 'users', selectedOwner.uid);

            await updateDoc(ownerRef, {
                subscriptionExpiresAt: keyData.expiresAt,
            });
            
            await updateDoc(keyRef, {
                isUsed: true,
                usedBy: selectedOwner.uid,
            });

            toast({
                title: 'Subscription Activated',
                description: `${selectedOwner.name}'s account has been activated.`,
            });
            setIsAssignDialogOpen(false);
            setSelectedOwner(null);

        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to assign key.',
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
                    <form onSubmit={keyForm.handleSubmit(onKeySubmit)} className="grid sm:grid-cols-3 gap-4 items-end">
                        <div className="grid gap-2">
                            <Label htmlFor="keyId">{t('subscriptionKey')}</Label>
                            <Input id="keyId" {...keyForm.register('keyId')} disabled={isSubmitting} />
                            {keyForm.formState.errors.keyId && <p className="text-sm text-destructive">{keyForm.formState.errors.keyId.message}</p>}
                        </div>
                        <div className="grid gap-2">
                             <Label htmlFor="expiresAt">{t('expiresOn')}</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="expiresAt"
                                    variant={"outline"}
                                    className={cn("justify-start text-left font-normal", !keyForm.watch('expiresAt') && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {keyForm.watch('expiresAt') ? format(keyForm.watch('expiresAt'), "PPP") : <span>{t('pickADate')}</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={keyForm.watch('expiresAt')}
                                    onSelect={(date) => keyForm.setValue('expiresAt', date as Date)}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                             {keyForm.formState.errors.expiresAt && <p className="text-sm text-destructive">{keyForm.formState.errors.expiresAt.message}</p>}
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            {isSubmitting ? t('creating') : t('createKey')}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users /> Owners</CardTitle>
                        <CardDescription>Manage owner accounts and subscriptions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {ownersLoading ? (
                           <p>Loading owners...</p>
                       ) : ownersError ? (
                           <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>Failed to load owners.</AlertDescription>
                            </Alert>
                       ) : (
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Owner</TableHead>
                                       <TableHead>Subscription Status</TableHead>
                                       <TableHead className="text-right">Action</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {owners?.map(owner => {
                                       const isSubscribed = owner.subscriptionExpiresAt && new Date(owner.subscriptionExpiresAt) > new Date();
                                       return (
                                        <TableRow key={owner.id}>
                                           <TableCell>
                                               <div className="font-medium">{owner.name}</div>
                                               <div className="text-sm text-muted-foreground">{owner.phone}</div>
                                           </TableCell>
                                           <TableCell>
                                               {isSubscribed ? (
                                                   <Badge variant="secondary" className="text-green-600 border-green-200">
                                                       <BadgeCheck className="mr-1 h-4 w-4"/>
                                                       Active until {format(new Date(owner.subscriptionExpiresAt), 'PP')}
                                                   </Badge>
                                               ) : (
                                                   <Badge variant="destructive">
                                                       <BadgeX className="mr-1 h-4 w-4"/>
                                                       No Subscription
                                                   </Badge>
                                               )}
                                           </TableCell>
                                           <TableCell className="text-right">
                                               {!isSubscribed && (
                                                   <Button size="sm" onClick={() => handleAssignClick(owner)}>
                                                       Assign Key
                                                   </Button>
                                               )}
                                           </TableCell>
                                       </TableRow>
                                   )})}
                               </TableBody>
                           </Table>
                       )}
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

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Subscription to {selectedOwner?.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={assignKeyForm.handleSubmit(handleAssignKey)}>
                    <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="keyId">Subscription Key</Label>
                        <Input id="keyId" {...assignKeyForm.register('keyId')} placeholder="Enter unused subscription key"/>
                        {assignKeyForm.formState.errors.keyId && (
                        <p className="text-sm text-destructive">{assignKeyForm.formState.errors.keyId.message}</p>
                        )}
                    </div>
                    </div>
                    <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isSubmitting}>
                        Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Assigning...' : 'Assign and Activate'}</Button>
                    </DialogFooter>
                </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
