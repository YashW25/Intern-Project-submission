'use client';

import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';
import { CertificateData, TextBlockPosition } from '@/types';
import {
  INITIAL_CERTIFICATE,
  DEFAULT_CERTIFICATE_BLOCKS,
  replaceCertificatePlaceholders,
} from '@/lib/certificate-defaults';
import {
  Award,
  Download,
  CheckCircle,
  Move,
  RotateCcw,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
  Users,
  Save,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Tag,
  Palette,
  FileText,
  Check,
  Layers,
} from 'lucide-react';

interface InternUser {
  id: string;
  name: string;
  email: string;
  employeeCode?: string;
  department: string;
  internshipPeriod: string;
}

interface CertificateStudioProps {
  initialData?: CertificateData;
  onSaveCertificate?: (updated: CertificateData) => void;
  onIssueCertificate?: (updated: CertificateData) => void;
}

export const CertificateStudio: React.FC<CertificateStudioProps> = ({
  initialData,
  onSaveCertificate,
  onIssueCertificate,
}) => {
  const [currentCert, setCurrentCert] = useState<CertificateData>(initialData || INITIAL_CERTIFICATE);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('cert_name');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [issuedMessage, setIssuedMessage] = useState<string | null>(null);

  // Intern selector state
  const [availableUsers, setAvailableUsers] = useState<InternUser[]>([]);
  const [selectedInternIds, setSelectedInternIds] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [activeTheme, setActiveTheme] = useState<
    'innovara_official' | 'executive_dark' | 'classic_gold' | 'cyber_emerald' | 'minimal_light'
  >((initialData?.theme as any) || 'innovara_official');

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load registered interns
  useEffect(() => {
    async function loadInterns() {
      try {
        const res = await fetch('/api/interns').then((r) => r.json());
        if (res?.interns && res.interns.length > 0) {
          setAvailableUsers(res.interns);
          setSelectedInternIds(res.interns.map((u: InternUser) => u.id));
        }
      } catch (e) {
        console.warn('Failed to load interns for Certificate Studio:', e);
      }
    }
    loadInterns();
  }, []);

  const selectedInterns = availableUsers.filter((u) => selectedInternIds.includes(u.id));
  const activePreviewIntern = selectedInterns[previewIndex] || selectedInterns[0] || availableUsers[0] || null;

  const toggleSelectIntern = (id: string) => {
    if (selectedInternIds.includes(id)) {
      if (selectedInternIds.length === 1) return;
      setSelectedInternIds(selectedInternIds.filter((i) => i !== id));
    } else {
      setSelectedInternIds([...selectedInternIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedInternIds.length === availableUsers.length) {
      setSelectedInternIds([availableUsers[0]?.id || '']);
    } else {
      setSelectedInternIds(availableUsers.map((u) => u.id));
    }
  };

  const selectedBlock = currentCert.blocks.find((b) => b.id === selectedBlockId);

  // Drag and drop block position handling
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>, blockId: string) => {
    setSelectedBlockId(blockId);
    setIsDragging(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !selectedBlockId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
    const relativeY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(90, Math.round(relativeX * 10) / 10));
    const clampedY = Math.max(0, Math.min(95, Math.round(relativeY * 10) / 10));

    setCurrentCert((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === selectedBlockId ? { ...b, x: clampedX, y: clampedY } : b)),
    }));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const updateBlockProp = (prop: keyof TextBlockPosition, value: any) => {
    if (!selectedBlockId) return;
    setCurrentCert((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === selectedBlockId ? { ...b, [prop]: value } : b)),
    }));
  };

  const handleAddBlock = () => {
    const newId = `cert_block_${Date.now()}`;
    const newBlock: TextBlockPosition = {
      id: newId,
      label: 'Custom Text Block',
      text: 'Custom Certification Text',
      x: 20,
      y: 70,
      fontSize: 12,
      fontWeight: 'normal',
      color: activeTheme === 'innovara_official' ? '#334155' : '#ffffff',
      textAlign: 'center',
      maxWidth: 60,
    };
    setCurrentCert((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setSelectedBlockId(newId);
  };

  const handleDeleteBlock = () => {
    if (!selectedBlockId || currentCert.blocks.length <= 1) return;
    setCurrentCert((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== selectedBlockId),
    }));
    setSelectedBlockId(currentCert.blocks[0]?.id || null);
  };

  const handleResetDefaults = () => {
    setCurrentCert((prev) => ({
      ...prev,
      blocks: DEFAULT_CERTIFICATE_BLOCKS,
      theme: 'innovara_official',
      backgroundImageUrl: '/certificate/innovara_certificate_frame.png',
      signatureSealBlockUrl: '/certificate/innovara_signature_seal_block.png',
    }));
    setActiveTheme('innovara_official');
    setSelectedBlockId('cert_name');
  };

  const insertPlaceholderTag = (tag: string) => {
    if (!selectedBlock) return;
    updateBlockProp('text', selectedBlock.text + ' ' + tag);
  };

  // High-res PDF download
  const downloadPdf = async () => {
    if (!canvasRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const isInnovara = activeTheme === 'innovara_official';
      const canvas = await html2canvas(canvasRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: isInnovara ? '#ffffff' : '#050814',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificate_${(activePreviewIntern?.name || currentCert.userName).replace(/\s+/g, '_')}_Innovara_Dynamics.pdf`);
    } catch (err) {
      console.error('Failed to generate certificate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Save template to server
  const handleSave = async () => {
    setSavedSuccess(true);
    if (onSaveCertificate) onSaveCertificate(currentCert);
    try {
      await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_template', template: currentCert }),
      });
    } catch (e) {
      console.warn('Failed to save certificate template:', e);
    }
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Batch issue to all selected interns
  const handleBatchIssue = async () => {
    if (selectedInterns.length === 0) return;

    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue_batch',
          template: { ...currentCert, theme: activeTheme },
          interns: selectedInterns,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIssuedMessage(`Successfully issued official Completion Certificates to ${data.count} intern(s)!`);
        setSavedSuccess(true);

        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}

        if (onIssueCertificate) onIssueCertificate({ ...currentCert, theme: activeTheme, status: 'issued' });
        setTimeout(() => setIssuedMessage(null), 5000);
      }
    } catch (e) {
      console.error('Failed to batch issue certificates:', e);
    }
  };

  // Theme styling definitions
  const themeStyles = {
    innovara_official: {
      bg: 'bg-white',
      borderOuter: 'border-slate-300',
      borderInner: 'border-transparent',
      accentGlow: 'from-transparent to-transparent',
      sealColor: 'border-transparent text-transparent bg-transparent',
      isInnovara: true,
    },
    executive_dark: {
      bg: 'bg-gradient-to-br from-slate-950 via-[#070b19] to-[#04060f]',
      borderOuter: 'border-amber-500/40',
      borderInner: 'border-amber-400/20',
      accentGlow: 'from-amber-500/10 via-indigo-500/10 to-transparent',
      sealColor: 'border-amber-400 text-amber-300 bg-amber-500/10',
      isInnovara: false,
    },
    classic_gold: {
      bg: 'bg-gradient-to-br from-[#12141c] via-[#1a1f33] to-[#0d101d]',
      borderOuter: 'border-yellow-400/50',
      borderInner: 'border-yellow-500/30',
      accentGlow: 'from-yellow-500/15 via-purple-500/10 to-transparent',
      sealColor: 'border-yellow-400 text-yellow-300 bg-yellow-500/15',
      isInnovara: false,
    },
    cyber_emerald: {
      bg: 'bg-gradient-to-br from-slate-950 via-[#061a1a] to-[#020b0d]',
      borderOuter: 'border-emerald-500/50',
      borderInner: 'border-cyan-500/30',
      accentGlow: 'from-emerald-500/15 via-cyan-500/10 to-transparent',
      sealColor: 'border-emerald-400 text-emerald-300 bg-emerald-500/10',
      isInnovara: false,
    },
    minimal_light: {
      bg: 'bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900',
      borderOuter: 'border-indigo-400/40',
      borderInner: 'border-indigo-500/20',
      accentGlow: 'from-indigo-500/10 via-sky-500/10 to-transparent',
      sealColor: 'border-indigo-400 text-indigo-300 bg-indigo-500/10',
      isInnovara: false,
    },
  }[activeTheme] || {
    bg: 'bg-white',
    borderOuter: 'border-slate-300',
    borderInner: 'border-transparent',
    accentGlow: 'from-transparent to-transparent',
    sealColor: 'border-transparent text-transparent bg-transparent',
    isInnovara: true,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Studio Banner */}
      <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold px-3 py-1 rounded-full">
              <Award className="w-3.5 h-3.5 text-teal-400" />
              Innovara Dynamics Official Certificate Studio
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Design & Issue Completion Certificates
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Official company certificate layout with authentic Innovara Dynamics rocket emblem, geometric teal framing, Snehal Dhumal signatory, and Innovara Dynamics Pune seal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <Save className="w-4 h-4 text-teal-400" />
              <span>{savedSuccess ? 'Saved!' : 'Save Template'}</span>
            </button>

            <button
              onClick={downloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-teal-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Rendering PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handleBatchIssue}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xl shadow-teal-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Batch Issue ({selectedInterns.length})</span>
            </button>
          </div>
        </div>
      </div>

      {issuedMessage && (
        <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs p-4 rounded-2xl flex items-center gap-3 shadow-xl animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold">{issuedMessage}</span>
        </div>
      )}

      {/* Main Studio Workspace: Left Controls + Right Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================================= */}
        {/* LEFT TOOLBAR CONTROLS (4 COLS) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Theme and Candidates Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-teal-400" />
                Certificate Aesthetic Theme
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'innovara_official', label: 'Innovara Official (Company Design)', color: 'from-teal-400 to-indigo-500' },
                  { id: 'executive_dark', label: 'Executive Obsidian', color: 'from-amber-500 to-indigo-500' },
                  { id: 'classic_gold', label: 'Royal Gold & Navy', color: 'from-yellow-400 to-purple-600' },
                  { id: 'cyber_emerald', label: 'Cyber Emerald', color: 'from-emerald-400 to-cyan-500' },
                  { id: 'minimal_light', label: 'Indigo Enterprise', color: 'from-indigo-400 to-sky-400' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => {
                      setActiveTheme(th.id as any);
                      setCurrentCert((prev) => ({ ...prev, theme: th.id as any }));
                    }}
                    className={`p-2 rounded-xl text-left text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
                      activeTheme === th.id
                        ? 'bg-slate-850 border-teal-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${th.color} shrink-0`} />
                    <span className="truncate">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Selector & Multi-selection */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Target Interns ({selectedInterns.length}/{availableUsers.length})
                </label>
                <button
                  onClick={toggleSelectAll}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  {selectedInternIds.length === availableUsers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Preview Cycler */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2.5 mb-2">
                <button
                  onClick={() => setPreviewIndex((prev) => (prev > 0 ? prev - 1 : selectedInterns.length - 1))}
                  disabled={selectedInterns.length <= 1}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Previous candidate"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center px-2">
                  <p className="font-bold text-xs text-white truncate max-w-[170px]">
                    {activePreviewIntern?.name || 'No Intern Selected'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Previewing {previewIndex + 1} of {selectedInterns.length}
                  </p>
                </div>

                <button
                  onClick={() => setPreviewIndex((prev) => (prev < selectedInterns.length - 1 ? prev + 1 : 0))}
                  disabled={selectedInterns.length <= 1}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Next candidate"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Dropdown Toggle */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full text-xs text-slate-400 bg-slate-950/80 border border-slate-800 p-2 rounded-xl text-left flex items-center justify-between hover:text-slate-200 cursor-pointer"
              >
                <span>{isDropdownOpen ? 'Collapse Candidates List' : 'Expand Multi-Select List'}</span>
                <span className="text-[10px] text-indigo-400 font-bold">
                  {selectedInterns.length} selected
                </span>
              </button>

              {isDropdownOpen && (
                <div className="mt-2 max-h-44 overflow-y-auto space-y-1 bg-slate-950 border border-slate-800 rounded-xl p-2">
                  {availableUsers.map((u) => {
                    const isSelected = selectedInternIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleSelectIntern(u.id)}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition ${
                          isSelected ? 'bg-indigo-950/60 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <p className="truncate text-xs">{u.name}</p>
                          <span className="text-[10px] text-slate-500 font-mono">{u.employeeCode}</span>
                        </div>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Official Signatures & Seal Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Signatures & Official Stamp
              </label>
              <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full font-bold">
                Innovara Verified
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-200">Snehal Dhumal</p>
                  <p className="text-[10px] text-slate-400">Innovara Dynamics</p>
                </div>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 border border-purple-800 px-2 py-0.5 rounded">
                  PUNE SEAL
                </span>
              </div>

              <div className="bg-white rounded-lg p-2 flex items-center justify-center">
                <img
                  src="/certificate/innovara_signature_seal_block.png"
                  alt="Snehal Dhumal Signature & Seal"
                  className="max-h-12 object-contain"
                />
              </div>
            </div>
          </div>

          {/* 2. Text Block Inspector & Properties */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Active Block Properties
              </label>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleAddBlock}
                  className="p-1.5 hover:bg-slate-800 text-indigo-400 rounded-lg cursor-pointer transition"
                  title="Add custom text block"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteBlock}
                  disabled={!selectedBlockId || currentCert.blocks.length <= 1}
                  className="p-1.5 hover:bg-rose-950/50 text-rose-400 rounded-lg cursor-pointer transition disabled:opacity-30"
                  title="Delete active block"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Block Select Dropdown */}
            <div>
              <select
                value={selectedBlockId || ''}
                onChange={(e) => setSelectedBlockId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {currentCert.blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} ({b.text.substring(0, 24)}...)
                  </option>
                ))}
              </select>
            </div>

            {/* Block Content Editor */}
            {selectedBlock && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Block Content Text</label>
                  <textarea
                    rows={3}
                    value={selectedBlock.text}
                    onChange={(e) => updateBlockProp('text', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                  />
                </div>

                {/* Placeholder Chips */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    Insert Placeholder Tag
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      '{name_full}',
                      '{name}',
                      '{role}',
                      '{department}',
                      '{internship_period}',
                      '{certificate_id}',
                      '{issue_date}',
                      '{company_name}',
                    ].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => insertPlaceholderTag(tag)}
                        className="bg-slate-950 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-700 text-indigo-300 text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typography Controls */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Font Size ({selectedBlock.fontSize}px)
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={46}
                      value={selectedBlock.fontSize}
                      onChange={(e) => updateBlockProp('fontSize', parseInt(e.target.value))}
                      className="w-full accent-teal-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Max Width ({selectedBlock.maxWidth}%)
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={selectedBlock.maxWidth}
                      onChange={(e) => updateBlockProp('maxWidth', parseInt(e.target.value))}
                      className="w-full accent-teal-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Alignment & Weight */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => updateBlockProp('textAlign', 'left')}
                      className={`flex-1 p-1 rounded-lg text-xs cursor-pointer flex justify-center ${
                        selectedBlock.textAlign === 'left' ? 'bg-teal-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateBlockProp('textAlign', 'center')}
                      className={`flex-1 p-1 rounded-lg text-xs cursor-pointer flex justify-center ${
                        selectedBlock.textAlign === 'center' ? 'bg-teal-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateBlockProp('textAlign', 'right')}
                      className={`flex-1 p-1 rounded-lg text-xs cursor-pointer flex justify-center ${
                        selectedBlock.textAlign === 'right' ? 'bg-teal-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => updateBlockProp('fontWeight', 'normal')}
                      className={`flex-1 py-1 rounded-lg text-[11px] cursor-pointer ${
                        selectedBlock.fontWeight === 'normal' ? 'bg-teal-600 text-white font-normal' : 'text-slate-400'
                      }`}
                    >
                      Regular
                    </button>
                    <button
                      onClick={() => updateBlockProp('fontWeight', 'bold')}
                      className={`flex-1 py-1 rounded-lg text-[11px] cursor-pointer ${
                        selectedBlock.fontWeight === 'bold' ? 'bg-teal-600 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      Bold
                    </button>
                  </div>
                </div>

                {/* Color Palette */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1.5">Block Text Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {['#1e293b', '#14b8a6', '#0d9488', '#475569', '#334155', '#2563eb', '#7c3aed', '#ffffff', '#fbbf24', '#f43f5e'].map(
                      (c) => (
                        <button
                          key={c}
                          onClick={() => updateBlockProp('color', c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border cursor-pointer transition ${
                            selectedBlock.color === c ? 'scale-110 ring-2 ring-teal-500' : 'border-slate-700'
                          }`}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Reset Defaults Button */}
                <div className="pt-2">
                  <button
                    onClick={handleResetDefaults}
                    className="w-full text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl py-2 text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default Blocks</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT CANVAS PREVIEW (8 COLS) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-400 px-2">
            <span className="flex items-center gap-1 font-semibold text-teal-300">
              <Move className="w-3.5 h-3.5 text-teal-400" />
              Interactive Canvas: Drag text blocks to reposition
            </span>
            <span className="text-[11px] bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
              Official Landscape (1.414 : 1)
            </span>
          </div>

          {/* Certificate Canvas Box */}
          <div className="w-full overflow-x-auto p-2 flex justify-center">
            <div
              ref={canvasRef}
              id="certificate-render-canvas"
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              style={{
                width: '100%',
                maxWidth: '820px',
                aspectRatio: '1.414 / 1',
                position: 'relative',
                backgroundColor: themeStyles.isInnovara ? '#ffffff' : undefined,
              }}
              className={`rounded-2xl shadow-2xl overflow-hidden select-none border-4 ${themeStyles.borderOuter} ${themeStyles.bg}`}
            >
              {/* If theme is Innovara Official, render the authentic background frame */}
              {themeStyles.isInnovara ? (
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none select-none"
                  style={{
                    backgroundImage: `url(${currentCert.backgroundImageUrl || '/certificate/innovara_certificate_frame.png'})`,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              ) : (
                <>
                  {/* Inner Ornamental Inset Border for generic themes */}
                  <div
                    className={`absolute inset-3 border-2 ${themeStyles.borderInner} rounded-xl pointer-events-none`}
                  />
                  <div className="absolute inset-5 border border-white/5 rounded-lg pointer-events-none" />
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-400/80 pointer-events-none" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-400/80 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-400/80 pointer-events-none" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-400/80 pointer-events-none" />
                  <div
                    className={`absolute top-0 left-1/4 right-1/4 h-36 bg-gradient-to-b ${themeStyles.accentGlow} blur-2xl pointer-events-none`}
                  />
                  <div
                    className={`absolute bottom-6 right-8 w-24 h-24 rounded-full border-2 ${themeStyles.sealColor} flex flex-col items-center justify-center text-center p-2 shadow-inner pointer-events-none rotate-[-6deg]`}
                  >
                    <Award className="w-6 h-6 mb-0.5" />
                    <span className="text-[7px] font-extrabold uppercase tracking-widest leading-none">
                      OFFICIAL
                    </span>
                    <span className="text-[6px] tracking-tighter text-slate-300 mt-0.5">
                      VERIFIED
                    </span>
                  </div>
                </>
              )}

              {/* Render Draggable Blocks */}
              {currentCert.blocks.map((block) => {
                const resolvedText = replaceCertificatePlaceholders(block.text, activePreviewIntern || {});
                const isSelected = selectedBlockId === block.id;

                return (
                  <div
                    key={block.id}
                    onMouseDown={(e) => handleCanvasMouseDown(e, block.id)}
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
                      cursor: 'grab',
                      transition: isDragging ? 'none' : 'box-shadow 0.2s',
                    }}
                    className={`p-1 rounded-lg ${
                      isSelected ? 'ring-2 ring-teal-500 bg-teal-500/10 shadow-lg' : 'hover:bg-teal-500/5'
                    }`}
                  >
                    {resolvedText}
                  </div>
                );
              })}

              {/* Official Snehal Dhumal Signature & Innovara Dynamics Pune Stamp Block */}
              {themeStyles.isInnovara ? (
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
                    src={currentCert.signatureSealBlockUrl || '/certificate/innovara_signature_seal_block.png'}
                    alt="Snehal Dhumal Signature and Innovara Dynamics Seal"
                    className="w-full h-auto object-contain"
                  />
                </div>
              ) : currentCert.directorSignatureUrl ? (
                <div
                  style={{
                    position: 'absolute',
                    left: '19%',
                    top: '73%',
                    width: '120px',
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src={currentCert.directorSignatureUrl}
                    alt="Director Signature"
                    className="h-10 max-w-full object-contain filter invert opacity-90"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
