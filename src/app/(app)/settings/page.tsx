'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { slabs } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">{t('settings')}</h1>
      <Tabs defaultValue="slabs">
        <TabsList className="grid w-full max-w-md grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="slabs">{t('payoutSlabs')}</TabsTrigger>
          <TabsTrigger value="trip-types">{t('tripTypes')}</TabsTrigger>
          <TabsTrigger value="month-lock">{t('monthLock')}</TabsTrigger>
        </TabsList>
        <TabsContent value="slabs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('payoutSlabs')}</CardTitle>
                  <p className="text-sm text-muted-foreground pt-1">{t('defineSlabsDescription')}</p>
                </div>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    {t('addSlab')}
                  </span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('minimumTrips')}</TableHead>
                    <TableHead>{t('maximumTrips')}</TableHead>
                    <TableHead className="text-right">{t('payoutAmount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slabs
                    .filter((s) => s.payout_amount > 0)
                    .map((slab) => (
                      <TableRow key={slab.id}>
                        <TableCell>{slab.min_trips}</TableCell>
                        <TableCell>{slab.max_trips}</TableCell>
                        <TableCell className="text-right">
                          ₹{slab.payout_amount.toLocaleString('en-IN')}
                        </TableCell>
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
              <CardTitle>{t('tripTypes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{t('tripTypeConfigWillBeHere')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="month-lock">
          <Card>
            <CardHeader>
              <CardTitle>{t('monthLock')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{t('monthLockingInterfaceWillBeHere')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
