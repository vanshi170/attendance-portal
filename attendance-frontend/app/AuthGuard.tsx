'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../lib/store';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const initialize = useAuthStore((state) => state.initialize);
  const token = useAuthStore((state) => state.token);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initialize();
    setIsReady(true);
  }, [initialize]);

  useEffect(() => {
    if (isReady) {
      if (!token && (pathname.startsWith('/dashboard') || pathname.startsWith('/session') || pathname.startsWith('/timetable'))) {
        router.push('/login');
      } else if (token && pathname === '/login') {
        const isNew = localStorage.getItem('isNewUser');
        if (isNew) {
          localStorage.removeItem('isNewUser');
          router.push('/timetable');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [isReady, token, pathname, router]);

  if (!isReady || (!token && (pathname.startsWith('/dashboard') || pathname.startsWith('/session') || pathname.startsWith('/timetable')))) {
    // Show nothing or a loading spinner while checking auth
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-hot-pink border-r-transparent border-b-thistle border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
