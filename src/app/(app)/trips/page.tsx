'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { drivers, tripTypes } from '@/lib/data';
import { useI18n } from '@/lib/i18n';

export default function TripsPage() {
  const { t } = useI18n();
  return (
    <div className="p-4 md:p-8 flex justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t('logNewTrips')}</CardTitle>
          <CardDescription>{t('logNewTripsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="driver">{t('driver')}</Label>
              <Select>
                <SelectTrigger id="driver">
                  <SelectValue placeholder={t('selectDriver')} />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">{t('date')}</Label>
              <Input id="date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="trip-type">{t('tripType')}</Label>
                <Select defaultValue={tripTypes[0]?.name || ''}>
                  <SelectTrigger id="trip-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tripTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trip-count">{t('numberOfTrips')}</Label>
                <Input id="trip-count" type="number" placeholder={t('eg5')} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {t('saveTrips')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
