import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Application, Deficiency, WalletDocument } from '../types';
import { AlertTriangle, Upload, CheckCircle2, ArrowRight, FileText, Clock, Send } from 'lucide-react';

interface DeficiencyResolutionProps {
  onSuccess: () => void;
}

export const DeficiencyResolution: React.FC<DeficiencyResolutionProps> = ({ onSuccess }) => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [deficiency, setDeficiency] = useState<Deficiency | null>(null);
  const [walletDocs, setWalletDocs] = useState<WalletDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDeficiencyData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [apps, docs] = await Promise.all([
        apiFetch('/api/applications'),
        apiFetch('/api/documents')
      ]);

      if (Array.isArray(docs)) setWalletDocs(docs);

      if (Array.isArray(apps)) {
        // Find application with DEFICIENCY status
        const defApp = apps.find((a: Application) => a.status === 'DEFICIENCY');
        if (defApp) {
          const detailed = await apiFetch(`/api/applications/${defApp.id}`);
          setActiveApp(detailed);
          if (detailed.deficiencies && detailed.deficiencies.length > 0) {
            setDeficiency(detailed.deficiencies[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load deficiency details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeficiencyData();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileDataUrl = reader.result as string;
        const res = await apiFetch('/api/documents', {
          method: 'POST',
          body: JSON.stringify({
            docName: `Corrected_${file.name}`,
            docType: deficiency?.fieldName || 'INCOME_CERTIFICATE',
            fileDataUrl,
            mimeType: file.type
          })
        });
        if (res.document) {
          setWalletDocs((prev) => [res.document, ...prev]);
          setSelectedDocId(res.document.id);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApp) return;

    try {
      setSubmitting(true);
      const res = await apiFetch(`/api/applications/${activeApp.id}/resubmit`, {
        method: 'POST',
        body: JSON.stringify({
          correctedDocumentId: selectedDocId || undefined,
          resolutionNotes: resolutionNotes || 'Uploaded updated certificate for FY 2025-26.'
        })
      });

      setSuccessMsg(res.message);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Resubmission failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">{t.loading}</p>
      </div>
    );
  }

  if (!activeApp || !deficiency) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">
          {'No Open Deficiencies'}
        </h3>
        <p className="text-xs text-slate-600 mt-1">
          {'Your scholarship applications have no pending objections from the Verification Officer.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Alert Header */}
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-red-950 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
              {deficiency.deficiencyType}
            </span>
            <h2 className="text-lg font-extrabold text-red-900 mt-1">
              {t.deficiencyBannerTitle}
            </h2>
            <p className="text-xs text-red-800 mt-0.5">
              Application ID: <strong className="font-mono">{activeApp.applicationNumber}</strong>
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-5 space-y-3 bg-white/80 p-4 rounded-xl border border-red-200 text-xs">
          <div>
            <span className="font-bold text-red-900 block">{t.deficiencyReason}:</span>
            <p className="text-slate-700 mt-0.5 leading-relaxed">
              {deficiency.reasonEn}
            </p>
          </div>

          <div>
            <span className="font-bold text-red-900 block">{t.requiredAction}:</span>
            <p className="text-slate-700 mt-0.5 leading-relaxed">
              {deficiency.requiredActionEn}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-red-700 font-bold pt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{t.deadline}: {deficiency.deadline}</span>
          </div>
        </div>
      </div>

      {successMsg ? (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      ) : (
        <form onSubmit={handleResubmit} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
            {'Upload Corrected Document & Submit Explanation'}
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.uploadCorrectedDoc}
            </label>
            <input
              type="file"
              onChange={handleFileUpload}
              className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>

          {selectedDocId && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Corrected document attached ready for officer review.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.resolutionNotes}
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder={'Explain the correction made...'}
              rows={3}
              className="w-full px-3 py-2 border rounded-xl text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? t.loading : t.resubmitApp}</span>
          </button>
        </form>
      )}
    </div>
  );
};
