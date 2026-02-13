'use client';
import { LayoutDashboard, Truck, Users, BookText, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

export function AppBottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/trips', label: t('tripEntry'), icon: Truck },
    { href: '/drivers', label: t('drivers'), icon: Users },
    { href: '/reports', label: t('monthlyLedger'), icon: BookText },
    { href: '/settings', label: t('settings'), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-5 items-stretch">
        {navItems.map((item) => {
          const isActive =
            (item.href === '/dashboard' && pathname === '/dashboard') ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href === '/drivers' ? '/drivers/d1' : item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 p-1 text-muted-foreground transition-colors hover:text-primary',
                isActive && 'text-primary'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[11px] font-medium text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
