'use client';
import type { ImagePlaceholder } from './placeholder-images';

export type Driver = {
  id: string; // This is the Firestore Document ID (UID)
  ownerId: string;
  name: string;
  phone: string;
  is_active: boolean;
  avatar?: ImagePlaceholder;
  location?: {
    latitude: number;
    longitude: number;
    heading: number;
    timestamp: any; // Firestore Timestamp
  };
};

export type Route = {
  id: string; // This is the Firestore Document ID
  name: string;
  ownerId: string;
  source: string;
  destinations: string[];
  rate_per_trip: number;
  is_active: boolean;
  sourceCoords: { longitude: number; latitude: number };
  destCoords: { longitude: number; latitude: number }[];
};

export type TripEvent = {
  timestamp: any; // Firestore Timestamp
  location: string;
  action: string;
  notes?: string;
};

export type Trip = {
  id: string; // This is the Firestore Document ID
  ownerId: string;
  driverId: string; // The driver's UID
  date: any; // Firestore Timestamp
  routeId: string;
  count: number;
  events?: TripEvent[];
};

export type Slab = {
  id: string; // This is the Firestore Document ID
  ownerId: string;
  min_trips: number;
  max_trips: number;
  payout_amount: number;
};

export type MonthlySummary = {
  driverId: string;
  month: string; // "YYYY-MM"
  total_trips: number;
  payout: number;
};

export type Job = {
  id: string;
  ownerId: string;
  driverId: string;
  routeId: string;
  routeName: string;
  status: 'requested' | 'assigned' | 'accepted' | 'in_progress' | 'completed';
  assignedAt: any; // Firestore Timestamp
  events: any[]; // Consider a more specific type
};
