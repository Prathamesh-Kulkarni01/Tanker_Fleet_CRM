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
  Sparkles,
  Settings,
  Users,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { drivers } from '@/lib/data';

export function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/dashboard'}
          tooltip="Dashboard"
        >
          <Link href="/dashboard">
            <LayoutDashboard />
            <span>Dashboard</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/trips'}
          tooltip="Trip Entry"
        >
          <Link href="/trips">
            <Truck />
            <span>Trip Entry</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname.startsWith('/drivers')}
          tooltip="Drivers"
        >
          <Link href="/drivers/d1">
             <Users />
            <span>Driver Insights</span>
          </Link>
        </SidebarMenuButton>
         <SidebarMenuSub>
           {drivers.map((driver) => (
             <SidebarMenuSubItem key={driver.id}>
               <SidebarMenuSubButton
                asChild
                isActive={pathname === `/drivers/${driver.id}`}
              >
                <Link href={`/drivers/${driver.id}`}>
                  <span>{driver.name}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
           ))}
        </SidebarMenuSub>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/reports'}
          tooltip="Monthly Ledger"
        >
          <Link href="/reports">
            <BookText />
            <span>Monthly Ledger</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/payments'}
          tooltip="Payment Tracking"
        >
          <Link href="/payments">
            <CircleDollarSign />
            <span>Payment Tracking</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/settings'}
          tooltip="Settings"
        >
          <Link href="/settings">
            <Settings />
            <span>Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
