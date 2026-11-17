'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { toast } from 'sonner';
import { Check, Clock, Calendar, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface Classroom {
  id: string;
  code: string;
}

interface Lecture {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  classroom: Classroom;
  isWithinTimeWindow: boolean;
  attendanceDone: boolean;
  activeSessionId?: string | null;
  latestSessionId?: string | null;
}

export default function DashboardPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const router = useRouter();
  const { teacher } = useAuthStore();

  const loadLectures = async () => {
    try {
      const data = await fetchApi('/lectures/today');
      setLectures(data);
    } catch (err: any) {
      toast.error('Failed to load lectures', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLectures();
    // Refresh periodically so time windows update live as clock ticks
    const interval = setInterval(loadLectures, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter lectures that can be selected in dropdown:
  // ONLY lectures that are currently in their time window AND attendance not already done!
  const eligibleLectures = useMemo(() => {
    return lectures.filter((l) => l.isWithinTimeWindow && !l.attendanceDone);
  }, [lectures]);

  useEffect(() => {
    if (eligibleLectures.length > 0) {
      if (!selectedLectureId || !eligibleLectures.some((l) => l.id === selectedLectureId)) {
        setSelectedLectureId(eligibleLectures[0].id);
      }
    } else {
      setSelectedLectureId('');
    }
  }, [eligibleLectures, selectedLectureId]);

  const handleStartAttendance = async () => {
    if (!selectedLectureId) return;
    setStarting(true);
    try {
      const session = await fetchApi('/sessions/start', {
        method: 'POST',
        body: JSON.stringify({ lectureId: selectedLectureId, section: selectedSection })
      });
      router.push(`/session/${session.id}`);
    } catch (err: any) {
      if (err.message && err.message.includes('already active')) {
        toast.error('Session already active', { description: err.message });
        loadLectures();
      } else {
        toast.error('Cannot start session', { description: err.message });
      }
      setStarting(false);
    }
  };

  const selectedLecture = eligibleLectures.find((l) => l.id === selectedLectureId);

  if (loading && lectures.length === 0) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-hot-pink border-r-transparent border-b-thistle border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-sora font-semibold text-ink">
              Welcome, {teacher?.name?.split(' ')[0]}
            </h1>
            <p className="text-muted text-sm mt-0.5">Choose a lecture to take student attendance</p>
          </div>
          <Link
            href="/timetable"
            className="text-xs sm:text-sm font-medium text-hot-pink hover:underline flex items-center gap-1"
          >
            <Calendar className="w-4 h-4" />
            Timetable
          </Link>
        </div>

        {/* Today's Lectures Status Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted font-sora">
              Today's Schedule & Status
            </h2>
            <span className="text-xs text-muted">
              {lectures.length} {lectures.length === 1 ? 'lecture' : 'lectures'} today
            </span>
          </div>

          {lectures.length === 0 ? (
            <div className="bg-white/70 border border-thistle rounded-2xl p-6 text-center shadow-sm">
              <p className="text-ink font-medium">No lectures scheduled for today.</p>
              <p className="text-muted text-xs mt-1">Check your weekly schedule in Create Lecture.</p>
              <Link href="/timetable" className="inline-block mt-3">
                <Button variant="outline" className="rounded-full text-xs h-8">
                  View Timetable
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {lectures.map((lec) => {
                return (
                  <div
                    key={lec.id}
                    className={`bg-white/80 backdrop-blur-sm border rounded-2xl p-4 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      lec.attendanceDone
                        ? 'border-green-200/80 bg-green-50/20'
                        : lec.isWithinTimeWindow
                        ? 'border-hot-pink/40 ring-1 ring-hot-pink/20'
                        : 'border-thistle/80 opacity-90'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-ink text-base">{lec.subject}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {lec.classroom?.code || 'CL'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted font-plex-mono">
                        <Clock className="w-3.5 h-3.5 text-hot-pink" />
                        <span>{lec.startTime} – {lec.endTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Attendance Done: Pure green tick ONLY (no circle, no emoji) */}
                      {lec.attendanceDone ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-[#16A34A] text-xs font-semibold">
                          <Check className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
                          <span>Attendance Done</span>
                        </div>
                      ) : lec.activeSessionId ? (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/session/${lec.activeSessionId}`)}
                          className="bg-hot-pink hover:bg-hot-pink/90 text-white rounded-full h-8 text-xs font-medium"
                        >
                          Resume Session
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      ) : lec.isWithinTimeWindow ? (
                        <div className="px-3 py-1 rounded-full bg-hot-pink/10 text-hot-pink text-xs font-semibold">
                          Open Now
                        </div>
                      ) : (
                        <div className="px-3 py-1 rounded-full bg-slate-100 text-muted text-xs font-medium">
                          Closed (Outside Hours)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Start Attendance Card */}
        <Card className="bg-white/80 backdrop-blur-xl border border-thistle shadow-xl text-ink">
          <CardHeader>
            <CardTitle className="text-xl font-sora">Start Attendance Session</CardTitle>
            <CardDescription className="text-muted">
              Select an open lecture from your schedule. Only lectures within their scheduled hours appear below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {eligibleLectures.length === 0 ? (
              <div className="bg-canvas rounded-2xl p-6 text-center border border-thistle space-y-2">
                <p className="text-ink font-medium">No lectures eligible right now.</p>
                <p className="text-muted text-xs leading-relaxed max-w-sm mx-auto">
                  Attendance can only be opened during scheduled lecture hours (e.g. 9:00 AM – 11:00 AM), and completed sessions cannot be reopened.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink">Select Lecture</label>
                  <select
                    className="w-full bg-canvas text-ink border border-thistle rounded-full h-12 px-4 focus:ring-2 focus:ring-hot-pink outline-none cursor-pointer"
                    value={selectedLectureId}
                    onChange={(e) => setSelectedLectureId(e.target.value)}
                  >
                    {eligibleLectures.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.subject} · {l.startTime} – {l.endTime}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink">Select Section</label>
                  <select
                    className="w-full bg-canvas text-ink border border-thistle rounded-full h-12 px-4 focus:ring-2 focus:ring-hot-pink outline-none cursor-pointer"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                  >
                    {['A', 'B', 'C', 'D', 'E'].map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLecture && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Classroom</label>
                    <div className="w-full bg-canvas text-ink border border-thistle rounded-full h-12 px-4 flex items-center cursor-not-allowed">
                      {selectedLecture.classroom?.code || 'CL'}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleStartAttendance}
                  disabled={starting || !selectedLectureId}
                  className="w-full bg-hot-pink hover:bg-hot-pink/90 text-white rounded-full h-12 font-medium mt-4 shadow-md transition-transform hover:scale-[1.01]"
                >
                  {starting ? 'Starting Session...' : 'Start Attendance'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
