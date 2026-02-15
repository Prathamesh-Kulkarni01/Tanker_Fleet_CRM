'use client';
import { useState, useMemo, useRef } from 'react';
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
import { Plus, Edit, Trash2, ArrowRight, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, doc, addDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { Route } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import Map, { Marker, MapRef, type MapStyle, LngLatLike } from 'react-map-gl/maplibre';
import { cn } from '@/lib/utils';

const routeSchema = z.object({
  source: z.string().min(3, { message: 'Source must be at least 3 characters.' }),
  destinations: z.string().min(3, { message: 'Enter at least one destination.' }),
  rate_per_trip: z.coerce.number().positive({ message: 'Rate must be a positive number.' }),
});

type RouteFormValues = z.infer<typeof routeSchema>;

const osmStyle: MapStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};


export default function RoutesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  // State for map interactions
  const [selectionMode, setSelectionMode] = useState<'source' | 'destination'>('source');
  const [sourceCoords, setSourceCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [destCoords, setDestCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const mapRef = useRef<MapRef>(null);

  const initialViewState = {
    longitude: 73.8567, // Pune
    latitude: 18.5204,
    zoom: 10,
  };

  const routesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'routes'), where('ownerId', '==', user.id));
  }, [firestore, user]);
  const { data: routes, loading: routesLoading, error: routesError } = useCollection<Route>(routesQuery);


  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
  });
  
  const resetMapState = () => {
      setSourceCoords(null);
      setDestCoords([]);
      setSelectionMode('source');
  }

  const handleAddRoute = () => {
    setEditingRoute(null);
    resetMapState();
    form.reset({ source: '', destinations: '', rate_per_trip: 0 });
    setIsDialogOpen(true);
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    setSourceCoords(route.sourceCoords);
    setDestCoords(route.destCoords || []);
    form.reset({ 
        source: route.source, 
        destinations: route.destinations.join(', '), 
        rate_per_trip: route.rate_per_trip 
    });
    setIsDialogOpen(true);
  };

  const handleDeactivateRoute = async (routeId: string) => {
    if (!firestore) return;
    const routeRef = doc(firestore, 'routes', routeId);
    try {
      await updateDoc(routeRef, { is_active: false });
      toast({
        title: t('routeDeactivated'),
      });
    } catch (error) {
       console.error("Error deactivating route: ", error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to deactivate route.',
      });
    }
  };
  
  const onSubmit = async (data: RouteFormValues) => {
    if (!firestore || !user) return;
    
    if (!sourceCoords) {
        toast({ variant: 'destructive', title: 'Missing Location', description: 'Please select a source location on the map.' });
        return;
    }
    const destinationNames = data.destinations.split(',').map(d => d.trim()).filter(Boolean);
    if(destinationNames.length > 0 && destCoords.length === 0){
        toast({ variant: 'destructive', title: 'Missing Location', description: 'Please select destination locations on the map.' });
        return;
    }
    if (destinationNames.length !== destCoords.length) {
        toast({
            variant: 'destructive',
            title: 'Mismatched Locations',
            description: `You have entered ${destinationNames.length} destination names but selected ${destCoords.length} points on the map. Please ensure they match.`,
        });
        return;
    }

    const routeData = {
        ...data,
        destinations: destinationNames,
        sourceCoords,
        destCoords,
    };

    try {
        if (editingRoute) {
          const routeRef = doc(firestore, 'routes', editingRoute.id);
          // Omit ownerId and is_active from update data as they shouldn't be changed here.
          const { ownerId, is_active, ...updateData } = { ...editingRoute, ...routeData };
          await setDoc(routeRef, updateData, { merge: true });
        } else {
          const newRoute = {
            ...routeData,
            ownerId: user.id,
            is_active: true,
          };
          await addDoc(collection(firestore, 'routes'), newRoute);
        }
        toast({
          title: t('routeSaved'),
        });
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error saving route: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to save route.',
        });
    }
  };

  const handleMapClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const { lng, lat } = e.lngLat;
      if (selectionMode === 'source') {
          setSourceCoords({ latitude: lat, longitude: lng });
      } else {
          setDestCoords(prev => [...prev, { latitude: lat, longitude: lng }]);
      }
  }

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

  if (routesLoading) {
    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline sm:text-3xl">{t('routes')}</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        </div>
    )
  }

  if (routesError) {
    return (
        <div className="p-4 md:p-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Routes</AlertTitle>
                <AlertDescriptionComponent>Could not load your routes. Please check your connection and try again.</AlertDescriptionComponent>
            </Alert>
        </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline sm:text-3xl">{t('routes')}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routes && routes.map(route => {
          return (
            <Card key={route.id} className={!route.is_active ? 'bg-muted/50' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-start gap-2 flex-wrap">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-1" />
                    <span className="font-semibold">{route.source}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    <span className="text-muted-foreground font-normal">{route.destinations.join(', ')}</span>
                  </CardTitle>
                  <Badge variant={route.is_active ? 'secondary' : 'outline'}>
                    {route.is_active ? t('active') : t('inactive')}
                  </Badge>
                </div>
                <CardDescription>₹{route.rate_per_trip.toLocaleString('en-IN')} / {t('trip')}</CardDescription>
              </CardHeader>
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
        <DialogContent className="sm:max-w-3xl">
           <DialogHeader>
            <DialogTitle>{editingRoute ? t('editRoute') : t('addRoute')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="overflow-y-auto max-h-[70vh] p-1 -m-6 px-6">
                <div className="grid md:grid-cols-2 gap-6 py-4">
                    {/* Form Inputs Column */}
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="source">Source Name (Filling Point)</Label>
                            <Input id="source" {...form.register('source')} />
                            {form.formState.errors.source && (
                            <p className="text-sm text-destructive">{form.formState.errors.source.message}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="destinations">Destination Names (Delivery Points)</Label>
                            <Textarea id="destinations" {...form.register('destinations')} placeholder="e.g. Corporate Park, Tech Tower" />
                            <p className="text-xs text-muted-foreground">Enter multiple destinations separated by a comma.</p>
                            {form.formState.errors.destinations && (
                            <p className="text-sm text-destructive">{form.formState.errors.destinations.message}</p>
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

                    {/* Map Column */}
                    <div className="space-y-2">
                        <Label>Set Locations on Map</Label>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button type="button" size="sm" variant={selectionMode === 'source' ? 'default' : 'outline'} onClick={() => setSelectionMode('source')}>Set Source</Button>
                            <Button type="button" size="sm" variant={selectionMode === 'destination' ? 'default' : 'outline'} onClick={() => setSelectionMode('destination')}>Add Destination</Button>
                            <Button type="button" size="sm" variant="destructive" onClick={() => resetMapState()}>Clear Pins</Button>
                        </div>
                        <p className="text-xs text-muted-foreground h-8">
                            {selectionMode === 'source' ? 'Click on the map to place the source pin.' : `Click to add destination pin ${destCoords.length + 1}.`}
                        </p>
                        <div className="w-full h-64 rounded-md overflow-hidden relative bg-muted">
                            <Map
                               ref={mapRef}
                               initialViewState={initialViewState}
                               style={{width: '100%', height: '100%'}}
                               mapStyle={osmStyle}
                               onClick={handleMapClick}
                               >
                               {sourceCoords && (
                                    <Marker longitude={sourceCoords.longitude} latitude={sourceCoords.latitude}>
                                        <MapPin className="h-6 w-6 text-blue-600 fill-blue-400/80" />
                                    </Marker>
                               )}
                               {destCoords.map((coords, index) => (
                                    <Marker key={index} longitude={coords.longitude} latitude={coords.latitude}>
                                        <MapPin className="h-6 w-6 text-red-600 fill-red-400/80" />
                                    </Marker>
                               ))}
                            </Map>
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter className="pt-6">
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
