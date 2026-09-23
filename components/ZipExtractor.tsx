'use client';

import React, { useState } from 'react';
import JSZip from 'jszip';
import { CodeFile, FileTreeNode } from '@/types';
import { MonacoViewer } from './MonacoViewer';
import { UploadCloud, FileArchive, CheckCircle2, AlertCircle, Loader2, Sparkles, Send } from 'lucide-react';

interface ZipExtractorProps {
  onSubmissionSuccess?: (submissionData: any) => void;
  userId?: string;
  userName?: string;
  userEmail?: string;
}

export const ZipExtractor: React.FC<ZipExtractorProps> = ({
  onSubmissionSuccess,
  userId = 'usr_intern_1',
  userName = 'Alex Rivera',
  userEmail = 'alex.rivera@intern.peopleos.tech',
}) => {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [extractedFiles, setExtractedFiles] = useState<CodeFile[]>([]);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const processZip = async (file: File) => {
    setError(null);
    setSuccess(false);
    setExtracting(true);
    setZipFile(file);

    try {
      const jszip = new JSZip();
      const zipContent = await jszip.loadAsync(file);

      const parsedFiles: CodeFile[] = [];
      const treeMap: Record<string, FileTreeNode> = {};
      const rootNodes: FileTreeNode[] = [];

      const fileEntries = Object.entries(zipContent.files);

      for (const [relativePath, zipEntry] of fileEntries) {
        if (zipEntry.dir) continue;
        // Ignore binary / node_modules for code editor preview
        if (relativePath.includes('node_modules/') || relativePath.includes('.git/') || relativePath.includes('dist/')) {
          continue;
        }

        const isTextFile = /\.(ts|tsx|js|jsx|json|md|css|html|py|sql|c|cpp|h|java|go|rs|env|txt|yaml|yml)$/i.test(relativePath);
        
        let content = '';
        if (isTextFile) {
          content = await zipEntry.async('string');
        } else {
          content = `// [Binary or Media File: ${relativePath}]\n// Visualizing text content only.`;
        }

        const pathSegments = relativePath.split('/');
        const fileName = pathSegments[pathSegments.length - 1];
        const ext = fileName.split('.').pop() || '';

        parsedFiles.push({
          path: relativePath,
          name: fileName,
          content,
          language: ext,
          size: (zipEntry as any)._data ? (zipEntry as any)._data.uncompressedSize || content.length : content.length,
        });

        // Build File Tree Hierarchy
        let currentPath = '';
        let currentChildren = rootNodes;

        for (let i = 0; i < pathSegments.length; i++) {
          const segment = pathSegments[i];
          currentPath = currentPath ? `${currentPath}/${segment}` : segment;
          const isFile = i === pathSegments.length - 1;

          if (isFile) {
            currentChildren.push({
              name: segment,
              path: currentPath,
              type: 'file',
              language: ext,
            });
          } else {
            let existingDir = currentChildren.find((n) => n.path === currentPath && n.type === 'directory');
            if (!existingDir) {
              existingDir = {
                name: segment,
                path: currentPath,
                type: 'directory',
                children: [],
              };
              currentChildren.push(existingDir);
            }
            if (!existingDir.children) existingDir.children = [];
            currentChildren = existingDir.children;
          }
        }
      }

      setExtractedFiles(parsedFiles);
      setFileTree(rootNodes);
      if (!projectTitle) {
        const cleanName = file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
        setProjectTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err: any) {
      console.error('Failed to extract zip file:', err);
      setError('Could not extract ZIP file. Please ensure it is a valid zip archive.');
    } finally {
      setExtracting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        processZip(file);
      } else {
        setError('Please upload a .zip archive file.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processZip(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!projectTitle) {
      setError('Please provide a Project Title.');
      return;
    }
    if (extractedFiles.length === 0) {
      setError('No extracted code files to submit. Please upload a project ZIP.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload ZIP to hidden Cloud Vault Storage
      let uploadedFileId = 'vault_' + Date.now();
      if (zipFile) {
        const formData = new FormData();
        formData.append('file', zipFile);
        const uploadRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.fileId) {
          uploadedFileId = uploadData.fileId;
        }
      }

      // 2. Save submission payload to database
      const payload = {
        userId,
        userName,
        userEmail,
        projectTitle,
        description: projectDescription || 'Intern Project Submission',
        zipFileId: uploadedFileId,
        zipFileName: zipFile?.name || 'submission.zip',
        fileTree,
        files: extractedFiles,
      };

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok) {
        setSuccess(true);
        if (onSubmissionSuccess) {
          onSubmissionSuccess(resData.submission);
        }
      } else {
        setError(resData.error || 'Failed to submit project');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError('Failed to transmit project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              Upload Project Archive
            </h3>
            <p className="text-sm text-slate-400">
              Upload your complete project as a <code className="text-indigo-300 font-mono">.zip</code> file. It will auto-extract on the server and render in Monaco Editor.
            </p>
          </div>
          <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Monaco Auto-Viewer Enabled
          </span>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 rounded-xl p-8 text-center bg-slate-950/40 hover:bg-indigo-950/20 transition-all cursor-pointer group"
        >
          <input
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
            id="zip-upload-input"
          />
          <label htmlFor="zip-upload-input" className="cursor-pointer block">
            {extracting ? (
              <div className="flex flex-col items-center py-4">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
                <p className="text-sm text-indigo-300 font-semibold">Decompressing and parsing project files...</p>
              </div>
            ) : zipFile ? (
              <div className="flex flex-col items-center py-2">
                <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 mb-2 border border-indigo-500/30">
                  <FileArchive className="w-6 h-6" />
                </div>
                <p className="text-base font-semibold text-slate-200">{zipFile.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {(zipFile.size / (1024 * 1024)).toFixed(2)} MB • {extractedFiles.length} files extracted
                </p>
                <span className="mt-3 text-xs text-indigo-400 hover:underline">Click or drop to replace zip</span>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                <div className="w-14 h-14 bg-slate-800/80 group-hover:bg-indigo-600/20 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors mb-3 border border-slate-700">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  Drag and drop your project <span className="text-indigo-400 font-mono">.zip</span> here
                </p>
                <p className="text-xs text-slate-500 mt-1">Maximum recommended file size: 50MB</p>
              </div>
            )}
          </label>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Project submitted successfully! Stored securely in Cloud Vault and awaiting Admin review.</span>
          </div>
        )}
      </div>

      {/* Extracted Code Preview in Monaco */}
      {extractedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-base font-bold text-slate-200 flex items-center gap-2">
              Submission Metadata
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Project Title</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g., Distributed Task Scheduler"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Brief summary of implemented features..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting Project...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Project to Server</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider px-1">
              Extracted Code Explorer (Monaco Visualizer)
            </h4>
            <MonacoViewer files={extractedFiles} fileTree={fileTree} readOnly={false} />
          </div>
        </div>
      )}
    </div>
  );
};
