'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';

interface Classroom {
  id: string;
  code: string;
}

interface Lecture {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  classroom: Classroom;
}

export default function DashboardPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const router = useRouter();
  const { teacher, logout } = useAuthStore();

  useEffect(() => {
    const loadLectures = async () => {
      try {
        const data = await fetchApi('/lectures/today');
        setLectures(data);
        if (data.length > 0) {
          setSelectedLectureId(data[0].id);
        }
      } catch (err: any) {
        toast.error('Failed to load lectures', { description: err.message });
      } finally {
        setLoading(false);
      }
    };
    loadLectures();
  }, []);

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
      if (err.message.includes('already active')) {
        // Just find the active session if we can't create one. But for this demo we just redirect or show error.
        toast.error('Session failed', { description: err.message });
      } else {
        toast.error('Failed to start session', { description: err.message });
      }
      setStarting(false);
    }
  };

  const selectedLecture = lectures.find((l) => l.id === selectedLectureId);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-hot-pink border-r-transparent border-b-thistle border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas p-4 sm:p-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-sora font-semibold text-ink">Welcome, {teacher?.name?.split(' ')[0]}</h1>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border border-thistle shadow-xl text-ink">
          <CardHeader>
            <CardTitle className="text-xl font-sora">Today's Lectures</CardTitle>
            <CardDescription className="text-muted">Select a lecture to start taking attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {lectures.length === 0 ? (
              <div className="bg-canvas rounded-xl p-6 text-center border border-thistle">
                <p className="text-ink font-medium">No lectures scheduled for today.</p>
                <p className="text-muted text-sm mt-1">Check back before your next class.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink">Select Lecture</label>
                  <select
                    className="w-full bg-canvas text-ink border border-thistle rounded-full h-12 px-4 focus:ring-2 focus:ring-hot-pink outline-none appearance-none cursor-pointer"
                    value={selectedLectureId}
                    onChange={(e) => setSelectedLectureId(e.target.value)}
                  >
                    {lectures.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.subject} · {l.startTime} - {l.endTime}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink">Select Section</label>
                  <select
                    className="w-full bg-canvas text-ink border border-thistle rounded-full h-12 px-4 focus:ring-2 focus:ring-hot-pink outline-none appearance-none cursor-pointer"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                  >
                    {['A', 'B', 'C', 'D', 'E'].map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>

                {selectedLecture && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Classroom</label>
                    <div className="w-full bg-canvas text-ink border border-thistle rounded-full h-12 px-4 flex items-center cursor-not-allowed">
                      {selectedLecture.classroom.code}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleStartAttendance}
                  disabled={starting}
                  className="w-full bg-hot-pink hover:bg-hot-pink/90 text-white rounded-full h-12 font-medium mt-4"
                >
                  {starting ? 'Starting...' : 'Start Attendance'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
