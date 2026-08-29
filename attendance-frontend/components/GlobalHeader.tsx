'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { fetchApi } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { ChevronDown, User, LogOut, Settings, Calendar, PlaySquare, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  
  useEffect(() => {
    if (dropdownOpen) {
      fetchApi('/sessions/active')
        .then(res => {
          if (res && !res.error) {
            setActiveSession(res);
          } else {
            setActiveSession(null);
          }
        })
        .catch(() => setActiveSession(null));
    }
  }, [dropdownOpen]);
  
  const { teacher, logout } = useAuthStore();

  // Do not render on login page
  if (pathname === '/login' || pathname === '/') return null;

  const handleSignOut = () => {
    logout();
    router.push('/login');
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-white/60 backdrop-blur-md border-b border-thistle flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <h1 className="font-sora font-semibold text-xl text-ink">
          Attendance Portal
        </h1>
      </div>

      <div className="relative">
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 hover:bg-thistle/20 p-2 rounded-full transition-colors"
        >
          {teacher?.profilePic ? (
            <img src={teacher.profilePic} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-thistle" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-thistle flex items-center justify-center text-ink font-semibold">
              {teacher?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <ChevronDown className="w-4 h-4 text-ink" />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setDropdownOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-thistle z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-thistle bg-canvas/30">
                  <p className="font-semibold text-ink truncate">{teacher?.name}</p>
                  <p className="text-xs text-muted truncate">{teacher?.email}</p>
                </div>
                
                <div className="p-2 space-y-1">
                  <Link 
                    href="/timetable"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-hot-pink/10 hover:text-hot-pink rounded-lg transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    Create Lecture
                  </Link>

                  <Link 
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-hot-pink/10 hover:text-hot-pink rounded-lg transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    Choose Lecture
                  </Link>
                  
                  <Link 
                    href={activeSession ? "/scan/demo" : "#"}
                    target={activeSession ? "_blank" : undefined}
                    onClick={(e) => {
                      if (!activeSession) {
                        e.preventDefault();
                      } else {
                        setDropdownOpen(false);
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeSession 
                        ? 'text-ink hover:bg-hot-pink/10 hover:text-hot-pink' 
                        : 'text-muted/50 cursor-not-allowed'
                    }`}
                  >
                    <PlaySquare className="w-4 h-4" />
                    Scanner Demo
                  </Link>

                  <Link 
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-hot-pink/10 hover:text-hot-pink rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </Link>
                </div>

                <div className="p-2 border-t border-thistle">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
