'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash2, Pen, Clock } from 'lucide-react';

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
}

const DAYS = [
  { id: 1, name: 'MON' },
  { id: 2, name: 'TUE' },
  { id: 3, name: 'WED' },
  { id: 4, name: 'THU' },
  { id: 5, name: 'FRI' },
  { id: 6, name: 'SAT' }
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
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formDay, setFormDay] = useState(1);
  const [formSubject, setFormSubject] = useState('');
  const [formClassroom, setFormClassroom] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formTemp, setFormTemp] = useState(false);
  
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
      if (cls.length > 0 && !formClassroom) {
        // Keep empty for placeholder
      }
      if (teacherSubjects.length > 0 && !formSubject) {
        // Keep formSubject empty initially to show 'Select Subject'
      }
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
      // We could call loadData() here, but optimistic UI is enough
    } catch (err: any) {
      toast.error('Error deleting lecture', { description: err.message });
      setLectures(previousLectures); // Rollback
    }
  };

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
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
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
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-col gap-3 mt-4">
                {dayLectures.map(lec => (
                  <div key={lec.id} className="bg-white/80 backdrop-blur-sm border border-thistle rounded-2xl p-4 shadow-sm relative group">
                    {lec.isTemporary && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        TEMP
                      </div>
                    )}
                    <h3 className="font-bold text-ink text-sm leading-tight mb-1">{lec.subject}</h3>
                    <p className="text-xs text-muted mb-3">{lec.classroom?.code}</p>
                    <div className="flex items-center gap-1 text-xs font-plex-mono text-hot-pink mb-4">
                      <Clock className="w-3 h-3" />
                      {lec.startTime}
                    </div>
                    
                    <div className="flex justify-between mt-auto pt-2 border-t border-thistle/50">
                      <button 
                        onClick={() => handleDelete(lec.id)}
                        className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEditModal(lec)}
                        className="p-1.5 text-muted hover:text-hot-pink hover:bg-hot-pink/10 rounded-lg transition-colors"
                      >
                        <Pen className="w-4 h-4" />
                      </button>
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
    </div>
  );
}
