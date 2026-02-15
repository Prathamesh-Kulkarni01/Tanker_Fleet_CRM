
'use client';

import { getDriverInsights } from '@/lib/actions';
import { type DriverPayoutInsightsOutput } from '@/ai/flows/driver-payout-insights-flow';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, CheckCircle2, ListChecks, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Driver, Route, Slab, Trip } from '@/lib/data';

interface PayoutInsightsProps {
    driver: Driver;
    allTrips: Trip[];
    routes: Route[];
    slabs: Slab[];
}

export function PayoutInsights({ driver, allTrips, routes, slabs }: PayoutInsightsProps) {
  const { t } = useI18n();
  const [insights, setInsights] = useState<DriverPayoutInsightsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      if (!driver || !allTrips || !routes || !slabs) {
        return;
      }
      setLoading(true);
      setError(null);

      // Convert complex objects to plain objects before passing to the Server Action
      const plainTrips = allTrips.map(trip => ({
        ...trip,
        // The `date` field is a Firestore Timestamp object, which is not a plain object.
        // We convert it to an ISO string before sending it to the server.
        date: trip.date.toDate().toISOString(),
      }));

      const result = await getDriverInsights(driver.id, plainTrips, slabs, routes);
      if (result.success) {
        setInsights(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    fetchInsights();
  }, [driver, allTrips, routes, slabs]);

  if (loading) {
    return <PayoutInsightsSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-accent" />
            {t('aiPayoutInsights')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>
              {t('couldNotLoadInsights', { error: error })}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles />
          {t('aiPayoutInsights')}
        </CardTitle>
        <CardDescription>{insights.progressToNextSlab}</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.aiInsights && insights.aiInsights.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              {t('suggestionsToIncreasePayout')}
            </h3>
            <ul className="space-y-2 list-inside">
              {insights.aiInsights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>{t('noInsightsAvailable')}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PayoutInsightsSkeleton() {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles />
          {t('aiPayoutInsights')}
        </CardTitle>
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
