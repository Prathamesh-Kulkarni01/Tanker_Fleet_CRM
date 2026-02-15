
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, KeyRound } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const RenewPage = () => {
  const { t } = useI18n();
  const router = useRouter();
  const { user, renewSubscription, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasSubscription = user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date();

  const renewSchema = z.object({
    subscriptionKey: z.string().min(1, { message: t('subscriptionKeyRequired') }),
  });
  
  type RenewFormValues = z.infer<typeof renewSchema>;

  const form = useForm<RenewFormValues>({
    resolver: zodResolver(renewSchema),
  });

  const onSubmit = async (data: RenewFormValues) => {
    setError(null);
    setLoading(true);
    try {
      const result = await renewSubscription(data.subscriptionKey);
      if (result.success) {
        router.replace('/dashboard');
      } else {
        setError(result.error || t('failedToRenewSubscription'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('anErrorOccurred'));
    } finally {
      setLoading(false);
    }
  };
  
  const title = hasSubscription ? t('renewYourSubscription') : t('subscriptionExpired');
  const description = hasSubscription ? t('yourCurrentPlanWillExpire') : (user?.subscriptionExpiresAt ? t('enterNewKey') : t('contactAdminForNewKey'));


  return (
    <div className="flex min-h-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <KeyRound className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscriptionKey">{t('newSubscriptionKey')}</Label>
              <Input id="subscriptionKey" {...form.register('subscriptionKey')} disabled={loading} />
              {form.formState.errors.subscriptionKey && <p className="text-sm text-destructive">{form.formState.errors.subscriptionKey.message}</p>}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('renewalFailed')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('activating') : t('activateSubscription')}
            </Button>
             <Button type="button" variant="link" className="w-full" onClick={logout}>
                {t('logout')}
              </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default RenewPage;
