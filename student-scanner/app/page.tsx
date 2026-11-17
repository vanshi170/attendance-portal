'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentStore } from '../lib/store';

export default function RootPage() {
  const router = useRouter();
  const initialize = useStudentStore((s) => s.initialize);
  const token = useStudentStore((s) => s.token);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [token, router]);

  return (
    <div className="min-h-screen-mobile flex items-center justify-center bg-[#f0f7ff]">
      <div className="w-9 h-9 border-4 border-t-sky-500 border-r-transparent border-b-sky-200 border-l-transparent rounded-full animate-spin"></div>
    </div>
  );
}
