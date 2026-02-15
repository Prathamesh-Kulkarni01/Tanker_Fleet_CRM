'use client';

import { useEffect } from 'react';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useAuth } from '@/contexts/auth';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * This component has no UI. It runs in the background on trip pages 
 * to update the driver's live location in Firestore.
 */
export function DriverLocationUpdater() {
  const { user } = useAuth();
  const firestore = useFirestore();
  
  // Get location updates. enableHighAccuracy is important for tracking.
  const { position, heading } = useGeolocation({ enableHighAccuracy: true });

  useEffect(() => {
    // Only run for logged-in drivers who have a position
    if (position && user && firestore && user.role === 'driver') {
      const driverRef = doc(firestore, 'users', user.uid);
      
      // Using .catch() for silent error handling in the background
      updateDoc(driverRef, {
        location: {
          latitude: position.latitude,
          longitude: position.longitude,
          heading: heading ?? 0,
          timestamp: Timestamp.now(),
        },
      }).catch(error => {
          // We don't want to show a toast for this background task
          console.error("Error updating driver location: ", error);
      });
    }
  }, [position, user, firestore, heading]);

  // This component doesn't render anything to the screen
  return null;
}
