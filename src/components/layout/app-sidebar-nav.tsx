'use client';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Truck,
  BookText,
  CircleDollarSign,
  Settings,
  Users,
  Map,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { drivers } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/auth';

export function AppSidebarNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'driver') {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === `/drivers/${user.id}`}
            tooltip={t('dashboard')}
          >
            <Link href={`/drivers/${user.id}`}>
              <LayoutDashboard />
              <span>{t('dashboard')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Owner view
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip={t('dashboard')}>
          <Link href="/dashboard">
            <LayoutDashboard />
            <span>{t('dashboard')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname === '/trips'} tooltip={t('tripEntry')}>
          <Link href="/trips">
            <Truck />
            <span>{t('tripEntry')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname.startsWith('/drivers')}
          tooltip={t('driverInsights')}
        >
          <Link href={'/drivers/d1'}>
            <Users />
            <span>{t('driverInsights')}</span>
          </Link>
        </SidebarMenuButton>
        <SidebarMenuSub>
          {drivers.map((driver) => (
            <SidebarMenuSubItem key={driver.id}>
              <SidebarMenuSubButton asChild isActive={pathname === `/drivers/${driver.id}`}>
                <Link href={`/drivers/${driver.id}`}>
                  <span>{driver.name}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith('/routes')} tooltip={t('routes')}>
          <Link href="/routes">
            <Map />
            <span>{t('routes')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname === '/reports'} tooltip={t('monthlyLedger')}>
          <Link href="/reports">
            <BookText />
            <span>{t('monthlyLedger')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/payments'}
          tooltip={t('paymentTracking')}
        >
          <Link href="/payments">
            <CircleDollarSign />
            <span>{t('paymentTracking')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname === '/settings'} tooltip={t('settings')}>
          <Link href="/settings">
            <Settings />
            <span>{t('settings')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
