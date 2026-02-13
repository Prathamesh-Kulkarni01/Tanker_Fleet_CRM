'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { drivers as initialDrivers, Driver } from '@/lib/data';
import { Plus, User, Phone, MoreVertical, View, UserX, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


const driverSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().regex(/^\d{10}$/, { message: 'Must be a 10-digit phone number.' }),
});

type DriverFormValues = z.infer<typeof driverSchema>;

export default function DriversPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers.filter(d => d.ownerId === user?.id));
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deactivatingDriver, setDeactivatingDriver] = useState<Driver | null>(null);

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
  });

  const onSubmit = (data: DriverFormValues) => {
    const newDriver: Driver = {
      id: `d${drivers.length + 10}`, // temp unique id
      ownerId: user!.id,
      ...data,
      is_active: true,
      avatar: undefined, // No avatar on creation
    };
    setDrivers([...drivers, newDriver]);
    toast({
      title: t('driverAdded'),
      description: `${data.name} has been added. In a real app, a login would be created for them.`,
    });
    setIsAddDialogOpen(false);
    form.reset({ name: '', phone: '' });
  };
  
  const toggleDriverStatus = (driverId: string) => {
    setDrivers(drivers.map(d => {
      if (d.id === driverId) {
        const wasActive = d.is_active;
        toast({
          title: wasActive ? t('driverDeactivated') : t('driverActivated'),
          description: `${d.name}'s account has been ${wasActive ? 'deactivated' : 'activated'}.`,
        });
        return { ...d, is_active: !d.is_active };
      }
      return d;
    }));
    setDeactivatingDriver(null);
  };

  if (user?.role !== 'owner') {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescriptionComponent>
            You do not have permission to view this page.
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
                            <DropdownMenuItem onClick={() => setDeactivatingDriver(driver)}>
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

      <Button
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg md:hidden"
        onClick={() => setIsAddDialogOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
      <Button
        className="hidden md:flex fixed bottom-8 right-8 h-14 rounded-full shadow-lg gap-2"
        onClick={() => setIsAddDialogOpen(true)}
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
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit">{t('addDriver')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {deactivatingDriver && (
        <AlertDialog open={!!deactivatingDriver} onOpenChange={() => setDeactivatingDriver(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{deactivatingDriver.is_active ? t('deactivate') : t('activate')} {deactivatingDriver.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                    {deactivatingDriver.is_active ? t('deactivateDriverConfirmation') : t('activateDriverConfirmation')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => toggleDriverStatus(deactivatingDriver.id)}>
                {deactivatingDriver.is_active ? t('deactivate') : t('activate')}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
