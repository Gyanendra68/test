import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Application, ApplicationStatus } from '../types';
import {
  Shield, CheckCircle2, AlertTriangle, XCircle, Search, Filter,
  FileText, ArrowRight, Eye, RefreshCw, Award, CreditCard, X
} from 'lucide-react';

export const OfficerDashboard: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Deficiency creation modal inside officer console
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [deficiencyReason, setDeficiencyReason] = useState('');
  const [deficiencyField, setDeficiencyField] = useState('INCOME_CERTIFICATE');
  const [deficiencyDeadline, setDeficiencyDeadline] = useState('2026-10-31');

  const fetchApplications = async () => {
    if (!user || user.role !== 'OFFICER') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await apiFetch('/api/officer/applications');
      if (Array.isArray(data)) setApplications(data);
    } catch (err) {
      console.error('Failed to load officer applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const openAppDetails = async (appId: string) => {
    try {
      setActionLoading(true);
      const data = await apiFetch(`/api/applications/${appId}`);
      setSelectedApp(data);
    } catch (err) {
      console.error('Failed to load details:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Officer Actions
  const handleVerify = async (appId: string) => {
    try {
      setActionLoading(true);
      await apiFetch(`/api/officer/applications/${appId}/verify`, { method: 'POST', body: JSON.stringify({}) });
      await fetchApplications();
      openAppDetails(appId);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (appId: string) => {
    try {
      setActionLoading(true);
      await apiFetch(`/api/officer/applications/${appId}/approve`, { method: 'POST', body: JSON.stringify({}) });
      await fetchApplications();
      openAppDetails(appId);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (appId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      setActionLoading(true);
      await apiFetch(`/api/officer/applications/${appId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      await fetchApplications();
      openAppDetails(appId);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseDeficiency = async () => {
    if (!selectedApp) return;
    try {
      setActionLoading(true);
      await apiFetch(`/api/officer/applications/${selectedApp.id}/deficiency`, {
        method: 'POST',
        body: JSON.stringify({
          deficiencyType: 'DOCUMENT_DEFICIENCY',
          fieldName: deficiencyField,
          reasonEn: deficiencyReason || 'Uploaded certificate is unclear or expired.',
          requiredActionEn: 'Upload clear valid certificate issued by Competent Revenue Authority.',
          deadline: deficiencyDeadline
        })
      });
      setShowDeficiencyModal(false);
      setDeficiencyReason('');
      await fetchApplications();
      openAppDetails(selectedApp.id);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSanction = async (appId: string) => {
    try {
      setActionLoading(true);
      await apiFetch(`/api/officer/applications/${appId}/sanction`, { method: 'POST', body: JSON.stringify({}) });
      await fetchApplications();
      openAppDetails(appId);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburseDBT = async (appId: string) => {
    try {
      setActionLoading(true);
      await apiFetch(`/api/officer/applications/${appId}/disburse`, { method: 'POST', body: JSON.stringify({}) });
      await fetchApplications();
      openAppDetails(appId);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      app.student_name?.toLowerCase().includes(term) ||
      app.application_number?.toLowerCase().includes(term) ||
      app.scheme_name_en?.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const countPending = applications.filter((a) => ['SUBMITTED', 'UNDER_VERIFICATION', 'RESUBMITTED'].includes(a.status)).length;
  const countDeficiency = applications.filter((a) => a.status === 'DEFICIENCY').length;
  const countSanctioned = applications.filter((a) => ['SANCTIONED', 'DISBURSED'].includes(a.status)).length;

  return (
    <div className="space-y-6">
      {/* Officer Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{t.officerTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t.officerSubtitle}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">{t.totalApplications}</span>
          <span className="text-2xl font-extrabold text-slate-900">{applications.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase block">{t.pendingVerification}</span>
          <span className="text-2xl font-extrabold text-amber-600">{countPending}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-red-600 uppercase block">{t.deficienciesOpen}</span>
          <span className="text-2xl font-extrabold text-red-600">{countDeficiency}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase block">{t.approvedSanctioned}</span>
          <span className="text-2xl font-extrabold text-emerald-600">{countSanctioned}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchApplications}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">{t.filterByStatus}</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_VERIFICATION">UNDER_VERIFICATION</option>
            <option value="DEFICIENCY">DEFICIENCY</option>
            <option value="RESUBMITTED">RESUBMITTED</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SANCTIONED">SANCTIONED</option>
            <option value="DISBURSED">DISBURSED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <button
            onClick={fetchApplications}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Application ID</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Scheme</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Updated</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono font-bold text-blue-900">
                    {app.application_number}
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-slate-900 block">{app.student_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">ST: {app.st_certificate_no}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="line-clamp-1">{app.scheme_name_en}</span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      app.status === 'VERIFIED' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                      app.status === 'SANCTIONED' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                      app.status === 'DISBURSED' ? 'bg-green-50 text-green-800 border-green-200' :
                      app.status === 'DEFICIENCY' ? 'bg-red-50 text-red-800 border-red-200 animate-pulse' :
                      'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {new Date(app.updated_at).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => openAppDetails(app.id)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition"
                    >
                      {t.reviewAction}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400">APPLICATION DOSSIER</span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedApp.applicationNumber} — {selectedApp.studentName}
                </h3>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="my-4 space-y-4 text-xs">
              {/* Status bar */}
              <div className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Current Lifecycle Status:</span>
                  <span className="font-extrabold text-blue-800 ml-2">{selectedApp.status}</span>
                </div>
                {selectedApp.sanctionAmount && (
                  <span className="font-bold text-emerald-700">
                    Sanction: ₹{selectedApp.sanctionAmount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Student info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border">
                <div>
                  <span className="text-slate-500 block">Category & Cert:</span>
                  <span className="font-bold">ST ({selectedApp.stCertificateNo})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Annual Income:</span>
                  <span className="font-bold">₹{selectedApp.familyAnnualIncome?.toLocaleString('en-IN')}/yr</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact:</span>
                  <span>{selectedApp.studentMobile} • {selectedApp.studentEmail}</span>
                </div>
              </div>

              {/* Verification Adapter Results */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>Automated Mock Verification Adapter Logs:</span>
                </h4>
                <div className="space-y-2">
                  {selectedApp.verificationResults?.map((vr: any) => (
                    <div key={vr.id} className="p-2.5 bg-slate-50 rounded-lg border flex items-start justify-between">
                      <div>
                        <span className="font-mono font-bold text-blue-900">{vr.adapterSource}:</span>
                        <span className="text-slate-600 ml-2">{vr.notes}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        vr.outcome === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {vr.outcome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attached Documents */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Attached Documents ({selectedApp.documents?.length || 0}):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedApp.documents?.map((d: any) => (
                    <div key={d.id} className="p-2.5 bg-slate-50 rounded-lg border flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{d.docName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {d.verificationStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Officer Action Toolbar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setShowDeficiencyModal(true)}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition"
              >
                {t.raiseDeficiency}
              </button>

              <button
                onClick={() => handleReject(selectedApp.id)}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition"
              >
                {t.rejectAction}
              </button>

              <button
                onClick={() => handleVerify(selectedApp.id)}
                className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl transition"
              >
                {t.verifyAction}
              </button>

              <button
                onClick={() => handleApprove(selectedApp.id)}
                className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition"
              >
                {t.approveAction}
              </button>

              <button
                onClick={() => handleSanction(selectedApp.id)}
                className="px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition"
              >
                {t.issueSanction}
              </button>

              <button
                onClick={() => handleDisburseDBT(selectedApp.id)}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition"
              >
                {t.disburseDBT}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deficiency Form Modal */}
      {showDeficiencyModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-800">
            <h3 className="font-bold text-base text-slate-900 mb-3">{t.raiseDeficiency}</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deficient Field / Document</label>
                <select
                  value={deficiencyField}
                  onChange={(e) => setDeficiencyField(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="INCOME_CERTIFICATE">Income Certificate</option>
                  <option value="ST_CERTIFICATE">ST Certificate</option>
                  <option value="BONAFIDE_CERTIFICATE">Bonafide Certificate</option>
                  <option value="BANK_DETAILS">Bank Passbook / IFSC</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Deficiency</label>
                <textarea
                  value={deficiencyReason}
                  onChange={(e) => setDeficiencyReason(e.target.value)}
                  placeholder="e.g. Uploaded Income Certificate was issued in 2023 and is expired. Valid certificate for FY 2025-26 required."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Correction Deadline</label>
                <input
                  type="date"
                  value={deficiencyDeadline}
                  onChange={(e) => setDeficiencyDeadline(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
              <button
                onClick={() => setShowDeficiencyModal(false)}
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleRaiseDeficiency}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
              >
                Send Deficiency Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
