'use client';

import { ArrowUpRight, DollarSign, Users, Truck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { drivers, trips, slabs } from '@/lib/data';
import Link from 'next/link';
import { format, subMonths } from 'date-fns';
import { useI18n } from '@/lib/i18n';

export default function Dashboard() {
  const { t } = useI18n();
  const now = new Date();
  const currentMonthStr = format(now, 'yyyy-MM');

  const currentMonthTrips = trips.filter((t) => t.date.startsWith(currentMonthStr));
  const totalTripsThisMonth = currentMonthTrips.reduce((acc, t) => acc + t.count, 0);

  const calculateTotalPayout = () => {
    let totalPayout = 0;
    drivers.forEach((driver) => {
      const driverTrips = currentMonthTrips
        .filter((t) => t.driverId === driver.id)
        .reduce((acc, t) => acc + t.count, 0);
      const matchedSlab = [...slabs].reverse().find((s) => driverTrips >= s.min_trips);
      if (matchedSlab) {
        totalPayout += matchedSlab.payout_amount;
      }
    });
    return totalPayout;
  };

  const totalPayoutThisMonth = calculateTotalPayout();
  const totalDrivers = drivers.length;

  const last6MonthsTrips = Array.from({ length: 6 })
    .map((_, i) => {
      const d = subMonths(now, i);
      const monthName = format(d, 'MMM');
      const monthStr = format(d, 'yyyy-MM');
      const total = trips
        .filter((t) => t.date.startsWith(monthStr))
        .reduce((acc, t) => acc + t.count, 0);
      return { name: monthName, total };
    })
    .reverse();

  const chartConfig = {
    total: {
      label: 'Total Trips',
      color: 'hsl(var(--chart-1))',
    },
  };

  const recentDriversActivity = drivers.slice(0, 5).map((driver) => {
    const driverTrips = currentMonthTrips.filter((t) => t.driverId === driver.id);
    const totalTrips = driverTrips.reduce((sum, trip) => sum + trip.count, 0);
    const matchedSlab = [...slabs].reverse().find((s) => totalTrips >= s.min_trips);
    return {
      ...driver,
      totalTrips,
      payout: matchedSlab ? matchedSlab.payout_amount : 0,
    };
  });

  return (
    <div className="flex flex-col gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalPayoutThisMonth')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPayoutThisMonth.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">{t('basedOnCurrentTripCounts')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalTripsThisMonth')}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalTripsThisMonth}</div>
            <p className="text-xs text-muted-foreground">{t('acrossAllDrivers')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeDrivers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrivers}</div>
            <p className="text-xs text-muted-foreground">{t('currentlyInTheSystem')}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-8 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('monthlyTripOverview')}</CardTitle>
            <CardDescription>{t('totalTripsLast6Months')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
              <AreaChart
                accessibilityLayer
                data={last6MonthsTrips}
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
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={30}
                />
                <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  type="natural"
                  dataKey="total"
                  strokeWidth={2}
                  stroke="var(--color-total)"
                  fill="url(#colorTotal)"
                  fillOpacity={0.4}
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>{t('recentDriverActivity')}</CardTitle>
              <CardDescription>{t('currentMonthlySummaryForTopDrivers')}</CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/reports">
                {t('viewAll')}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('driver')}</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">{t('trips')}</TableHead>
                  <TableHead className="text-right">{t('estPayout')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDriversActivity.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="hidden h-9 w-9 sm:flex">
                          <AvatarImage
                            src={driver.avatar?.imageUrl}
                            alt="Avatar"
                            data-ai-hint={driver.avatar?.imageHint}
                          />
                          <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{driver.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {driver.totalTrips}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{driver.payout.toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
