'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { fetchApi } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import { Button } from '../../../components/ui/button';
import { LiveIndicator } from '../../../components/LiveIndicator';
import { StatusBadge, cn } from '../../../components/StatusBadge';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:10000';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface Student {
  id: string;
  name: string;
  rollNo: string;
}

interface Record {
  id: string;
  student: Student;
  status: 'present' | 'absent' | 'late';
  method: string | null;
}

export default function SessionPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [qrToken, setQrToken] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [actedUpon, setActedUpon] = useState<Set<string>>(new Set());
  const [lateMode, setLateMode] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await fetchApi(`/sessions/${sessionId}`);
        if (data.status === 'closed') {
          router.push(`/session/${sessionId}/summary`);
          return;
        }
        setSession(data);
        setRecords(data.records);
      } catch (err: any) {
        toast.error('Failed to load session');
      }
    };
    loadSession();
  }, [sessionId, router]);

  // Handle QR Token Rotation
  useEffect(() => {
    if (!session) return;
    const fetchToken = async () => {
      try {
        const res = await fetchApi(`/sessions/${sessionId}/token`);
        setQrToken(res.token);
      } catch (e) {}
    };
    fetchToken();
    const interval = setInterval(fetchToken, 25000); // 25s rotation
    return () => clearInterval(interval);
  }, [session, sessionId]);

  // Handle Socket
  useEffect(() => {
    if (!session) return;
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_session', sessionId);
    });

    newSocket.on('attendance:update', (data: { studentId: string, status: 'present' | 'absent' | 'late', student?: Student }) => {
      setRecords(prev => {
        const exists = prev.find(r => r.student.id === data.studentId);
        if (exists) {
          return prev.map(r => 
            r.student.id === data.studentId ? { ...r, status: data.status } : r
          );
        } else if (data.student) {
          // Dynamically add new student who just scanned in
          return [...prev, { id: `record-${Date.now()}`, student: data.student, status: data.status, method: 'qr' }];
        }
        return prev;
      });
    });

    newSocket.on('session:closed', () => {
      router.push(`/session/${sessionId}/summary`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [session, sessionId, router]);

  const handleManualOverride = async (studentId: string, status: 'present' | 'late') => {
    try {
      await fetchApi(`/sessions/${sessionId}/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    } catch (e: any) {
      toast.error('Failed to update attendance');
    }
  };

  const handleCloseAttendance = async () => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await fetchApi(`/sessions/${sessionId}/close`, { method: 'POST' });
      // We rely on the socket 'session:closed' event to route, or route directly if it doesn't fire.
      router.push(`/session/${sessionId}/summary`);
    } catch (e: any) {
      toast.error('Failed to close session', { description: e.message });
      setIsClosing(false);
      setShowConfirm(false);
    }
  };

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const aActed = actedUpon.has(a.student.id) || a.status !== 'absent';
      const bActed = actedUpon.has(b.student.id) || b.status !== 'absent';
      
      if (!aActed && bActed) return -1;
      if (aActed && !bActed) return 1;
      return a.student.rollNo.localeCompare(b.student.rollNo);
    });
  }, [records, actedUpon]);

  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const totalCount = records.length;

  if (!session) return <div className="min-h-screen bg-canvas" />;

  return (
    <div className="h-[calc(100vh-4rem)] md:overflow-hidden bg-transparent flex flex-col">
      {/* Top Bar */}
      <header className="z-40 h-16 bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-sora font-semibold text-ink">
            {session.lecture.subject} <span className="text-muted ml-2">{session.lecture.classroom.code}</span>
          </h1>
          <LiveIndicator startedAt={session.startedAt} />
          <div className="ml-4 px-3 py-1 bg-white/50 border border-thistle rounded-full text-sm font-medium">
            <span className="text-hot-pink font-plex-mono">{presentCount}</span>
            <span className="text-muted mx-1">/</span>
            <span className="text-ink font-plex-mono">{totalCount}</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowConfirm(true)}
          className="border-thistle text-ink hover:bg-thistle/10 rounded-full"
        >
          Close Attendance
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
        {/* Left Panel: QR */}
        <div className="w-full md:w-[45%] lg:w-[40%] bg-white/40 backdrop-blur-xl border-b md:border-b-0 md:border-r border-thistle/50 p-8 flex flex-col items-center justify-center relative shrink-0">
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-2xl font-sora text-ink mb-8 text-center leading-tight">
              Scan QR Code to<br />Mark Attendance
            </h2>
            
            <div className="relative flex items-center justify-center mb-12">
              <div className="absolute inset-0 rounded-full border-4 border-hot-pink/30 radar-ring z-0"></div>
              <div className="absolute inset-[-20%] rounded-full border-2 border-thistle/50 radar-ring" style={{ animationDelay: '0.5s' }}></div>
              <div className="bg-white p-4 rounded-2xl shadow-xl z-10 relative">
                {qrToken ? (
                  <QRCodeSVG 
                    value={`${APP_URL}/scan/${qrToken}`}
                    size={240}
                    level="H"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[240px] h-[240px] bg-canvas animate-pulse" />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-ink">
                <Check className="w-5 h-5 text-hot-pink" />
                <span>GPS Enabled</span>
              </div>
              <div className="flex items-center gap-3 text-ink">
                <Check className="w-5 h-5 text-hot-pink" />
                <span>College Wi-Fi Accessible</span>
              </div>
              <div className="flex items-center gap-3 text-ink">
                <Check className="w-5 h-5 text-hot-pink" />
                <span>Face Clearly Visible</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Roster */}
        <div className="flex-1 p-6 md:overflow-y-auto custom-scrollbar md:pr-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <AnimatePresence initial={false}>
              {sortedRecords.map((record) => (
                <motion.div
                  key={record.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-white shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-ink">{record.student.name}</span>
                    <span className="text-sm font-plex-mono text-muted">{record.student.rollNo}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    {record.status === 'absent' && (
                      <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg shrink-0">
                        A
                      </div>
                    )}
                    {(record.status === 'present' || record.status === 'late') && (
                      <div className="w-8 h-8 rounded bg-green-100 text-green-600 flex items-center justify-center font-bold text-lg shrink-0">
                        P
                      </div>
                    )}

                    {/* Actions */}
                    {record.status === 'absent' && (
                      lateMode.has(record.student.id) ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              handleManualOverride(record.student.id, 'present');
                              setActedUpon(prev => new Set(prev).add(record.student.id));
                              setLateMode(prev => { const next = new Set(prev); next.delete(record.student.id); return next; });
                            }}
                            className="bg-[#16A34A] hover:bg-[#16A34A]/90 text-white rounded-full h-8 px-3 text-xs"
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Already absent in DB, just exit late mode
                              setLateMode(prev => { const next = new Set(prev); next.delete(record.student.id); return next; });
                            }}
                            className="border-red-500 text-red-500 hover:bg-red-500/10 rounded-full h-8 px-3 text-xs"
                          >
                            Absent
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLateMode(prev => new Set(prev).add(record.student.id));
                          }}
                          className="border-hot-pink text-hot-pink hover:bg-hot-pink/10 rounded-full h-8 px-3 text-xs"
                        >
                          Late
                        </Button>
                      )
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Confirm Dialog Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-sora font-semibold mb-2 text-ink">Close Attendance?</h3>
            <p className="text-muted mb-6">
              This finalizes attendance for <strong>{session.lecture.subject} · {session.lecture.startTime}–{session.lecture.endTime}</strong>. You can't reopen it. Close attendance now?
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirm(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCloseAttendance}
                disabled={isClosing}
                className="bg-hot-pink hover:bg-hot-pink/90 text-white rounded-full"
              >
                {isClosing ? 'Closing...' : 'Close Attendance'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
