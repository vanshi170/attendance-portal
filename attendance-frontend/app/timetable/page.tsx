'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash2, Pen, Clock, Check, UserCheck, X, Search, Users } from 'lucide-react';
import { StudentAvatar } from '../../components/StudentAvatar';

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
  isTemporary: boolean;
  classroomId: string;
  classroom?: Classroom;
  hasAttendance?: boolean;
  latestSessionId?: string | null;
  latestSessionStatus?: string | null;
}

const DAYS = [
  { id: 1, name: 'MON' },
  { id: 2, name: 'TUE' },
  { id: 3, name: 'WED' },
  { id: 4, name: 'THU' },
  { id: 5, name: 'FRI' },
  { id: 6, name: 'SAT' },
  { id: 0, name: 'SUN' }
];

const AVAILABLE_SUBJECTS = [
  "Microcontroller & Sensors",
  "Computer Organization",
  "Discrete Mathematics & Graph Theory",
  "Design Analysis & Algorithms",
  "Project Based Leaning",
  "Design Analysis & Algorithms Lab",
  "Microcontroller & Sensors Lab",
  "Introduction to Cyber Security",
  "Machine Learning Fundamentals",
  "Aptitude & Reasoning",
  "Flexi Credit",
  "Entreprenurship Ventures",
  "Group Discussion",
  "Mentor Mentee",
  "SEC Technical"
];

export default function TimetablePage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create / Edit Lecture Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formDay, setFormDay] = useState(1);
  const [formSubject, setFormSubject] = useState('');
  const [formClassroom, setFormClassroom] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formTemp, setFormTemp] = useState(false);

  // Edit Attendance Modal State
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [activeLectureForAttendance, setActiveLectureForAttendance] = useState<Lecture | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<any | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();
  const { teacher } = useAuthStore();
  
  const teacherSubjects = teacher?.subjects?.length ? teacher.subjects : AVAILABLE_SUBJECTS;

  const loadData = async () => {
    try {
      setLoading(true);
      const [cls, lecs] = await Promise.all([
        fetchApi('/classrooms'),
        fetchApi('/lectures')
      ]);
      setClassrooms(cls);
      setLectures(lecs);
    } catch (err: any) {
      toast.error('Failed to load data', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = (day: number) => {
    setEditingId(null);
    setFormDay(day);
    setFormSubject('');
    setFormClassroom('');
    setFormStart('09:00');
    setFormEnd('10:00');
    setFormTemp(false);
    setModalOpen(true);
  };

  const openEditModal = (lec: Lecture) => {
    setEditingId(lec.id);
    setFormDay(lec.dayOfWeek);
    setFormSubject(lec.subject);
    setFormClassroom(lec.classroomId);
    
    // Convert "09:00 AM" to "09:00" for input type="time"
    const parseTime = (t: string) => {
      const match = t.match(/(\d+):(\d+) (AM|PM)/i);
      if (!match) return '09:00';
      let [_, h, m, ampm] = match;
      let hour = parseInt(h);
      if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${m}`;
    };
    
    setFormStart(parseTime(lec.startTime));
    setFormEnd(parseTime(lec.endTime));
    setFormTemp(lec.isTemporary);
    setModalOpen(true);
  };

  const formatTime = (time24: string) => {
    const [h, m] = time24.split(':');
    let hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject || !formClassroom || !formStart || !formEnd) {
      toast.error('Please fill all fields');
      return;
    }
    
    const payload = {
      subject: formSubject,
      classroomId: formClassroom,
      startTime: formatTime(formStart),
      endTime: formatTime(formEnd),
      dayOfWeek: formDay,
      isTemporary: formTemp
    };

    const previousLectures = [...lectures];
    const optimisticLecture: Lecture = {
      id: editingId || `temp-${Date.now()}`,
      ...payload,
      classroom: classrooms.find(c => c.id === formClassroom)
    };

    if (editingId) {
      setLectures(prev => prev.map(l => l.id === editingId ? optimisticLecture : l));
    } else {
      setLectures(prev => [...prev, optimisticLecture]);
    }
    setModalOpen(false);
    
    try {
      if (editingId) {
        await fetchApi(`/lectures/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/lectures', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      loadData();
    } catch (err: any) {
      toast.error('Error saving lecture', { description: err.message });
      setLectures(previousLectures); // Rollback on error
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lecture?')) return;
    const previousLectures = [...lectures];
    setLectures(prev => prev.filter(l => l.id !== id));
    try {
      await fetchApi(`/lectures/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      toast.error('Error deleting lecture', { description: err.message });
      setLectures(previousLectures); // Rollback
    }
  };

  // Open Edit Attendance Modal for a lecture
  const openEditAttendance = async (lec: Lecture) => {
    setActiveLectureForAttendance(lec);
    setAttendanceModalOpen(true);
    setAttendanceLoading(true);
    setSearchQuery('');
    try {
      const session = await fetchApi(`/sessions/lecture/${lec.id}/latest`);
      setAttendanceSession(session);
      setAttendanceRecords(session.records || []);
    } catch (err: any) {
      toast.error('Failed to load attendance records', { description: err.message });
      setAttendanceModalOpen(false);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Toggle student status between present and absent
  const handleToggleStatus = async (studentId: string, currentStatus: string) => {
    if (!attendanceSession) return;
    const newStatus = (currentStatus === 'present' || currentStatus === 'late') ? 'absent' : 'present';

    // Optimistically update records
    setAttendanceRecords(prev =>
      prev.map(r => r.student.id === studentId ? { ...r, status: newStatus } : r)
    );

    try {
      await fetchApi(`/sessions/${attendanceSession.id}/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      toast.success(`Updated to ${newStatus}`);
    } catch (err: any) {
      toast.error('Failed to update status', { description: err.message });
      // Revert on error
      setAttendanceRecords(prev =>
        prev.map(r => r.student.id === studentId ? { ...r, status: currentStatus } : r)
      );
    }
  };

  const filteredAttendanceRecords = useMemo(() => {
    if (!searchQuery.trim()) return attendanceRecords;
    const q = searchQuery.toLowerCase();
    return attendanceRecords.filter(
      r => r.student.name.toLowerCase().includes(q) || r.student.rollNo.toLowerCase().includes(q)
    );
  }, [attendanceRecords, searchQuery]);

  const presentCount = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const totalCount = attendanceRecords.length;

  if (loading && lectures.length === 0) {
    return (
      <div className="min-h-screen bg-[#fdf2f6] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-hot-pink border-r-transparent border-b-thistle border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fdf2f6] p-4 sm:p-8 relative">
      <h1 className="text-3xl md:text-5xl font-sora font-bold text-center text-ink mb-12">
        Create Lecture
      </h1>
      
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-5">
        {DAYS.map((day) => {
          const dayLectures = lectures.filter(l => l.dayOfWeek === day.id);
          
          return (
            <div key={day.id} className="flex flex-col gap-4">
              <div className="text-center font-sora font-bold text-ink tracking-widest uppercase border-b-2 border-hot-pink/30 pb-2 mx-4">
                {day.name}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => openAddModal(day.id)}
                  className="w-16 h-10 bg-hot-pink hover:bg-hot-pink/90 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105"
                  title="Add Lecture"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-col gap-3 mt-4">
                {dayLectures.map(lec => (
                  <div key={lec.id} className="bg-white/80 backdrop-blur-sm border border-thistle rounded-2xl p-4 shadow-sm relative group flex flex-col">
                    {lec.isTemporary && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        TEMP
                      </div>
                    )}
                    <h3 className="font-bold text-ink text-sm leading-tight mb-1">{lec.subject}</h3>
                    <p className="text-xs text-muted mb-2">{lec.classroom?.code}</p>
                    
                    {/* Time Window */}
                    <div className="flex items-center gap-1.5 text-xs font-plex-mono text-hot-pink mb-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{lec.startTime} – {lec.endTime}</span>
                    </div>

                    {/* Attendance Taken Indicator: Green tick only (no circle, no emoji) */}
                    {lec.hasAttendance && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] mb-3">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Attendance Done</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-thistle/50">
                      <button 
                        onClick={() => handleDelete(lec.id)}
                        className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Lecture"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1">
                        {/* Edit Attendance Button: Appears only after attendance has been taken */}
                        {lec.hasAttendance && (
                          <button 
                            onClick={() => openEditAttendance(lec)}
                            className="p-1.5 text-[#16A34A] hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1 font-medium text-xs"
                            title="Edit Attendance"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(lec)}
                          className="p-1.5 text-muted hover:text-hot-pink hover:bg-hot-pink/10 rounded-lg transition-colors"
                          title="Edit Lecture"
                        >
                          <Pen className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-8 right-8">
        <Button
          onClick={() => router.push('/dashboard')}
          className="bg-ink hover:bg-ink/90 text-white rounded-full px-8 h-14 text-lg font-sora shadow-xl"
        >
          Next
        </Button>
      </div>

      {/* Edit Lecture Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border border-thistle">
            <h2 className="text-2xl font-sora font-bold text-ink mb-6">
              {editingId ? 'Edit Lecture' : 'New Lecture'} for {DAYS.find(d => d.id === formDay)?.name}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink">Choose Subject</label>
                <select
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full bg-canvas text-ink border border-thistle rounded-xl h-12 px-4 focus:ring-2 focus:ring-hot-pink outline-none cursor-pointer"
                >
                  <option value="" disabled>Select Subject</option>
                  {teacherSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink">Select Classroom</label>
                <select
                  required
                  value={formClassroom}
                  onChange={(e) => setFormClassroom(e.target.value)}
                  className="w-full bg-canvas text-ink border border-thistle rounded-xl h-12 px-4 focus:ring-2 focus:ring-hot-pink outline-none cursor-pointer"
                >
                  <option value="" disabled>Select Classroom</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full bg-canvas text-ink border border-thistle rounded-xl h-12 px-4 focus:ring-2 focus:ring-hot-pink outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink">End Time</label>
                  <input
                    type="time"
                    required
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full bg-canvas text-ink border border-thistle rounded-xl h-12 px-4 focus:ring-2 focus:ring-hot-pink outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTemp}
                    onChange={(e) => setFormTemp(e.target.checked)}
                    className="w-5 h-5 rounded border-thistle text-hot-pink focus:ring-hot-pink"
                  />
                  <span className="text-sm font-medium text-ink">Create this as a temporary lecture</span>
                </label>
              </div>

              <div className="pt-6 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 rounded-full h-12">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-hot-pink hover:bg-hot-pink/90 text-white rounded-full h-12">
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal (matches right panel of session page) */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-thistle overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-thistle flex items-center justify-between bg-canvas/30 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-sora font-bold text-ink">
                    {activeLectureForAttendance?.subject}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                    {activeLectureForAttendance?.classroom?.code || 'CL'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted font-plex-mono">
                  <span>{activeLectureForAttendance?.startTime} – {activeLectureForAttendance?.endTime}</span>
                  {attendanceSession?.section && (
                    <span className="px-2 py-0.5 rounded bg-hot-pink/10 text-hot-pink font-semibold">
                      Section {attendanceSession.section}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="px-3.5 py-1.5 bg-white border border-thistle rounded-full text-sm font-medium shadow-sm">
                  <span className="text-hot-pink font-plex-mono font-bold">{presentCount}</span>
                  <span className="text-muted mx-1">/</span>
                  <span className="text-ink font-plex-mono font-bold">{totalCount}</span>
                  <span className="text-xs text-muted ml-1.5">Present</span>
                </div>
                <button
                  onClick={() => setAttendanceModalOpen(false)}
                  className="p-2 text-muted hover:text-ink rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-3 border-b border-thistle/60 bg-white shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-canvas border border-thistle focus:ring-2 focus:ring-hot-pink outline-none"
                />
              </div>
            </div>

            {/* Students Roster (Same interface as attendance session right window) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
              {attendanceLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-4 border-t-hot-pink border-r-transparent border-b-thistle border-l-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-muted mt-3">Loading student records...</p>
                </div>
              ) : filteredAttendanceRecords.length === 0 ? (
                <div className="py-12 text-center text-muted text-sm">
                  {searchQuery ? 'No students found matching your search.' : 'No student records found.'}
                </div>
              ) : (
                filteredAttendanceRecords.map((record) => {
                  const isPresent = record.status === 'present' || record.status === 'late';
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-thistle bg-white shadow-sm hover:border-hot-pink/30 transition-all"
                    >
                      {/* Left: Student Avatar Box (Image 2 style) + Name & PRN */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <StudentAvatar name={record.student.name} />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-ink uppercase tracking-tight text-sm sm:text-base truncate">
                            {record.student.name}
                          </span>
                          <span className="text-xs sm:text-sm font-plex-mono text-muted">
                            {record.student.rollNo}
                          </span>
                        </div>
                      </div>

                      {/* Right: Status Badge & Toggle Action */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {!isPresent ? (
                          <>
                            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-base shrink-0">
                              A
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleToggleStatus(record.student.id, record.status)}
                              className="bg-[#16A34A] hover:bg-[#16A34A]/90 text-white rounded-full h-8 px-3.5 text-xs font-medium"
                            >
                              Mark Present
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-bold text-base shrink-0">
                              P
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(record.student.id, record.status)}
                              className="border-red-400 text-red-500 hover:bg-red-50 rounded-full h-8 px-3.5 text-xs font-medium"
                            >
                              Mark Absent
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-thistle bg-canvas/30 flex justify-end shrink-0">
              <Button
                onClick={() => setAttendanceModalOpen(false)}
                className="bg-ink hover:bg-ink/90 text-white rounded-full px-6 h-10 text-sm font-medium"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
