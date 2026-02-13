'use client';

import { FleetMap } from '@/components/owner/fleet-map';
import { useAuth } from '@/contexts/auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function FleetPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  if (user?.role !== 'owner') {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('accessDenied')}</AlertTitle>
          <AlertDescription>
            {t('noPermissionToView')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 -m-4 sm:-mx-6 md:-m-8">
      <FleetMap />
    </div>
  );
}
