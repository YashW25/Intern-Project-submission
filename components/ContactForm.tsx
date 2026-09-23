'use client';

import React, { useState } from 'react';
import { ContactMessage } from '@/types';
import { Mail, Send, CheckCircle2, MessageSquare, Clock, UserCheck } from 'lucide-react';

interface ContactFormProps {
  messages: ContactMessage[];
  role?: 'intern' | 'admin';
  userName?: string;
  userEmail?: string;
  onSendMessage?: (msg: ContactMessage) => void;
  onReplyMessage?: (id: string, reply: string) => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  messages: initialMessages,
  role = 'intern',
  userName = 'Alex Rivera',
  userEmail = 'alex.rivera@intern.peopleos.tech',
  onSendMessage,
  onReplyMessage,
}) => {
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    const newMsg: ContactMessage = {
      id: `msg_${Date.now()}`,
      userId: 'usr_intern_1',
      userName,
      userEmail,
      subject,
      message,
      status: 'unread',
      createdAt: new Date().toISOString(),
    };

    const updated = [newMsg, ...messages];
    setMessages(updated);
    setSubject('');
    setMessage('');
    setSubmitted(true);
    if (onSendMessage) onSendMessage(newMsg);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleSendReply = (msgId: string) => {
    const text = replyText[msgId];
    if (!text) return;

    const updated = messages.map((m) =>
      m.id === msgId ? { ...m, status: 'replied' as const, reply: text } : m
    );
    setMessages(updated);
    setReplyText((prev) => ({ ...prev, [msgId]: '' }));
    if (onReplyMessage) onReplyMessage(msgId, text);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-400" />
          {role === 'admin' ? 'Intern Inquiry Desk' : 'Contact Internship Administrator'}
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {role === 'admin'
            ? 'Review support requests, project questions, and issue replies to interns.'
            : 'Send a message directly to your program director regarding LOR, submissions, or technical help.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Send Inquiry Form (For Interns) */}
        {role === 'intern' && (
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
              New Message
            </h4>

            {submitted && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Message dispatched to Admin team!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. LOR verification or Logbook query"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Message Content</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your question or request..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send Message</span>
              </button>
            </form>
          </div>
        )}

        {/* Messages List & Responses */}
        <div className={role === 'intern' ? 'lg:col-span-7' : 'lg:col-span-12'} style={{ width: '100%' }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
              <span>Message History ({messages.length})</span>
            </h4>

            <div className="space-y-4">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No messages yet.</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-slate-200">{msg.subject}</span>
                        <p className="text-[10px] text-slate-400">
                          From: {msg.userName} ({msg.userEmail}) • {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          msg.status === 'replied'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg leading-relaxed">
                      {msg.message}
                    </p>

                    {/* Reply display */}
                    {msg.reply && (
                      <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-lg p-3 text-xs space-y-1">
                        <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-[11px]">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                          Admin Response:
                        </span>
                        <p className="text-slate-200">{msg.reply}</p>
                      </div>
                    )}

                    {/* Admin Reply Box */}
                    {role === 'admin' && !msg.reply && (
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Type reply to intern..."
                          value={replyText[msg.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [msg.id]: e.target.value })}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                        />
                        <button
                          onClick={() => handleSendReply(msg.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
