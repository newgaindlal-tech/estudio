'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DocumentMetadata, VaultCategory } from '@/types/database.types';
import { validateUploadedFile, sanitizeTitle } from '@/lib/vault/security';
import {
  FolderArchive,
  Upload,
  Search,
  Eye,
  Download,
  Trash2,
  Edit2,
  RefreshCw,
  FileText,
  ImageIcon,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  Plus,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

const CATEGORIES: VaultCategory[] = [
  'Aadhaar',
  'College ID',
  'Admit Card',
  'Certificate',
  'Other',
];

export default function DocumentVaultPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | VaultCategory>('ALL');

  // Modal: Upload Document
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<VaultCategory>('College ID');
  const [uploadIssueDate, setUploadIssueDate] = useState('');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');

  // Modal: Rename / Edit
  const [editingDoc, setEditingDoc] = useState<DocumentMetadata | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<VaultCategory>('College ID');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Modal: File Preview
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; mimeType: string } | null>(null);
  const [targetDocForReplace, setTargetDocForReplace] = useState<DocumentMetadata | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setFeedback({ type: 'error', text: `Failed to load vault: ${error.message}` });
    } else if (data) {
      setDocuments(data as DocumentMetadata[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.notes && doc.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [documents, searchQuery, selectedCategory]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) {
      setFeedback({ type: 'error', text: 'Please choose a file and title.' });
      return;
    }

    const validation = validateUploadedFile(uploadFile);
    if (!validation.valid) {
      setFeedback({ type: 'error', text: validation.error || 'Invalid file format.' });
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const fileExt = uploadFile.name.split('.').pop()?.toLowerCase();
      const uniqueId = crypto.randomUUID();
      const storagePath = `${user.id}/${uniqueId}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('vault')
        .upload(storagePath, uploadFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: uploadFile.type,
        });

      if (storageError) throw storageError;

      const cleanTitle = sanitizeTitle(uploadTitle);

      const { error: dbError } = await supabase.from('documents').insert({
        user_id: user.id,
        title: cleanTitle,
        category: uploadCategory,
        file_path: storagePath,
        file_size_bytes: uploadFile.size,
        mime_type: uploadFile.type,
        issue_date: uploadIssueDate || null,
        expiry_date: uploadExpiryDate || null,
        notes: uploadNotes ? uploadNotes.slice(0, 500) : null,
        is_private: true,
      });

      if (dbError) throw dbError;

      setFeedback({ type: 'success', text: `"${cleanTitle}" saved to your private vault.` });
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadCategory('College ID');
      setUploadIssueDate('');
      setUploadExpiryDate('');
      setUploadNotes('');
      await fetchDocuments();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Upload failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDocument = async (doc: DocumentMetadata) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.storage
        .from('vault')
        .createSignedUrl(doc.file_path, 60);

      if (error || !data?.signedUrl) throw error || new Error('Could not create secure link.');

      setPreviewDoc({
        title: doc.title,
        url: data.signedUrl,
        mimeType: doc.mime_type,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: `View error: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadDocument = async (doc: DocumentMetadata) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.storage.from('vault').download(doc.file_path);
      if (error || !data) throw error || new Error('Download failed.');

      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = doc.file_path.split('.').pop() || 'file';
      a.download = `${doc.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Download error: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDocument = async (doc: DocumentMetadata) => {
    if (!confirm(`Permanently delete "${doc.title}" from your vault?`)) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      await supabase.storage.from('vault').remove([doc.file_path]);
      const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id);
      if (dbError) throw dbError;

      setFeedback({ type: 'success', text: `"${doc.title}" removed.` });
      await fetchDocuments();
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Deletion failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editTitle.trim()) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          title: sanitizeTitle(editTitle),
          category: editCategory,
          issue_date: editIssueDate || null,
          expiry_date: editExpiryDate || null,
          notes: editNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingDoc.id);

      if (error) throw error;

      setFeedback({ type: 'success', text: 'Document details updated.' });
      setEditingDoc(null);
      await fetchDocuments();
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Update error: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileReplaced = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0];
    if (!newFile || !targetDocForReplace) return;

    const validation = validateUploadedFile(newFile);
    if (!validation.valid) {
      setFeedback({ type: 'error', text: validation.error || 'Invalid file format.' });
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    try {
      const { error: storageError } = await supabase.storage
        .from('vault')
        .upload(targetDocForReplace.file_path, newFile, {
          upsert: true,
          contentType: newFile.type,
        });

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .update({
          file_size_bytes: newFile.size,
          mime_type: newFile.type || 'application/octet-stream',
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetDocForReplace.id);

      if (dbError) throw dbError;

      setFeedback({ type: 'success', text: `File for "${targetDocForReplace.title}" replaced.` });
      setTargetDocForReplace(null);
      await fetchDocuments();
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Replacement failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400 font-medium">Loading vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleFileReplaced}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <FolderArchive className="w-6 h-6 text-emerald-500" />
            Document Vault
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Encrypted personal vault for college credentials and certificates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({documents.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Documents */}
      {filteredDocs.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <FolderArchive className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-bold text-white text-base">No documents found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'No documents match your filter criteria.'
              : 'Store your College ID, Admit Card, or Marksheets privately.'}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Upload File
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isPdf = doc.mime_type.includes('pdf');
            return (
              <div
                key={doc.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-900/60 text-emerald-400 shrink-0">
                      {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-white text-sm truncate" title={doc.title}>
                        {doc.title}
                      </h4>
                      <span className="text-[10px] font-semibold text-emerald-400 font-mono">
                        {doc.category}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span className="font-mono text-slate-300">{formatFileSize(doc.file_size_bytes)}</span>
                    </div>
                    {doc.issue_date && (
                      <div className="flex justify-between">
                        <span>Issued:</span>
                        <span className="font-mono text-slate-300">{doc.issue_date}</span>
                      </div>
                    )}
                    {doc.expiry_date && (
                      <div className="flex justify-between">
                        <span>Expires:</span>
                        <span className="font-mono text-amber-400">{doc.expiry_date}</span>
                      </div>
                    )}
                    {doc.notes && (
                      <p className="text-slate-400 italic pt-1 border-t border-slate-800/60 line-clamp-2">
                        &quot;{doc.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleViewDocument(doc)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="View Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingDoc(doc);
                        setEditTitle(doc.title);
                        setEditCategory(doc.category);
                        setEditIssueDate(doc.issue_date || '');
                        setEditExpiryDate(doc.expiry_date || '');
                        setEditNotes(doc.notes || '');
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-300 transition"
                      title="Edit Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setTargetDocForReplace(doc);
                        replaceFileInputRef.current?.click();
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition"
                      title="Replace File"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-500" />
                Upload Document
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">File (PDF or Image, max 10MB) *</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFile(f);
                      if (!uploadTitle) {
                        setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                      }
                    }
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Final Semester ID Card"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as VaultCategory)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={uploadIssueDate}
                    onChange={(e) => setUploadIssueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={uploadExpiryDate}
                    onChange={(e) => setUploadExpiryDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes / Roll Number</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Roll 220412"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-semibold transition flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME / EDIT MODAL */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                Edit Document
              </h3>
              <button onClick={() => setEditingDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category *</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as VaultCategory)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={editIssueDate}
                    onChange={(e) => setEditIssueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-semibold transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{previewDoc.title}</h3>
                <span className="text-[11px] text-emerald-400">Secure 60-Second Session</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Open externally"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-2 overflow-auto flex items-center justify-center">
              {previewDoc.mimeType.includes('pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-full h-full rounded-lg border border-slate-800"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-full max-w-full object-contain rounded-lg shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}