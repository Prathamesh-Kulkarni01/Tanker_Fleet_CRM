'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Map, { Marker, Popup, MapRef, type MapStyle } from 'react-map-gl/maplibre';
import Link from 'next/link';
import { drivers, trips, type Driver } from '@/lib/data';
import { TruckMarker } from '../icons/truck-marker';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useI18n } from '@/lib/i18n';

type DriverPosition = {
  driver: Driver;
  longitude: number;
  latitude: number;
  heading: number;
  status: 'active' | 'idle';
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
  return activeDrivers.map(driver => ({
    driver,
    longitude: initialCenter.longitude + (Math.random() - 0.5) * 0.2,
    latitude: initialCenter.latitude + (Math.random() - 0.5) * 0.2,
    heading: Math.random() * 360,
    status: Math.random() > 0.3 ? 'active' : 'idle',
  }));
}

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
  }, [todayStr, trips]);
  
  const activeDriversCount = driverPositions.filter(p => p.status === 'active').length;
  const idleDriversCount = driverPositions.filter(p => p.status === 'idle').length;

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={osmStyle}
      >
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
              <h3 className="font-bold text-base mb-2">{selectedDriver.driver.name}</h3>
              <div className="space-y-1.5 text-sm">
                  <p><Badge variant={selectedDriver.status === 'active' ? 'secondary' : 'outline'}>{t(selectedDriver.status)}</Badge></p>
                  <p>{t('todaysTrips')}: <span className="font-semibold">{todaysTripsByDriver[selectedDriver.driver.id] || 0}</span></p>
              </div>
              <Button size="sm" variant="link" asChild className="p-0 h-auto mt-3">
                  <Link href={`/drivers/${selectedDriver.driver.id}`}>{t('viewProfile')}</Link>
              </Button>
            </div>
          </Popup>
        )}
      </Map>
      <Card className="absolute top-4 left-4 w-auto max-w-sm">
        <CardHeader className="p-3">
            <CardTitle className="text-lg">{t('fleetOverview')}</CardTitle>
            <CardDescription>{t('liveStatusOfAllDrivers')}</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 flex gap-4">
            <div>
                <p className="text-xs text-muted-foreground">{t('active')}</p>
                <p className="text-lg font-bold text-green-600">{activeDriversCount}</p>
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{t('idle')}</p>
                <p className="text-lg font-bold text-amber-600">{idleDriversCount}</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
