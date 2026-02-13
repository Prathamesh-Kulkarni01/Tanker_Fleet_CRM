'use client';
import { drivers, trips, slabs, tripTypes } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PayoutInsights } from '@/components/driver/payout-insights';
import { format } from 'date-fns';
import { Truck, DollarSign, Award, TrendingUp, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/lib/i18n';

export default function DriverPage({ params }: { params: { driverId: string } }) {
  const { t } = useI18n();
  const driver = drivers.find((d) => d.id === params.driverId);

  if (!driver) {
    notFound();
  }

  const now = new Date();
  const currentMonthStr = format(now, 'yyyy-MM');

  const currentMonthTrips = trips.filter(
    (t) => t.driverId === driver.id && t.date.startsWith(currentMonthStr)
  );

  const totalTrips = currentMonthTrips.reduce((acc, t) => acc + t.count, 0);

  const sortedSlabs = [...slabs].sort((a, b) => a.min_trips - b.min_trips);

  const currentSlab = [...sortedSlabs].reverse().find((s) => totalTrips >= s.min_trips);
  const nextSlab = sortedSlabs.find((s) => totalTrips < s.min_trips);

  const estimatedPayout = currentSlab ? currentSlab.payout_amount : 0;

  const progressToNextSlab = nextSlab ? (totalTrips / nextSlab.min_trips) * 100 : 100;

  const dailyTrips = currentMonthTrips.reduce(
    (acc, trip) => {
      const day = trip.date;
      if (!acc[day]) {
        acc[day] = { total: 0, counts: {} };
      }
      acc[day].counts[trip.tripType] = (acc[day].counts[trip.tripType] || 0) + trip.count;
      acc[day].total += trip.count;
      return acc;
    },
    {} as Record<string, { total: number; counts: Record<string, number> }>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-lg">
          <AvatarImage
            src={driver.avatar?.imageUrl}
            alt={driver.name}
            data-ai-hint={driver.avatar?.imageHint}
          />
          <AvatarFallback className="text-5xl">{driver.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h1 className="mt-4 text-3xl font-bold font-headline sm:text-4xl">{driver.name}</h1>
        <p className="text-muted-foreground">{t('driverPerformanceOverview')}</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <Truck className="w-8 h-8 text-primary" />
              <div>
                <p className="text-muted-foreground">{t('currentMonthTrips')}</p>
                <p className="font-bold text-lg">{totalTrips}</p>
              </div>
            </li>
            <Separator />
            <li className="flex items-center gap-4">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-muted-foreground">{t('estimatedPayout')}</p>
                <p className="font-bold text-lg">₹{estimatedPayout.toLocaleString('en-IN')}</p>
              </div>
            </li>
            <Separator />
            <li className="flex items-center gap-4">
              <Award className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-muted-foreground">{t('currentSlab')}</p>
                <p className="font-bold text-lg">
                  {currentSlab && currentSlab.payout_amount > 0
                    ? `${currentSlab.min_trips} - ${currentSlab.max_trips} trips`
                    : t('noSlabYet')}
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {nextSlab && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-primary" />
              {t('nextPayoutSlab')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-1">
              <p className="text-muted-foreground">
                <span className="font-bold text-foreground">
                  {t('needMoreTrips', { count: nextSlab.min_trips - totalTrips })}
                </span>
              </p>
              <p className="font-bold text-primary text-lg">
                ₹{nextSlab.payout_amount.toLocaleString('en-IN')}
              </p>
            </div>
            <Progress value={progressToNextSlab} />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {t('target', { count: nextSlab.min_trips })}
            </p>
          </CardContent>
        </Card>
      )}

      <PayoutInsights driverId={params.driverId} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('currentMonthLog')}
          </CardTitle>
          <CardDescription>{t('currentMonthLogDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                {tripTypes.map(tt => (
                    <TableHead key={tt.id} className="text-center hidden sm:table-cell">{tt.name} Trips</TableHead>
                ))}
                <TableHead className="text-right">{t('dailyTotal')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(dailyTrips)
                .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                .map(([date, data]) => (
                  <TableRow key={date}>
                    <TableCell className="font-medium">
                      {format(new Date(date), 'MMM d, yyyy')}
                    </TableCell>
                     {tripTypes.map(tt => (
                        <TableCell key={tt.id} className="text-center hidden sm:table-cell">{data.counts[tt.name] || 0}</TableCell>
                    ))}
                    <TableCell className="text-right font-semibold">
                      {data.total}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
