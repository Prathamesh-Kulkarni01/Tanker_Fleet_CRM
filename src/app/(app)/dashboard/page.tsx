'use client';

import {
  Activity,
  ArrowUpRight,
  CircleUser,
  CreditCard,
  DollarSign,
  Menu,
  Package2,
  Search,
  Users,
  Truck,
} from "lucide-react"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { drivers, trips, slabs } from "@/lib/data"
import Link from "next/link"
import { format, subMonths, getMonth, getYear } from 'date-fns';

export default function Dashboard() {
  const now = new Date();
  const currentMonthStr = format(now, 'yyyy-MM');
  
  const currentMonthTrips = trips.filter(t => t.date.startsWith(currentMonthStr));
  const totalTripsThisMonth = currentMonthTrips.reduce((acc, t) => acc + t.count, 0);

  const calculateTotalPayout = () => {
    let totalPayout = 0;
    drivers.forEach(driver => {
      const driverTrips = currentMonthTrips
        .filter(t => t.driverId === driver.id)
        .reduce((acc, t) => acc + t.count, 0);
      const matchedSlab = [...slabs].reverse().find(s => driverTrips >= s.min_trips);
      if (matchedSlab) {
        totalPayout += matchedSlab.payout_amount;
      }
    });
    return totalPayout;
  }

  const totalPayoutThisMonth = calculateTotalPayout();
  const totalDrivers = drivers.length;

  const last6MonthsTrips = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, i);
    const monthName = format(d, 'MMM');
    const monthStr = format(d, 'yyyy-MM');
    const total = trips
      .filter(t => t.date.startsWith(monthStr))
      .reduce((acc, t) => acc + t.count, 0);
    return { name: monthName, total };
  }).reverse();

  const chartConfig = {
    total: {
      label: "Total Trips",
      color: "hsl(var(--chart-1))",
    },
  };

  const recentDriversActivity = drivers.slice(0, 5).map(driver => {
    const driverTrips = currentMonthTrips.filter(t => t.driverId === driver.id);
    const totalTrips = driverTrips.reduce((sum, trip) => sum + trip.count, 0);
    const matchedSlab = [...slabs].reverse().find(s => totalTrips >= s.min_trips);
    return {
      ...driver,
      totalTrips,
      payout: matchedSlab ? matchedSlab.payout_amount : 0,
    }
  });


  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Payout (This Month)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalPayoutThisMonth.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground">
                Based on current trip counts
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Trips (This Month)
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{totalTripsThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                Across all drivers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDrivers}</div>
              <p className="text-xs text-muted-foreground">
                Currently in the system
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Trip Overview</CardTitle>
              <CardDescription>Total trips over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                <BarChart data={last6MonthsTrips} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                  <Tooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center">
               <div className="grid gap-2">
                <CardTitle>Recent Driver Activity</CardTitle>
                <CardDescription>
                  Current monthly summary for top drivers.
                </CardDescription>
              </div>
              <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/reports">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Est. Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDriversActivity.map(driver => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="hidden h-9 w-9 sm:flex">
                            <AvatarImage src={driver.avatar?.imageUrl} alt="Avatar" data-ai-hint={driver.avatar?.imageHint} />
                            <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                           <div className="font-medium">{driver.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{driver.totalTrips}</TableCell>
                      <TableCell className="text-right">₹{driver.payout.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
