import type { Metadata, Viewport } from 'next';
import { Inter, Sora, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import LivingBackground from '../components/LivingBackground';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'SIT Student Portal & QR Scanner',
  description: 'Smart Attendance Management System - Student Mobile QR Scanner & Dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SIT Scanner',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${sora.variable} ${plexMono.variable} antialiased bg-[#f0f7ff] text-slate-900 selection:bg-sky-200 min-h-screen`}
      >
        <LivingBackground />
        <main className="min-h-screen-mobile flex flex-col relative z-10">{children}</main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
