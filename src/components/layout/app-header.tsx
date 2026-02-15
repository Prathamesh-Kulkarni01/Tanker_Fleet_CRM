
'use client';

import { Globe, Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '../theme-provider';
import { useAuth } from '@/contexts/auth';
import Link from 'next/link';

export function AppHeader() {
  const { setLanguage, t } = useI18n();
  const { setTheme } = useTheme();
  const { user, logout } = useAuth();

  const userAvatar =
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxtYWxlJTIwcHJvZmlsZXxlbnwwfHx8fDE3NzA5OTc0Njl8MA&ixlib=rb-4.1.0&q=80&w=1080';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex-1">{/* Can add breadcrumbs here */}</div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t('toggleTheme')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>{t('light')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>{t('dark')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>{t('system')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Globe className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">{t('changeLanguage')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setLanguage('en')}>{t('en')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setLanguage('hi')}>{t('hi')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setLanguage('mr')}>{t('mr')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
            <Image
              src={userAvatar}
              width={36}
              height={36}
              alt="Avatar"
              className="overflow-hidden rounded-full"
              data-ai-hint="person portrait"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {user?.name || t('myAccount')} ({user?.role})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">{t('settings')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>{t('support')}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
