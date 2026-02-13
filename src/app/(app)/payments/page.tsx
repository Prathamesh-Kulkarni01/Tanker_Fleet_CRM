import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PaymentsPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Payment Tracking</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Driver Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Payment tracking interface will be here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
