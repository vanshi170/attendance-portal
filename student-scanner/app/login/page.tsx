'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentStore } from '../../lib/store';
import { toast } from 'sonner';
import { ShieldCheck, GraduationCap, Lock, Mail, User, Hash, School } from 'lucide-react';

export default function StudentLoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const setAuth = useStudentStore((s) => s.setAuth);

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [section, setSection] = useState('A');
  const [registerPassword, setRegisterPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setAuth(data.student, data.token);
      toast.success('Logged in successfully!');

      // If student hasn't captured their passport photo yet, direct them to photo page
      if (!data.student.photoUrl) {
        toast.info('Please set your mandatory passport profile photo.');
        router.push(`/register-photo?rollNo=${data.student.rollNo}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error('Login Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    if (!/^\d{11}$/.test(rollNo.trim())) {
      toast.error('Invalid PRN', { description: 'PRN must be an exact 11-digit roll number.' });
      return;
    }

    if (!email.trim().toLowerCase().endsWith('@sitnagpur.siu.edu.in')) {
      toast.error('Invalid Email Domain', {
        description: 'You must use your college email ending in @sitnagpur.siu.edu.in',
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          rollNo: rollNo.trim(),
          email: email.trim().toLowerCase(),
          section,
          password: registerPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setAuth(data.student, data.token);
      toast.success('Account created! Now take your passport profile photo.');

      // Proceed immediately to photo capture page
      router.push(`/register-photo?rollNo=${data.student.rollNo}`);
    } catch (err: any) {
      toast.error('Registration Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-mobile bg-[#f0f7ff] flex flex-col justify-between items-center p-4 sm:p-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 border border-sky-300/80 flex items-center justify-center text-sky-600 shadow-sm mb-3">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-sora font-extrabold text-slate-900 tracking-tight">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xs">
          Symbiosis Institute of Technology, Nagpur · Student Portal
        </p>
      </div>

      {/* Main Glassmorphic Card (Pastel Blue Theme) */}
      <div className="w-full max-w-md bg-white/85 backdrop-blur-xl border border-sky-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-sky-100/50">
        <div className="text-center mb-6">
          <h2 className="text-lg font-sora font-bold text-slate-800">
            {isLogin ? 'Student Sign In' : 'Student Registration'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLogin
              ? 'Enter your PRN or official college email to access scanner'
              : 'Register with your 11-digit PRN and @sitnagpur.siu.edu.in email'}
          </p>
        </div>

        {isLogin ? (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">PRN or College Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-sky-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="25070521001 or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-12 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-sky-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-12 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white font-semibold rounded-full h-12 text-sm shadow-md shadow-sky-300/40 transition-all mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In to Portal'}
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 ml-1">First Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Arushi"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-11 pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 ml-1">Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="Varghese"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-11 px-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">11-Digit PRN (Roll Number)</label>
              <div className="relative">
                <Hash className="w-4 h-4 text-sky-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={11}
                  placeholder="25070521001"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-11 pl-11 pr-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">College Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-sky-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name.student@sitnagpur.siu.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-11 pl-11 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <p className="text-[10px] text-sky-600 ml-2">Must end with @sitnagpur.siu.edu.in</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 ml-1">Section</label>
                <div className="relative">
                  <School className="w-3.5 h-3.5 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full bg-[#f8fbff] text-slate-900 border border-sky-200 rounded-full h-11 pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
                  >
                    {['A', 'B', 'C', 'D', 'E'].map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 ml-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min 6 chars"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-11 px-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white font-semibold rounded-full h-12 text-sm shadow-md shadow-sky-300/40 transition-all mt-3"
            >
              {loading ? 'Creating Account...' : 'Continue to Photo Capture →'}
            </button>
          </form>
        )}

        {/* Toggle Switch */}
        <div className="mt-6 text-center border-t border-sky-100 pt-4">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs sm:text-sm text-slate-500 hover:text-sky-600 font-medium transition-colors"
          >
            {isLogin ? (
              <span>
                New student? <strong className="text-sky-600 underline">Register here</strong>
              </span>
            ) : (
              <span>
                Already registered? <strong className="text-sky-600 underline">Sign In</strong>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="py-4 text-center">
        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
          Encrypted Zero-Trust Verification Framework
        </p>
      </div>
    </div>
  );
}
