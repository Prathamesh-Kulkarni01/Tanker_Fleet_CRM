import type { Metadata } from 'next';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '@/lib/utils';
import { Inter } from 'next/font/google';
import { AppProviders } from '@/components/provider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Tanker Ledger',
  description: 'Manage driver trips and calculate monthly slab-based payouts for your water tanker business.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('font-body antialiased', inter.variable, 'min-h-screen bg-background')}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
