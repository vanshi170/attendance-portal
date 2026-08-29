'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '../../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { toast } from 'sonner';

export default function SummaryPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await fetchApi(`/sessions/${sessionId}`);
        setSession(data);
      } catch (err) {
        toast.error('Failed to load session summary');
      }
    };
    loadSession();
  }, [sessionId]);

  if (!session) {
    return <div className="min-h-screen bg-canvas" />;
  }

  const { presentCount = 0, totalCount = 0, strengthPct = 0, records = [] } = session;

  const presentStudents = records
    .filter((r: any) => r.status === 'present' || r.status === 'late')
    .sort((a: any, b: any) => a.student.rollNo.localeCompare(b.student.rollNo));
    
  const absentStudents = records
    .filter((r: any) => r.status === 'absent')
    .sort((a: any, b: any) => a.student.rollNo.localeCompare(b.student.rollNo));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fdf2f6] pt-10 sm:pt-10 p-4 sm:p-8">
      {/* 
        NOTE TO USER: 
        To move the box up or down more, change the 'pt-12 sm:pt-16' in the line above. 
        'pt-12' means padding-top of 3rem (48px) on mobile. 
        'sm:pt-16' means padding-top of 4rem (64px) on screens larger than mobile.
        You can reduce them to e.g. 'pt-4 sm:pt-8' to push it higher up, 
        or increase them to 'pt-24 sm:pt-32' to push it lower.
      */}
      <div className="flex justify-center mb-12">
        <Card className="w-full max-w-sm bg-white/80 backdrop-blur-xl border border-thistle shadow-xl text-center text-ink">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-sora tracking-tight">
            Attendance is Closed
          </CardTitle>
          <CardDescription className="text-muted text-sm">
            Session has been finalized
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/50 backdrop-blur-sm border border-thistle p-4 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-4xl font-bold font-plex-mono text-ink mb-1">{presentCount}</span>
              <span className="text-sm text-muted font-medium uppercase tracking-wider">Present</span>
            </div>
            <div className="bg-white/50 backdrop-blur-sm border border-thistle p-4 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-4xl font-bold font-plex-mono text-ink mb-1">{totalCount - presentCount}</span>
              <span className="text-sm text-muted font-medium uppercase tracking-wider">Absent</span>
            </div>
          </div>
          
          <div className="bg-white/50 rounded-2xl p-6 backdrop-blur-sm border border-thistle">
            <div className="text-sm font-medium text-muted uppercase tracking-wider mb-2">
              Today's Strength
            </div>
            <div className="text-3xl font-plex-mono font-bold text-hot-pink">
              {strengthPct.toFixed(2)}%
            </div>
          </div>

          <Button 
            onClick={() => router.push('/dashboard')}
            className="w-full bg-hot-pink text-white hover:bg-hot-pink/90 rounded-full h-10 font-medium"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Present Students Table */}
        <div className="bg-white/80 backdrop-blur-sm border border-thistle rounded-2xl p-4 shadow-sm flex flex-col h-[500px]">
          <h3 className="font-bold text-ink mb-4 border-b border-thistle pb-2 flex items-center justify-between">
            <span>Present Students</span>
            <span className="bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded-full text-xs font-semibold">{presentCount}</span>
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {presentStudents.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white shadow-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-ink text-sm">{r.student.name}</span>
                  <span className="text-xs font-plex-mono text-muted">{r.student.rollNo}</span>
                </div>
                <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs shrink-0">
                  P
                </div>
              </div>
            ))}
            {presentStudents.length === 0 && (
              <div className="text-center text-muted text-sm mt-4">No students marked present.</div>
            )}
          </div>
        </div>

        {/* Absent Students Table */}
        <div className="bg-white/80 backdrop-blur-sm border border-thistle rounded-2xl p-4 shadow-sm flex flex-col h-[500px]">
          <h3 className="font-bold text-ink mb-4 border-b border-thistle pb-2 flex items-center justify-between">
            <span>Absent Students</span>
            <span className="bg-[#DC2626]/10 text-[#DC2626] px-2 py-0.5 rounded-full text-xs font-semibold">{totalCount - presentCount}</span>
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {absentStudents.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white shadow-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-ink text-sm">{r.student.name}</span>
                  <span className="text-xs font-plex-mono text-muted">{r.student.rollNo}</span>
                </div>
                <div className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                  A
                </div>
              </div>
            ))}
            {absentStudents.length === 0 && (
              <div className="text-center text-muted text-sm mt-4">No students marked absent.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
