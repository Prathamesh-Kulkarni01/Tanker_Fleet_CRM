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
import { CalendarIcon, User, Truck, Banknote, ChevronsUpDown, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';

export default function ReportsPage() {
  const { t } = useI18n();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [driverIdFilter, setDriverIdFilter] = useState<string>('all');
  const [routeId, setRouteId] = useState<string>('all');
  const [deductions, setDeductions] = useState<Record<string, number>>({});

  const filteredTrips = useMemo(() => {
    return trips
      .map(trip => ({
        ...trip,
        dateObj: parseISO(trip.date),
      }))
      .filter(trip => {
        if (dateRange?.from && trip.dateObj < dateRange.from) return false;
        if (dateRange?.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            if (trip.dateObj > toDate) return false;
        }
        if (driverIdFilter !== 'all' && trip.driverId !== driverIdFilter) return false;
        if (routeId !== 'all' && trip.routeId !== routeId) return false;
        return true;
      });
  }, [dateRange, driverIdFilter, routeId]);

  const handleDeductionChange = (driverId: string, value: string) => {
    setDeductions(prev => ({
        ...prev,
        [driverId]: Number(value) || 0
    }));
  };

  const settlementData = useMemo(() => {
    if (filteredTrips.length === 0) {
      return { driverSettlements: [], totalRevenue: 0, totalPayout: 0, totalDeductions: 0, totalPayable: 0, totalTrips: 0 };
    }

    const tripsByDriver = filteredTrips.reduce<Record<string, any[]>>((acc, trip) => {
        (acc[trip.driverId] = acc[trip.driverId] || []).push(trip);
        return acc;
    }, {});

    let grandTotalRevenue = 0;
    let grandTotalTrips = 0;

    const driverSettlements = Object.keys(tripsByDriver).map(driverId => {
        const driverTrips = tripsByDriver[driverId];
        const driver = drivers.find(d => d.id === driverId);

        const { totalTrips, totalEarnings } = driverTrips.reduce((acc, trip) => {
            const route = routes.find(r => r.id === trip.routeId);
            const earnings = trip.count * (route?.rate_per_trip || 0);
            acc.totalTrips += trip.count;
            acc.totalEarnings += earnings;
            return acc;
        }, { totalTrips: 0, totalEarnings: 0 });

        grandTotalRevenue += totalEarnings;
        grandTotalTrips += totalTrips;
        
        return {
            driver,
            trips: driverTrips.sort((a,b) => b.dateObj.getTime() - a.dateObj.getTime()),
            totalTrips,
            totalEarnings,
        };
    }).filter(item => !!item.driver);

    const grandTotalDeductions = Object.values(deductions).reduce((acc, val) => acc + val, 0);
    const grandTotalPayable = grandTotalRevenue - grandTotalDeductions;

    return { 
        driverSettlements, 
        totalRevenue: grandTotalRevenue, 
        totalPayout: grandTotalRevenue, // 100% model
        totalDeductions: grandTotalDeductions, 
        totalPayable: grandTotalPayable,
        totalTrips: grandTotalTrips
    };
  }, [filteredTrips, deductions]);
  
  const { driverSettlements, totalRevenue, totalPayout, totalDeductions, totalPayable, totalTrips } = settlementData;

  const clearFilters = () => {
    setDateRange(undefined);
    setDriverIdFilter('all');
    setRouteId('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline sm:text-3xl">{t('settlementReport')}</h1>
        <Button variant="outline" size="sm" className="gap-2">
            <FileDown/>
            {t('export')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('filterTrips')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button id="date" variant="outline" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>{t('selectDateRange')}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
          <Select value={driverIdFilter} onValueChange={setDriverIdFilter}>
            <SelectTrigger><SelectValue placeholder={t('selectDriver')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allDrivers')}</SelectItem>
              {drivers.map(driver => <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={routeId} onValueChange={setRouteId}>
            <SelectTrigger><SelectValue placeholder={t('selectRoute')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allRoutes')}</SelectItem>
              {routes.map(route => <SelectItem key={route.id} value={route.id}>{route.source} → {route.destinations.join(', ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearFilters}>{t('clearFilters')}</Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>{t('summary')}</CardTitle>
            <CardDescription>{t('overallSummaryForSelection')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                <div className="rounded-full bg-primary/10 p-3 text-primary"><Truck /></div>
                <div>
                    <p className="text-sm text-muted-foreground">{t('totalTrips')}</p>
                    <p className="text-2xl font-bold">{totalTrips}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                <div className="rounded-full bg-primary/10 p-3 text-primary"><Banknote /></div>
                <div>
                    <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
                    <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
                </div>
            </div>
             <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                <div className="rounded-full bg-destructive/10 p-3 text-destructive"><Banknote /></div>
                <div>
                    <p className="text-sm text-muted-foreground">{t('totalDeductions')}</p>
                    <p className="text-2xl font-bold">₹{totalDeductions.toLocaleString('en-IN')}</p>
                </div>
            </div>
             <div className="flex items-center gap-4 rounded-lg bg-green-500/10 p-4">
                <div className="rounded-full bg-green-500/20 p-3 text-green-600"><Banknote /></div>
                <div>
                    <p className="text-sm text-green-700">{t('totalPayable')}</p>
                    <p className="text-2xl font-bold text-green-600">₹{totalPayable.toLocaleString('en-IN')}</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold font-headline">{t('driverSettlements')}</h2>
        {driverSettlements.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
            {driverSettlements.map(({ driver, trips, totalTrips, totalEarnings }) => {
                const driverDeduction = deductions[driver!.id] || 0;
                const payableAmount = totalEarnings - driverDeduction;
                return (
                <AccordionItem value={driver!.id} key={driver!.id} className="border-0">
                    <Card className="shadow-md">
                        <AccordionTrigger className="p-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                           <div className="w-full grid gap-4 sm:grid-cols-2 md:grid-cols-5 items-center text-left">
                                <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                                    <Avatar>
                                        <AvatarImage src={driver!.avatar?.imageUrl} alt={driver!.name} />
                                        <AvatarFallback>{driver!.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold">{driver!.name}</span>
                                </div>
                                <div className="text-sm">
                                    <p className="text-muted-foreground">{t('trips')}</p>
                                    <p className="font-semibold">{totalTrips}</p>
                                </div>
                                <div className="text-sm">
                                    <p className="text-muted-foreground">{t('earnings')}</p>
                                    <p className="font-semibold">₹{totalEarnings.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="text-sm">
                                    <p className="text-muted-foreground">{t('deductions')}</p>
                                    <p className="font-semibold text-destructive">₹{driverDeduction.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="text-sm">
                                    <p className="text-muted-foreground">{t('payable')}</p>
                                    <p className="font-bold text-green-600 text-base">₹{payableAmount.toLocaleString('en-IN')}</p>
                                </div>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="border-t p-4 space-y-4">
                               <div className="grid sm:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor={`deduction-${driver!.id}`}>{t('addDeduction')}</Label>
                                        <Input 
                                            id={`deduction-${driver!.id}`} 
                                            type="number"
                                            placeholder={t('egAdvanceAmount')}
                                            value={deductions[driver!.id] || ''}
                                            onChange={(e) => handleDeductionChange(driver!.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                               </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('date')}</TableHead>
                                            <TableHead>{t('route')}</TableHead>
                                            <TableHead>{t('rate')}</TableHead>
                                            <TableHead className="text-right">{t('trips')}</TableHead>
                                            <TableHead className="text-right">{t('subtotal')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {trips.map(trip => {
                                            const route = routes.find(r => r.id === trip.routeId);
                                            const subtotal = trip.count * (route?.rate_per_trip || 0);
                                            return (
                                            <TableRow key={trip.id}>
                                                <TableCell>{format(trip.dateObj, 'MMM d, yyyy')}</TableCell>
                                                <TableCell>{route ? `${route.source} → ${route.destinations.join(', ')}` : 'N/A'}</TableCell>
                                                <TableCell>₹{route?.rate_per_trip.toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right">{trip.count}</TableCell>
                                                <TableCell className="text-right font-semibold">₹{subtotal.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-right font-bold">{t('totalEarnings')}</TableCell>
                                            <TableCell className="text-right font-bold text-lg">₹{totalEarnings.toLocaleString('en-IN')}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                           </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                )
            })}
            </Accordion>
        ) : (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">{t('noTripsFoundForSelection')}</p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
