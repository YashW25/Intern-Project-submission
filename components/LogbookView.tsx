'use client';

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { LogbookEntry } from '@/types';
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

interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

async function getImageInfo(url: string): Promise<ImageInfo | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width || 100;
        const h = img.naturalHeight || img.height || 50;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx && w > 0 && h > 0) {
          ctx.drawImage(img, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL('image/png'),
            width: w,
            height: h,
            aspectRatio: w / h,
          });
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export const LogbookView: React.FC<LogbookViewProps> = ({
  logbooks: initialLogbooks,
  userName,
  department,
  internshipPeriod,
  role = 'intern',
  onUpdateLogbook,
}) => {
  const [logbooks] = useState<LogbookEntry[]>(initialLogbooks);
  const [activeId, setActiveId] = useState<string>(initialLogbooks[0]?.id || '');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [search, setSearch] = useState('');

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
      await new Promise((r) => setTimeout(r, 10));

      const [directorSigImg, userSigImg] = await Promise.all([
        getImageInfo('/output-smallpngtools.png'),
        userSignatureUrl ? getImageInfo(userSignatureUrl) : Promise.resolve(null),
      ]);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const contentWidth = 182;

      let currentPage = 1;

      // Helper function to render Header on every page
      const renderHeader = () => {
        pdf.setFillColor(15, 23, 42); // Slate 950
        pdf.rect(0, 0, pageWidth, 22, 'F');

        // Cyan accent line
        pdf.setFillColor(6, 182, 212); // Cyan 500
        pdf.rect(0, 22, pageWidth, 1.2, 'F');

        // 'P' Badge icon
        pdf.setFillColor(99, 102, 241); // Indigo 500
        pdf.roundedRect(14, 4, 11, 11, 2, 2, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.text('P', 19.5, 12, { align: 'center' });

        // Header Title & Tagline
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('PEOPLE OS TECHNOLOGIES', 28, 9);

        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(103, 232, 249); // Cyan 300
        pdf.text('EMPOWERING NEXT-GENERATION SOFTWARE ENGINEERING', 28, 14.5);

        // Header Right Meta
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('OFFICIAL DOCUMENT', 196, 8, { align: 'right' });

        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(199, 210, 254);
        pdf.text('internships@peopleos.tech', 196, 12.5, { align: 'right' });
        pdf.text('www.peopleos.tech', 196, 16.5, { align: 'right' });
      };

      // Helper function to render Footer on every page
      const renderFooter = (page: number, totalPages: number) => {
        pdf.setPage(page);
        pdf.setFillColor(6, 182, 212);
        pdf.rect(14, 283, contentWidth, 0.5, 'F');

        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text('Innovation Park, Building 4, Tech Corridor, SF 94107 | internships@peopleos.tech', 14, 287);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(99, 102, 241);
        pdf.text(`VERIFIED CERTIFICATE PORTAL  |  Page ${page} of ${totalPages}`, 196, 287, { align: 'right' });
      };

      // Helper to draw Table Header
      const renderTableHeader = (y: number) => {
        pdf.setFillColor(15, 23, 42); // Dark slate
        pdf.rect(14, y, contentWidth, 8, 'F');

        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);

        pdf.text('DATE', 16, y + 5.5);
        pdf.text('TITLE & WORK DONE', 38, y + 5.5);
        pdf.text('KEY LEARNINGS', 128, y + 5.5);
        pdf.text('HOURS', 188, y + 5.5, { align: 'center' });

        return y + 8;
      };

      // Start Page 1
      renderHeader();

      // First Page Title & Info Box
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('INTERNSHIP OFFICIAL LOGBOOK', 105, 31, { align: 'center' });

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 116, 139);
      pdf.text('PEOPLEOS TECHNOLOGIES • VERIFIED ENGINEERING RECORD', 105, 35, { align: 'center' });

      // Intern Info Card
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(14, 38, contentWidth, 16, 2, 2, 'FD');

      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);

      pdf.text('Intern Name:', 18, 43.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(userName || '—', 36, 43.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text('Department:', 105, 43.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(department || '—', 123, 43.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text('Internship Period:', 18, 49.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(internshipPeriod || '—', 43, 49.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text('Total Entries:', 105, 49.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${logbooks.length} days • ${totalHours.toFixed(1)} hrs`, 123, 49.5);

      let currentY = renderTableHeader(58);

      // Render rows
      for (let i = 0; i < logbooks.length; i++) {
        const entry = logbooks[i];
        const titleText = entry.title || 'Untitled Entry';
        const descText = entry.description || '';
        const learnText = entry.whatLearned || '—';
        const dateStr = formatDate(entry.date);
        const hoursStr = entry.hoursSpent > 0 ? `${entry.hoursSpent.toFixed(1)}h` : '—';

        // Split text to fit columns
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'bold');
        const titleLines = pdf.splitTextToSize(titleText, 86);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        const descLines = pdf.splitTextToSize(descText, 86);
        const learnLines = pdf.splitTextToSize(learnText, 50);

        const titleDescHeight = titleLines.length * 3.5 + descLines.length * 3 + 4;
        const learnHeight = learnLines.length * 3 + 4;
        const rowHeight = Math.max(9, Math.max(titleDescHeight, learnHeight));

        // Check page overflow limit
        if (currentY + rowHeight > 250) {
          pdf.addPage();
          currentPage++;
          renderHeader();

          // Sub-header for page > 1
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(15, 23, 42);
          pdf.text('INTERNSHIP OFFICIAL LOGBOOK', 14, 28);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 116, 139);
          pdf.text(`|   ${userName}`, 68, 28);

          pdf.setDrawColor(226, 232, 240);
          pdf.line(14, 30.5, 196, 30.5);

          currentY = renderTableHeader(33);
        }

        // Row background fill (alternating)
        if (i % 2 === 1) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(14, currentY, contentWidth, rowHeight, 'F');
        }

        // Row borders
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(14, currentY, contentWidth, rowHeight, 'S');
        pdf.line(36, currentY, 36, currentY + rowHeight);
        pdf.line(126, currentY, 126, currentY + rowHeight);
        pdf.line(180, currentY, 180, currentY + rowHeight);

        // Cell contents
        // Date
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(51, 65, 85);
        pdf.text(dateStr, 16, currentY + 4.5);

        // Title & Description
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(15, 23, 42);
        let textY = currentY + 4;
        pdf.text(titleLines, 38, textY);
        textY += titleLines.length * 3.5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text(descLines, 38, textY);

        // Key Learnings
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text(learnLines, 128, currentY + 4);

        // Hours
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(4, 120, 87); // Emerald 700
        pdf.text(hoursStr, 188, currentY + 5, { align: 'center' });

        currentY += rowHeight;
      }

      // Check space for Signatures block
      const sigHeight = 28;
      if (currentY + sigHeight > 270) {
        pdf.addPage();
        currentPage++;
        renderHeader();
        currentY = 32;
      } else {
        currentY += 6;
      }

      // Render Signatures
      pdf.setDrawColor(226, 232, 240);
      pdf.line(14, currentY, 196, currentY);
      currentY += 4;

      // Intern Signature (Left)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Intern Signature', 14, currentY);

      let sigOffset = 14;
      if (userSigImg) {
        const maxH = 11;
        const maxW = 45;
        let sigH = maxH;
        let sigW = sigH * userSigImg.aspectRatio;
        if (sigW > maxW) {
          sigW = maxW;
          sigH = sigW / userSigImg.aspectRatio;
        }
        pdf.addImage(userSigImg.dataUrl, 'PNG', 14, currentY + 1.5, sigW, sigH);
        sigOffset = Math.max(14, 1.5 + sigH + 3);
      } else {
        pdf.setFont('times', 'bolditalic');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(userName || 'Intern', 14, currentY + 7);
        sigOffset = 14;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(userName || 'Intern', 14, currentY + sigOffset);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 14, currentY + sigOffset + 3.5);

      // Program Director Signature (Right)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Program Director Signoff', 196, currentY, { align: 'right' });

      let dirSigOffset = 14;
      if (directorSigImg) {
        const maxH = 11;
        const maxW = 45;
        let sigH = maxH;
        let sigW = sigH * directorSigImg.aspectRatio;
        if (sigW > maxW) {
          sigW = maxW;
          sigH = sigW / directorSigImg.aspectRatio;
        }
        const posX = 196 - sigW;
        pdf.addImage(directorSigImg.dataUrl, 'PNG', posX, currentY + 1.5, sigW, sigH);
        dirSigOffset = Math.max(14, 1.5 + sigH + 3);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Manthan Kshirsagar', 196, currentY + dirSigOffset, { align: 'right' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Project Manager • Head of Engineering & Relations', 196, currentY + dirSigOffset + 3.5, { align: 'right' });

      // Apply footers to all pages
      for (let p = 1; p <= currentPage; p++) {
        renderFooter(p, currentPage);
      }

      pdf.save(`Logbook_${(userName || 'Intern').replace(/\s+/g, '_')}.pdf`);
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
