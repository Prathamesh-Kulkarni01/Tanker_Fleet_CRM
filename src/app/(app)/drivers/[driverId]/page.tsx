import { drivers, trips, slabs } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PayoutInsights } from '@/components/driver/payout-insights';
import { format, startOfMonth } from 'date-fns';
import { Truck, DollarSign, Target, Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


export default function DriverPage({ params }: { params: { driverId: string } }) {
  const driver = drivers.find(d => d.id === params.driverId);

  if (!driver) {
    notFound();
  }

  const now = new Date();
  const currentMonthStr = format(now, 'yyyy-MM');
  const monthStartDate = startOfMonth(now);

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
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 border-2 border-primary">
          <AvatarImage src={driver.avatar?.imageUrl} alt={driver.name} data-ai-hint={driver.avatar?.imageHint}/>
          <AvatarFallback className="text-2xl">{driver.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold font-headline">{driver.name}</h1>
          <p className="text-muted-foreground">Driver Performance Dashboard</p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month Trips</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrips}</div>
            <p className="text-xs text-muted-foreground">For {format(now, 'MMMM yyyy')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{estimatedPayout.toLocaleString('en-IN')}</div>
             <p className="text-xs text-muted-foreground">
                {currentSlab ? `Slab: ${currentSlab.min_trips} - ${currentSlab.max_trips} trips` : "No slab yet"}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress to Next Slab</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {nextSlab ? (
                <>
                    <div className="text-2xl font-bold">{nextSlab.min_trips - totalTrips} trips to go</div>
                    <p className="text-xs text-muted-foreground">
                        To reach the ₹{nextSlab.payout_amount.toLocaleString('en-IN')} payout slab
                    </p>
                </>
            ) : (
                <div className="text-2xl font-bold">Highest slab reached!</div>
            )}
            <Progress value={progressToNextSlab} className="mt-2" />
          </CardContent>
        </Card>
      </div>

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
                <TableHead className="text-center">ABC Trips</TableHead>
                <TableHead className="text-center">XYZ Trips</TableHead>
                <TableHead className="text-right">Daily Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(dailyTrips).sort(([dateA], [dateB]) => dateB.localeCompare(dateA)).map(([date, counts]) => (
                <TableRow key={date}>
                  <TableCell className="font-medium">{format(new Date(date), 'MMMM dd, yyyy')}</TableCell>
                  <TableCell className="text-center">{counts.abc}</TableCell>
                  <TableCell className="text-center">{counts.xyz}</TableCell>
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
