import { drivers, trips, slabs } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PayoutInsights } from '@/components/driver/payout-insights';
import { format, startOfMonth } from 'date-fns';
import { Truck, DollarSign, Target, Calendar, Award, TrendingUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from '@/components/ui/separator';


export default function DriverPage({ params }: { params: { driverId: string } }) {
  const driver = drivers.find(d => d.id === params.driverId);

  if (!driver) {
    notFound();
  }

  const now = new Date();
  const currentMonthStr = format(now, 'yyyy-MM');

  const currentMonthTrips = trips.filter(
    t => t.driverId === driver.id && t.date.startsWith(currentMonthStr)
  );

  const totalTrips = currentMonthTrips.reduce((acc, t) => acc + t.count, 0);

  const sortedSlabs = [...slabs].sort((a, b) => a.min_trips - b.min_trips);
  
  const currentSlab = [...sortedSlabs].reverse().find(s => totalTrips >= s.min_trips);
  const nextSlab = sortedSlabs.find(s => totalTrips < s.min_trips);

  const estimatedPayout = currentSlab ? currentSlab.payout_amount : 0;
  
  const progressToNextSlab = nextSlab 
    ? (totalTrips / nextSlab.min_trips) * 100
    : 100;

  const dailyTrips = currentMonthTrips.reduce((acc, trip) => {
    const day = trip.date;
    if(!acc[day]) {
      acc[day] = { abc: 0, xyz: 0 };
    }
    if(trip.tripType === 'ABC') acc[day].abc += trip.count;
    if(trip.tripType === 'XYZ') acc[day].xyz += trip.count;
    return acc;
  }, {} as Record<string, {abc: number, xyz: number}>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-lg">
          <AvatarImage src={driver.avatar?.imageUrl} alt={driver.name} data-ai-hint={driver.avatar?.imageHint} />
          <AvatarFallback className="text-5xl">{driver.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h1 className="mt-4 text-3xl font-bold font-headline sm:text-4xl">{driver.name}</h1>
        <p className="text-muted-foreground">Driver Performance Overview</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <Truck className="w-8 h-8 text-primary" />
              <div>
                <p className="text-muted-foreground">Current Month Trips</p>
                <p className="font-bold text-lg">{totalTrips}</p>
              </div>
            </li>
            <Separator />
             <li className="flex items-center gap-4">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-muted-foreground">Estimated Payout</p>
                <p className="font-bold text-lg">₹{estimatedPayout.toLocaleString('en-IN')}</p>
              </div>
            </li>
             <Separator />
             <li className="flex items-center gap-4">
              <Award className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-muted-foreground">Current Slab</p>
                <p className="font-bold text-lg">{currentSlab ? `${currentSlab.min_trips} - ${currentSlab.max_trips} trips` : "No slab yet"}</p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {nextSlab && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-primary"/>
              Next Payout Slab
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-1">
              <p className="text-muted-foreground">
                Need <span className="font-bold text-foreground">{nextSlab.min_trips - totalTrips}</span> more trips
              </p>
              <p className="font-bold text-primary text-lg">₹{nextSlab.payout_amount.toLocaleString('en-IN')}</p>
            </div>
            <Progress value={progressToNextSlab} />
             <p className="text-xs text-muted-foreground mt-2 text-right">
                Target: {nextSlab.min_trips} trips
            </p>
          </CardContent>
        </Card>
      )}

      <PayoutInsights driverId={params.driverId} />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5"/>
            Current Month Log
          </CardTitle>
          <CardDescription>A day-by-day summary of your trips this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-center hidden sm:table-cell">ABC Trips</TableHead>
                <TableHead className="text-center hidden sm:table-cell">XYZ Trips</TableHead>
                <TableHead className="text-right">Daily Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(dailyTrips).sort(([dateA], [dateB]) => dateB.localeCompare(dateA)).map(([date, counts]) => (
                <TableRow key={date}>
                  <TableCell className="font-medium">{format(new Date(date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell">{counts.abc}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell">{counts.xyz}</TableCell>
                  <TableCell className="text-right font-semibold">{counts.abc + counts.xyz}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
