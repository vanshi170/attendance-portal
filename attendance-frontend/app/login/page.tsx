'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);

  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  // Pre-warm backend and prefetch dashboard routes on mount
  useEffect(() => {
    // Fire an immediate non-blocking health check to wake up cloud server (Render)
    fetchApi('/health').catch(() => {});
    
    // Prefetch destination routes for instantaneous transition
    router.prefetch('/dashboard');
    router.prefetch('/timetable');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setWakingUp(false);

    // If server takes longer than 3 seconds (cold start), inform the user
    const wakeTimer = setTimeout(() => {
      setWakingUp(true);
    }, 3000);

    try {
      if (isLogin) {
        const data = await fetchApi('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password })
        });
        clearTimeout(wakeTimer);
        setAuth(data.teacher, data.token);
        toast.success('Logged in successfully');
        router.push('/dashboard');
      } else {
        const data = await fetchApi('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
        });
        clearTimeout(wakeTimer);
        localStorage.setItem('isNewUser', 'true');
        setAuth(data.teacher, data.token);
        toast.success('Registration successful. Welcome!');
        // Instantly navigate to timetable (or dashboard) without hanging
        router.push('/timetable');
      }
    } catch (err: any) {
      clearTimeout(wakeTimer);
      toast.error(isLogin ? 'Login Failed' : 'Registration Failed', {
        description: err.message || 'Please check your credentials.'
      });
    } finally {
      clearTimeout(wakeTimer);
      setLoading(false);
      setWakingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf2f6] grid grid-rows-[1fr_auto_1fr] items-center justify-items-center p-4">
      <div className="flex items-center justify-center h-full w-full">
        {isLogin && (
          <h1 className="text-4xl md:text-5xl font-sora font-bold text-ink animate-breathe">
            Welcome
          </h1>
        )}
      </div>
      
      <Card className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-thistle shadow-xl text-ink">
        <CardHeader className="space-y-1 text-center">
          {!isLogin && (
            <CardTitle className="text-2xl font-sora tracking-tight">
              Create an account
            </CardTitle>
          )}
          <CardDescription className="text-muted">
            {isLogin ? 'Enter your credentials to access your dashboard' : 'Enter your details to create your teacher account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {!isLogin && (
              <div className="space-y-2">
                <Input 
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Full Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  autoComplete="name"
                  className="bg-canvas text-ink border border-thistle rounded-full focus-visible:ring-hot-pink h-12 px-6"
                />
              </div>
            )}
            <div className="space-y-2">
              <Input 
                id="email"
                name="email"
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                autoComplete="email username"
                className="bg-canvas text-ink border border-thistle rounded-full focus-visible:ring-hot-pink h-12 px-6"
              />
            </div>
            <div className="space-y-2">
              <Input 
                id="password"
                name="password"
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="bg-canvas text-ink border border-thistle rounded-full focus-visible:ring-hot-pink h-12 px-6"
              />
            </div>

            {wakingUp && (
              <div className="text-center text-xs text-hot-pink font-medium animate-pulse py-1">
                Waking up cloud backend... Ready in a moment.
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-full h-12 bg-hot-pink hover:bg-hot-pink/90 text-white font-medium text-lg mt-2 shadow-md transition-transform hover:scale-[1.01]"
            >
              {loading ? (wakingUp ? 'Waking server...' : 'Please wait...') : (isLogin ? 'Log In' : 'Register')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button 
              type="button" 
              onClick={() => {
                setIsLogin(!isLogin);
                setWakingUp(false);
              }}
              className="text-muted hover:text-ink hover:no-underline font-medium text-sm"
            >
              {isLogin ? "Don't have an account? Register" : "Already have an account? Log In"}
            </button>
          </div>
        </CardContent>
      </Card>
      
      <div className="w-full h-full"></div>
    </div>
  );
}
