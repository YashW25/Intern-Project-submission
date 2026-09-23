'use client';

import React, { useState } from 'react';
import { User } from '@/types';
import { Lock, Mail, ShieldCheck, UserCheck, Loader2, AlertCircle, ArrowRight, Database } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailOrId.trim() || !password.trim()) {
      setError('Please fill in both Email/ID and Password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId, password }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      console.error('Login request error:', err);
      setError('Network error. Unable to connect to authentication service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-indigo-600/40 text-white font-extrabold text-3xl mx-auto border border-indigo-400/30 relative">
            P
            <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-600 to-cyan-400 rounded-2xl blur opacity-30 -z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              PeopleOS <span className="text-indigo-400">Portal</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Internship Project Submission & Certificate Hub
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/8 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/8 rounded-full blur-2xl pointer-events-none" />

          {/* Info Banner */}
          <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 flex items-start gap-3">
            <Database className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-300">Sign in with your account credentials</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Use the email address and password assigned to you by your program administrator.
                Your dashboard and role are determined automatically by your account.
              </p>
            </div>
          </div>

          {/* Role Hints */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2.5 bg-indigo-950/30 border border-indigo-800/40 rounded-xl">
              <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-indigo-300">Intern / Employee</p>
                <p className="text-[9px] text-slate-500">Intern Dashboard Access</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-amber-300">Admin / Manager</p>
                <p className="text-[9px] text-slate-500">Admin Console Access</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address / User ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  id="login-email"
                  type="text"
                  required
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  placeholder="your.email@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-600">
          Contact your program administrator if you need access credentials.
        </p>
      </div>
    </div>
  );
};
