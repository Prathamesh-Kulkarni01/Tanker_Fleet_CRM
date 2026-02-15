'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useI18n } from '@/lib/i18n';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, setDoc, Timestamp, query, where, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { AlertCircle, Users, BadgeCheck, BadgeX } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { Badge } from '@/components/ui/badge';


export default function AdminPage() {
    const { t } = useI18n();
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activatingOwner, setActivatingOwner] = useState<any | null>(null);

    const ownersCollectionRef = useMemo(() => firestore ? query(collection(firestore, 'users'), where('role', '==', 'owner')) : null, [firestore]);
    const { data: owners, loading: ownersLoading, error: ownersError } = useCollection(ownersCollectionRef);

    const handleActivateSubscription = async () => {
        if (!firestore || !activatingOwner) return;

        setIsSubmitting(true);
        try {
            const newKeyId = `KEY-${uuidv4().slice(0, 8).toUpperCase()}`;
            const expiresAt = addYears(new Date(), 1);
            
            const keyRef = doc(firestore, 'subscriptionKeys', newKeyId);
            const ownerRef = doc(firestore, 'users', activatingOwner.id);

            // Create the key, update the owner, and mark key as used
            // This is not in a transaction for simplicity, but could be for production
            await setDoc(keyRef, {
                isUsed: true,
                usedBy: activatingOwner.id,
                createdAt: Timestamp.now(),
                expiresAt: Timestamp.fromDate(expiresAt),
            });

            await updateDoc(ownerRef, {
                subscriptionKey: newKeyId,
                subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
            });

            toast({
                title: 'Subscription Activated',
                description: `${activatingOwner.name}'s account has been activated for 1 year.`,
            });

        } catch (error) {
            console.error("Error activating subscription: ", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to activate subscription.',
            });
        } finally {
            setIsSubmitting(false);
            setActivatingOwner(null);
        }
    };


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
                                    const expiryDate = owner.subscriptionExpiresAt?.toDate ? owner.subscriptionExpiresAt.toDate() : (owner.subscriptionExpiresAt ? new Date(owner.subscriptionExpiresAt) : null);
                                    const isSubscribed = expiryDate && expiryDate > new Date();

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
                                                    Active until {format(expiryDate!, 'PP')}
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <BadgeX className="mr-1 h-4 w-4"/>
                                                    No Subscription
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!isSubscribed ? (
                                                <Button size="sm" onClick={() => setActivatingOwner(owner)}>
                                                    Activate
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline">
                                                    Extend
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

            {activatingOwner && (
                <AlertDialog open={!!activatingOwner} onOpenChange={() => setActivatingOwner(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Activate Subscription for {activatingOwner?.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will generate a new 1-year subscription and assign it to this owner. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setActivatingOwner(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleActivateSubscription} disabled={isSubmitting}>
                                {isSubmitting ? 'Activating...' : 'Confirm & Activate'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    )
}
