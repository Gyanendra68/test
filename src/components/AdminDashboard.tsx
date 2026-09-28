import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { OutreachCandidate } from '../types';
import {
  Award, Users, FileCheck, CheckCircle2, TrendingUp,
  Activity, ShieldCheck, Send, Check, AlertCircle, Database
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [stats, setStats] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<OutreachCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactingId, setContactingId] = useState<string | null>(null);

  const loadAdminData = async () => {
    if (!user || user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [statsData, outreachData] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/admin/outreach')
      ]);
      setStats(statsData);
      if (Array.isArray(outreachData)) setCandidates(outreachData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [user]);

  const handleNotifyCandidate = async (candidateId: string) => {
    try {
      setContactingId(candidateId);
      await apiFetch(`/api/admin/outreach/${candidateId}/contact`, {
        method: 'POST',
        body: JSON.stringify({ status: 'NOTIFIED' })
      });
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, outreachStatus: 'NOTIFIED' } : c))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setContactingId(null);
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

  return (
    <div className="space-y-6">
      {/* Admin Title */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
          <Award className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{t.adminTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t.adminSubtitle}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Registered ST Students</span>
            <span className="text-2xl font-extrabold text-slate-900">{stats.totalUsers}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-blue-600 uppercase block">Total Applications</span>
            <span className="text-2xl font-extrabold text-blue-600">{stats.totalApplications}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 uppercase block">Disbursed (DBT)</span>
            <span className="text-2xl font-extrabold text-emerald-600">{stats.disbursedApplications}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-purple-600 uppercase block">Total Disbursed Amount</span>
            <span className="text-xl sm:text-2xl font-extrabold text-purple-700">₹{(stats.totalDisbursedAmount || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      {/* Outreach / Identification Engine */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-700" />
              <h3 className="font-extrabold text-base text-slate-900">
                {t.outreachTitle}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.outreachSubtitle}
            </p>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 self-start sm:self-auto">
            {candidates.length} Matched Candidates
          </span>
        </div>

        {/* Candidate Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Candidate</th>
                <th className="p-3">Source Registry</th>
                <th className="p-3">Location</th>
                <th className="p-3">Course & Institute</th>
                <th className="p-3">Suggested Scheme</th>
                <th className="p-3">Match</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{c.candidateName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{c.maskedId}</span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                      {c.sourceSystem}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">
                    {c.district}, {c.state}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-800 block line-clamp-1">{c.currentClassCourse}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{c.institution}</span>
                  </td>
                  <td className="p-3 text-blue-800 font-semibold">
                    {c.recommendedSchemeName}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {c.matchConfidence}% Match
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {c.outreachStatus === 'NOTIFIED' ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded flex items-center justify-end gap-1">
                        <Check className="w-3 h-3" />
                        SMS Sent
                      </span>
                    ) : (
                      <button
                        onClick={() => handleNotifyCandidate(c.id)}
                        disabled={contactingId === c.id}
                        className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 ml-auto"
                      >
                        <Send className="w-3 h-3" />
                        <span>{contactingId === c.id ? 'Sending...' : t.sendSmsAlert}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mock Integrations Health */}
      {stats?.mockAdapters && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">{t.mockIntegrationsHealth}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {stats.mockAdapters.map((m: any, i: number) => (
              <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">{m.name}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {m.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 flex justify-between">
                  <span>Latency: {m.latency}</span>
                  <span>Uptime: {m.successRate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
