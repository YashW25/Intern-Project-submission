'use client';

import React, { useState } from 'react';
import { PortalNotification } from '@/types';
import { Bell, CheckCircle2, Info, AlertTriangle, Check } from 'lucide-react';

interface NotificationsViewProps {
  notifications: PortalNotification[];
  onMarkRead?: (id: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications: initialNotifications,
  onMarkRead,
}) => {
  const [notifications, setNotifications] = useState<PortalNotification[]>(initialNotifications);

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
  };

  const handleRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    if (onMarkRead) onMarkRead(id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            Portal Notifications & System Alerts
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status updates on project grading, LOR generation, and supervisor feedback.
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-950/60 border border-indigo-800 px-3 py-1.5 rounded-xl transition"
        >
          <Check className="w-4 h-4" />
          <span>Mark All as Read</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">No notifications present.</p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleRead(notif.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                notif.read
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                  : 'bg-indigo-950/20 border-indigo-500/50 shadow-md'
              }`}
            >
              {notif.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : notif.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              )}

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-100">{notif.title}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{notif.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
