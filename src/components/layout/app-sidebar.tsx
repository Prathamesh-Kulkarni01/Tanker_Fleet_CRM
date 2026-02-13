'use client';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { AppSidebarNav } from './app-sidebar-nav';
import { Truck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function AppSidebar() {
  const { t } = useI18n();
  return (
    <Sidebar>
      <SidebarHeader>
        <Button
          variant="ghost"
          className="h-10 w-full justify-start px-2 text-primary-foreground hover:text-primary-foreground"
        >
          <Truck className="h-7 w-7 mr-2" />
          <span className="text-lg font-headline">
            <span className="font-bold">{t('tankerLedger')}</span>
          </span>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <AppSidebarNav />
      </SidebarContent>
    </Sidebar>
  );
}
