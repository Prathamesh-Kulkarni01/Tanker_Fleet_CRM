'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { AppBottomNav } from '@/components/layout/app-bottom-nav';
import { useAuth } from '@/contexts/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMapPage = pathname === '/fleet' || pathname.startsWith('/trips/live/');

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col md:pl-14">
        {!isMapPage && <AppHeader />}
        <main
          className={cn(
            'relative flex-1',
            !isMapPage && 'overflow-auto p-4 sm:px-6 md:p-8 pb-24 md:pb-8'
          )}
        >
          {children}
        </main>
        {!isMapPage && <AppBottomNav />}
      </div>
    </SidebarProvider>
  );
}


function FullPageLoader() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background p-4 sm:p-6 md:p-8">
       <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex-1"></div>
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </header>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3 my-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-8 xl:grid-cols-3">
        <Skeleton className="xl:col-span-2 h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  )
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <FullPageLoader />;
  }

  return <AppLayoutContent>{children}</AppLayoutContent>;
}
