import {
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { AppBottomNav } from '@/components/layout/app-bottom-nav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col">
        <AppSidebar />
        <div className="flex flex-col md:pl-14">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 sm:px-6 md:p-8 pb-24 md:pb-8">
            {children}
          </main>
        </div>
        <AppBottomNav />
      </div>
    </SidebarProvider>
  );
}
