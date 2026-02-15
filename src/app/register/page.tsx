'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Truck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const registerSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    phone: z.string().regex(/^\d{10}$/, { message: "Must be a 10-digit phone number." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { registerOwner } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    setLoading(true);
    try {
      const result = await registerOwner(data);
      if (result.success) {
        // On success, Firebase's onAuthStateChanged will handle redirection.
        // A new user is redirected to /renew because they have no subscription.
        router.replace('/dashboard');
      } else {
        setError(result.error || 'Registration failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Truck className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">{t('createOwnerAccount')}</CardTitle>
          <CardDescription>{t('startManagingFleet')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('fullName')}</Label>
              <Input id="name" {...form.register('name')} disabled={loading} />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phoneNumber')}</Label>
              <Input id="phone" type="tel" {...form.register('phone')} disabled={loading} />
              {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" type="password" {...form.register('password')} disabled={loading} />
              {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('registrationFailed')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('registering') : t('register')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="underline font-semibold text-primary">
              {t('loginHere')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
