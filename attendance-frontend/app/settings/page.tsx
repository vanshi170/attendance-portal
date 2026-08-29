'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { teacher, updateTeacher } = useAuthStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teacher) {
      setName(teacher.name || '');
      setEmail(teacher.email || '');
      setProfilePic(teacher.profilePic || '');
    }
  }, [teacher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload: any = { name, email, profilePic };

    try {
      const data = await fetchApi('/auth/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      updateTeacher(data.teacher);
      toast.success('Settings updated successfully');
    } catch (err: any) {
      toast.error('Failed to update settings', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas p-4 sm:p-8">
      <div className="max-w-xl mx-auto space-y-8">
        <h1 className="text-3xl font-sora font-bold text-ink">Account Settings</h1>

        <Card className="bg-white/80 backdrop-blur-xl border border-thistle shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-sora text-ink">Profile Details</CardTitle>
            <CardDescription className="text-muted">Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-thistle overflow-hidden border-2 border-hot-pink flex items-center justify-center shrink-0">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-ink">{name?.charAt(0)?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-ink px-2">Profile Image URL</label>
                  <Input 
                    placeholder="https://example.com/avatar.jpg" 
                    value={profilePic} 
                    onChange={(e) => setProfilePic(e.target.value)} 
                    className="bg-canvas text-ink border border-thistle rounded-full focus-visible:ring-hot-pink h-12 px-6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink px-2">Full Name</label>
                <Input 
                  placeholder="Full Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="bg-canvas text-ink border border-thistle rounded-full focus-visible:ring-hot-pink h-12 px-6"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink px-2">Email Address</label>
                <Input 
                  type="email"
                  placeholder="Email Address" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="bg-canvas text-ink border border-thistle rounded-full focus-visible:ring-hot-pink h-12 px-6"
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-full h-12 bg-hot-pink hover:bg-hot-pink/90 text-white font-medium mt-4"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
