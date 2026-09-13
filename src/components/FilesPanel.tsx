import React, { useState, useRef } from 'react';
import { FileUp, Download, X, FileText, CheckCircle2, AlertCircle, HardDrive, Shield } from 'lucide-react';
import { SharedFile } from '../types';

interface FilesPanelProps {
  roomId: string;
  files: SharedFile[];
  userId: string;
  userName: string;
  onFileUploaded: (file: SharedFile) => void;
  onClose: () => void;
}

export const FilesPanel: React.FC<FilesPanelProps> = ({
  roomId,
  files,
  userId,
  userName,
  onFileUploaded,
  onClose,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploadError(null);

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds the 15MB limit.');
      return;
    }

    // Validate extension
    const blockedExts = ['.exe', '.sh', '.bat', '.cmd', '.vbs'];
    const hasBlocked = blockedExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (hasBlocked) {
      setUploadError('Executable files are blocked for security reasons.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('userName', userName);

    setUploading(true);
    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(roomId)}/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await res.json();
      onFileUploaded(data.file);
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      id="meeting-files-panel"
      className="w-full sm:w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-2xl animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">In-Meeting Files</h3>
          <span className="text-[11px] text-slate-400">({files.length})</span>
        </div>
        <button
          id="close-files-panel-btn"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drag and Drop Zone */}
      <div className="p-4 border-b border-slate-800">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-950/30'
              : 'border-slate-700 hover:border-slate-600 bg-slate-800/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUpload(e.target.files[0]);
              }
            }}
          />
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
            <FileUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-200">
            {uploading ? 'Uploading to room...' : 'Click or drop files to share'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Max 15MB per file &bull; PDF, Code, Images, Docs</p>
        </div>

        {uploadError && (
          <div className="mt-2 p-2 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <FileText className="w-8 h-8 mb-2 opacity-30 text-indigo-400" />
            <p className="text-xs">No files shared yet.</p>
            <p className="text-[11px] mt-1 text-slate-500">
              Upload code files, slides, or assignment briefs for attendees.
            </p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              id={`file-item-${file.id}`}
              className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate group-hover:text-indigo-300">
                    {file.file_name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>&bull;</span>
                    <span>By {file.user_name}</span>
                  </div>
                </div>
              </div>

              <a
                id={`download-file-${file.id}`}
                href={`/api/files/download/${file.id}`}
                download={file.file_name}
                className="p-2 rounded-lg bg-slate-700/60 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors shrink-0"
                title="Download safe file"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          ))
        )}
      </div>

      {/* Security Footer Note */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center gap-2 text-[11px] text-slate-400">
        <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Validated file sanitization and server-side virus scanning</span>
      </div>
    </div>
  );
};
