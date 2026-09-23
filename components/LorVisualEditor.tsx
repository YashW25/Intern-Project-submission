'use client';

import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LorData, TextBlockPosition } from '@/types';
import { getCompanyLetterheadSvgUrl } from '@/lib/letterhead';
import {
  Upload,
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
  UserCheck,
  FileText,
  Tag,
  Sparkles,
  Save,
  CheckSquare,
  Square,
  Users,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';

interface InternUser {
  id: string;
  name: string;
  email: string;
  department: string;
  internshipPeriod: string;
}

interface LorVisualEditorProps {
  lorData: LorData;
  onSaveLor?: (updatedLor: LorData) => void;
  onIssueLor?: (updatedLor: LorData) => void;
}

const INNOVARA_RECOMMENDATION_PARA = `To Whom It May Concern,

I am pleased to recommend {name_full}, who successfully completed an internship at Innovara Dynamics as a {role}.

During their time with Innovara Dynamics, {name} demonstrated a strong sense of responsibility, willingness to learn, and commitment towards assigned responsibilities.

One of the qualities that stood out was their ability to adapt to new challenges and work effectively in a dynamic environment. {name} showed initiative in understanding assigned tasks, seeking solutions to problems, and completing responsibilities within the expected timelines. They were also receptive to feedback and demonstrated continuous improvement throughout the internship.

In addition to their technical/professional abilities, {name} maintained a positive attitude and worked well with other team members. Their communication, teamwork, and willingness to take ownership of their work made them a valuable member of the internship team.

Their efforts contributed positively to the overall progress of the project.

Based on their performance during the internship, I believe {name} has the potential to grow and succeed in their future academic and professional endeavors. I am confident that the knowledge, experience, and professional exposure gained at Innovara Dynamics will serve them well in their future career.

I therefore recommend {name} for future academic opportunities, internships, employment, and other professional endeavors.

I wish them all the very best for their future.`;

export const LorVisualEditor: React.FC<LorVisualEditorProps> = ({
  lorData,
  onSaveLor,
  onIssueLor,
}) => {
  const [currentLor, setCurrentLor] = useState<LorData>(lorData);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(lorData.blocks[0]?.id || null);
  const [letterheadImage, setLetterheadImage] = useState<string>(
    lorData.letterheadBgUrl || getCompanyLetterheadSvgUrl()
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [issuedMessage, setIssuedMessage] = useState<string>('');

  const [availableUsers, setAvailableUsers] = useState<InternUser[]>([]);
  const [selectedInternIds, setSelectedInternIds] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch registered interns from backend API
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/users').then((r) => r.json());
        if (res?.users && res.users.length > 0) {
          setAvailableUsers(res.users);
          setSelectedInternIds(res.users.map((u: InternUser) => u.id));
        }
      } catch (e) {
        console.warn('Failed to load users:', e);
      }
    }
    loadUsers();
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

  const selectedBlock = currentLor.blocks.find((b) => b.id === selectedBlockId);

  // Dynamic Placeholder Replacer Function
  const replacePlaceholders = (text: string, targetUser?: InternUser | null): string => {
    if (!text) return '';
    const userToUse = targetUser || activePreviewIntern;
    const fullName = userToUse?.name || currentLor.userName || 'Jeenisha Bhutekar';
    const firstName = fullName.trim().split(' ')[0] || 'Intern';
    const role = userToUse?.department || currentLor.department || 'Software Engineering Intern';
    const period = userToUse?.internshipPeriod || currentLor.internshipPeriod || 'June 2026 - Sept 2026';
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const refSeq = `INVD26/LOR/${Math.floor(5470 + (userToUse?.id ? userToUse.id.length * 3 : 6))}`;
    const company = 'Innovara Dynamics';

    return text
      .replace(/\{download_date\}/g, currentDate)
      .replace(/\{name_full\}/g, fullName)
      .replace(/\{name\}/g, firstName)
      .replace(/\{role\}/g, role)
      .replace(/\{internship_period\}/g, period)
      .replace(/\{lor_nex_id\}/g, refSeq)
      .replace(/\{department\}/g, role)
      .replace(/\{company_name\}/g, company);
  };

  // Add new text block
  const handleAddBlock = () => {
    const newId = `block_${Date.now()}`;
    const newBlock: TextBlockPosition = {
      id: newId,
      label: `Block ${currentLor.blocks.length + 1}`,
      text: 'New paragraph text block...',
      x: 8,
      y: 45,
      fontSize: 12,
      fontWeight: 'normal',
      color: '#1e293b',
      textAlign: 'left',
      maxWidth: 84,
    };
    setCurrentLor((prev) => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
    setSelectedBlockId(newId);
  };

  // Delete selected text block
  const handleDeleteBlock = () => {
    if (!selectedBlockId) return;
    const remaining = currentLor.blocks.filter((b) => b.id !== selectedBlockId);
    setCurrentLor((prev) => ({ ...prev, blocks: remaining }));
    setSelectedBlockId(remaining[0]?.id || null);
  };

  // Insert placeholder tag into active text box
  const insertPlaceholderTag = (tag: string) => {
    if (!selectedBlockId || !selectedBlock) return;
    updateBlockProp('text', selectedBlock.text + (selectedBlock.text ? ' ' : '') + tag);
  };

  // Load Innovara Recommendation Paragraph Preset into active block or create new block
  const loadInnovaraPreset = () => {
    if (selectedBlock) {
      updateBlockProp('text', INNOVARA_RECOMMENDATION_PARA);
      updateBlockProp('label', 'Innovara Recommendation Body');
      updateBlockProp('fontSize', 11);
    } else {
      const newId = `block_innovara_${Date.now()}`;
      const newBlock: TextBlockPosition = {
        id: newId,
        label: 'Innovara Recommendation Body',
        text: INNOVARA_RECOMMENDATION_PARA,
        x: 8,
        y: 35,
        fontSize: 11,
        fontWeight: 'normal',
        color: '#1e293b',
        textAlign: 'left',
        maxWidth: 84,
      };
      setCurrentLor((prev) => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
      setSelectedBlockId(newId);
    }
  };

  // Upload custom letterhead
  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newBgUrl = event.target.result as string;
          setLetterheadImage(newBgUrl);
          setCurrentLor((prev) => ({ ...prev, letterheadBgUrl: newBgUrl }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetDefaultLetterhead = () => {
    const defaultBg = getCompanyLetterheadSvgUrl();
    setLetterheadImage(defaultBg);
    setCurrentLor((prev) => ({ ...prev, letterheadBgUrl: defaultBg }));
  };

  const updateBlockProp = (prop: keyof TextBlockPosition, value: any) => {
    if (!selectedBlockId) return;
    setCurrentLor((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === selectedBlockId ? { ...b, [prop]: value } : b)),
    }));
  };

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

    setCurrentLor((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === selectedBlockId ? { ...b, x: clampedX, y: clampedY } : b)),
    }));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const downloadPdf = async () => {
    if (!canvasRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const element = canvasRef.current;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`LOR_${(activePreviewIntern?.name || currentLor.userName).replace(/\s+/g, '_')}_PeopleOS.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSave = () => {
    setSavedSuccess(true);
    if (onSaveLor) onSaveLor(currentLor);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Batch issue LOR to all selected interns
  const handleIssue = async () => {
    if (selectedInterns.length === 0) return;

    let issuedCount = 0;

    for (const intern of selectedInterns) {
      const resolvedBlocks = currentLor.blocks.map((b) => ({
        ...b,
        text: replacePlaceholders(b.text, intern),
      }));

      const issued: LorData = {
        ...currentLor,
        userId: intern.id,
        userEmail: intern.email,
        userName: intern.name,
        department: intern.department,
        internshipPeriod: intern.internshipPeriod,
        blocks: resolvedBlocks,
        status: 'issued',
        issuedAt: new Date().toISOString(),
      };

      try {
        await fetch('/api/lor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(issued),
        });
        issuedCount++;
      } catch (e) {
        console.error('Failed to issue LOR for intern:', intern.name, e);
      }
    }

    setIssuedMessage(`Successfully issued & authorized LOR for ${issuedCount} intern(s)!`);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIssuedMessage('');
    }, 4000);
  };

  const isAllSelected = availableUsers.length > 0 && selectedInternIds.length === availableUsers.length;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Action Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Visual LOR Letterhead Studio
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Customize layout, insert dynamic placeholders (<code className="text-indigo-300 font-mono font-bold">{"{name}"}</code>, <code className="text-indigo-300 font-mono font-bold">{"{role}"}</code>, <code className="text-indigo-300 font-mono font-bold">{"{download_date}"}</code>, <code className="text-indigo-300 font-mono font-bold">{"{lor_nex_id}"}</code>), and batch issue to interns.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium px-4 py-2 rounded-xl border border-slate-700 cursor-pointer transition">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Upload Letterhead</span>
              <input type="file" accept="image/*" onChange={handleLetterheadUpload} className="hidden" />
            </label>

            <button
              onClick={resetDefaultLetterhead}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition"
              title="Reset default company letterhead"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={downloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-sm font-medium px-4 py-2 rounded-xl border border-indigo-500/30 transition disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Rendering PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handleIssue}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm px-5 py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Issue & Authorize LOR for Selected Interns ({selectedInterns.length})</span>
            </button>
          </div>
        </div>

        {issuedMessage && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fadeIn shadow-lg">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{issuedMessage}</span>
          </div>
        )}

        {/* Multiselect Target Intern Selector Bar */}
        <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Select Target Interns ({selectedInterns.length} of {availableUsers.length} Selected)
                </p>
                <p className="text-[11px] text-slate-400">Select multiple interns to batch authorize and issue custom LORs in 1 click</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                {isAllSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-400" />}
                <span>{isAllSelected ? 'Deselect All' : 'Select All Interns'}</span>
              </button>

              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                <span>{isDropdownOpen ? 'Close Selector' : 'Toggle Intern List'}</span>
              </button>
            </div>
          </div>

          {/* Intern Checkbox Grid / Selector Pills */}
          {availableUsers.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {availableUsers.map((u) => {
                const isSelected = selectedInternIds.includes(u.id);
                const isPreviewing = activePreviewIntern?.id === u.id;

                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/70 text-indigo-100 shadow'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                    } ${isPreviewing ? 'ring-2 ring-cyan-400 border-cyan-400' : ''}`}
                    onClick={() => toggleSelectIntern(u.id)}
                  >
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center text-white">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-slate-600 bg-slate-950" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="font-semibold text-slate-200">{u.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({u.department})</span>
                    </div>

                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const idx = selectedInterns.findIndex((x) => x.id === u.id);
                          if (idx !== -1) setPreviewIndex(idx);
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition ${
                          isPreviewing ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                        title="Preview live canvas for this intern"
                      >
                        {isPreviewing ? 'Previewing' : 'Preview'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-amber-400 font-medium italic">Loading available interns...</div>
          )}

          {/* Live Preview Switcher Bar */}
          {selectedInterns.length > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300">Live Canvas Preview:</span>
                <span className="text-cyan-300 font-semibold">{activePreviewIntern?.name}</span>
                <span className="text-slate-500">({previewIndex + 1} of {selectedInterns.length} selected)</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewIndex((prev) => (prev > 0 ? prev - 1 : selectedInterns.length - 1))}
                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300"
                  title="Previous intern preview"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewIndex((prev) => (prev < selectedInterns.length - 1 ? prev + 1 : 0))}
                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300"
                  title="Next intern preview"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Studio Area (Control Panel + Live Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Controls */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Text Manipulation Controls
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddBlock}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition"
                title="Add new text block"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Block</span>
              </button>
            </div>
          </div>

          {/* Block Selection List & Delete */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-400">Select Text Element</label>
              {selectedBlockId && (
                <button
                  onClick={handleDeleteBlock}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/60 px-2 py-0.5 rounded-md transition"
                  title="Delete selected text block"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Block</span>
                </button>
              )}
            </div>

            <select
              value={selectedBlockId || ''}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              {currentLor.blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.label} ({block.id})
                </option>
              ))}
            </select>
          </div>

          {selectedBlock ? (
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              {/* Text Block Label */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Block Name / Label</label>
                <input
                  type="text"
                  value={selectedBlock.label}
                  onChange={(e) => updateBlockProp('label', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Text Field Editor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-400">Text Content</label>
                  <button
                    onClick={loadInnovaraPreset}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded-md transition"
                    title="Load full Innovara recommendation paragraph"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Load Innovara Preset</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={selectedBlock.text}
                  onChange={(e) => updateBlockProp('text', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                />

                {/* Quick Insert Tag Pills */}
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-wider">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    Insert Dynamic Tags:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      '{name}',
                      '{name_full}',
                      '{role}',
                      '{download_date}',
                      '{lor_nex_id}',
                      '{internship_period}',
                      '{company_name}',
                    ].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => insertPlaceholderTag(tag)}
                        className="text-[10px] font-mono font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-md transition cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* X / Y Position Sliders */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                    <span>X Position</span>
                    <span className="text-indigo-400">{selectedBlock.x}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="0.5"
                    value={selectedBlock.x}
                    onChange={(e) => updateBlockProp('x', parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                    <span>Y Position</span>
                    <span className="text-indigo-400">{selectedBlock.y}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="95"
                    step="0.5"
                    value={selectedBlock.y}
                    onChange={(e) => updateBlockProp('y', parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Font Size & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Font Size (px)</label>
                  <input
                    type="number"
                    min="8"
                    max="48"
                    value={selectedBlock.fontSize}
                    onChange={(e) => updateBlockProp('fontSize', parseInt(e.target.value) || 12)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Weight</label>
                  <select
                    value={selectedBlock.fontWeight}
                    onChange={(e) => updateBlockProp('fontWeight', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="normal">Normal</option>
                    <option value="500">Medium</option>
                    <option value="600">Semi-Bold</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>

              {/* Alignment & Text Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Align</label>
                  <div className="flex border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                    <button
                      onClick={() => updateBlockProp('textAlign', 'left')}
                      className={`flex-1 py-1.5 flex justify-center ${
                        selectedBlock.textAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateBlockProp('textAlign', 'center')}
                      className={`flex-1 py-1.5 flex justify-center ${
                        selectedBlock.textAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateBlockProp('textAlign', 'right')}
                      className={`flex-1 py-1.5 flex justify-center ${
                        selectedBlock.textAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedBlock.color}
                      onChange={(e) => updateBlockProp('color', e.target.value)}
                      className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-300 uppercase">{selectedBlock.color}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center py-4">Click any text element on the canvas to edit formatting</p>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleAddBlock}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Text Block</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 transition"
            >
              <Save className="w-3.5 h-3.5 text-indigo-400" />
              <span>{savedSuccess ? 'Saved!' : 'Save Layout State'}</span>
            </button>
          </div>
        </div>

        {/* Right Side - Interactive Live Canvas Preview */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-indigo-400" />
            <span>Direct Manipulation Canvas: Drag text to reposition. Previewing: <strong className="text-cyan-300">{activePreviewIntern?.name}</strong></span>
          </div>

          <div
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="w-[800px] h-[1130px] bg-white relative rounded-sm shadow-2xl overflow-hidden border border-slate-300 origin-top transform scale-[0.68] sm:scale-[0.75] md:scale-[0.85] lg:scale-[0.95] transition-transform"
            style={{
              backgroundImage: `url("${letterheadImage}")`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Render Editable Text Blocks with Live Resolved Placeholders for Active Preview Intern */}
            {currentLor.blocks.map((block) => {
              const isSelected = selectedBlockId === block.id;
              const resolvedText = replacePlaceholders(block.text, activePreviewIntern);

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
                    cursor: 'move',
                    userSelect: 'none',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  className={`p-1 rounded transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 bg-indigo-500/10 shadow-lg'
                      : 'hover:ring-1 hover:ring-indigo-300 hover:bg-indigo-50/20'
                  }`}
                >
                  {resolvedText}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
