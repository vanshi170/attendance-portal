'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentStore } from '../../lib/store';
import { toast } from 'sonner';
import { ShieldCheck, GraduationCap, Lock, Mail, User, Hash, School, ArrowRight } from 'lucide-react';

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
      router.push(`/register-photo?rollNo=${data.student.rollNo}`);
    } catch (err: any) {
      toast.error('Registration Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f7ff] grid grid-rows-[auto_1fr_auto] sm:grid-rows-[1fr_auto_1fr] items-center justify-items-center p-4 sm:p-6 relative z-10">
      {/* Top Welcome Heading matching Teacher Portal */}
      <div className="flex flex-col items-center justify-center py-6 sm:py-0 w-full text-center">
        <div className="w-13 h-13 rounded-2xl bg-sky-100/90 border border-sky-200 flex items-center justify-center text-sky-600 shadow-sm mb-2.5">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-sora font-extrabold text-slate-900 tracking-tight animate-breathe">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-sm">
          Symbiosis Institute of Technology, Nagpur · Student Portal
        </p>
      </div>

      {/* Main Glassmorphic Card (Pastel Blue Theme) */}
      <div className="w-full max-w-md bg-white/85 backdrop-blur-xl border border-sky-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-sky-100/60 my-2">
        <div className="text-center mb-5">
          <h2 className="text-lg font-sora font-bold text-slate-900">
            {isLogin ? 'Student Sign In' : 'Student Registration'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLogin
              ? 'Enter your PRN or college email to access QR scanner'
              : 'Register with 11-digit PRN & @sitnagpur.siu.edu.in email'}
          </p>
        </div>

        {isLogin ? (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
            <div className="space-y-1.5">
              <label htmlFor="student-identifier" className="text-xs font-semibold text-slate-700 ml-1">PRN or College Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-sky-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-identifier"
                  name="username"
                  type="text"
                  required
                  autoComplete="username email"
                  placeholder="25070521001 or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-12 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="student-password" className="text-xs font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-sky-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
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
              className="w-full bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-[0.99] text-white font-sora font-semibold rounded-full h-12 text-sm shadow-md shadow-sky-300/40 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-3.5" autoComplete="on">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 ml-1">First Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="given-name"
                    autoComplete="given-name"
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
                  name="family-name"
                  autoComplete="family-name"
                  required
                  placeholder="Varghese"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-11 px-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">PRN (11 Digits)</label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  name="username"
                  required
                  maxLength={11}
                  placeholder="25070521001"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-11 pl-9 pr-3 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">College Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="firstname.lastname.btech2025@sitnagpur.siu.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-11 pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">Class Section</label>
              <div className="relative">
                <School className="w-3.5 h-3.5 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 border border-sky-200 rounded-full h-11 pl-9 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                  <option value="E">Section E</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">Create Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full bg-[#f8fbff] text-slate-900 placeholder:text-slate-400 border border-sky-200 rounded-full h-11 pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-[0.99] text-white font-sora font-semibold rounded-full h-12 text-sm shadow-md shadow-sky-300/40 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Next: Take Passport Photo</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Toggle Login / Register */}
        <div className="text-center mt-5 pt-4 border-t border-sky-100">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-sky-600 hover:text-sky-800 font-semibold transition-colors"
          >
            {isLogin ? (
              <span>
                New student? <strong className="underline">Register here</strong>
              </span>
            ) : (
              <span>
                Already registered? <strong className="underline">Sign in</strong>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="py-4 text-center">
        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
          Encrypted Zero-Trust Verification Framework · Symbiosis Nagpur
        </p>
      </div>
    </div>
  );
}
