
'use client';

import { useState, useEffect, useRef } from 'react';
import Map, {
  Marker,
  Source,
  Layer,
  MapRef,
} from 'react-map-gl/maplibre';
import type { LineLayer, LngLatLike, MapStyle } from 'maplibre-gl';

import { useGeolocation } from '@/hooks/use-geolocation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocateFixed } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Route, Trip } from '@/lib/data';
import { TruckMarker } from '../icons/truck-marker';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useI18n } from '@/lib/i18n';

const lineLayer: LineLayer = {
  id: 'route-line',
  type: 'line',
  source: 'route',
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': '#007cbf',
    'line-width': 8,
    'line-opacity': 0.8,
  },
};

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


interface LiveMapProps {
  trip: Trip;
  route: Route;
}

export function LiveMap({ trip, route }: LiveMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { t } = useI18n();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { position, error, speed, heading } = useGeolocation();
  const [viewState, setViewState] = useState({
    longitude: 77.5946, // Default to Bangalore
    latitude: 12.9716,
    zoom: 12,
  });

  const [path, setPath] = useState<LngLatLike[]>([]);
  const [autoFollow, setAutoFollow] = useState(true);

  useEffect(() => {
    // When the driver is on this page, update their location in Firestore
    if (position && user && firestore && user.role === 'driver') {
      const driverRef = doc(firestore, 'users', user.uid);
      updateDoc(driverRef, {
        location: {
          latitude: position.latitude,
          longitude: position.longitude,
          heading: heading ?? 0,
          timestamp: Timestamp.now(),
        },
      });
    }
    
    if (position) {
      const newPoint: LngLatLike = [position.longitude, position.latitude];
      setPath((prevPath) => [...prevPath, newPoint]);

      if (autoFollow) {
        mapRef.current?.flyTo({
          center: newPoint,
          zoom: 16,
          speed: 1.5,
          curve: 1,
          easing(t) {
            return t;
          },
        });
      }
    }
  }, [position, autoFollow, user, firestore, heading]);

  const handleRecenter = () => {
    setAutoFollow(true);
    if (position) {
      mapRef.current?.flyTo({
        center: [position.longitude, position.latitude],
        zoom: 16,
      });
    }
  };

  const routeGeoJSON = {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: path,
    },
  };

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-muted">
        <Skeleton className="h-full w-full" />
        <p className="absolute text-lg font-semibold animate-pulse">
          {t('waitingForGps')}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onDragStart={() => setAutoFollow(false)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={osmStyle}
      >
        {/* Driver Marker */}
        <Marker
          longitude={position.longitude}
          latitude={position.latitude}
          anchor="center"
        >
          <TruckMarker rotation={heading || 0} />
        </Marker>

        {/* Route Line */}
        <Source id="route-source" type="geojson" data={routeGeoJSON}>
          <Layer {...lineLayer} />
        </Source>

        {/* <NavigationControl position="top-right" /> */}
      </Map>

      <div className="absolute top-4 right-4 space-y-2">
        <Button size="icon" onClick={handleRecenter}>
          <LocateFixed className="h-5 w-5" />
        </Button>
      </div>

      <Card className="absolute bottom-4 left-4 right-4 shadow-lg">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
             <div>
                <p className="text-xs text-muted-foreground">{t('currentRoute')}</p>
                <p className="font-bold">{route.source} → {route.destinations.join(', ')}</p>
             </div>
             {user?.role === 'driver' && (
              <Button variant="destructive" size="sm">{t('endTrip')}</Button>
             )}
          </div>
           <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-xs text-muted-foreground">{t('startTime')}</p>
                    <p className="font-semibold">{format(new Date(), 'h:mm a')}</p>
                </div>
                 <div>
                    <p className="text-xs text-muted-foreground">{t('speed')}</p>
                    <p className="font-semibold">{speed ? `${(speed * 3.6).toFixed(0)} km/h` : 'N/A'}</p>
                </div>
                 <div>
                    <p className="text-xs text-muted-foreground">{t('tripsToday')}</p>
                    <p className="font-semibold">{trip.count}</p>
                </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
