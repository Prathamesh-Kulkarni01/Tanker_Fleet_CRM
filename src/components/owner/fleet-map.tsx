'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import ReactMapGL, { Marker, Popup, MapRef, type MapStyle, Source, Layer, type LineLayer } from 'react-map-gl/maplibre';
import Link from 'next/link';
import { type Driver, type Route, type Trip } from '@/lib/data';
import { TruckMarker } from '../icons/truck-marker';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useI18n } from '@/lib/i18n';
import { MapPin } from 'lucide-react';
import type { FeatureCollection, LineString } from 'geojson';
import { useAuth } from '@/contexts/auth';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';


type DriverPosition = {
  driver: Driver;
  longitude: number;
  latitude: number;
  heading: number;
  status: 'active' | 'idle';
  route: Route | null;
};

const initialCenter = { longitude: 77.5946, latitude: 12.9716 };

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
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};


const routeLineLayer: LineLayer = {
    id: 'route-lines',
    type: 'line',
    source: 'routes',
    layout: {
        'line-join': 'round',
        'line-cap': 'round'
    },
    paint: {
        'line-color': '#0ea5e9',
        'line-width': 2,
        'line-dasharray': [2, 2],
    }
};

export function FleetMap() {
  const { t } = useI18n();
  const mapRef = useRef<MapRef>(null);
  const { user } = useAuth();
  const firestore = useFirestore();

  const [driverPositions, setDriverPositions] = useState<DriverPosition[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverPosition | null>(null);
  const [viewState, setViewState] = useState({
    ...initialCenter,
    zoom: 10,
  });

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return Timestamp.fromDate(d);
  }, []);

  // Fetch live data
  const driversQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('ownerId', '==', user.uid), where('role', '==', 'driver'), where('is_active', '==', true));
  }, [firestore, user]);
  const { data: drivers, loading: driversLoading } = useCollection<Driver>(driversQuery);

  const tripsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'trips'), where('ownerId', '==', user.uid), where('date', '>=', todayStart));
  }, [firestore, user, todayStart]);
  const { data: todaysTrips, loading: tripsLoading } = useCollection<Trip>(tripsQuery);
  
  const routesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'routes'), where('ownerId', '==', user.uid), where('is_active', '==', true));
  }, [firestore, user]);
  const { data: routes, loading: routesLoading } = useCollection<Route>(routesQuery);


  // Initialize driver positions once data is loaded
  useEffect(() => {
    if (drivers && todaysTrips && routes) {
      const positions = drivers.map(driver => {
        const tripToday = todaysTrips.find(t => t.driverId === driver.id);
        const route = tripToday ? routes.find(r => r.id === tripToday.routeId) || null : null;
        const status = route ? 'active' : 'idle';

        return {
          driver,
          longitude: initialCenter.longitude + (Math.random() - 0.5) * 0.2,
          latitude: initialCenter.latitude + (Math.random() - 0.5) * 0.2,
          heading: Math.random() * 360,
          status: status,
          route: route,
        };
      });
      setDriverPositions(positions);
    }
  }, [drivers, todaysTrips, routes]);


  // Simulate live movement
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverPositions(prevPositions =>
        prevPositions.map(p => {
          if (p.status === 'active') {
            const move = (Math.random() - 0.5) * 0.002;
            const angleRad = p.heading * (Math.PI / 180);
            return {
              ...p,
              longitude: p.longitude + move * Math.cos(angleRad),
              latitude: p.latitude + move * Math.sin(angleRad),
              heading: p.heading + (Math.random() - 0.5) * 5,
            };
          }
          return p;
        })
      );
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const todaysTripsByDriver = useMemo(() => {
    if (!todaysTrips) return {};
    const tripCounts: Record<string, number> = {};
    todaysTrips.forEach(trip => {
      tripCounts[trip.driverId] = (tripCounts[trip.driverId] || 0) + trip.count;
    });
    return tripCounts;
  }, [todaysTrips]);
  
  const activeDriversCount = driverPositions.filter(p => p.status === 'active').length;
  const idleDriversCount = driverPositions.filter(p => p.status === 'idle').length;

  const routesGeoJSON: FeatureCollection<LineString> = useMemo(() => {
    const features = driverPositions
      .filter(p => p.route)
      .map(p => {
        const route = p.route!;
        const coordinates = [
          [route.sourceCoords.longitude, route.sourceCoords.latitude],
          ...route.destCoords.map(d => [d.longitude, d.latitude])
        ];
        return {
          type: 'Feature' as const,
          properties: {
              driverId: p.driver.id,
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: coordinates,
          },
        };
      });

    return {
      type: 'FeatureCollection',
      features: features,
    };
  }, [driverPositions]);

  // Unique set of source and destination markers to avoid duplicates on the map
  const routePoints = useMemo(() => {
    const points = new Map<string, {
      type: 'source' | 'destination';
      name: string;
      longitude: number;
      latitude: number;
    }>();

    driverPositions.forEach(p => {
      if (p.route) {
        const { route } = p;
        const sourceKey = `${route.sourceCoords.longitude},${route.sourceCoords.latitude}`;
        if (!points.has(sourceKey)) {
          points.set(sourceKey, {
            type: 'source',
            name: route.source,
            ...route.sourceCoords,
          });
        }
        route.destCoords.forEach((dest, i) => {
          const destKey = `${dest.longitude},${dest.latitude}`;
          if (!points.has(destKey)) {
            points.set(destKey, {
              type: 'destination',
              name: route.destinations[i],
              ...dest
            });
          }
        });
      }
    });
    return Array.from(points.values());
  }, [driverPositions]);

  const isLoading = driversLoading || tripsLoading || routesLoading;

  if (isLoading) {
    return <Skeleton className="h-full w-full" />
  }


  return (
    <div className="relative h-full w-full">
      <ReactMapGL
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={osmStyle}
      >
        <Source id="routes" type="geojson" data={routesGeoJSON}>
            <Layer {...routeLineLayer} />
        </Source>

        {routePoints.map((point) => (
            <Marker
                key={`${point.name}-${point.longitude}`}
                longitude={point.longitude}
                latitude={point.latitude}
                anchor="bottom"
                onClick={(e) => { e.originalEvent.stopPropagation(); }}
            >
                <div className="flex flex-col items-center">
                    <MapPin className={point.type === 'source' ? "h-6 w-6 text-blue-600 fill-blue-400/80" : "h-6 w-6 text-red-600 fill-red-400/80"} />
                    <span className="text-xs font-semibold bg-background/90 text-foreground px-1.5 py-0.5 rounded-md shadow-lg">{point.name}</span>
                </div>
            </Marker>
        ))}


        {driverPositions.map(pos => (
          <Marker
            key={pos.driver.id}
            longitude={pos.longitude}
            latitude={pos.latitude}
            anchor="center"
            onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedDriver(pos)
            }}
          >
            <TruckMarker rotation={pos.heading} />
          </Marker>
        ))}

        {selectedDriver && (
          <Popup
            longitude={selectedDriver.longitude}
            latitude={selectedDriver.latitude}
            onClose={() => setSelectedDriver(null)}
            closeOnClick={false}
            anchor="bottom"
            offset={40}
          >
            <div className="w-48 text-neutral-900">
              <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-base">{selectedDriver.driver.name}</h3>
                  <Badge variant={selectedDriver.status === 'active' ? 'default' : 'secondary'}>{t(selectedDriver.status)}</Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                  <p>{t('todaysTrips')}: <span className="font-semibold">{todaysTripsByDriver[selectedDriver.driver.id] || 0}</span></p>
              </div>
              <Button size="sm" variant="link" asChild className="p-0 h-auto mt-3">
                  <Link href={`/drivers/${selectedDriver.driver.id}`}>{t('viewProfile')}</Link>
              </Button>
            </div>
          </Popup>
        )}
      </ReactMapGL>
      <Card className="absolute top-4 left-4 w-auto max-w-xs">
        <CardHeader className="p-3">
            <CardTitle className="text-lg">{t('fleetOverview')}</CardTitle>
            <CardDescription>{t('liveStatusOfAllDrivers')}</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 grid grid-cols-2 gap-2">
            <div className="text-center rounded-md p-2 bg-muted">
                <p className="text-muted-foreground text-sm font-semibold">{t('active')}</p>
                <p className="font-bold text-lg text-green-600">{activeDriversCount}</p>
            </div>
            <div className="text-center rounded-md p-2 bg-muted">
                <p className="text-muted-foreground text-sm font-semibold">{t('idle')}</p>
                <p className="font-bold text-lg text-amber-600">{idleDriversCount}</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
