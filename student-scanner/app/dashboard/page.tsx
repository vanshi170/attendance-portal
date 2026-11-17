'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentStore } from '../../lib/store';
import { toast } from 'sonner';
import {
  QrCode,
  Upload,
  Calendar,
  RotateCw,
  ZoomIn,
  ZoomOut,
  X,
  LogOut,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Settings,
  Sparkles,
  FileText,
} from 'lucide-react';

interface AttendanceStats {
  presentCount: number;
  absentCount: number;
  totalCount: number;
  percentage: number;
  isSafe: boolean;
}

interface RecentLog {
  id: string;
  subject: string;
  classroom: string;
  startTime: string;
  endTime: string;
  status: string;
  date: string;
  method: string;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const student = useStudentStore((s) => s.student);
  const token = useStudentStore((s) => s.token);
  const initialize = useStudentStore((s) => s.initialize);
  const logout = useStudentStore((s) => s.logout);
  const updateStudent = useStudentStore((s) => s.updateStudent);

  const [stats, setStats] = useState<AttendanceStats>({
    presentCount: 0,
    absentCount: 0,
    totalCount: 0,
    percentage: 100,
    isSafe: true,
  });
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Timetable State
  const [timetableUrl, setTimetableUrl] = useState<string | null>(null);
  const [uploadingTimetable, setUploadingTimetable] = useState(false);
  const [fullscreenTimetable, setFullscreenTimetable] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load stats from Neon DB
  const loadDashboardData = async () => {
    if (!student?.rollNo) return;
    try {
      const res = await fetch(`/api/student/dashboard?rollNo=${student.rollNo}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setRecentLogs(data.recentLogs || []);
        if (data.student?.timetableUrl) {
          setTimetableUrl(data.student.timetableUrl);
        }
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (student?.rollNo) {
      loadDashboardData();
      if (student.timetableUrl) {
        setTimetableUrl(student.timetableUrl);
      }
    }
  }, [student?.rollNo]);

  // Redirect if not logged in
  useEffect(() => {
    if (!token && !student) {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('student_token') : null;
      if (!storedToken) {
        router.replace('/login');
      }
    }
  }, [token, student, router]);

  // Handle Timetable File Upload (PDF / Image)
  const handleTimetableUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student?.rollNo) return;

    setUploadingTimetable(true);
    const reader = new FileReader();

    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch('/api/student/timetable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rollNo: student.rollNo,
            timetableUrl: base64Data,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setTimetableUrl(base64Data);
          updateStudent({ timetableUrl: base64Data });
          toast.success('Weekly timetable saved to your profile!');
        } else {
          toast.error(data.error || 'Failed to save timetable');
        }
      } catch (err: any) {
        toast.error('Upload failed: ' + err.message);
      } finally {
        setUploadingTimetable(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen-mobile bg-[#f0f7ff] pb-28 pt-4 px-4 sm:px-6 max-w-lg mx-auto flex flex-col">
      {/* Top Header Card */}
      <header className="flex items-center justify-between p-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-sky-200/80 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar box matching Image 2 */}
          <div className="w-12 h-12 rounded-2xl border-2 border-slate-900 bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {student?.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full border border-slate-900 flex items-center justify-center overflow-hidden bg-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-slate-900 mt-1">
                  <path
                    fillRule="evenodd"
                    d="M12 2a5 5 0 100 10 5 5 0 000-10zm-7 18a7 7 0 0114 0H5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-sora font-bold text-slate-900 text-sm truncate uppercase">
                {student?.name || 'Student Portal'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                Sec {student?.section || 'A'}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500">{student?.rollNo || '25070521001'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Sections */}
      <div className="space-y-4 flex-1">
        {/* Overall Attendance Card (Calculated from Neon DB) */}
        <div className="bg-white/85 backdrop-blur-xl border border-sky-200/90 rounded-3xl p-5 shadow-lg shadow-sky-100/60 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-sora font-semibold uppercase tracking-wider text-slate-500">
              Overall Attendance
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                stats.totalCount === 0
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : stats.isSafe
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {stats.totalCount === 0
                ? 'No Sessions Yet (0/0)'
                : stats.isSafe
                ? 'Eligible (>75%)'
                : 'Shortage (<75%)'}
            </span>
          </div>

          <div className="flex items-end justify-between py-1">
            <div>
              <div className="text-4xl font-sora font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1">
                <span>{stats.totalCount === 0 ? '0' : stats.percentage}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.totalCount === 0
                  ? 'No lecture sessions held yet · 0 of 0 attended'
                  : 'Calculated from live attendance sessions in Neon DB'}
              </p>
            </div>

            {/* Visual Attendance Ring / Meter */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-sky-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={
                    stats.totalCount === 0
                      ? 'text-sky-300'
                      : stats.isSafe
                      ? 'text-sky-500'
                      : 'text-amber-500'
                  }
                  strokeDasharray={`${stats.totalCount === 0 ? 0 : stats.percentage}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[11px] font-bold font-mono text-slate-800">
                {stats.presentCount}/{stats.totalCount}
              </span>
            </div>
          </div>

          {/* Breakdown Stats Grid */}
          <div className="grid grid-cols-3 gap-2 pt-4 mt-2 border-t border-sky-100 text-center">
            <div className="bg-sky-50/60 rounded-xl p-2 border border-sky-100">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Present</span>
              <span className="text-base font-bold font-mono text-green-600">{stats.presentCount}</span>
            </div>
            <div className="bg-sky-50/60 rounded-xl p-2 border border-sky-100">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Absent</span>
              <span className="text-base font-bold font-mono text-red-500">{stats.absentCount}</span>
            </div>
            <div className="bg-sky-50/60 rounded-xl p-2 border border-sky-100">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Total</span>
              <span className="text-base font-bold font-mono text-slate-800">{stats.totalCount}</span>
            </div>
          </div>
        </div>

        {/* Landscape Timetable Section (Feature 6) */}
        <div className="bg-white/85 backdrop-blur-xl border border-sky-200/90 rounded-3xl p-5 shadow-lg shadow-sky-100/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <h3 className="font-sora font-bold text-slate-900 text-sm">Class Timetable</h3>
            </div>
            {timetableUrl && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingTimetable}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
              >
                {uploadingTimetable ? 'Updating...' : 'Update Timetable'}
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,application/pdf"
            onChange={handleTimetableUpload}
            className="hidden"
          />

          {/* Landscape Rectangle Container */}
          {timetableUrl ? (
            <div
              onClick={() => {
                setRotationDegree(0);
                setZoomScale(1);
                setFullscreenTimetable(true);
              }}
              className="w-full aspect-[16/9] rounded-2xl overflow-hidden border border-sky-200 shadow-inner bg-slate-950 relative group cursor-pointer"
            >
              {timetableUrl.startsWith('data:application/pdf') ? (
                <div className="w-full h-full relative bg-slate-900">
                  <iframe
                    src={`${timetableUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full pointer-events-none rounded-2xl border-0 bg-white"
                    title="Timetable PDF Preview"
                  />
                  {/* Subtle frosted glass overlay banner */}
                  <div className="absolute inset-0 bg-slate-950/20 hover:bg-slate-950/10 transition-colors flex flex-col justify-between p-3 text-white pointer-events-auto">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-sky-200">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        Weekly Timetable (PDF)
                      </span>
                      <span className="text-[10px] bg-sky-500 text-white font-semibold px-2 py-0.5 rounded-full shadow-sm">
                        Tap to View
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-[11px] font-medium text-white drop-shadow">
                        Tap to view fullscreen & rotate
                      </span>
                      <span className="text-[10px] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full font-mono text-sky-200">
                        Landscape 16:9
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={timetableUrl}
                    alt="Semester Timetable"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Tap to View Fullscreen Overlay Banner */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3 text-white">
                    <span className="text-[11px] font-medium flex items-center gap-1">
                      Tap to view fullscreen & rotate
                    </span>
                    <span className="text-[10px] bg-sky-500/80 px-2 py-0.5 rounded-full font-mono">
                      Landscape 16:9
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Upload Prompt Box */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-[#f8fbff] flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all hover:bg-sky-50/50"
            >
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 mb-2 shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {uploadingTimetable ? 'Saving timetable...' : 'Upload Landscape Timetable'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Accepts JPG, PNG, or PDF · Saved permanently
              </p>
            </div>
          )}
        </div>

        {/* Recent Attendance Activity */}
        <div className="bg-white/85 backdrop-blur-xl border border-sky-200/90 rounded-3xl p-5 shadow-lg shadow-sky-100/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sora font-bold text-slate-900 text-sm">Recent Activity</h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {recentLogs.length} records
            </span>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No recent attendance logs recorded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {recentLogs.map((log) => {
                const isPresent = log.status === 'present' || log.status === 'late';
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{log.subject}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {log.classroom} · {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPresent ? (
                        <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[11px] font-bold">
                          Present
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[11px] font-bold">
                          Absent
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Highlighted QR Scanner Button (UPI Style) */}
      <div className="fixed bottom-5 left-0 right-0 max-w-lg mx-auto px-4 z-40">
        <button
          onClick={() => router.push('/scan')}
          className="w-full bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 active:scale-[0.98] text-white rounded-full py-4 px-6 shadow-xl shadow-sky-400/50 flex items-center justify-center gap-3 font-sora font-semibold text-base transition-transform"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5 animate-pulse text-white" />
          </div>
          <span>Scan Classroom QR</span>
        </button>
      </div>

      {/* Fullscreen Landscape Timetable Viewer Modal with Rotation & Zoom */}
      {fullscreenTimetable && timetableUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4">
          {/* Top Controls */}
          <div className="w-full flex items-center justify-between text-white py-2 px-1">
            <span className="text-xs font-semibold tracking-wider text-sky-300">
              Timetable Viewer
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRotationDegree((prev) => (prev + 90) % 360)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-medium text-white transition-colors"
                title="Rotate Timetable sideways for landscape reading"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate ({rotationDegree}°)</span>
              </button>
              <button
                onClick={() => setZoomScale((s) => Math.min(s + 0.25, 3))}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomScale((s) => Math.max(s - 0.25, 0.75))}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFullscreenTimetable(false)}
                className="p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Central Viewer */}
          <div className="flex-1 w-full flex items-center justify-center overflow-auto p-2">
            {timetableUrl.startsWith('data:application/pdf') ? (
              <iframe
                src={timetableUrl}
                className="w-full h-full rounded-xl bg-white"
                title="PDF Timetable"
              />
            ) : (
              <div
                className="transition-transform duration-300 ease-out origin-center"
                style={{
                  transform: `rotate(${rotationDegree}deg) scale(${zoomScale})`,
                }}
              >
                <img
                  src={timetableUrl}
                  alt="Full Timetable"
                  className="max-h-[75vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                />
              </div>
            )}
          </div>

          {/* Bottom Help Tip */}
          <p className="text-[11px] text-slate-400 text-center pb-2">
            Tip: Tap Rotate to turn your timetable landscape for full weekly view.
          </p>
        </div>
      )}
    </div>
  );
}
