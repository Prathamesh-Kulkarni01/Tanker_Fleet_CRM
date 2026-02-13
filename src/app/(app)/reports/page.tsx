'use client';
import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { drivers, routes, trips } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

export default function ReportsPage() {
  const { t } = useI18n();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [driverId, setDriverId] = useState<string>('all');
  const [routeId, setRouteId] = useState<string>('all');

  const filteredTrips = useMemo(() => {
    return trips
      .map(trip => {
        const driver = drivers.find(d => d.id === trip.driverId);
        const route = routes.find(r => r.id === trip.routeId);
        return {
          ...trip,
          driverName: driver?.name || 'Unknown Driver',
          routeName: route ? `${route.source} → ${route.destinations.join(', ')}` : 'Unknown Route',
          dateObj: parseISO(trip.date)
        }
      })
      .filter(trip => {
        if (dateRange?.from && trip.dateObj < dateRange.from) return false;
        // Set time to end of day for inclusive range
        if (dateRange?.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            if (trip.dateObj > toDate) return false;
        }
        if (driverId !== 'all' && trip.driverId !== driverId) return false;
        if (routeId !== 'all' && trip.routeId !== routeId) return false;
        return true;
      })
      .sort((a,b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [dateRange, driverId, routeId]);

  const totalFilteredTrips = useMemo(() => {
    return filteredTrips.reduce((acc, trip) => acc + trip.count, 0);
  }, [filteredTrips]);

  const clearFilters = () => {
    setDateRange(undefined);
    setDriverId('all');
    setRouteId('all');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-headline sm:text-3xl">{t('tripReport')}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('filterTrips')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="grid gap-2">
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>{t('startDate')} - {t('endDate')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectDriver')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allDrivers')}</SelectItem>
              {drivers.map(driver => (
                <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={routeId} onValueChange={setRouteId}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectRoute')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allRoutes')}</SelectItem>
              {routes.map(route => (
                <SelectItem key={route.id} value={route.id}>
                    {route.source} → {route.destinations.join(', ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearFilters}>{t('clearFilters')}</Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('driver')}</TableHead>
                  <TableHead>{t('route')}</TableHead>
                  <TableHead className="text-right">{t('trips')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.length > 0 ? (
                  filteredTrips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">
                      {format(trip.dateObj, 'MMM d, yyyy')}
                    </TableCell>
                     <TableCell>{trip.driverName}</TableCell>
                    <TableCell>{trip.routeName}</TableCell>
                    <TableCell className="text-right font-semibold">{trip.count}</TableCell>
                  </TableRow>
                ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                            {t('noTripsFound')}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
              <TableFooter className="bg-muted/50 font-semibold">
                <TableRow>
                  <TableCell colSpan={3}>{t('total')}</TableCell>
                  <TableCell className="text-right text-lg">{totalFilteredTrips}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
