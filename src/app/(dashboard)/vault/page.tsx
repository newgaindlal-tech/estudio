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
  ShieldAlert,
} from 'lucide-react';

const CATEGORIES: VaultCategory[] = [
  'Aadhaar',
  'College ID',
  'Admit Card',
  'Certificate',
  'Other',
];

export default function DocumentVaultPage() {
  const supabase = useMemo(() => createClient(), []);
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

  // Modal: Deletion Confirmation
  const [deletingDoc, setDeletingDoc] = useState<DocumentMetadata | null>(null);

  // Modal: File Preview
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; mimeType: string } | null>(null);
  const [targetDocForReplace, setTargetDocForReplace] = useState<DocumentMetadata | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setFeedback({ type: 'error', text: `Failed to load vault records: ${error.message}` });
      } else if (data) {
        setDocuments(data as DocumentMetadata[]);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Error loading vault records.' });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Modal ESC Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewDoc) setPreviewDoc(null);
        if (showUploadModal) setShowUploadModal(false);
        if (editingDoc) setEditingDoc(null);
        if (deletingDoc) setDeletingDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, showUploadModal, editingDoc, deletingDoc]);

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
      setFeedback({ type: 'error', text: 'Please select a file and assign a document title.' });
      return;
    }

    const validation = validateUploadedFile(uploadFile);
    if (!validation.valid) {
      setFeedback({ type: 'error', text: validation.error || 'Invalid file format or file size exceeded.' });
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User session not found.');

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

      setFeedback({ type: 'success', text: `"${cleanTitle}" saved to encrypted vault.` });
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadCategory('College ID');
      setUploadIssueDate('');
      setUploadExpiryDate('');
      setUploadNotes('');
      await fetchDocuments();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'File upload failed.' });
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

      if (error || !data?.signedUrl) throw error || new Error('Failed to generate secure URL.');

      setPreviewDoc({
        title: doc.title,
        url: data.signedUrl,
        mimeType: doc.mime_type,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Document view error: ${err.message}` });
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

  const confirmDeleteDocument = async () => {
    if (!deletingDoc) return;
    const target = deletingDoc;
    const previous = [...documents];

    // Optimistic removal
    setDocuments((prev) => prev.filter((d) => d.id !== target.id));
    setDeletingDoc(null);
    setActionLoading(true);
    setFeedback(null);

    try {
      await supabase.storage.from('vault').remove([target.file_path]);
      const { error: dbError } = await supabase.from('documents').delete().eq('id', target.id);
      if (dbError) throw dbError;

      setFeedback({ type: 'success', text: `"${target.title}" permanently removed.` });
    } catch (err: any) {
      setDocuments(previous);
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

      setFeedback({ type: 'success', text: 'Document metadata updated.' });
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

      setFeedback({ type: 'success', text: `File for "${targetDocForReplace.title}" updated.` });
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
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-xs text-content-muted font-medium">Decrypting vault metadata...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none pb-16">
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleFileReplaced}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-canvas-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2.5">
            <FolderArchive className="w-6 h-6 text-brand-400" />
            Document Vault
          </h1>
          <p className="text-content-secondary text-xs mt-0.5">
            Encrypted institutional storage for college IDs, admit cards, and certificates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="btn-primary px-4 py-2.5 text-xs font-bold shadow-brand-glow self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Dynamic Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2.5 border shadow-sm animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-status-success-bg border-status-success/40 text-emerald-300'
              : 'bg-status-danger-bg border-status-danger/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-status-success" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-status-danger" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 text-content-muted hover:text-content-primary transition-colors rounded"
            aria-label="Dismiss feedback alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Category Filter Toolbar */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search documents by title or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-canvas-surface border border-canvas-border pl-10 pr-9 rounded-xl text-xs text-content-primary placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-content-muted hover:text-content-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border outline-none ${
              selectedCategory === 'ALL'
                ? 'bg-brand-500 text-white border-brand-400 shadow-sm font-bold shadow-brand-glow'
                : 'bg-canvas-surface text-content-secondary border-canvas-border hover:bg-canvas-elevated hover:text-content-primary'
            }`}
          >
            All ({documents.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border outline-none ${
                  isSelected
                    ? 'bg-brand-500 text-white border-brand-400 shadow-sm font-bold shadow-brand-glow'
                    : 'bg-canvas-surface text-content-secondary border-canvas-border hover:bg-canvas-elevated hover:text-content-primary'
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
        <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-10 text-center space-y-3 shadow-sm">
          <FolderArchive className="w-10 h-10 text-content-muted mx-auto" />
          <h2 className="font-bold text-content-primary text-base">No documents located</h2>
          <p className="text-content-secondary text-xs max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'No records match your active query and category filters.'
              : 'Keep certificates, marksheets, and identity credentials encrypted in your vault.'}
          </p>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="btn-primary px-4 py-2.5 text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isPdf = doc.mime_type.includes('pdf');
            return (
              <div
                key={doc.id}
                className="bg-canvas-subtle border border-canvas-border hover:border-canvas-border/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-canvas-surface border border-canvas-border text-brand-400 shrink-0 shadow-inner">
                      {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-content-primary text-sm truncate" title={doc.title}>
                        {doc.title}
                      </h3>
                      <span className="text-2xs font-bold text-brand-400 font-mono block mt-0.5">
                        {doc.category}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1 text-2xs text-content-secondary bg-canvas-surface p-3 rounded-xl border border-canvas-border font-mono shadow-inner">
                    <div className="flex justify-between">
                      <span className="text-content-muted font-sans font-medium">Size:</span>
                      <span className="text-content-primary font-semibold">{formatFileSize(doc.file_size_bytes)}</span>
                    </div>
                    {doc.issue_date && (
                      <div className="flex justify-between">
                        <span className="text-content-muted font-sans font-medium">Issued:</span>
                        <span className="text-content-primary font-semibold">{doc.issue_date}</span>
                      </div>
                    )}
                    {doc.expiry_date && (
                      <div className="flex justify-between">
                        <span className="text-content-muted font-sans font-medium">Expires:</span>
                        <span className="text-amber-400 font-semibold">{doc.expiry_date}</span>
                      </div>
                    )}
                    {doc.notes && (
                      <p className="text-content-secondary italic pt-1.5 border-t border-canvas-border/60 line-clamp-2 font-sans font-normal">
                        &quot;{doc.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-canvas-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleViewDocument(doc)}
                      disabled={actionLoading}
                      className="p-2 rounded-xl bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border transition-colors outline-none shadow-sm"
                      title="View Document"
                      aria-label={`View ${doc.title}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(doc)}
                      disabled={actionLoading}
                      className="p-2 rounded-xl bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border transition-colors outline-none shadow-sm"
                      title="Download"
                      aria-label={`Download ${doc.title}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDoc(doc);
                        setEditTitle(doc.title);
                        setEditCategory(doc.category);
                        setEditIssueDate(doc.issue_date || '');
                        setEditExpiryDate(doc.expiry_date || '');
                        setEditNotes(doc.notes || '');
                      }}
                      className="p-2 rounded-xl bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border transition-colors outline-none shadow-sm"
                      title="Edit Details"
                      aria-label={`Edit ${doc.title}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetDocForReplace(doc);
                        replaceFileInputRef.current?.click();
                      }}
                      className="p-2 rounded-xl bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-amber-400 border border-canvas-border transition-colors outline-none shadow-sm"
                      title="Replace File"
                      aria-label={`Replace file for ${doc.title}`}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingDoc(doc)}
                      disabled={actionLoading}
                      className="p-2 rounded-xl bg-canvas-surface hover:bg-canvas-elevated text-content-muted hover:text-status-danger border border-canvas-border transition-colors outline-none shadow-sm"
                      title="Delete"
                      aria-label={`Delete ${doc.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: UPLOAD FILE */}
      {showUploadModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 max-w-md w-full shadow-elevated space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <h2 className="text-sm sm:text-base font-bold text-content-primary flex items-center gap-2">
                <Upload className="w-4 h-4 text-brand-400" />
                Upload New Document
              </h2>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-content-muted hover:text-content-primary transition-colors rounded"
                aria-label="Close upload dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">
                  File Attachment (PDF / PNG / JPEG / WEBP, max 10MB) *
                </label>
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
                  className="w-full bg-canvas-surface border border-canvas-border rounded-xl p-2.5 text-content-primary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-white cursor-pointer shadow-inner"
                />
              </div>

              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Identity Card 2026"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-xl px-3.5 text-content-primary text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">Category Classification *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as VaultCategory)}
                  className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-xl px-3.5 text-content-primary text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 cursor-pointer shadow-inner"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-canvas-surface text-content-primary">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">Issue Date</label>
                  <input
                    type="date"
                    value={uploadIssueDate}
                    onChange={(e) => setUploadIssueDate(e.target.value)}
                    className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-xl px-3 text-content-primary text-xs font-mono outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={uploadExpiryDate}
                    onChange={(e) => setUploadExpiryDate(e.target.value)}
                    className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-xl px-3 text-content-primary text-xs font-mono outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">Reference Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified copy for semester admission"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full bg-canvas-surface border border-canvas-border rounded-xl p-3 text-content-primary text-xs outline-none focus:border-brand-500 shadow-inner resize-none"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-canvas-border">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary px-4 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary px-5 py-2.5 text-xs font-bold shadow-brand-glow"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT METADATA */}
      {editingDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 max-w-md w-full shadow-elevated space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <h2 className="text-sm sm:text-base font-bold text-content-primary flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-400" />
                Edit Document Details
              </h2>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1 text-content-muted hover:text-content-primary transition-colors rounded"
                aria-label="Close edit dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-xl px-3.5 text-content-primary text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">Category *</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as VaultCategory)}
                  className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-xl px-3.5 text-content-primary text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 cursor-pointer shadow-inner"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-canvas-surface text-content-primary">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">Issue Date</label>
                  <input
                    type="date"
                    value={editIssueDate}
                    onChange={(e) => setEditIssueDate(e.target.value)}
                    className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-xl px-3 text-content-primary text-xs font-mono outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-xl px-3 text-content-primary text-xs font-mono outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">Reference Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-canvas-surface border border-canvas-border rounded-xl p-3 text-content-primary text-xs outline-none focus:border-brand-500 shadow-inner resize-none"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-canvas-border">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="btn-secondary px-4 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary px-5 py-2.5 text-xs font-bold shadow-brand-glow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION DIALOG */}
      {deletingDoc && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-canvas-subtle border border-status-danger/40 rounded-2xl p-6 max-w-sm w-full shadow-elevated space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-status-danger-bg border border-status-danger/30 flex items-center justify-center text-status-danger shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-content-primary">Delete Document?</h2>
                <p className="text-2xs text-content-secondary mt-0.5">
                  &quot;{deletingDoc.title}&quot; will be permanently expunged from the storage vault.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-canvas-border">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="btn-secondary px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDocument}
                className="px-4 py-2 rounded-xl bg-status-danger hover:bg-status-danger/90 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SECURE PREVIEW VIEWER */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-elevated overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-canvas-border flex items-center justify-between">
              <div>
                <h2 className="font-bold text-content-primary text-sm truncate max-w-xs sm:max-w-md">{previewDoc.title}</h2>
                <span className="text-2xs font-mono text-status-success flex items-center gap-1.5 mt-0.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
                  Authenticated 60-Second Session Stream
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-canvas-surface border border-canvas-border text-content-secondary hover:text-content-primary transition-colors shadow-inner"
                  title="Open externally"
                  aria-label="Open document in a new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl bg-canvas-surface border border-canvas-border text-content-muted hover:text-content-primary transition-colors shadow-inner"
                  aria-label="Close document preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-canvas-base p-2 overflow-auto flex items-center justify-center">
              {previewDoc.mimeType.includes('pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-full h-full rounded-xl border border-canvas-border shadow-inner"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}