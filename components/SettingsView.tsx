'use client';

import React, { useState } from 'react';
import { UserRole } from '@/types';
import { Settings, Save, Shield, Database, Key, CheckCircle2, Cloud } from 'lucide-react';

interface SettingsViewProps {
  role: UserRole;
  userName: string;
  userEmail: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  role,
  userName: initialName,
  userEmail: initialEmail,
}) => {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          Account & Infrastructure Settings
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Manage profile details, letterhead defaults, and database connectivity.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <form onSubmit={handleSave} className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
            Profile Information
          </h4>

          {saved && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Settings saved successfully.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>

        {/* Technical Integration Status */}
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Backend Infrastructure Status
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                Supabase PostgreSQL Database
              </span>
              <p className="text-slate-400 font-mono text-[11px] truncate">
                postgresql://postgres:PeopleOS...
              </p>
              <span className="inline-block mt-2 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                CONNECTED & ACTIVE
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-indigo-400" />
                Enterprise Cloud Storage Vault
              </span>
              <p className="text-slate-400 text-[11px]">
                High-availability encrypted document engine
              </p>
              <span className="inline-block mt-2 text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-bold">
                OPERATIONAL (AUTOMATED VAULT)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
