'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle2, Circle, Users, Map, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface OnboardingGuideProps {
  driversCount: number;
  routesCount: number;
}

export function OnboardingGuide({ driversCount, routesCount }: OnboardingGuideProps) {
  const { t } = useI18n();

  const steps = [
    {
      title: t('step1AddDriver'),
      description: t('step1AddDriverDescription'),
      href: '/drivers',
      icon: <Users className="h-8 w-8 text-primary" />,
      isComplete: driversCount > 0,
    },
    {
      title: t('step2CreateRoute'),
      description: t('step2CreateRouteDescription'),
      href: '/routes',
      icon: <Map className="h-8 w-8 text-primary" />,
      isComplete: routesCount > 0,
    },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold font-headline sm:text-3xl">{t('welcomeToTankerLedger')}</CardTitle>
        <CardDescription>{t('gettingStartedGuide')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative flex flex-col gap-8 pl-6 before:absolute before:left-6 before:top-5 before:h-full before:w-0.5 before:bg-border">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className={cn(
                'absolute -left-9 flex h-6 w-6 items-center justify-center rounded-full text-primary-foreground',
                step.isComplete ? 'bg-green-500' : 'bg-primary'
              )}>
                {step.isComplete ? <CheckCircle2 size={24} /> : <span className="font-bold">{index + 1}</span>}
              </div>
              <div className="flex items-start gap-4">
                <div className="hidden sm:block mt-1">{step.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground mt-1">{step.description}</p>
                  <Button asChild variant="secondary" size="sm" className="mt-3">
                    <Link href={step.href}>
                      {step.isComplete ? t('manage') : t('getStarted')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
