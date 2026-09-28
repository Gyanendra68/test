import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Application, StudentProfile, NotificationItem } from '../types';
import {
  FileText, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck,
  CreditCard, FolderLock, Sparkles, MessageSquare, Clock, User,
  Building, BookOpen, AlertCircle
} from 'lucide-react';

interface StudentDashboardProps {
  onNavigate: (tab: string) => void;
  onSelectApplication: (id: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate, onSelectApplication }) => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [profData, appsData, notifsData] = await Promise.all([
        apiFetch('/api/profile').catch(() => null),
        apiFetch('/api/applications').catch(() => []),
        apiFetch('/api/notifications').catch(() => [])
      ]);

      if (profData) setProfile(profData);
      if (Array.isArray(appsData)) {
        // Find most recent active application (not rejected)
        const active = appsData.find((a: Application) => a.status !== 'REJECTED') || appsData[0] || null;
        setActiveApp(active);
      }
      if (Array.isArray(notifsData)) {
        setNotifications(notifsData.slice(0, 4));
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      DRAFT: { bg: 'bg-slate-100 text-slate-800 border-slate-300', text: t.statusDraft, label: t.statusDraft },
      SUBMITTED: { bg: 'bg-blue-100 text-blue-800 border-blue-300', text: t.statusSubmitted, label: t.statusSubmitted },
      UNDER_VERIFICATION: { bg: 'bg-amber-100 text-amber-800 border-amber-300', text: t.statusUnderVerification, label: t.statusUnderVerification },
      DEFICIENCY: { bg: 'bg-red-100 text-red-800 border-red-300 animate-pulse', text: t.statusDeficiency, label: t.statusDeficiency },
      RESUBMITTED: { bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', text: t.statusResubmitted, label: t.statusResubmitted },
      VERIFIED: { bg: 'bg-teal-100 text-teal-800 border-teal-300', text: t.statusVerified, label: t.statusVerified },
      APPROVED: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: t.statusApproved, label: t.statusApproved },
      SANCTIONED: { bg: 'bg-purple-100 text-purple-800 border-purple-300', text: t.statusSanctioned, label: t.statusSanctioned },
      DISBURSED: { bg: 'bg-green-100 text-green-800 border-green-300 font-extrabold', text: t.statusDisbursed, label: t.statusDisbursed },
      REJECTED: { bg: 'bg-rose-100 text-rose-800 border-rose-300', text: t.statusRejected, label: t.statusRejected }
    };
    const b = badges[status] || { bg: 'bg-slate-100 text-slate-800 border-slate-300', text: status, label: status };
    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${b.bg}`}>
        {b.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="bg-gradient-to-r from-[#0b3c5d] via-[#0d47a1] to-[#1565c0] rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <img src="/tribal-logo.svg" alt="watermark" className="w-64 h-64 object-contain" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded uppercase tracking-wider">
                {profile?.category || 'ST'} Category
              </span>
              <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {t.stStatusVerified}
              </span>
              {profile?.pvtgStatus && (
                <span className="text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded">
                  ★ PVTG: {profile.pvtgGroup || 'Notified'}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {user ? (profile?.fullName || user.fullName) : ('Welcome, Tribal Student / Applicant')}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-blue-100">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-amber-300" />
                {profile?.institutionName || ('Recognized Institutions')}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                {profile ? `${profile.courseName} (${profile.classYear})` : ('Pre-Matric to Ph.D. Schemes')}
              </span>
              {profile?.stCertificateNo && (
                <span>
                  ST Cert: <strong className="font-mono text-white">{profile.stCertificateNo}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => onNavigate('profile')}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold transition backdrop-blur-sm"
              >
                {'Manage Profile'}
              </button>
            ) : null}
            <button
              onClick={() => onNavigate('eligibility')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{t.navEligibility}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deficiency Alert (If student has open deficiency) */}
      {activeApp?.status === 'DEFICIENCY' && (
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-red-900">
                {t.deficiencyBannerTitle}
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                {`Your application (${activeApp.applicationNumber}) requires attention. The Verification Officer has flagged a document issue.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('deficiencies')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition flex-shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>{t.resolveDeficiencyNow}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Application Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {t.activeApplicationTitle}
            </h3>
          </div>
          {activeApp && getStatusBadge(activeApp.status)}
        </div>

        {activeApp ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-[11px] text-slate-500 block">{'Application ID'}</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{activeApp.applicationNumber}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">{'Scheme'}</span>
                <span className="font-bold text-slate-900 text-sm line-clamp-1">{activeApp.schemeNameEn}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">{'Academic Year'}</span>
                <span className="font-bold text-slate-900 text-sm">{activeApp.academicYear}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">{'Last Updated'}</span>
                <span className="font-medium text-slate-700 text-xs">{new Date(activeApp.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {activeApp.status === 'VERIFIED'
                    ? ('Documents verified. Sanction order in progress.')
                    : activeApp.status === 'SANCTIONED'
                    ? ('Sanction issued. DBT batch queuing.')
                    : activeApp.status === 'DISBURSED'
                    ? ('Scholarship disbursed via DBT to bank account.')
                    : ('In verification review queue.')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onSelectApplication(activeApp.id);
                    onNavigate('tracking');
                  }}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition flex items-center gap-1"
                >
                  <span>{t.trackStatus}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 px-4">
            <p className="text-sm text-slate-600 mb-3">{t.noActiveApplication}</p>
            <button
              onClick={() => onNavigate('eligibility')}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition"
            >
              {t.applyNow}
            </button>
          </div>
        )}
      </div>

      {/* Quick Action Tiles */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider text-xs">
          {t.quickActions}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('eligibility')}
            className="p-4 bg-white hover:bg-blue-50/50 rounded-xl border border-slate-200 text-left transition group shadow-sm flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                {t.navEligibility}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {'Evaluate against 5 schemes'}
              </span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('schemes')}
            className="p-4 bg-white hover:bg-emerald-50/50 rounded-xl border border-slate-200 text-left transition group shadow-sm flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                {t.navSchemes}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {'Pre, Post, Top Class, NFST, NOS'}
              </span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('wallet')}
            className="p-4 bg-white hover:bg-purple-50/50 rounded-xl border border-slate-200 text-left transition group shadow-sm flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                {t.navDocumentWallet}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {'Upload & reuse documents'}
              </span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('payments')}
            className="p-4 bg-white hover:bg-amber-50/50 rounded-xl border border-slate-200 text-left transition group shadow-sm flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                {t.navPayments}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {'PFMS Direct Transfer status'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Notifications section */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              {t.recentNotifications}
            </h3>
            <button
              onClick={() => onNavigate('notifications')}
              className="text-xs text-blue-700 hover:underline font-semibold"
            >
              {'View all'}
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.id} className="py-2.5 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  n.type === 'DEFICIENCY' ? 'bg-red-500 animate-ping' : n.type === 'SUCCESS' ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {n.titleEn}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {n.messageEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
