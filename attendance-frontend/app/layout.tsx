import type { Metadata } from 'next';
import { Inter, Sora, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import AuthGuard from './AuthGuard';
import LivingBackground from '../components/LivingBackground';
import GlobalHeader from '../components/GlobalHeader';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-plex-mono' });

export const metadata: Metadata = {
  title: 'Teacher Attendance Portal',
  description: 'Manage classroom attendance efficiently.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${sora.variable} ${plexMono.variable} antialiased bg-canvas text-ink`}
      >
        <LivingBackground />
        <AuthGuard>
          <GlobalHeader />
          {children}
        </AuthGuard>
        <Toaster />
      </body>
    </html>
  );
}
