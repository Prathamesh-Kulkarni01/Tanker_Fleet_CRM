'use client';
import { LayoutDashboard, Truck, Users, BookText, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trips', label: 'Trips', icon: Truck },
  { href: '/drivers', label: 'Drivers', icon: Users },
  { href: '/reports', label: 'Ledger', icon: BookText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-5 items-stretch">
        {navItems.map((item) => {
          const isActive = (item.href === '/dashboard' && pathname === '/dashboard') || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          
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
