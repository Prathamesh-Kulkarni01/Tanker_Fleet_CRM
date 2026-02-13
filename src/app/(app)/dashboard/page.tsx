'use client';

import { DollarSign, Users, Truck, Map, TrendingUp, BarChart, Compass } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Bar, ComposedChart, Legend } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { drivers, trips, routes } from '@/lib/data';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function DashboardPage() {
  const { t } = useI18n();
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const currentMonthStr = format(now, 'yyyy-MM');

  const currentMonthTrips = trips.filter((t) => t.date.startsWith(currentMonthStr));

  // 1. Total Trips (This Month)
  const totalTripsThisMonth = currentMonthTrips.reduce((acc, t) => acc + t.count, 0);

  // 2. Total Revenue (This Month)
  const totalRevenueThisMonth = currentMonthTrips.reduce((acc, trip) => {
    const route = routes.find(r => r.id === trip.routeId);
    return acc + (trip.count * (route?.rate_per_trip || 0));
  }, 0);

  // 3. Total Pending Payment (Payable for this month)
  // This is the same as total revenue in a 100% per trip model before deductions
  const totalPayableThisMonth = totalRevenueThisMonth;

  // 4. Active Drivers Count
  const activeDriversCount = drivers.filter(d => d.is_active).length;

  // 5. Active Routes Count
  const activeRoutesCount = routes.filter(r => r.is_active).length;

  // 6. Trips Per Day Chart Data
  const daysInMonth = eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });
  const tripsPerDayData = daysInMonth.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayName = format(day, 'd');
    const total = currentMonthTrips
      .filter(t => t.date === dayStr)
      .reduce((acc, t) => acc + t.count, 0);
    return { name: dayName, total };
  });

  const tripsChartConfig = {
    total: {
      label: t('trips'),
      color: 'hsl(var(--chart-1))',
    },
  };

  // 7. Revenue Per Route Chart Data
  const revenuePerRouteData = routes
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

  const revenueChartConfig = {
    revenue: {
      label: t('revenue'),
      color: 'hsl(var(--chart-2))',
    },
  };

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
