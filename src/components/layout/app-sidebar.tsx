import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { AppSidebarNav } from './app-sidebar-nav';
import { Separator } from '@/components/ui/separator';
import { Truck } from 'lucide-react';

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <Button variant="ghost" className="h-10 w-full justify-start px-2 text-primary-foreground hover:text-primary-foreground">
          <Truck className="h-7 w-7 mr-2" />
          <span className="text-lg font-headline"><span className="font-bold">Tanker</span>Ledger</span>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <AppSidebarNav />
      </SidebarContent>
    </Sidebar>
  );
}
