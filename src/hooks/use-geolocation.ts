'use client';

import { useState, useEffect } from 'react';

interface Position {
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  position: Position | null;
  error: string | null;
  speed: number | null;
  heading: number | null;
}

export function useGeolocation(options?: PositionOptions): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    speed: null,
    heading: null,
  });

  useEffect(() => {
    let watchId: number;

    const handleSuccess = (pos: GeolocationPosition) => {
      setState({
        position: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        error: null,
      });
    };

    const handleError = (err: GeolocationPositionError) => {
      let errorMessage = 'An unknown error occurred.';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location Permission Required';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable.';
          break;
        case err.TIMEOUT:
          errorMessage = 'The request to get user location timed out.';
          break;
      }
      setState((prevState) => ({ ...prevState, error: errorMessage }));
    };

    if (!navigator.geolocation) {
      setState((prevState) => ({
        ...prevState,
        error: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
      ...options,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [options]);

  return state;
}
