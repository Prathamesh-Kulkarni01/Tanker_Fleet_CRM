
'use client';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { routes as initialRoutes, trips, Route } from '@/lib/data';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const routeSchema = z.object({
  name: z.string().min(3, { message: 'Route name must be at least 3 characters.' }),
  rate_per_trip: z.coerce.number().positive({ message: 'Rate must be a positive number.' }),
});

type RouteFormValues = z.infer<typeof routeSchema>;

export default function RoutesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
  });

  const handleAddRoute = () => {
    setEditingRoute(null);
    form.reset({ name: '', rate_per_trip: 0 });
    setIsDialogOpen(true);
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    form.reset({ name: route.name, rate_per_trip: route.rate_per_trip });
    setIsDialogOpen(true);
  };

  const handleDeactivateRoute = (routeId: string) => {
    setRoutes(routes.map(r => r.id === routeId ? { ...r, is_active: false } : r));
    toast({
      title: t('routeDeactivated'),
    });
  };
  
  const onSubmit = (data: RouteFormValues) => {
    if (editingRoute) {
      // Edit existing route
      setRoutes(routes.map(r => r.id === editingRoute.id ? { ...r, ...data } : r));
    } else {
      // Add new route
      const newRoute: Route = {
        id: `r${routes.length + 1}`,
        ...data,
        is_active: true,
      };
      setRoutes([...routes, newRoute]);
    }
    toast({
      title: t('routeSaved'),
    });
    setIsDialogOpen(false);
  };

  const getRouteStats = (routeId: string) => {
    const routeTrips = trips.filter(trip => trip.routeId === routeId);
    const totalTrips = routeTrips.reduce((acc, trip) => acc + trip.count, 0);
    const route = routes.find(r => r.id === routeId);
    const totalRevenue = totalTrips * (route?.rate_per_trip || 0);
    return { totalTrips, totalRevenue };
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
        <h1 className="text-2xl font-bold font-headline sm:text-3xl">{t('routes')}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routes.map(route => {
          const { totalTrips, totalRevenue } = getRouteStats(route.id);
          return (
            <Card key={route.id} className={!route.is_active ? 'bg-muted/50' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{route.name}</CardTitle>
                  <Badge variant={route.is_active ? 'secondary' : 'outline'}>
                    {route.is_active ? t('active') : t('inactive')}
                  </Badge>
                </div>
                <CardDescription>₹{route.rate_per_trip.toLocaleString('en-IN')} / {t('trip')}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalTrips')}</p>
                  <p className="text-lg font-bold">{totalTrips}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
                  <p className="text-lg font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleEditRoute(route)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('edit')}
                </Button>
                {route.is_active && (
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('deactivate')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('deactivateRoute')}</AlertDialogTitle>
                        <AlertDialogDescription>
                         {t('deactivateRouteConfirmation')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeactivateRoute(route.id)}>
                          {t('deactivate')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Button
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg md:hidden"
        onClick={handleAddRoute}
      >
        <Plus className="h-6 w-6" />
      </Button>
       <Button
        className="hidden md:flex fixed bottom-8 right-8 h-14 rounded-full shadow-lg gap-2"
        onClick={handleAddRoute}
      >
        <Plus className="h-6 w-6" />
        {t('addRoute')}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoute ? t('editRoute') : t('addRoute')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('routeName')}</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate_per_trip">{t('ratePerTrip')}</Label>
                <Input id="rate_per_trip" type="number" {...form.register('rate_per_trip')} />
                 {form.formState.errors.rate_per_trip && (
                  <p className="text-sm text-destructive">{form.formState.errors.rate_per_trip.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit">{t('saveChanges')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
