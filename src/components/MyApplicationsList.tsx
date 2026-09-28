import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Application } from '../types';
import { FileText, ArrowRight, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MyApplicationsListProps {
  onSelectApplication: (id: string) => void;
  onNavigate: (tab: string) => void;
  onStartApplication: (schemeId?: string) => void;
}

export const MyApplicationsList: React.FC<MyApplicationsListProps> = ({
  onSelectApplication,
  onNavigate,
  onStartApplication
}) => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      if (!user) {
        setLoading(false);
        setApplications([]);
        return;
      }
      try {
        setLoading(true);
        const data = await apiFetch('/api/applications');
        if (Array.isArray(data)) setApplications(data);
      } catch (err) {
        console.error('Failed to load applications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{t.navMyApplications}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {'Track and manage your submitted scholarship applications'}
          </p>
        </div>

        <button
          onClick={() => onStartApplication()}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition"
        >
          {t.applyNow}
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">{t.loading}</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">{t.noActiveApplication}</h3>
            <button
              onClick={() => onNavigate('eligibility')}
              className="mt-3 px-4 py-2 bg-blue-700 text-white font-bold text-xs rounded-xl"
            >
              {t.navEligibility}
            </button>
          </div>
        ) : (
          applications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-blue-400 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-900 block">
                    {app.applicationNumber}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {app.schemeNameEn}
                  </h3>
                </div>

                <span className={`px-3 py-1 text-xs font-bold rounded-full border self-start sm:self-auto ${
                  app.status === 'VERIFIED' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                  app.status === 'SANCTIONED' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                  app.status === 'DISBURSED' ? 'bg-green-50 text-green-800 border-green-200' :
                  app.status === 'DEFICIENCY' ? 'bg-red-50 text-red-800 border-red-200 animate-pulse' :
                  'bg-slate-100 text-slate-800 border-slate-200'
                }`}>
                  {app.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Academic Year</span>
                  <span className="font-semibold text-slate-800">{app.academicYear}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Submitted Date</span>
                  <span className="font-semibold text-slate-800">
                    {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Draft'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sanctioned Amount</span>
                  <span className="font-bold text-emerald-700">
                    {app.sanctionAmount ? `₹${app.sanctionAmount.toLocaleString('en-IN')}` : 'Pending Sanction'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">DBT Status</span>
                  <span className="font-semibold text-slate-800">
                    {app.payment ? app.payment.status : 'Queued'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-mono">
                  Updated: {new Date(app.updatedAt).toLocaleString()}
                </span>

                <div className="flex items-center gap-2">
                  {app.status === 'DEFICIENCY' && (
                    <button
                      onClick={() => onNavigate('deficiencies')}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      {t.resolveDeficiencyNow}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onSelectApplication(app.id);
                      onNavigate('tracking');
                    }}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <span>{t.trackStatus}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
