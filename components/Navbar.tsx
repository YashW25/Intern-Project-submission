'use client';

import React, { useState } from 'react';
import { UserRole } from '@/types';
import {
  Home,
  UploadCloud,
  BookOpen,
  Award,
  Bell,
  Mail,
  Settings,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  Users,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole;
  unreadNotificationsCount?: number;
  userName?: string;
  avatarUrl?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  role,
  unreadNotificationsCount = 0,
  userName = 'User',
  avatarUrl,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayAvatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=${role === 'admin' ? 'f59e0b' : '6366f1'}&color=fff`;

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: number;
  }

  const internNavs: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'submit', label: 'Submit Project', icon: UploadCloud },
    { id: 'logbook', label: 'Download Logbook', icon: BookOpen },
    { id: 'lor', label: 'Download LOR', icon: Award },
    { id: 'certificate', label: 'Certificate', icon: Sparkles },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotificationsCount },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const adminNavs: NavItem[] = [
    { id: 'home', label: 'Overview', icon: Home },
    { id: 'interns', label: 'Interns', icon: Users },
    { id: 'submissions', label: 'Submissions Review', icon: UploadCloud },
    { id: 'lor_builder', label: 'LOR Letterhead Studio', icon: Award },
    { id: 'cert_studio', label: 'Certificate Studio', icon: Sparkles },
    { id: 'logbooks_review', label: 'Logbooks Signoff', icon: BookOpen },
    { id: 'contact_desk', label: 'Contact Desk', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentNavs = role === 'admin' ? adminNavs : internNavs;

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer flex-shrink-0" onClick={() => handleNavClick('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-bold text-lg">
              P
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                PeopleOS{' '}
                <span className="text-indigo-400 font-normal text-xs uppercase tracking-widest bg-indigo-950 border border-indigo-800/60 px-1.5 py-0.5 rounded">
                  Portal
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-mono">Internship Engineering Hub</p>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center space-x-1">
            {currentNavs.map((nav) => {
              const Icon = nav.icon;
              const isActive = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => handleNavClick(nav.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{nav.label}</span>
                  {nav.badge && nav.badge > 0 ? (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {nav.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Right Side: Role Badge + Profile */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                role === 'admin'
                  ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                  : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300'
              }`}
            >
              {role === 'admin' ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
              <span className="capitalize">{role}</span>
            </div>

            {/* Profile Avatar & Logout */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <img
                src={displayAvatar}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500/40"
              />
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-slate-200 leading-none">{userName}</p>
                <p className="text-[10px] text-slate-400 capitalize">{role} Account</p>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 rounded-xl transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800/80 py-3 space-y-1">
            {currentNavs.map((nav) => {
              const Icon = nav.icon;
              const isActive = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => handleNavClick(nav.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{nav.label}</span>
                  {nav.badge && nav.badge > 0 ? (
                    <span className="ml-auto w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {nav.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
