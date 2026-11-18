'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { Button } from '../../components/ui/button';
import { StudentAvatar } from '../../components/StudentAvatar';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Search,
  Check,
  X,
  Pen,
  Save,
  CheckCircle2,
  AlertCircle,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Student {
  id: string;
  name: string;
  rollNo: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  status: 'present' | 'absent' | 'late';
  method?: string | null;
  markedAt?: string | null;
  student: Student;
}

interface Classroom {
  id: string;
  code: string;
}

interface Lecture {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  classroom?: Classroom;
}

interface Session {
  id: string;
  lectureId: string;
  section: string;
  status: 'active' | 'closed';
  startedAt: string;
  closedAt?: string | null;
  totalCount: number;
  presentCount: number;
  strengthPct: number;
  lecture: Lecture;
  records: AttendanceRecord[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format Date to YYYY-MM-DD in local time
function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AttendanceRecordsPage() {
  const router = useRouter();
  const { teacher } = useAuthStore();

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Attendance Modal State
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingRecords, setEditingRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load all sessions for this teacher
  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/sessions');
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Failed to load attendance records', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Map sessions by local date (YYYY-MM-DD)
  const sessionsByDate = useMemo(() => {
    const map: Record<string, Session[]> = {};
    for (const sess of sessions) {
      const d = new Date(sess.startedAt);
      const key = formatDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(sess);
    }
    return map;
  }, [sessions]);

  // Selected Day Sessions
  const selectedDaySessions = useMemo(() => {
    return sessionsByDate[selectedDateKey] || [];
  }, [sessionsByDate, selectedDateKey]);

  // Calendar Grid Computation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 is Sun, 1 is Mon...
    const totalDaysInMonth = lastDay.getDate();

    const days: Array<{
      date: Date;
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      sessionCount: number;
    }> = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      const key = formatDateKey(prevDate);
      days.push({
        date: prevDate,
        dateKey: key,
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        sessionCount: (sessionsByDate[key] || []).length,
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const thisDate = new Date(currentYear, currentMonth, day);
      const key = formatDateKey(thisDate);
      days.push({
        date: thisDate,
        dateKey: key,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        sessionCount: (sessionsByDate[key] || []).length,
      });
    }

    // Next month padding days to fill 35 or 42 grid cells
    const remaining = 42 - days.length;
    if (remaining > 0 && remaining < 7) {
      for (let nextDay = 1; nextDay <= remaining; nextDay++) {
        const nextDate = new Date(currentYear, currentMonth + 1, nextDay);
        const key = formatDateKey(nextDate);
        days.push({
          date: nextDate,
          dateKey: key,
          dayNumber: nextDay,
          isCurrentMonth: false,
          isToday: key === todayKey,
          isSelected: key === selectedDateKey,
          sessionCount: (sessionsByDate[key] || []).length,
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, selectedDateKey, todayKey, sessionsByDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateKey(todayKey);
  };

  // Open Edit Attendance Modal
  const openEditAttendance = (session: Session) => {
    setEditingSession(session);
    // Deep clone records to edit safely
    setEditingRecords(JSON.parse(JSON.stringify(session.records || [])));
    setSearchQuery('');
  };

  // Toggle student status inside modal
  const handleUpdateStudentStatus = (studentId: string, newStatus: 'present' | 'absent' | 'late') => {
    setEditingRecords((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, status: newStatus } : r))
    );
  };

  // Save modified attendance records back to DB
  const handleSaveAttendance = async () => {
    if (!editingSession) return;
    setIsSaving(true);

    try {
      const updates = editingRecords.map((r) => ({
        studentId: r.student.id,
        status: r.status,
      }));

      const res = await fetchApi(`/sessions/${editingSession.id}/records`, {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      });

      toast.success('Attendance records saved successfully!');

      // Update local state
      setSessions((prev) =>
        prev.map((s) => (s.id === editingSession.id ? res : s))
      );
      setEditingSession(null);
    } catch (err: any) {
      toast.error('Failed to save attendance', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered records in modal
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return editingRecords;
    const q = searchQuery.toLowerCase();
    return editingRecords.filter(
      (r) =>
        r.student.name.toLowerCase().includes(q) ||
        r.student.rollNo.toLowerCase().includes(q)
    );
  }, [editingRecords, searchQuery]);

  // Modal Attendance Statistics
  const modalStats = useMemo(() => {
    const total = editingRecords.length;
    const present = editingRecords.filter((r) => r.status === 'present').length;
    const late = editingRecords.filter((r) => r.status === 'late').length;
    const absent = editingRecords.filter((r) => r.status === 'absent').length;
    const attended = present + late;
    const pct = total > 0 ? ((attended / total) * 100).toFixed(1) : '0';
    return { total, present, late, absent, attended, pct };
  }, [editingRecords]);

  // Formatted selected date header label
  const formattedSelectedDate = useMemo(() => {
    const parts = selectedDateKey.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDateKey]);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-thistle shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-hot-pink/10 text-hot-pink rounded-2xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-sora font-semibold text-ink">
              Attendance Records
            </h1>
          </div>
          <p className="text-sm text-muted">
            Browse lecture attendance by date, view student attendance records, and adjust statuses.
          </p>
        </div>

        <Button
          onClick={handleJumpToToday}
          variant="outline"
          className="rounded-full border-thistle text-ink hover:bg-thistle/20 self-start sm:self-auto h-9 text-xs font-semibold px-4"
        >
          Jump to Today
        </Button>
      </div>

      {/* Main Grid: Calendar Left, Sessions Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sleek Interactive Calendar (5 cols) */}
        <div className="lg:col-span-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-thistle p-6 shadow-sm flex flex-col">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sora font-semibold text-lg text-ink">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-full hover:bg-thistle/20 text-ink transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-full hover:bg-thistle/20 text-ink transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center mb-3">
            {WEEKDAY_NAMES.map((name) => (
              <span
                key={name}
                className="text-[11px] font-semibold text-muted tracking-wider uppercase"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              const isSelected = cell.dateKey === selectedDateKey;
              const hasSessions = cell.sessionCount > 0;

              return (
                <button
                  key={`${cell.dateKey}-${idx}`}
                  onClick={() => setSelectedDateKey(cell.dateKey)}
                  className={`relative flex flex-col items-center justify-center h-11 sm:h-12 rounded-2xl text-xs font-medium transition-all ${
                    !cell.isCurrentMonth
                      ? 'text-muted/30 hover:bg-thistle/10'
                      : isSelected
                      ? 'bg-hot-pink text-white font-bold shadow-md shadow-hot-pink/30 scale-105 z-10'
                      : cell.isToday
                      ? 'border border-hot-pink text-hot-pink font-bold bg-hot-pink/5 hover:bg-hot-pink/15'
                      : 'text-ink hover:bg-thistle/20'
                  }`}
                >
                  <span>{cell.dayNumber}</span>

                  {/* Indicator Dot for Days with Attendance Sessions */}
                  {hasSessions && (
                    <span
                      className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend / Status Footer */}
          <div className="mt-6 pt-4 border-t border-thistle/60 flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Lectures Conducted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full border border-hot-pink" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Right: Day Sessions List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-sora font-semibold text-lg text-ink flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-hot-pink" />
              <span>{formattedSelectedDate}</span>
            </h2>
            <span className="text-xs font-plex-mono px-3 py-1 bg-white/70 border border-thistle rounded-full text-muted">
              {selectedDaySessions.length} {selectedDaySessions.length === 1 ? 'Session' : 'Sessions'}
            </span>
          </div>

          {loading ? (
            <div className="py-16 bg-white/60 backdrop-blur-md rounded-3xl border border-thistle flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-t-hot-pink border-r-transparent border-b-thistle border-l-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted mt-3">Loading sessions...</p>
            </div>
          ) : selectedDaySessions.length === 0 ? (
            <div className="py-16 bg-white/60 backdrop-blur-md rounded-3xl border border-thistle text-center p-8 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-thistle/20 flex items-center justify-center text-muted">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="font-sora font-semibold text-ink">No Attendance Sessions</h3>
              <p className="text-xs text-muted max-w-sm">
                No attendance was recorded on {formattedSelectedDate}. Select another highlighted date on the calendar to view past records.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {selectedDaySessions.map((session) => {
                const total = session.totalCount || session.records?.length || 0;
                const present = session.presentCount || 0;
                const pct = session.strengthPct ? session.strengthPct.toFixed(1) : total > 0 ? ((present / total) * 100).toFixed(1) : '0';

                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-3xl border border-thistle bg-white/80 backdrop-blur-md shadow-sm hover:border-hot-pink/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sora font-semibold text-ink text-base sm:text-lg">
                          {session.lecture.subject}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-hot-pink/10 text-hot-pink border border-hot-pink/20">
                          Section {session.section}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          session.status === 'closed'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-emerald-100 text-emerald-700 animate-pulse'
                        }`}>
                          {session.status === 'closed' ? 'Closed' : 'Active'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{session.lecture.startTime} – {session.lecture.endTime}</span>
                        </div>
                        {session.lecture.classroom && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Room {session.lecture.classroom.code}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-plex-mono font-medium text-ink">
                            {present} / {total} Present ({pct}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => openEditAttendance(session)}
                      className="bg-ink hover:bg-ink/90 text-white rounded-full px-5 h-9 text-xs font-semibold flex items-center gap-2 shrink-0 self-start sm:self-center shadow-sm"
                    >
                      <Pen className="w-3.5 h-3.5" />
                      <span>Edit Attendance</span>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Attendance Full Roster Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-thistle overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-thistle bg-canvas/30 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-sora font-semibold text-ink">
                      {editingSession.lecture.subject}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-hot-pink/10 text-hot-pink rounded-full">
                      Section {editingSession.section}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {formattedSelectedDate} · {editingSession.lecture.startTime} – {editingSession.lecture.endTime}
                    {editingSession.lecture.classroom && ` · Room ${editingSession.lecture.classroom.code}`}
                  </p>
                </div>

                <button
                  onClick={() => setEditingSession(null)}
                  className="p-1.5 rounded-full hover:bg-thistle/20 text-muted hover:text-ink transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-thistle/50 text-center">
                <div className="p-2 rounded-xl bg-white border border-thistle/60">
                  <div className="text-[11px] text-muted">Total</div>
                  <div className="text-sm font-bold font-plex-mono text-ink">{modalStats.total}</div>
                </div>
                <div className="p-2 rounded-xl bg-green-50 border border-green-200">
                  <div className="text-[11px] text-green-700">Present</div>
                  <div className="text-sm font-bold font-plex-mono text-green-700">{modalStats.present}</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] text-amber-700">Late</div>
                  <div className="text-sm font-bold font-plex-mono text-amber-700">{modalStats.late}</div>
                </div>
                <div className="p-2 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-[11px] text-red-700">Absent</div>
                  <div className="text-sm font-bold font-plex-mono text-red-700">{modalStats.absent}</div>
                </div>
              </div>

              {/* Search Field */}
              <div className="relative mt-4">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student by name or PRN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-full bg-white border border-thistle focus:ring-2 focus:ring-hot-pink outline-none"
                />
              </div>
            </div>

            {/* Students List Scrollable Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-3">
              {filteredRecords.length === 0 ? (
                <div className="py-12 text-center text-muted text-xs sm:text-sm">
                  {searchQuery ? 'No students match your search query.' : 'No student records in this session.'}
                </div>
              ) : (
                filteredRecords.map((record) => {
                  const status = record.status;

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-thistle bg-white shadow-sm hover:border-hot-pink/30 transition-all gap-3"
                    >
                      {/* Left: Avatar, Name, PRN */}
                      <div className="flex items-center gap-3 min-w-0">
                        <StudentAvatar name={record.student.name} />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-ink uppercase tracking-tight text-xs sm:text-sm truncate">
                            {record.student.name}
                          </span>
                          <span className="text-[11px] sm:text-xs font-plex-mono text-muted">
                            {record.student.rollNo}
                          </span>
                        </div>
                      </div>

                      {/* Right: Current Badge + State Change Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Icon Badge */}
                        {status === 'absent' && (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
                            A
                          </div>
                        )}
                        {status === 'present' && (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
                            P
                          </div>
                        )}
                        {status === 'late' && (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
                            L
                          </div>
                        )}

                        {/* Action Buttons to Change Status */}
                        {status === 'absent' ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStudentStatus(record.student.id, 'present')}
                              className="bg-[#16A34A] hover:bg-[#16A34A]/90 text-white rounded-full h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-medium"
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStudentStatus(record.student.id, 'late')}
                              className="border-amber-500 text-amber-600 hover:bg-amber-50 rounded-full h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium"
                            >
                              Late
                            </Button>
                          </div>
                        ) : status === 'present' ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStudentStatus(record.student.id, 'late')}
                              className="border-amber-500 text-amber-600 hover:bg-amber-50 rounded-full h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium"
                            >
                              Late
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStudentStatus(record.student.id, 'absent')}
                              className="border-red-400 text-red-500 hover:bg-red-50 rounded-full h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-medium"
                            >
                              Absent
                            </Button>
                          </div>
                        ) : (
                          // status === 'late'
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStudentStatus(record.student.id, 'present')}
                              className="bg-[#16A34A] hover:bg-[#16A34A]/90 text-white rounded-full h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-medium"
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStudentStatus(record.student.id, 'absent')}
                              className="border-red-400 text-red-500 hover:bg-red-50 rounded-full h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-medium"
                            >
                              Absent
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-thistle bg-canvas/30 flex items-center justify-between shrink-0">
              <span className="text-xs text-muted">
                Strength: <strong className="text-ink">{modalStats.pct}%</strong> ({modalStats.attended}/{modalStats.total})
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingSession(null)}
                  disabled={isSaving}
                  className="rounded-full text-ink border-thistle text-xs h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAttendance}
                  disabled={isSaving}
                  className="bg-hot-pink hover:bg-hot-pink/90 text-white rounded-full text-xs font-semibold h-9 px-5 flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Attendance</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
