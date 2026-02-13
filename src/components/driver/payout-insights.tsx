'use client';

import { getDriverInsights } from '@/lib/actions';
import { type DriverPayoutInsightsOutput } from '@/ai/flows/driver-payout-insights-flow';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, CheckCircle2, ListChecks, Sparkles } from 'lucide-react';

export function PayoutInsights({ driverId }: { driverId: string }) {
  const [insights, setInsights] = useState<DriverPayoutInsightsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      setError(null);
      const result = await getDriverInsights(driverId);
      if (result.success) {
        setInsights(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    if (driverId) {
      fetchInsights();
    }
  }, [driverId]);

  if (loading) {
    return <PayoutInsightsSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-accent" />
            AI Payout Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Could not load AI insights. {error}
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
          AI Payout Insights
        </CardTitle>
        <CardDescription>{insights.progressToNextSlab}</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.aiInsights && insights.aiInsights.length > 0 ? (
          <div className="space-y-3">
             <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Suggestions to Increase Your Payout:
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
          <p>No specific insights available at this time. Keep up the good work!</p>
        )}
      </CardContent>
    </Card>
  );
}

function PayoutInsightsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles />
          AI Payout Insights
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
