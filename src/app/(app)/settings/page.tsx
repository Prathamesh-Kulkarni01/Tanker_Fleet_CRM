import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slabs } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";


export default function SettingsPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <Tabs defaultValue="slabs">
        <TabsList className="grid w-full max-w-md grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="slabs">Payout Slabs</TabsTrigger>
          <TabsTrigger value="trip-types">Trip Types</TabsTrigger>
          <TabsTrigger value="month-lock">Month Lock</TabsTrigger>
        </TabsList>
        <TabsContent value="slabs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payout Slabs</CardTitle>
                  <p className="text-sm text-muted-foreground pt-1">Define the monthly trip slabs and their corresponding payout amounts.</p>
                </div>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Slab
                  </span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Minimum Trips</TableHead>
                    <TableHead>Maximum Trips</TableHead>
                    <TableHead className="text-right">Payout Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slabs.filter(s => s.payout_amount > 0).map(slab => (
                    <TableRow key={slab.id}>
                      <TableCell>{slab.min_trips}</TableCell>
                      <TableCell>{slab.max_trips}</TableCell>
                      <TableCell className="text-right">₹{slab.payout_amount.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="trip-types">
           <Card>
            <CardHeader>
              <CardTitle>Trip Types</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Trip type configuration will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="month-lock">
           <Card>
            <CardHeader>
              <CardTitle>Month Lock</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Month locking interface will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
