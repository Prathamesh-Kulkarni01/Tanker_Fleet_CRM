'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';

export default function PaymentsPage() {
  const { t } = useI18n();
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">{t('paymentTracking')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('manageDriverPayments')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('paymentTrackingInterfaceWillBeHere')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
