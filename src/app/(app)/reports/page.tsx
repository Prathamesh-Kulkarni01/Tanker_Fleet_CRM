import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const totalAbc = 55;
  const totalXyz = 48;
  const totalTrips = totalAbc + totalXyz;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-headline sm:text-3xl">Monthly Ledger: Rohan (July 2024)</h1>
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="hidden sm:table-cell">ABC Trips</TableHead>
                <TableHead className="hidden sm:table-cell">XYZ Trips</TableHead>
                <TableHead className="text-right">Total Daily Trips</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({length: 15}).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">2024-07-{String(i+1).padStart(2,'0')}</TableCell>
                  <TableCell className="hidden sm:table-cell">4</TableCell>
                  <TableCell className="hidden sm:table-cell">3</TableCell>
                  <TableCell className="text-right">7</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-muted/50 font-semibold">
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="hidden sm:table-cell">{totalAbc}</TableCell>
                <TableCell className="hidden sm:table-cell">{totalXyz}</TableCell>
                <TableCell className="text-right text-lg">{totalTrips}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          </div>
        </CardContent>
        <CardHeader>
           <div className="grid md:grid-cols-2 gap-4 text-center md:text-left">
              <div>
                <CardDescription>Slab Matched</CardDescription>
                <CardTitle><Badge variant="secondary" className="text-base">100 Trips</Badge></CardTitle>
              </div>
              <div className="md:text-right">
                <CardDescription>Final Payout</CardDescription>
                <CardTitle className="text-green-600">₹1,00,000</CardTitle>
              </div>
            </div>
        </CardHeader>
      </Card>
    </div>
  )
}
