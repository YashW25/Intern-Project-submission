'use client';

import React, { useState, useEffect } from 'react';
import { LogbookEntry } from '@/types';
import { downloadLogbookPdf as downloadOfficialLogbookPdf } from '@/lib/document-generator';
import {
  BookOpen,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  ChevronRight,
  FileText,
  Lightbulb,
  Search,
  AlertCircle,
} from 'lucide-react';

interface LogbookViewProps {
  logbooks: LogbookEntry[];
  userName: string;
  department: string;
  internshipPeriod: string;
  role?: 'intern' | 'admin';
  onUpdateLogbook?: (updated: LogbookEntry[]) => void;
}

function formatDate(isoString: string) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatHours(h: number) {
  if (!h || h === 0) return '—';
  return `${h.toFixed(1)} hrs`;
}



export const LogbookView: React.FC<LogbookViewProps> = ({
  logbooks: initialLogbooks,
  userName,
  department,
  internshipPeriod,
  role = 'intern',
  onUpdateLogbook,
}) => {
  const logbooks = initialLogbooks || [];
  const [activeId, setActiveId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [search, setSearch] = useState('');

  // Keep active entry synchronized whenever logbooks update
  useEffect(() => {
    if ((!activeId || !logbooks.some((l) => l.id === activeId)) && logbooks.length > 0) {
      setActiveId(logbooks[0].id);
    }
  }, [logbooks, activeId]);

  const activeEntry = logbooks.find((l) => l.id === activeId) || logbooks[0] || null;

  // Filter logbooks by search
  const filteredLogbooks = logbooks.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.title?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.whatLearned?.toLowerCase().includes(q)
    );
  });

  // Total hours
  const totalHours = logbooks.reduce((sum, l) => sum + (l.hoursSpent || 0), 0);
  const userSignatureUrl = logbooks.find((l) => l.userSignature)?.userSignature || null;

  const downloadLogbookPdf = async () => {
    if (!logbooks || logbooks.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const internData: any = {
        id: '',
        name: userName || 'Intern',
        department: department || 'Web Development',
        internshipPeriod: internshipPeriod || '1st July 2026 to 15th September 2026',
        employeeCode: 'INT001',
      };
      await downloadOfficialLogbookPdf(internData, logbooks);
    } catch (err) {
      console.error('Logbook PDF error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Official Internship Logbook
            {role === 'admin' && <span className="text-sm text-slate-400 font-normal ml-1">— All Interns</span>}
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Daily engineering logs fetched from database · Export certified PDF on Company Letterhead
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2">
            <span><span className="font-bold text-indigo-300 text-sm">{logbooks.length}</span> Entries</span>
            <span className="w-px h-4 bg-slate-700" />
            <span><span className="font-bold text-emerald-300 text-sm">{totalHours.toFixed(1)}</span> Total Hours</span>
          </div>

          <button
            onClick={downloadLogbookPdf}
            disabled={isGeneratingPdf || logbooks.length === 0}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-indigo-500/30 font-medium text-sm px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Logbook (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {logbooks.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-base font-semibold text-slate-300">No logbook entries found</p>
          <p className="text-sm text-slate-500">
            Your daily log entries will appear here once you start logging on the PeopleOS platform.
          </p>
        </div>
      )}

      {logbooks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar — Entry List */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search entries..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* List Header */}
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-between border-b border-slate-800/60">
              <span>Daily Log Archive</span>
              <span className="text-indigo-400">{filteredLogbooks.length} entries</span>
            </div>

            {/* Entries Scrollable List */}
            <div className="flex-1 overflow-y-auto max-h-[520px]">
              {filteredLogbooks.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center italic">No matching entries.</p>
              ) : (
                filteredLogbooks.map((log) => {
                  const isActive = log.id === activeId;
                  return (
                    <div
                      key={log.id}
                      onClick={() => setActiveId(log.id)}
                      className={`px-4 py-3.5 cursor-pointer border-b border-slate-800/50 transition-all flex items-start gap-3 ${
                        isActive
                          ? 'bg-indigo-600/15 border-l-2 border-l-indigo-500'
                          : 'hover:bg-slate-800/40 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {log.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(log.date)}
                          </span>
                          {log.hoursSpent > 0 && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatHours(log.hoursSpent)}
                            </span>
                          )}
                        </div>
                        {role === 'admin' && log.userName && (
                          <p className="text-[10px] text-indigo-400 mt-0.5 truncate">{log.userName}</p>
                        )}
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-1" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel — Entry Detail */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {activeEntry ? (
              <div className="h-full flex flex-col">
                {/* Entry Header */}
                <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-white leading-tight">{activeEntry.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {formatDate(activeEntry.date)}
                        </span>
                        {activeEntry.hoursSpent > 0 && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-800/60 rounded-lg px-2 py-0.5">
                            <Clock className="w-3 h-3" />
                            {formatHours(activeEntry.hoursSpent)}
                          </span>
                        )}
                        {role === 'admin' && activeEntry.userName && (
                          <span className="text-xs text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 rounded-lg px-2 py-0.5">
                            {activeEntry.userName}
                          </span>
                        )}
                      </div>
                    </div>
                    {activeEntry.driveLink && (
                      <a
                        href={activeEntry.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 px-3 py-1.5 rounded-xl transition shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Drive Link
                      </a>
                    )}
                  </div>
                </div>

                {/* Entry Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Work Done & Description
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {activeEntry.description || <span className="text-slate-500 italic">No description provided.</span>}
                      </p>
                    </div>
                  </div>

                  {/* What Learned */}
                  {activeEntry.whatLearned && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Key Learnings & Takeaways
                      </label>
                      <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4">
                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {activeEntry.whatLearned}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Entry Meta */}
                  <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 font-medium">Entry ID</p>
                      <p className="text-slate-300 font-mono mt-0.5 text-[11px] truncate">{activeEntry.id}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Created</p>
                      <p className="text-slate-300 mt-0.5">{formatDate(activeEntry.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Hours Logged</p>
                      <p className="text-emerald-300 font-bold mt-0.5">{formatHours(activeEntry.hoursSpent)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Last Updated</p>
                      <p className="text-slate-300 mt-0.5">{formatDate(activeEntry.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-center">
                <div className="space-y-2">
                  <BookOpen className="w-10 h-10 text-slate-700 mx-auto" />
                  <p className="text-slate-500 text-sm">Select an entry from the list to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
