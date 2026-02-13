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
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 font-headline">Monthly Ledger: Rohan (July 2024)</h1>
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>ABC Trips</TableHead>
                <TableHead>XYZ Trips</TableHead>
                <TableHead className="text-right">Total Daily Trips</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({length: 15}).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">2024-07-{String(i+1).padStart(2,'0')}</TableCell>
                  <TableCell>4</TableCell>
                  <TableCell>3</TableCell>
                  <TableCell className="text-right">7</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-muted/50 font-semibold">
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell>{totalAbc}</TableCell>
                <TableCell>{totalXyz}</TableCell>
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
