'use client';
import {
  LayoutDashboard,
  Users,
  BookText,
  Settings,
  Map,
  Compass,
  Truck,
  KeyRound,
  Briefcase,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/auth';

export function AppBottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user } = useAuth();

  if (!user) return null;

  const baseOwnerItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/fleet', label: t('fleet'), icon: Compass },
    { href: '/jobs', label: t('jobs'), icon: Briefcase },
    { href: '/trips', label: t('tripEntry'), icon: Truck },
    { href: '/drivers', label: t('drivers'), icon: Users },
    { href: '/routes', label: t('routes'), icon: Map },
    { href: '/reports', label: t('settlements'), icon: BookText },
    { href: '/settings', label: t('settings'), icon: Settings },
  ];

  const getNavItems = () => {
    if (user.role === 'admin') {
        return [{ href: '/admin', label: t('admin'), icon: KeyRound }];
    }

    if (user.role === 'driver') {
      return [
        {
          href: `/drivers/${user.id}`,
          label: t('dashboard'),
          icon: LayoutDashboard,
        },
      ];
    }
    
    return baseOwnerItems;
  };

  const navItems = getNavItems();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-sm md:hidden">
      <div
        className="grid h-16 items-stretch overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(64px, 1fr))` }}
      >
        {navItems.map((item) => {
          const isActive =
            (item.href === '/dashboard' && pathname === '/dashboard') ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 p-1 text-muted-foreground transition-colors hover:text-primary',
                isActive && 'text-primary'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-[11px] font-medium text-center break-words">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
