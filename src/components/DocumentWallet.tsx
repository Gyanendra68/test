import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { WalletDocument, DocumentType } from '../types';
import { FolderLock, Upload, Trash2, Eye, FileText, CheckCircle2, ShieldCheck, X, LogIn } from 'lucide-react';

interface DocumentWalletProps {
  onOpenAuth?: (tab?: 'demo' | 'signin' | 'register') => void;
}

export const DocumentWallet: React.FC<DocumentWalletProps> = ({ onOpenAuth }) => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [documents, setDocuments] = useState<WalletDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('ST_CERTIFICATE');
  const [previewDoc, setPreviewDoc] = useState<WalletDocument | null>(null);

  const fetchDocs = async () => {
    if (!user) {
      setLoading(false);
      setDocuments([]);
      return;
    }
    try {
      setLoading(true);
      const data = await apiFetch('/api/documents');
      if (Array.isArray(data)) setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const fileDataUrl = reader.result as string;
        await apiFetch('/api/documents', {
          method: 'POST',
          body: JSON.stringify({
            docName: file.name,
            docType: selectedDocType,
            fileDataUrl,
            mimeType: file.type
          })
        });
        fetchDocs();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      await apiFetch(`/api/documents/${docId}`, { method: 'DELETE' });
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center max-w-xl mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-inner">
          <FolderLock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{t.walletTitle}</h2>
          <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            {'Please sign in or select a demo persona to view and manage your verified certificates and DigiLocker documents.'}
          </p>
        </div>
        {onOpenAuth && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenAuth('signin')}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{'Sign In'}</span>
            </button>
            <button
              onClick={() => onOpenAuth('demo')}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold shadow transition"
            >
              {'1-Click Demo'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
            <FolderLock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">{t.walletTitle}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                DigiLocker Integrated
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {t.walletSubtitle}
            </p>
          </div>
        </div>

        {/* Upload Action */}
        <div className="flex items-center gap-2">
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
          >
            <option value="ST_CERTIFICATE">ST Certificate</option>
            <option value="INCOME_CERTIFICATE">Income Certificate</option>
            <option value="BONAFIDE_CERTIFICATE">Bonafide Certificate</option>
            <option value="MARKSHEET">Marksheet</option>
            <option value="BANK_PASSBOOK">Bank Passbook</option>
            <option value="DOMICILE_CERTIFICATE">Domicile Certificate</option>
          </select>

          <label className="cursor-pointer px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 flex-shrink-0">
            <Upload className="w-4 h-4" />
            <span>{uploading ? t.loading : t.uploadDocument}</span>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          {t.loading}
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No documents in your wallet yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Uploaded and DigiLocker-pulled documents will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-blue-400 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 truncate max-w-[180px]">
                        {doc.docName}
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {doc.docType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {Boolean(doc.digilockerVerified) ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      DigiLocker
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Uploaded
                    </span>
                  )}
                </div>

                {doc.certNumber && (
                  <div className="mt-3 p-2 bg-slate-50 rounded text-[11px] font-mono text-slate-700 flex justify-between">
                    <span className="text-slate-500">Cert No:</span>
                    <strong>{doc.certNumber}</strong>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded transition"
                    title="View Document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{previewDoc.docName}</h3>
                <span className="text-xs text-slate-500">{previewDoc.docType}</span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-80 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-6 text-center">
              <FileText className="w-16 h-16 text-blue-600 mb-3" />
              <p className="font-bold text-sm text-slate-800">{previewDoc.docName}</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                URI: {previewDoc.fileUri || 'Mock DigiLocker Secure Vault Asset'}
              </p>
              {Boolean(previewDoc.digilockerVerified) && (
                <div className="mt-3 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  DigiLocker Cryptographically Verified via MoTA Mock Gateway
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
