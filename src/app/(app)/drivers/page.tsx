
'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Plus, User, Phone, MoreVertical, View, UserX, UserCheck, Loader2, Copy, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useFirestore, useCollection } from '@/firebase';
import { query, collection, where, doc, updateDoc } from 'firebase/firestore';
import type { Driver } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';


const driverSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().regex(/^\d{10}$/, { message: 'Must be a 10-digit phone number.' }),
});

type DriverFormValues = z.infer<typeof driverSchema>;

export default function DriversPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user, registerDriver } = useAuth();
  const firestore = useFirestore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionableDriver, setActionableDriver] = useState<Driver | null>(null);
  const [generatedCode, setGeneratedCode] = useState('');

  const driversQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'driver'), where('ownerId', '==', user.uid));
  }, [firestore, user]);
  const { data: drivers, loading: driversLoading, error: driversError } = useCollection<Driver>(driversQuery);

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
  });

  const openAddDriverDialog = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    form.reset({ name: '', phone: '' });
    setIsAddDialogOpen(true);
  };

  const onSubmit = async (data: DriverFormValues) => {
    setIsSubmitting(true);
    const result = await registerDriver({ ...data, password: generatedCode });
    if (result.success) {
        toast({
            title: t('driverAdded'),
            description: t('driverAddedDescription', { name: data.name }),
        });
        setIsAddDialogOpen(false);
        form.reset({ name: '', phone: '' });
    } else {
        toast({
            variant: 'destructive',
            title: t('error'),
            description: result.error || 'An unknown error occurred.',
        });
    }
    setIsSubmitting(false);
  };
  
  const toggleDriverStatus = async () => {
    if (!firestore || !actionableDriver) return;
    
    const driverRef = doc(firestore, 'users', actionableDriver.id);
    const newStatus = !actionableDriver.is_active;
    const statusString = newStatus ? t('activated') : t('deactivated');

    try {
        await updateDoc(driverRef, { is_active: newStatus });
        toast({
          title: newStatus ? t('driverActivated') : t('driverDeactivated'),
          description: t('driverStatusUpdated', { name: actionableDriver.name, status: statusString }),
        });
    } catch(e) {
        console.error("Error toggling driver status", e);
        toast({
            variant: 'destructive',
            title: t('error'),
            description: t('couldNotUpdateDriverStatus'),
        });
    } finally {
        setActionableDriver(null);
    }
  };

  if (user?.role !== 'owner') {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('accessDenied')}</AlertTitle>
          <AlertDescriptionComponent>
            {t('noPermissionToViewPage')}
          </AlertDescriptionComponent>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline sm:text-3xl">{t('drivers')}</h1>
      </div>

      {driversLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full"/>)}
        </div>
      )}

      {driversError && (
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('errorLoadingDrivers')}</AlertTitle>
          <AlertDescriptionComponent>
            {t('errorLoadingDriversDescription')}
          </AlertDescriptionComponent>
        </Alert>
      )}

      {!driversLoading && !driversError && (
        <>
          {drivers && drivers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drivers.map(driver => (
                <Card key={driver.id} className={!driver.is_active ? 'bg-muted/50' : ''}>
                  <CardHeader>
                      <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12">
                                  <AvatarImage src={driver.avatar?.imageUrl} alt={driver.name} data-ai-hint={driver.avatar?.imageHint}/>
                                  <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <CardTitle>{driver.name}</CardTitle>
                                  <CardDescription className="flex items-center gap-2 pt-1"><Phone className="h-3 w-3"/>{driver.phone}</CardDescription>
                              </div>
                          </div>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild><Link href={`/drivers/${driver.id}`} className="flex items-center"><View className="mr-2"/>{t('viewProfile')}</Link></DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setActionableDriver(driver)}>
                                      {driver.is_active ? <><UserX className="mr-2"/>{t('deactivate')}</> : <><UserCheck className="mr-2"/>{t('activate')}</>}
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <Badge variant={driver.is_active ? 'secondary' : 'outline'}>
                          {driver.is_active ? t('active') : t('inactive')}
                      </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mt-6">
                <CardContent className="p-12 text-center">
                    <div className="mx-auto max-w-sm">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">{t('noDriversAdded')}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{t('noDriversAddedDescription')}</p>
                        <Button onClick={openAddDriverDialog} className="mt-6">
                            <Plus className="mr-2" />
                            {t('addYourFirstDriver')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
          )}
        </>
      )}

      <Button
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg md:hidden"
        onClick={openAddDriverDialog}
      >
        <Plus className="h-6 w-6" />
      </Button>
      <Button
        className="hidden md:flex fixed bottom-8 right-8 h-14 rounded-full shadow-lg gap-2"
        onClick={openAddDriverDialog}
      >
        <Plus className="h-6 w-6" />
        {t('addDriver')}
      </Button>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addDriver')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('driverName')}</Label>
                <Input id="name" {...form.register('name')} placeholder="e.g. Suresh Kumar"/>
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t('phoneNumber')}</Label>
                <Input id="phone" type="tel" {...form.register('phone')} placeholder="10-digit number"/>
                 {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t('temporaryLoginCode')}</Label>
                <div className="flex items-center gap-2">
                    <Input id="password" readOnly value={generatedCode} className="font-mono text-lg" />
                    <Button type="button" variant="secondary" size="icon" onClick={() => {
                        navigator.clipboard.writeText(generatedCode);
                        toast({ title: t('codeCopied') });
                    }}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('temporaryLoginCodeDescription')}</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isSubmitting}>
                  {t('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                {t('addDriver')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {actionableDriver && (
        <AlertDialog open={!!actionableDriver} onOpenChange={() => setActionableDriver(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{actionableDriver.is_active ? t('deactivate') : t('activate')} {actionableDriver.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                    {actionableDriver.is_active ? t('deactivateDriverConfirmation') : t('activateDriverConfirmation')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={toggleDriverStatus}>
                {actionableDriver.is_active ? t('deactivate') : t('activate')}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}

    