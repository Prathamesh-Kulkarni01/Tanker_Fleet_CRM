
'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
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
import { Plus, Edit, Trash2, ArrowRight, MapPin, AlertCircle, LocateFixed, X, ArrowDown, ArrowUp, Map, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Route } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import MapGL, { Marker, MapRef, type MapStyle } from 'react-map-gl/maplibre';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { getRouteNameSuggestion } from '@/lib/actions';


const routeSchema = z.object({
  name: z.string().min(3, { message: 'Route name must be at least 3 characters.'}),
  rate_per_trip: z.coerce.number().positive({ message: 'Rate must be a positive number.' }),
});

type RouteFormValues = z.infer<typeof routeSchema>;

interface LocationPoint {
  name: string;
  coords: {
    latitude: number;
    longitude: number;
  };
}

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
  
  const [source, setSource] = useState<LocationPoint | null>(null);
  const [destinations, setDestinations] = useState<LocationPoint[]>([]);

  const mapRef = useRef<MapRef>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

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
    defaultValues: {
        name: '',
        rate_per_trip: 0,
    }
  });
  
  const resetMapState = () => {
      setSource(null);
      setDestinations([]);
  }

  const handleAddRoute = () => {
    setEditingRoute(null);
    resetMapState();
    form.reset({ name: '', rate_per_trip: 0 });
    setIsNameManuallyEdited(false);
    setIsDialogOpen(true);
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    setSource({ name: route.source, coords: route.sourceCoords });
    setDestinations(route.destinations.map((name, i) => ({ name, coords: route.destCoords[i] })));
    form.reset({ name: route.name, rate_per_trip: route.rate_per_trip });
    setIsNameManuallyEdited(!!route.name);
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
    
    if (!source) {
        toast({ variant: 'destructive', title: t('missingSource'), description: t('missingSourceDescription') });
        return;
    }
    if (destinations.length === 0) {
        toast({ variant: 'destructive', title: t('missingDestination'), description: t('missingDestinationDescription') });
        return;
    }

    const routeData = {
        name: data.name,
        source: source.name,
        destinations: destinations.map(d => d.name),
        sourceCoords: source.coords,
        destCoords: destinations.map(d => d.coords),
        rate_per_trip: data.rate_per_trip,
    };

    try {
        if (editingRoute) {
          const routeRef = doc(firestore, 'routes', editingRoute.id);
          await updateDoc(routeRef, routeData);
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
            title: t('error'),
            description: 'Failed to save route.',
        });
    }
  };

  // Fetch location suggestions from Nominatim
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const handler = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`,
          { signal }
        );
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setSuggestions(data);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Failed to fetch location suggestions:", error);
          setSuggestions([]);
        }
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [searchQuery]);

  // Effect to suggest a route name
  useEffect(() => {
    // Only suggest if not editing an existing named route, and if we have a source/dest
    if (isDialogOpen && !isNameManuallyEdited && source && destinations.length > 0) {
      const suggestName = async () => {
        setIsGeneratingName(true);
        const destNames = destinations.map(d => d.name);
        const result = await getRouteNameSuggestion(source.name, destNames);
        if (result.success && result.data?.routeName) {
          // Check if user has started typing while we were fetching
          if (!form.getValues('name') && !isNameManuallyEdited) {
            form.setValue('name', result.data.routeName, { shouldValidate: true });
          }
        }
        setIsGeneratingName(false);
      };
      
      const timer = setTimeout(suggestName, 1000); // Debounce to avoid rapid calls
      return () => clearTimeout(timer);
    }
  }, [source, destinations, isDialogOpen, isNameManuallyEdited, form]);


  const handleSuggestionClick = (suggestion: any) => {
    const { lat, lon, display_name } = suggestion;
    const newPoint: LocationPoint = {
        name: display_name,
        coords: { latitude: parseFloat(lat), longitude: parseFloat(lon) }
    };
    
    if (!source) {
        setSource(newPoint);
    } else {
        setDestinations(prev => [...prev, newPoint]);
    }
    
    mapRef.current?.flyTo({
      center: [parseFloat(lon), parseFloat(lat)],
      zoom: 14,
    });
    setSearchQuery('');
    setSuggestions([]);
  };

  const removeDestination = (index: number) => {
    setDestinations(prev => prev.filter((_, i) => i !== index));
  };
  
  const moveDestination = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index > 0) {
          setDestinations(prev => {
              const newDests = [...prev];
              [newDests[index - 1], newDests[index]] = [newDests[index], newDests[index-1]];
              return newDests;
          });
      }
      if (direction === 'down' && index < destinations.length - 1) {
           setDestinations(prev => {
              const newDests = [...prev];
              [newDests[index + 1], newDests[index]] = [newDests[index], newDests[index+1]];
              return newDests;
          });
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
                <AlertTitle>{t('errorLoadingRoutes')}</AlertTitle>
                <AlertDescriptionComponent>{t('couldNotLoadRoutesDescription')}</AlertDescriptionComponent>
            </Alert>
        </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline sm:text-3xl">{t('routes')}</h1>
      </div>
        
      {!routesLoading && !routesError && (
        <>
            {routes && routes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {routes.map(route => {
                    return (
                        <Card key={route.id} className={cn('flex flex-col', !route.is_active ? 'bg-muted/50' : '')}>
                          <CardHeader className="flex-grow">
                              <div className="flex justify-between items-start gap-4">
                                  <CardTitle className="break-words">{route.name}</CardTitle>
                                  <Badge variant={route.is_active ? 'secondary' : 'outline'} className="shrink-0">
                                      {route.is_active ? t('active') : t('inactive')}
                                  </Badge>
                              </div>
                              <CardDescription className="break-words" title={`${route.source} → ${route.destinations.join(', ')}`}>
                                  {route.source} → {route.destinations.join(', ')}
                              </CardDescription>
                          </CardHeader>
                          <CardContent>
                              <div className="font-bold">₹{route.rate_per_trip.toLocaleString('en-IN')} / {t('trip')}</div>
                          </CardContent>
                          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
            ) : (
                <Card className="mt-6">
                    <CardContent className="p-12 text-center">
                        <div className="mx-auto max-w-sm">
                            <Map className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium">{t('noRoutesCreated')}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{t('noRoutesCreatedDescription')}</p>
                            <Button onClick={handleAddRoute} className="mt-6">
                                <Plus className="mr-2" />
                                {t('createYourFirstRoute')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
      )}


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
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0">
           <DialogHeader className="p-6 pb-0">
            <DialogTitle>{editingRoute ? t('editRoute') : t('addRoute')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
              <div className="grid grid-cols-1 md:grid-cols-2 flex-1 gap-4 overflow-hidden px-6">
                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <Input
                            id="location-search"
                            placeholder={!source ? t('searchForStartingPoint') : t('searchForDestination')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoComplete="off"
                            className="pl-10"
                        />
                        <LocateFixed className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        {suggestions.length > 0 && (
                            <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto">
                                <CardContent className="p-1">
                                    {suggestions.map((suggestion) => (
                                        <div
                                            key={suggestion.place_id}
                                            onMouseDown={() => handleSuggestionClick(suggestion)}
                                            className="p-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                                        >
                                            {suggestion.display_name}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                        {source && (
                            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                <MapPin className="h-5 w-5 text-blue-600" />
                                <p className="flex-1 text-sm truncate">{source.name}</p>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSource(null)}><X className="h-4 w-4"/></Button>
                            </div>
                        )}
                        {destinations.map((dest, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                <MapPin className="h-5 w-5 text-red-600" />
                                <p className="flex-1 text-sm truncate">{dest.name}</p>
                                <div className="flex items-center">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveDestination(index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveDestination(index, 'down')} disabled={index === destinations.length - 1}><ArrowDown className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDestination(index)}><X className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 w-full rounded-md overflow-hidden relative bg-muted">
                    <MapGL
                        ref={mapRef}
                        initialViewState={initialViewState}
                        style={{width: '100%', height: '100%'}}
                        mapStyle={osmStyle}
                        >
                        {source && (
                            <Marker longitude={source.coords.longitude} latitude={source.coords.latitude}>
                                <div className="flex flex-col items-center cursor-pointer">
                                <MapPin className="h-8 w-8 text-blue-600 fill-blue-400/80 drop-shadow-lg" />
                                <span className="text-xs font-bold bg-background/80 px-2 py-0.5 rounded-full shadow-lg">S</span>
                                </div>
                            </Marker>
                        )}
                        {destinations.map((dest, index) => (
                            <Marker key={index} longitude={dest.coords.longitude} latitude={dest.coords.latitude}>
                                <div className="flex flex-col items-center cursor-pointer">
                                    <MapPin className="h-8 w-8 text-red-600 fill-red-400/80 drop-shadow-lg" />
                                    <span className="text-xs font-bold bg-background/80 px-2 py-0.5 rounded-full shadow-lg">{index + 1}</span>
                                </div>
                            </Marker>
                        ))}
                    </MapGL>
                </div>
              </div>
                
              <div className="bg-muted/50 p-6 border-t space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <Label htmlFor="name">{t('routeName')}</Label>
                                    <div className="relative">
                                      <FormControl>
                                          <Input 
                                            id="name" 
                                            placeholder={isGeneratingName ? t('generatingSuggestion') : t('egWakadToHinjewadi')} 
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                setIsNameManuallyEdited(true);
                                            }}
                                          />
                                      </FormControl>
                                      {isGeneratingName && (
                                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
                                      )}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="rate_per_trip"
                            render={({ field }) => (
                                <FormItem>
                                    <Label htmlFor="rate_per_trip">{t('ratePerTrip')}</Label>
                                    <FormControl>
                                        <Input id="rate_per_trip" type="number" placeholder="e.g. 500" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                        {t('cancel')}
                        </Button>
                    </DialogClose>
                    <Button type="submit">{t('saveChanges')}</Button>
                  </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
