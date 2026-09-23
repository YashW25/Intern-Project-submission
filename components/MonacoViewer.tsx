'use client';

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { CodeFile, FileTreeNode } from '@/types';
import { Folder, FolderOpen, FileCode, FileText, File, Download, Copy, Check, Expand, Shrink } from 'lucide-react';

interface MonacoViewerProps {
  files: CodeFile[];
  fileTree?: FileTreeNode[];
  readOnly?: boolean;
  onCodeChange?: (path: string, newContent: string) => void;
}

export const MonacoViewer: React.FC<MonacoViewerProps> = ({
  files,
  fileTree,
  readOnly = true,
  onCodeChange,
}) => {
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(files[0] || null);
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'src': true });

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleFileSelect = (filePath: string) => {
    const found = files.find((f) => f.path === filePath || f.name === filePath);
    if (found) {
      setSelectedFile(found);
    }
  };

  const copyToClipboard = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageForEditor = (lang?: string, fileName?: string): string => {
    if (lang) {
      const l = lang.toLowerCase();
      if (l === 'ts' || l === 'typescript') return 'typescript';
      if (l === 'js' || l === 'javascript') return 'javascript';
      if (l === 'json') return 'json';
      if (l === 'md' || l === 'markdown') return 'markdown';
      if (l === 'html') return 'html';
      if (l === 'css') return 'css';
      if (l === 'py' || l === 'python') return 'python';
      if (l === 'cpp' || l === 'c++') return 'cpp';
      if (l === 'sql') return 'sql';
      return l;
    }
    if (fileName) {
      if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript';
      if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
      if (fileName.endsWith('.json')) return 'json';
      if (fileName.endsWith('.md')) return 'markdown';
      if (fileName.endsWith('.html')) return 'html';
      if (fileName.endsWith('.css')) return 'css';
      if (fileName.endsWith('.py')) return 'python';
      if (fileName.endsWith('.sql')) return 'sql';
    }
    return 'plaintext';
  };

  const renderTree = (nodes: FileTreeNode[]) => {
    return (
      <ul className="pl-2 space-y-1 text-sm font-mono select-none">
        {nodes.map((node) => {
          if (node.type === 'directory') {
            const isOpen = expandedFolders[node.path];
            return (
              <li key={node.path}>
                <div
                  onClick={() => toggleFolder(node.path)}
                  className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-slate-800/60 text-slate-300 transition-colors"
                >
                  {isOpen ? (
                    <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">{node.name}</span>
                </div>
                {isOpen && node.children && (
                  <div className="border-l border-slate-700/50 ml-3">
                    {renderTree(node.children)}
                  </div>
                )}
              </li>
            );
          } else {
            const isSelected = selectedFile?.path === node.path || selectedFile?.name === node.name;
            return (
              <li key={node.path}>
                <div
                  onClick={() => handleFileSelect(node.path)}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/30 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                      : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{node.name}</span>
                </div>
              </li>
            );
          }
        })}
      </ul>
    );
  };

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col ${
        isFullScreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'h-[620px] w-full'
      }`}
    >
      {/* Top Action Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span className="text-xs font-mono text-slate-400 border-l border-slate-800 pl-3 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            {selectedFile ? selectedFile.path : 'No file loaded'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedFile && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-700/60 transition"
              title="Copy code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-md border border-slate-700/60 transition"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content (File Tree Sidebar + Monaco Editor) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar File Tree */}
        <div className="w-64 bg-slate-950/80 border-r border-slate-800/80 p-3 overflow-y-auto shrink-0 hidden md:block">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-2 flex items-center justify-between">
            <span>Project Files</span>
            <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
              {files.length} Files
            </span>
          </div>

          {fileTree && fileTree.length > 0 ? (
            renderTree(fileTree)
          ) : (
            <ul className="space-y-1 text-sm font-mono">
              {files.map((file) => (
                <li key={file.path}>
                  <div
                    onClick={() => setSelectedFile(file)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      selectedFile?.path === file.path
                        ? 'bg-indigo-600/30 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                        : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate text-xs">{file.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-1 bg-slate-900 relative">
          {selectedFile ? (
            <Editor
              height="100%"
              path={selectedFile.path}
              defaultLanguage={getLanguageForEditor(selectedFile.language, selectedFile.name)}
              language={getLanguageForEditor(selectedFile.language, selectedFile.name)}
              value={selectedFile.content}
              theme="vs-dark"
              options={{
                readOnly,
                minimap: { enabled: true },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineHeight: 22,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                renderLineHighlight: 'all',
              }}
              onChange={(value) => {
                if (value !== undefined && onCodeChange && selectedFile) {
                  onCodeChange(selectedFile.path, value);
                }
              }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <File className="w-12 h-12 mb-2 stroke-1 text-slate-600" />
              <p className="text-sm">Select a file from the explorer to view code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
