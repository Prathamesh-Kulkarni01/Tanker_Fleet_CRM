import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

export type Driver = {
  id: string;
  name: string;
  avatar: ImagePlaceholder | undefined;
};

export type Trip = {
  id: string;
  driverId: string;
  date: string; // "YYYY-MM-DD"
  tripType: string;
  count: number;
};

export type Slab = {
  id: string;
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

export type TripTypeData = {
  id: string;
  name: string;
};

export const drivers: Driver[] = [
  { id: 'd1', name: 'Rohan', avatar: PlaceHolderImages.find(img => img.id === 'driver-1') },
  { id: 'd2', name: 'Sameer', avatar: PlaceHolderImages.find(img => img.id === 'driver-2') },
  { id: 'd3', name: 'Vijay', avatar: PlaceHolderImages.find(img => img.id === 'driver-3') },
  { id: 'd4', name: 'Anil', avatar: PlaceHolderImages.find(img => img.id === 'driver-4') },
  { id: 'd5', name: 'Sunil', avatar: PlaceHolderImages.find(img => img.id === 'driver-5') },
];

export const slabs: Slab[] = [
  { id: 's1', min_trips: 0, max_trips: 49, payout_amount: 0 },
  { id: 's2', min_trips: 50, max_trips: 99, payout_amount: 50000 },
  { id: 's3', min_trips: 100, max_trips: 149, payout_amount: 100000 },
  { id: 's4', min_trips: 150, max_trips: 9999, payout_amount: 150000 },
];

export const tripTypes: TripTypeData[] = [
  { id: 'tt1', name: 'ABC' },
  { id: 'tt2', name: 'XYZ' },
];

// Generate dynamic trip data for the last few months
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

const generateTripsForMonth = (year: number, month: number): Trip[] => {
  const trips: Trip[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let tripId = (year * 100 + month) * 1000;

  drivers.forEach(driver => {
    for (let day = 1; day <= daysInMonth; day++) {
      // Simulate some days off
      if (Math.random() > 0.85) continue;

      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // ABC trips
      if (Math.random() > 0.3) {
        trips.push({
          id: `t${tripId++}`,
          driverId: driver.id,
          date,
          tripType: 'ABC',
          count: Math.floor(Math.random() * 3) + 1, // 1 to 3 trips
        });
      }
      
      // XYZ trips
      if (Math.random() > 0.5) {
        trips.push({
          id: `t${tripId++}`,
          driverId: driver.id,
          date,
          tripType: 'XYZ',
          count: Math.floor(Math.random() * 2) + 1, // 1 to 2 trips
        });
      }
    }
  });
  return trips;
};


export const trips: Trip[] = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - i, 1);
    return generateTripsForMonth(d.getFullYear(), d.getMonth());
  }).flat();
  

export const pastMonthSummaries: MonthlySummary[] = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (i + 1), 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    return drivers.map(driver => {
        const monthTrips = trips.filter(t => t.driverId === driver.id && t.date.startsWith(monthStr));
        const total_trips = monthTrips.reduce((acc, t) => acc + t.count, 0);
        const matchedSlab = [...slabs].reverse().find(s => total_trips >= s.min_trips);
        const payout = matchedSlab ? matchedSlab.payout_amount : 0;
        
        return {
            driverId: driver.id,
            month: monthStr,
            total_trips,
            payout
        };
    });
}).flat();
