import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Application, StatusHistoryItem } from '../types';
import {
  Clock, CheckCircle2, AlertCircle, ShieldAlert, ArrowLeft,
  FileText, ShieldCheck, ChevronRight, Check
} from 'lucide-react';

interface ApplicationTrackingProps {
  applicationId?: string;
  onBack: () => void;
}

export const ApplicationTracking: React.FC<ApplicationTrackingProps> = ({ applicationId, onBack }) => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApp = async () => {
      if (!user) {
        setLoading(false);
        setApplication(null);
        return;
      }
      try {
        setLoading(true);
        let idToFetch = applicationId;
        if (!idToFetch) {
          const list = await apiFetch('/api/applications');
          if (Array.isArray(list) && list.length > 0) {
            idToFetch = list[0].id;
          }
        }

        if (idToFetch) {
          const data = await apiFetch(`/api/applications/${idToFetch}`);
          setApplication(data);
        }
      } catch (err) {
        console.error('Failed to load application tracking:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [applicationId, user]);

  const stages = [
    { key: 'SUBMITTED', title: t.timelineStage1, desc: 'Student submitted application online' },
    { key: 'UNDER_VERIFICATION', title: t.timelineStage2, desc: 'DigiLocker, APAAR & UIDAI automated checks' },
    { key: 'VERIFIED', title: t.timelineStage3, desc: 'District Officer verified certificates' },
    { key: 'APPROVED', title: t.timelineStage5, desc: 'Committee approval granted' },
    { key: 'SANCTIONED', title: t.timelineStage6, desc: 'Sanction order and fund allocation' },
    { key: 'DISBURSED', title: t.timelineStage8, desc: 'Direct Benefit Transfer (DBT) to bank account' }
  ];

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'DRAFT': return -1;
      case 'SUBMITTED': return 0;
      case 'UNDER_VERIFICATION':
      case 'DEFICIENCY':
      case 'RESUBMITTED': return 1;
      case 'VERIFIED': return 2;
      case 'APPROVED': return 3;
      case 'SANCTIONED': return 4;
      case 'DISBURSED': return 5;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">{t.loading}</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border">
        <p className="text-sm text-slate-600 mb-4">{t.noActiveApplication}</p>
        <button onClick={onBack} className="px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const currentStageIdx = getStageIndex(application.status);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-blue-700 font-semibold flex items-center gap-1 mb-2 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.previousStep}</span>
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900">{t.trackingTitle}</h2>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              {application.applicationNumber}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {application.schemeNameEn} • Academic Year: {application.academicYear}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 border">
            Status: <strong className="text-blue-700">{application.status}</strong>
          </span>
        </div>
      </div>

      {/* Visual Timeline Stepper */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">
          {'Application Lifecycle Stages'}
        </h3>

        <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-8 ml-3 sm:ml-4">
          {stages.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx || application.status === 'DISBURSED';
            const isCurrent = idx === currentStageIdx && application.status !== 'DISBURSED';
            const isDeficiency = isCurrent && application.status === 'DEFICIENCY';

            return (
              <div key={stage.key} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-[35px] sm:-left-[43px] top-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition ${
                    isDeficiency
                      ? 'bg-red-600 text-white ring-4 ring-red-100 animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDeficiency ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-bold ${isCurrent ? 'text-blue-900' : isCompleted ? 'text-slate-900' : 'text-slate-500'}`}>
                      {stage.title}
                    </h4>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 animate-pulse">
                        Current Stage
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification Results from Adapters */}
      {application.verificationResults && application.verificationResults.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>{'Digital Registry Verification Outcomes'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {application.verificationResults.map((vr) => (
              <div key={vr.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-blue-800">{vr.adapterSource}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    vr.outcome === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {vr.outcome}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] mt-1">{vr.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit History Log */}
      {application.timeline && application.timeline.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            <span>{t.statusHistoryTitle}</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {application.timeline.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.toStatus}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-600">
                      by {item.actorRole}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{item.remarks}</p>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
