import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { drivers } from "@/lib/data";

export default function TripsPage() {
  return (
    <div className="p-4 md:p-8 flex justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Log New Trips</CardTitle>
          <CardDescription>Select a driver and enter the number of trips for a specific date.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="driver">Driver</Label>
              <Select>
                <SelectTrigger id="driver">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
               <div className="grid gap-2">
                  <Label htmlFor="trip-type">Trip Type</Label>
                  <Select defaultValue="ABC">
                    <SelectTrigger id="trip-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABC">ABC</SelectItem>
                      <SelectItem value="XYZ">XYZ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trip-count">Number of Trips</Label>
                  <Input id="trip-count" type="number" placeholder="e.g. 5" />
                </div>
            </div>
            <Button type="submit" className="w-full">Save Trips</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
