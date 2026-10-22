'use client';

import React, { useState, useEffect } from 'react';
import { UserRole, User, ProjectSubmission, LogbookEntry, LorData, ContactMessage, PortalNotification, InternProfile, CertificateData } from '@/types';
import { Navbar } from '@/components/Navbar';
import { LoginForm } from '@/components/LoginForm';
import { MonacoViewer } from '@/components/MonacoViewer';
import { ZipExtractor } from '@/components/ZipExtractor';
import { LorVisualEditor } from '@/components/LorVisualEditor';
import { LogbookView } from '@/components/LogbookView';
import { ContactForm } from '@/components/ContactForm';
import { NotificationsView } from '@/components/NotificationsView';
import { SettingsView } from '@/components/SettingsView';
import { InternsView } from '@/components/InternsView';
import { CertificateStudio } from '@/components/CertificateStudio';
import { getCompanyLetterheadSvgUrl } from '@/lib/letterhead';
import { INITIAL_LOR, getDefaultLorTemplate } from '@/lib/mock-data';
import { INITIAL_CERTIFICATE, replaceCertificatePlaceholders } from '@/lib/certificate-defaults';
import { downloadLorPdf, downloadCertificatePdf } from '@/lib/document-generator';
import {
  CheckCircle2,
  Clock,
  Award,
  UploadCloud,
  FileCode,
  BookOpen,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Download,
  FolderOpen,
  Inbox,
  AlertCircle,
  X,
  Calendar,
  Users
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PortalMainPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('intern');
  const [activeTab, setActiveTab] = useState<string>('home');

  // Application Data States
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [logbooks, setLogbooks] = useState<LogbookEntry[]>([]);
  const [lorData, setLorData] = useState<LorData>(INITIAL_LOR);
  const [certData, setCertData] = useState<CertificateData>(INITIAL_CERTIFICATE);
  const [internsList, setInternsList] = useState<InternProfile[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected item states for Admin view
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [gradeSaved, setGradeSaved] = useState(false);
  const [isDownloadingInternLor, setIsDownloadingInternLor] = useState(false);
  const [isDownloadingInternCert, setIsDownloadingInternCert] = useState(false);
  const [showProjectNoticeModal, setShowProjectNoticeModal] = useState<boolean>(false);

  // Restore user session if stored in localStorage and verify freshness
  useEffect(() => {
    const savedUser = localStorage.getItem('peopleos_session_user');
    if (savedUser) {
      try {
        const parsed: User = JSON.parse(savedUser);
        setCurrentUser(parsed);
        determineRoleAndTemplate(parsed);

        // Re-verify against server to guarantee fresh profile and correct role
        fetch(`/api/auth/verify?id=${encodeURIComponent(parsed.id || '')}&email=${encodeURIComponent(parsed.email || '')}&username=${encodeURIComponent(parsed.name || '')}`)
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.user) {
              setCurrentUser(res.user);
              determineRoleAndTemplate(res.user);
              localStorage.setItem('peopleos_session_user', JSON.stringify(res.user));
            }
          })
          .catch((e) => console.warn('Session verification fallback:', e));
      } catch (e) {
        console.warn('Invalid session user data');
      }
    }
  }, []);

  const determineRoleAndTemplate = (user: User) => {
    const r = (user.role || '').toLowerCase();
    const isSpecialAdmin =
      user.id === '53fa250a-cb36-4390-ae92-01d1cea68357' ||
      (user.email && (user.email.includes('yash@') || user.email.includes('admin')));

    if (!isSpecialAdmin && (r === 'intern' || r === 'employee')) {
      setRole('intern');
      setLorData(getDefaultLorTemplate(user.name, user.department, user.internshipPeriod));
      if (!sessionStorage.getItem('intern_notice_dismissed')) {
        setShowProjectNoticeModal(true);
      }
    } else {
      setRole('admin');
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('peopleos_session_user', JSON.stringify(user));
    determineRoleAndTemplate(user);
    setActiveTab('home');
    const r = (user.role || '').toLowerCase();
    const isSpecialAdmin =
      user.id === '53fa250a-cb36-4390-ae92-01d1cea68357' ||
      (user.email && (user.email.includes('yash@') || user.email.includes('admin')));

    if (!isSpecialAdmin && (r === 'intern' || r === 'employee')) {
      setShowProjectNoticeModal(true);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('peopleos_session_user');
  };

  // Fetch real data from Supabase backend APIs whenever logged in user changes
  useEffect(() => {
    if (!currentUser) return;
    const user = currentUser;

    async function loadBackendData() {
      try {
        setLoading(true);
        const logbookParams = new URLSearchParams({
          userId: user.id || '',
          email: user.email || '',
          name: user.name || '',
          role: user.role || '',
        });
        const [subRes, logRes, lorRes, msgRes, internRes, certRes] = await Promise.all([
          fetch('/api/submissions').then((r) => r.json()).catch(() => ({ submissions: [] })),
          fetch(`/api/logbooks?${logbookParams}`).then((r) => r.json()).catch(() => ({ logbooks: [] })),
          fetch(`/api/lor?${logbookParams}`).then((r) => r.json()).catch(() => ({ lor: null })),
          fetch('/api/contact').then((r) => r.json()).catch(() => ({ messages: [] })),
          fetch('/api/interns').then((r) => r.json()).catch(() => ({ interns: [] })),
          fetch(`/api/certificates?${logbookParams}`).then((r) => r.json()).catch(() => ({ certificate: null })),
        ]);

        if (subRes?.submissions) {
          setSubmissions(subRes.submissions);
          if (subRes.submissions.length > 0) {
            setSelectedSubmissionId(subRes.submissions[0].id);
          }
        }
        if (logRes?.logbooks) {
          setLogbooks(logRes.logbooks);
        }
        if (lorRes?.lor) {
          setLorData(lorRes.lor);
        }
        if (msgRes?.messages) {
          setContactMessages(msgRes.messages);
        }
        if (internRes?.interns) {
          setInternsList(internRes.interns);
        }
        if (certRes?.certificate || certRes?.template) {
          setCertData(certRes.certificate || certRes.template);
        }
      } catch (err) {
        console.error('Data loading error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBackendData();
  }, [currentUser]);

  // Filter submissions / data based on logged in user role
  const filteredSubmissions = role === 'intern' && currentUser
    ? submissions.filter((s) => s.userId === currentUser.id || s.userEmail === currentUser.email)
    : submissions;

  const activeInternSubmission = filteredSubmissions[0] || null;
  const activeAdminSubmission = submissions.find((s) => s.id === selectedSubmissionId) || submissions[0] || null;

  useEffect(() => {
    if (activeAdminSubmission) {
      setGradeInput(activeAdminSubmission.grade || '');
      setFeedbackInput(activeAdminSubmission.feedback || '');
    }
  }, [selectedSubmissionId]);

  const handleGradeSubmission = async () => {
    if (!activeAdminSubmission) return;
    const updated = submissions.map((s) =>
      s.id === activeAdminSubmission.id
        ? { ...s, grade: gradeInput, feedback: feedbackInput, status: 'approved' as const }
        : s
    );
    setSubmissions(updated);
    setGradeSaved(true);
    setTimeout(() => setGradeSaved(false), 2000);

    try {
      await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeAdminSubmission.id,
          grade: gradeInput,
          feedback: feedbackInput,
          status: 'approved',
        }),
      });
    } catch (e) {
      console.warn('Grade save error:', e);
    }
  };

  // Download LOR as PDF directly from Intern Dashboard
  const downloadInternLorPdf = async () => {
    setIsDownloadingInternLor(true);
    try {
      const internProfile: InternProfile = {
        id: currentUser?.id || 'usr_active',
        name: currentUser?.name || lorData.userName || 'Intern',
        email: currentUser?.email || '',
        employeeCode: (currentUser as any)?.employeeCode || (currentUser as any)?.employee_code || 'EMP0595',
        department: currentUser?.department || lorData.department || 'Software Engineering',
        internshipPeriod: currentUser?.internshipPeriod || lorData.internshipPeriod || '1st July 2026 to 15th September 2026',
        status: currentUser?.status || 'active',
      };
      await downloadLorPdf(internProfile);
    } catch (e) {
      console.error('LOR Download error:', e);
    } finally {
      setIsDownloadingInternLor(false);
    }
  };


  // Download Certificate as PDF directly from Intern Dashboard
  const downloadInternCertPdf = async () => {
    setIsDownloadingInternCert(true);
    try {
      if (currentUser) {
        const internProfile: InternProfile = {
          id: currentUser.id,
          name: currentUser.name || certData.userName || 'Intern',
          email: currentUser.email || '',
          employeeCode: (currentUser as any)?.employeeCode || (currentUser as any)?.employee_code || 'EMP0595',
          department: currentUser.department || 'Software Engineering',
          internshipPeriod: currentUser.internshipPeriod || '1st July 2026 to 15th September 2026',
          status: currentUser.status || 'active',
        };
        await downloadCertificatePdf(internProfile);
        return;
      }

      const container = document.getElementById('intern-cert-render-canvas');
      if (!container) return;

      const isInnovara = certData.theme === 'innovara_official' || !certData.theme;
      const canvas = await html2canvas(container, {
        scale: 3,
        useCORS: true,
        backgroundColor: isInnovara ? '#ffffff' : '#050814',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      pdf.save(`Certificate_${(certData.userName || 'Intern').replace(/\s+/g, '_')}_Innovara_Dynamics.pdf`);
    } catch (e) {
      console.error('Certificate Download error:', e);
    } finally {
      setIsDownloadingInternCert(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Render Login Form if user is not authenticated
  if (!currentUser) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Intern Project Submission Notice Popup Modal */}
      {showProjectNoticeModal && currentUser && role === 'intern' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden text-center sm:text-left">
            {/* Ambient Top Glow Bar */}
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 h-1.5 absolute top-0 left-0 right-0" />

            {/* Close Button */}
            <button
              onClick={() => {
                setShowProjectNoticeModal(false);
                sessionStorage.setItem('intern_notice_dismissed', 'true');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-750 p-2 rounded-full transition cursor-pointer"
              title="Close Notice"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Badge & Icon */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-amber-500/20 border border-indigo-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
                <Award className="w-8 h-8 stroke-[2]" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider mb-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Action Required
                </span>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  Project Submission Notice
                </h3>
              </div>
            </div>

            {/* Notice Message Content */}
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
              <p className="font-medium text-slate-200">
                Please <strong className="text-indigo-400 font-bold">submit your project first</strong> to receive your official <strong className="text-amber-300 font-semibold">Internship Completion Certificate & LOR</strong> within <strong className="text-cyan-300 font-bold">3–4 working days</strong> after administrative verification.
              </p>
              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Project source code archive upload is mandatory.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Processing timeline: <strong>3 to 4 working days</strong> upon review.</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setActiveTab('submit');
                  setShowProjectNoticeModal(false);
                  sessionStorage.setItem('intern_notice_dismissed', 'true');
                }}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Submit Project Now</span>
              </button>

              <button
                onClick={() => {
                  setShowProjectNoticeModal(false);
                  sessionStorage.setItem('intern_notice_dismissed', 'true');
                }}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm px-5 py-3 rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        unreadNotificationsCount={unreadCount}
        userName={currentUser.name}
        avatarUrl={currentUser.avatarUrl}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================================= */}
        {/* INTERN / EMPLOYEE DASHBOARD VIEWS */}
        {/* ========================================================================= */}
        {role === 'intern' && (
          <div className="space-y-8">
            {/* 1. HOME TAB */}
            {activeTab === 'home' && (
              <div className="space-y-8">
                {/* Hero Welcome Banner */}
                <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 max-w-3xl space-y-4">
                    <span className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-3 py-1 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      {currentUser.department || 'Software Engineering'} Cohort
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{currentUser.name}</span>
                    </h1>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      {currentUser.department} • Account ID: <code className="font-mono text-indigo-300">{currentUser.id}</code> • Upload project archives, inspect code in Monaco, and download official Letterhead LOR documents.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-4">
                      <button
                        onClick={() => setActiveTab('submit')}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Submit Project Archive</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('lor')}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
                      >
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>Download Letterhead LOR</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Key Status Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase">Project Submissions</p>
                      <p className="text-base font-bold text-slate-100 mt-0.5">
                        {filteredSubmissions.length > 0 ? `${filteredSubmissions.length} Uploaded` : 'Pending Upload'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase">Letter of Rec (LOR)</p>
                      <p className="text-base font-bold text-amber-300 mt-0.5">
                        {lorData.status === 'issued' ? 'Issued & Letterhead Ready' : 'Draft / Awaiting Admin'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase">Logbook Verification</p>
                      <p className="text-base font-bold text-indigo-300 mt-0.5">
                        {logbooks.length} Log Entries
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase">Support Inquiries</p>
                      <p className="text-base font-bold text-cyan-300 mt-0.5">
                        {contactMessages.length} Messages
                      </p>
                    </div>
                  </div>
                </div>

                {/* Monaco Code Preview Card or Clean Empty State */}
                {activeInternSubmission ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-indigo-400" />
                        Submitted Repository Monaco Visualizer ({activeInternSubmission.projectTitle})
                      </h3>
                      <button
                        onClick={() => setActiveTab('submit')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                      >
                        <span>Re-upload / Update Archive</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <MonacoViewer files={activeInternSubmission.files} fileTree={activeInternSubmission.fileTree} readOnly={true} />
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto border border-slate-700">
                      <FolderOpen className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-base font-bold text-slate-200">No Project Archive Uploaded Yet</h3>
                      <p className="text-xs text-slate-400">
                        Upload your complete internship project as a <code className="font-mono text-indigo-300">.zip</code> archive to extract files and view code directly in Monaco Editor.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('submit')}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Project Archive</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. SUBMIT PROJECT TAB */}
            {activeTab === 'submit' && (
              <div className="space-y-6">
                <ZipExtractor
                  userId={currentUser.id}
                  userName={currentUser.name}
                  userEmail={currentUser.email}
                  onSubmissionSuccess={(newSub) => {
                    setSubmissions([newSub, ...submissions]);
                    setSelectedSubmissionId(newSub.id);
                  }}
                />
              </div>
            )}

            {/* 3. DOWNLOAD LOGBOOK TAB */}
            {activeTab === 'logbook' && (
              <LogbookView
                logbooks={logbooks}
                userName={currentUser.name}
                department={currentUser.department || 'Software Engineering'}
                internshipPeriod={currentUser.internshipPeriod || 'Active Internship Program'}
                role="intern"
                onUpdateLogbook={(updated) => setLogbooks(updated)}
              />
            )}

            {/* 4. DOWNLOAD LOR TAB */}
            {activeTab === 'lor' && (
              <div className="space-y-6">
                {lorData.status === 'issued' ? (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-400" />
                          Official Letter of Recommendation (LOR)
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          Issued on official Company Letterhead for <strong className="text-slate-200">{currentUser.name}</strong>. Click below to download in high-resolution PDF format.
                        </p>
                      </div>

                      <button
                        onClick={downloadInternLorPdf}
                        disabled={isDownloadingInternLor}
                        className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-sm px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>{isDownloadingInternLor ? 'Preparing Letterhead PDF...' : 'Download LOR (Company Letterhead PDF)'}</span>
                      </button>
                    </div>

                    {/* Rendered LOR Preview Sheet */}
                    <div className="flex justify-center py-4">
                      <div
                        id="intern-lor-render-canvas"
                        className="w-[800px] h-[1130px] bg-white relative p-12 overflow-hidden shadow-2xl rounded border border-slate-200 text-slate-900 transform scale-[0.7] sm:scale-[0.85] md:scale-[0.95] origin-top transition-transform"
                        style={{
                          backgroundImage: `url("${lorData.letterheadBgUrl || '/certificate/innovara_letterhead_bg.png'}")`,
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat',
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {lorData.blocks.map((block) => (
                          <div
                            key={block.id}
                            style={{
                              position: 'absolute',
                              left: `${block.x}%`,
                              top: `${block.y}%`,
                              fontSize: `${block.fontSize}px`,
                              fontWeight: block.fontWeight as any,
                              color: block.color,
                              textAlign: block.textAlign,
                              width: block.maxWidth ? `${block.maxWidth}%` : 'auto',
                              whiteSpace: 'pre-wrap',
                              lineHeight: '1.6',
                            }}
                          >
                            {block.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-6 max-w-3xl mx-auto shadow-2xl my-8">
                    <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                      <Award className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 text-amber-400 text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                        Status: Pending Admin Signoff
                      </span>
                      <h3 className="text-2xl font-bold text-white">Letter of Recommendation Not Yet Issued</h3>
                      <p className="text-sm text-slate-400 leading-relaxed max-w-xl mx-auto pt-1">
                        Your official Letter of Recommendation (LOR) is currently pending review and authorization by the Program Director. Once an administrator personally verifies your internship program completion and issues your LOR, it will become available here for preview and download on official company letterhead.
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-3 text-xs text-slate-500 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 max-w-lg mx-auto">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Individual LORs are issued personally by Program Management upon internship sign-off.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. DOWNLOAD CERTIFICATE TAB */}
            {activeTab === 'certificate' && (
              <div className="space-y-6">
                {certData.status === 'issued' ? (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-400" />
                          Official Internship Completion Certificate
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          Authorized & issued for <strong className="text-slate-200">{currentUser.name}</strong>. Click below to download your official certificate in high-resolution PDF format.
                        </p>
                      </div>

                      <button
                        onClick={downloadInternCertPdf}
                        disabled={isDownloadingInternCert}
                        className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-sm px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>{isDownloadingInternCert ? 'Preparing Certificate PDF...' : 'Download Certificate (A4 Landscape PDF)'}</span>
                      </button>
                    </div>

                    {/* Rendered Certificate Preview */}
                    <div className="flex justify-center py-4 overflow-x-auto">
                      <div
                        id="intern-cert-render-canvas"
                        style={{
                          width: '100%',
                          maxWidth: '820px',
                          aspectRatio: '1.414 / 1',
                          position: 'relative',
                          backgroundColor: certData.theme === 'innovara_official' ? '#ffffff' : undefined,
                        }}
                        className={`rounded-2xl shadow-2xl overflow-hidden select-none border-4 ${
                          certData.theme === 'innovara_official'
                            ? 'border-slate-300 bg-white'
                            : 'border-amber-500/40 bg-gradient-to-br from-slate-950 via-[#070b19] to-[#04060f]'
                        } p-4`}
                      >
                        {/* If Innovara Official, render authentic company background frame */}
                        {certData.theme === 'innovara_official' ? (
                          <div
                            className="absolute inset-0 w-full h-full pointer-events-none select-none"
                            style={{
                              backgroundImage: `url(${certData.backgroundImageUrl || '/certificate/innovara_certificate_frame.png'})`,
                              backgroundSize: '100% 100%',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                            }}
                          />
                        ) : (
                          <>
                            {/* Inner Ornamental Inset Border */}
                            <div className="absolute inset-3 border-2 border-amber-400/20 rounded-xl pointer-events-none" />
                            <div className="absolute inset-5 border border-white/5 rounded-lg pointer-events-none" />
                            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-400/80 pointer-events-none" />
                            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-400/80 pointer-events-none" />
                            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-400/80 pointer-events-none" />
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-400/80 pointer-events-none" />

                            {/* Seal */}
                            <div className="absolute bottom-6 right-8 w-24 h-24 rounded-full border-2 border-amber-400 text-amber-300 bg-amber-500/10 flex flex-col items-center justify-center text-center p-2 shadow-inner pointer-events-none rotate-[-6deg]">
                              <Award className="w-6 h-6 mb-0.5" />
                              <span className="text-[7px] font-extrabold uppercase tracking-widest leading-none">OFFICIAL</span>
                              <span className="text-[6px] tracking-tighter text-slate-300 mt-0.5">VERIFIED</span>
                            </div>
                          </>
                        )}

                        {certData.blocks.map((block) => (
                          <div
                            key={block.id}
                            style={{
                              position: 'absolute',
                              left: `${block.x}%`,
                              top: `${block.y}%`,
                              fontSize: `${block.fontSize}px`,
                              fontWeight: block.fontWeight as any,
                              color: block.color,
                              textAlign: block.textAlign,
                              width: block.maxWidth ? `${block.maxWidth}%` : 'auto',
                              whiteSpace: 'pre-wrap',
                              lineHeight: '1.45',
                            }}
                          >
                            {replaceCertificatePlaceholders(block.text, {
                              id: currentUser.id,
                              name: currentUser.name,
                              department: currentUser.department,
                              internshipPeriod: currentUser.internshipPeriod,
                            })}
                          </div>
                        ))}

                        {/* Official Snehal Dhumal Signature & Innovara Dynamics Pune Seal */}
                        {certData.theme === 'innovara_official' ? (
                          <div
                            style={{
                              position: 'absolute',
                              left: '41.3%',
                              top: '67.3%',
                              width: '27.2%',
                              pointerEvents: 'none',
                              userSelect: 'none',
                            }}
                          >
                            <img
                              src={certData.signatureSealBlockUrl || '/certificate/innovara_signature_seal_block.png'}
                              alt="Snehal Dhumal Signature & Seal"
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        ) : certData.directorSignatureUrl ? (
                          <div style={{ position: 'absolute', left: '19%', top: '73%', width: '120px', pointerEvents: 'none' }}>
                            <img
                              src={certData.directorSignatureUrl}
                              alt="Director Signature"
                              className="h-10 max-w-full object-contain filter invert opacity-90"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-6 max-w-3xl mx-auto shadow-2xl my-8">
                    <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                      <Sparkles className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 text-amber-400 text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                        Status: Pending Program Signoff
                      </span>
                      <h3 className="text-2xl font-bold text-white">Completion Certificate Under Review</h3>
                      <p className="text-sm text-slate-400 leading-relaxed max-w-xl mx-auto pt-1">
                        Your official Certificate of Internship Completion is currently pending final approval by the Directorate. Once authorized in Certificate Studio, your verified certificate will be available here for preview and high-resolution PDF download.
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-3 text-xs text-slate-500 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 max-w-lg mx-auto">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Individual Completion Certificates are issued upon successful program verification.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <NotificationsView
                notifications={notifications}
                onMarkRead={(id) => {
                  setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
                }}
              />
            )}

            {/* 6. CONTACT TAB */}
            {activeTab === 'contact' && (
              <ContactForm
                messages={contactMessages}
                role="intern"
                userName={currentUser.name}
                userEmail={currentUser.email}
                onSendMessage={(msg) => setContactMessages([msg, ...contactMessages])}
              />
            )}

            {/* 7. SETTINGS TAB */}
            {activeTab === 'settings' && (
              <SettingsView role="intern" userName={currentUser.name} userEmail={currentUser.email} />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADMIN DASHBOARD VIEWS */}
        {/* ========================================================================= */}
        {role === 'admin' && (
          <div className="space-y-8">
            {/* 1. ADMIN OVERVIEW TAB */}
            {activeTab === 'home' && (
              <div className="space-y-8">
                {/* Admin Header */}
                <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 max-w-3xl space-y-4">
                    <span className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold px-3 py-1 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      Program Director & Admin Console
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      Internship Program Administration
                    </h1>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      Inspect intern project archives in Monaco, manipulate LOR letterhead text positions, sign off logbooks, and manage student messages.
                    </p>
                  </div>
                </div>

                {/* Admin Quick Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div
                    onClick={() => setActiveTab('submissions')}
                    className="bg-slate-900 border border-slate-800 hover:border-indigo-600/60 p-4 rounded-2xl shadow-xl flex items-center gap-3 cursor-pointer transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center shrink-0 font-extrabold text-base group-hover:scale-105 transition-transform">
                      {submissions.length}
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Submissions</p>
                      <p className="text-sm font-bold text-slate-100 mt-0.5">Project Archives</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('interns')}
                    className="bg-slate-900 border border-slate-800 hover:border-purple-600/60 p-4 rounded-2xl shadow-xl flex items-center gap-3 cursor-pointer transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center shrink-0 font-extrabold text-base group-hover:scale-105 transition-transform">
                      {internsList.length}
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Interns</p>
                      <p className="text-sm font-bold text-purple-300 mt-0.5">Docs & Archives</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('logbooks_review')}
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-600/60 p-4 rounded-2xl shadow-xl flex items-center gap-3 cursor-pointer transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0 font-extrabold text-base group-hover:scale-105 transition-transform">
                      {logbooks.length}
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Logbooks</p>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">Logged Weeks</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('lor_builder')}
                    className="bg-slate-900 border border-slate-800 hover:border-amber-600/60 p-4 rounded-2xl shadow-xl flex items-center gap-3 cursor-pointer transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center shrink-0 font-extrabold text-base group-hover:scale-105 transition-transform">
                      {lorData.status === 'issued' ? '1' : '0'}
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">LOR Studio</p>
                      <p className="text-sm font-bold text-amber-300 mt-0.5">
                        {lorData.status === 'issued' ? 'Issued' : 'Draft'}
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('cert_studio')}
                    className="bg-slate-900 border border-slate-800 hover:border-cyan-600/60 p-4 rounded-2xl shadow-xl flex items-center gap-3 cursor-pointer transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0 font-extrabold text-base group-hover:scale-105 transition-transform">
                      {certData.status === 'issued' ? '✓' : '—'}
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Cert Studio</p>
                      <p className="text-sm font-bold text-cyan-300 mt-0.5">Completion Cert</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('contact_desk')}
                    className="bg-slate-900 border border-slate-800 hover:border-rose-600/60 p-4 rounded-2xl shadow-xl flex items-center gap-3 cursor-pointer transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0 font-extrabold text-base group-hover:scale-105 transition-transform">
                      {contactMessages.length}
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Inquiries</p>
                      <p className="text-sm font-bold text-slate-100 mt-0.5">Messages</p>
                    </div>
                  </div>
                </div>

                {/* Submissions List & Monaco Review preview */}
                {activeAdminSubmission ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-indigo-400" />
                      Submitted Projects Code Inspector ({activeAdminSubmission.projectTitle})
                    </h3>
                    <MonacoViewer files={activeAdminSubmission.files} fileTree={activeAdminSubmission.fileTree} readOnly={true} />
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                    <Inbox className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">No project submissions available for review</p>
                    <p className="text-xs text-slate-500">Submissions uploaded by interns will appear here in Monaco Code Inspector.</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. INTERNS DIRECTORY & DOCS DOWNLOAD TAB */}
            {activeTab === 'interns' && (
              <InternsView
                interns={internsList}
                onUpdateInternStatus={(id, st) =>
                  setInternsList(internsList.map((i) => (i.id === id ? { ...i, documentVerificationStatus: st } : i)))
                }
              />
            )}

            {/* 3. SUBMISSIONS REVIEW TAB */}
            {activeTab === 'submissions' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side Submissions List */}
                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-slate-800">
                    Submissions List ({submissions.length})
                  </div>

                  {submissions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 italic">No submissions uploaded yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {submissions.map((sub) => {
                        const isSelected = sub.id === selectedSubmissionId;
                        return (
                          <div
                            key={sub.id}
                            onClick={() => setSelectedSubmissionId(sub.id)}
                            className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow'
                                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-850'
                            }`}
                          >
                            <p className="font-bold text-sm text-slate-200">{sub.projectTitle}</p>
                            <p className="text-xs text-slate-400 mt-0.5">By {sub.userName}</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px]">
                              <span className="font-mono text-indigo-300">{sub.zipFileName}</span>
                              <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                {sub.grade || 'Submitted'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Side Monaco Code Review & Grading */}
                <div className="lg:col-span-8 space-y-6">
                  {activeAdminSubmission ? (
                    <div className="space-y-4">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-white">{activeAdminSubmission.projectTitle}</h3>
                            <p className="text-xs text-slate-400 font-mono">
                              Submitted by {activeAdminSubmission.userName} ({activeAdminSubmission.userEmail})
                            </p>
                          </div>
                          <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1 rounded-full font-bold">
                            File Storage ID: {activeAdminSubmission.zipFileId}
                          </span>
                        </div>

                        {/* Grading Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-800 pt-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Grade / Score</label>
                            <input
                              type="text"
                              value={gradeInput}
                              onChange={(e) => setGradeInput(e.target.value)}
                              placeholder="e.g. A+ (98/100)"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Reviewer Feedback</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={feedbackInput}
                                onChange={(e) => setFeedbackInput(e.target.value)}
                                placeholder="Add reviewer comments..."
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100"
                              />
                              <button
                                onClick={handleGradeSubmission}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shrink-0"
                              >
                                {gradeSaved ? 'Saved!' : 'Submit Grade'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <MonacoViewer files={activeAdminSubmission.files} fileTree={activeAdminSubmission.fileTree} readOnly={true} />
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                      No submission selected.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. LOR LETTERHEAD STUDIO TAB */}
            {activeTab === 'lor_builder' && (
              <LorVisualEditor
                lorData={lorData}
                onSaveLor={(updated) => setLorData(updated)}
                onIssueLor={(updated) => setLorData(updated)}
              />
            )}

            {/* 5. CERTIFICATE STUDIO TAB */}
            {activeTab === 'cert_studio' && (
              <CertificateStudio
                initialData={certData}
                onSaveCertificate={(updated) => setCertData(updated)}
                onIssueCertificate={(updated) => setCertData(updated)}
              />
            )}

            {/* 4. LOGBOOKS REVIEW TAB */}
            {activeTab === 'logbooks_review' && (
              <LogbookView
                logbooks={logbooks}
                userName={currentUser.name}
                department="Software Engineering"
                internshipPeriod="Active Internship Program"
                role="admin"
                onUpdateLogbook={(updated) => setLogbooks(updated)}
              />
            )}

            {/* 5. CONTACT DESK TAB */}
            {activeTab === 'contact_desk' && (
              <ContactForm
                messages={contactMessages}
                role="admin"
                onReplyMessage={(id, reply) => {
                  setContactMessages(
                    contactMessages.map((m) => (m.id === id ? { ...m, status: 'replied' as const, reply } : m))
                  );
                }}
              />
            )}

            {/* 6. SETTINGS TAB */}
            {activeTab === 'settings' && (
              <SettingsView role="admin" userName={currentUser.name} userEmail={currentUser.email} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
