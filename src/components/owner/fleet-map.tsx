'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import ReactMapGL, { Marker, Popup, MapRef, type MapStyle, Source, Layer, type LineLayer } from 'react-map-gl/maplibre';
import Link from 'next/link';
import { drivers, trips, type Driver, routes, type Route } from '@/lib/data';
import { TruckMarker } from '../icons/truck-marker';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useI18n } from '@/lib/i18n';
import { MapPin } from 'lucide-react';
import type { FeatureCollection, LineString } from 'geojson';


type DriverPosition = {
  driver: Driver;
  longitude: number;
  latitude: number;
  heading: number;
  status: 'active' | 'idle';
  route: Route | null;
};

// Simulate initial positions around a central point (e.g., Bangalore)
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


function getInitialPositions(): DriverPosition[] {
  const activeDrivers = drivers.filter(d => d.is_active);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return activeDrivers.map(driver => {
    // Find a trip for today for this driver
    const tripToday = trips.find(t => t.driverId === driver.id && t.date === todayStr);

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
}

const routeLineLayer: LineLayer = {
    id: 'route-lines',
    type: 'line',
    source: 'routes',
    layout: {
        'line-join': 'round',
        'line-cap': 'round'
    },
    paint: {
        'line-color': '#0ea5e9', // a nice blue color
        'line-width': 2,
        'line-dasharray': [2, 2],
    }
};

export function FleetMap() {
  const { t } = useI18n();
  const mapRef = useRef<MapRef>(null);
  const [driverPositions, setDriverPositions] = useState<DriverPosition[]>(getInitialPositions());
  const [selectedDriver, setSelectedDriver] = useState<DriverPosition | null>(null);
  const [viewState, setViewState] = useState({
    ...initialCenter,
    zoom: 10,
  });

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

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysTripsByDriver = useMemo(() => {
    const tripCounts: Record<string, number> = {};
    trips.forEach(trip => {
      if (trip.date === todayStr) {
        tripCounts[trip.driverId] = (tripCounts[trip.driverId] || 0) + trip.count;
      }
    });
    return tripCounts;
  }, [todayStr]);
  
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

        {/* Source and Destination Markers */}
        {routePoints.map((point) => (
            <Marker
                key={`${point.name}-${point.longitude}`}
                longitude={point.longitude}
                latitude={point.latitude}
                anchor="bottom"
                onClick={(e) => { e.originalEvent.stopPropagation(); }} // prevent map click
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
            <div className="w-48">
              <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-base">{selectedDriver.driver.name}</h3>
                  <Badge variant={selectedDriver.status === 'active' ? 'secondary' : 'outline'}>{t(selectedDriver.status)}</Badge>
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
        <CardContent className="p-3 pt-0 space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('active')}</span>
                <span className="font-bold text-lg text-green-600">{activeDriversCount}</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('idle')}</span>
                <span className="font-bold text-lg text-amber-600">{idleDriversCount}</span>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
