'use client';

import { DollarSign, Users, Truck, Map, TrendingUp, BarChart, Compass } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Bar, ComposedChart, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/auth';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { query, collection, where, Timestamp } from 'firebase/firestore';
import type { Driver, Route, Trip } from '@/lib/data';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-4 md:gap-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 gap-4 md:gap-8 xl:grid-cols-2">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
            </div>
        </div>
    )
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const firestore = useFirestore();

  const now = new Date();
  const currentMonthStart = startOfMonth(now);

  const tripsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'trips'), where('ownerId', '==', user.uid), where('date', '>=', Timestamp.fromDate(currentMonthStart)));
  }, [firestore, user, currentMonthStart]);
  const { data: currentMonthTrips, loading: tripsLoading } = useCollection<Trip>(tripsQuery);
  
  const driversQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('ownerId', '==', user.uid), where('role', '==', 'driver'));
  }, [firestore, user]);
  const { data: drivers, loading: driversLoading } = useCollection<Driver>(driversQuery);

  const routesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'routes'), where('ownerId', '==', user.uid));
  }, [firestore, user]);
  const { data: routes, loading: routesLoading } = useCollection<Route>(routesQuery);


  // 1. Total Trips (This Month)
  const totalTripsThisMonth = useMemo(() => {
    return currentMonthTrips?.reduce((acc, t) => acc + t.count, 0) || 0;
  }, [currentMonthTrips]);

  // 2. Total Revenue (This Month)
  const totalRevenueThisMonth = useMemo(() => {
    if (!currentMonthTrips || !routes) return 0;
    return currentMonthTrips.reduce((acc, trip) => {
      const route = routes.find(r => r.id === trip.routeId);
      return acc + (trip.count * (route?.rate_per_trip || 0));
    }, 0);
  }, [currentMonthTrips, routes]);

  // 3. Total Pending Payment
  const totalPayableThisMonth = totalRevenueThisMonth;

  // 4. Active Drivers Count
  const activeDriversCount = useMemo(() => {
    return drivers?.filter(d => d.is_active).length || 0;
  }, [drivers]);

  // 5. Active Routes Count
  const activeRoutesCount = useMemo(() => {
    return routes?.filter(r => r.is_active).length || 0;
  }, [routes]);

  // 6. Trips Per Day Chart Data
  const tripsPerDayData = useMemo(() => {
    if (!currentMonthTrips) return [];
    const currentMonthEnd = endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });
    
    return daysInMonth.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayName = format(day, 'd');
        const total = currentMonthTrips
        .filter(t => format(t.date.toDate(), 'yyyy-MM-dd') === dayStr)
        .reduce((acc, t) => acc + t.count, 0);
        return { name: dayName, total };
    });
  }, [currentMonthTrips, currentMonthStart, now]);

  const tripsChartConfig = {
    total: { label: t('trips'), color: 'hsl(var(--chart-1))' },
  };

  // 7. Revenue Per Route Chart Data
  const revenuePerRouteData = useMemo(() => {
    if (!currentMonthTrips || !routes) return [];
    
    return routes
      .filter(r => r.is_active)
      .map(route => {
        const routeTrips = currentMonthTrips.filter(t => t.routeId === route.id);
        const revenue = routeTrips.reduce((acc, trip) => acc + (trip.count * route.rate_per_trip), 0);
        const routeName = `${route.source} → ${route.destinations.join(', ')}`;
        return {
          name: routeName.length > 25 ? `${routeName.substring(0, 25)}...` : routeName,
          revenue
        };
      })
      .filter(item => item.revenue > 0)
      .sort((a,b) => b.revenue - a.revenue);
  }, [currentMonthTrips, routes]);

  const revenueChartConfig = {
    revenue: { label: t('revenue'), color: 'hsl(var(--chart-2))' },
  };
  
  const isLoading = tripsLoading || driversLoading || routesLoading;
  if (isLoading) {
      return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalTripsThisMonth')}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTripsThisMonth}</div>
            <p className="text-xs text-muted-foreground">{t('inCurrentMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenueThisMonth.toLocaleString('en-IN')}</div>
             <p className="text-xs text-muted-foreground">{t('inCurrentMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalPendingPayment')}</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPayableThisMonth.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">{t('estimatedForThisMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeDrivers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDriversCount}</div>
             <p className="text-xs text-muted-foreground">{t('currentlyInTheSystem')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeRoutes')}</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRoutesCount}</div>
            <p className="text-xs text-muted-foreground">{t('availableForLogging')}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <CardTitle className="flex items-center gap-2 text-primary"><Compass /> {t('liveFleetView')}</CardTitle>
                <CardDescription className="mt-1">{t('seeAllDriversOnMap')}</CardDescription>
            </div>
            <Button asChild size="sm" className="w-full md:w-auto">
                <Link href="/fleet">
                    {t('openLiveMap')}
                </Link>
            </Button>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 gap-4 md:gap-8 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('dailyTripTrend')}
            </CardTitle>
            <CardDescription>{t('tripsPerDayThisMonth')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tripsChartConfig} className="min-h-[250px] w-full">
              <AreaChart
                accessibilityLayer
                data={tripsPerDayData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={30}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  type="natural"
                  dataKey="total"
                  strokeWidth={2}
                  stroke="var(--color-total)"
                  fill="url(#colorTotal)"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              {t('revenueByRoute')}
            </CardTitle>
            <CardDescription>{t('topPerformingRoutesThisMonth')}</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={revenueChartConfig} className="min-h-[250px] w-full">
                <ComposedChart data={revenuePerRouteData} layout="vertical" margin={{ left: 50 }}>
                   <CartesianGrid horizontal={false} />
                   <XAxis type="number" tick={{ fontSize: 12 }} hide/>
                   <YAxis 
                    dataKey="name" 
                    type="category" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    width={120}
                    />
                   <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent indicator="dot" />} />
                   <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                </ComposedChart>
             </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
