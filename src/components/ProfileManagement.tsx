import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { StudentProfile } from '../types';
import { User, ShieldCheck, Building, CreditCard, Save, CheckCircle2 } from 'lucide-react';

export const ProfileManagement: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        setProfile(null);
        return;
      }
      try {
        setLoading(true);
        const data = await apiFetch('/api/profile');
        setProfile(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setSaving(true);
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
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

  if (!profile) return null;

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {'Student Profile Management'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {'Your personal, academic, ST category and bank details'}
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? t.saving : t.save}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* 1. Personal & Tribal Identity */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          <span>1. Personal & Tribal Identity</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={profile.dob}
              onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
            <select
              value={profile.gender}
              onChange={(e) => setProfile({ ...profile, gender: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mobile</label>
            <input
              type="tel"
              value={profile.mobile}
              onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ST Certificate Number</label>
            <input
              type="text"
              value={profile.stCertificateNo}
              onChange={(e) => setProfile({ ...profile, stCertificateNo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">State & District</label>
            <input
              type="text"
              value={`${profile.state}, ${profile.district}`}
              onChange={(e) => {
                const parts = e.target.value.split(',');
                setProfile({ ...profile, state: parts[0]?.trim() || '', district: parts[1]?.trim() || '' });
              }}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="pvtgCheck"
            checked={profile.pvtgStatus}
            onChange={(e) => setProfile({ ...profile, pvtgStatus: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label htmlFor="pvtgCheck" className="text-xs font-bold text-slate-800">
            Identified as Particularly Vulnerable Tribal Group (PVTG)
          </label>
          {profile.pvtgStatus && (
            <input
              type="text"
              value={profile.pvtgGroup || ''}
              onChange={(e) => setProfile({ ...profile, pvtgGroup: e.target.value })}
              placeholder="Tribal Group Name (e.g. Maria Gond, Baiga, Birhor)"
              className="px-2 py-1 border rounded text-xs"
            />
          )}
        </div>
      </div>

      {/* 2. Academic & Institution Details */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-700" />
          <span>2. Academic & Institution Details</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Institution Name</label>
            <input
              type="text"
              value={profile.institutionName}
              onChange={(e) => setProfile({ ...profile, institutionName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Institution Type</label>
            <select
              value={profile.institutionType}
              onChange={(e) => setProfile({ ...profile, institutionType: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            >
              <option value="STATE_UNIVERSITY">State University / Affiliated College</option>
              <option value="PREMIER_INSTITUTE_IIT_NIT_IIM">Premier Notified (IIT / NIT / IIM / AIIMS)</option>
              <option value="GOVERNMENT_SCHOOL">Government Secondary School</option>
              <option value="CENTRAL_INSTITUTE">Central University</option>
              <option value="FOREIGN_UNIVERSITY">Foreign University</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Course Name</label>
            <input
              type="text"
              value={profile.courseName}
              onChange={(e) => setProfile({ ...profile, courseName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Course Level</label>
            <select
              value={profile.courseLevel}
              onChange={(e) => setProfile({ ...profile, courseLevel: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            >
              <option value="PRE_MATRIC">Pre-Matric (Class IX - X)</option>
              <option value="POST_MATRIC_HS">Higher Secondary (Class XI - XII)</option>
              <option value="UNDERGRADUATE">Undergraduate / Degree / Diploma</option>
              <option value="POSTGRADUATE">Postgraduate</option>
              <option value="MPHIL_PHD">M.Phil / Ph.D.</option>
              <option value="OVERSEAS_MASTERS_PHD">Overseas Masters / Ph.D.</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Class / Year</label>
            <input
              type="text"
              value={profile.classYear}
              onChange={(e) => setProfile({ ...profile, classYear: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Qualifying Marks (%)</label>
            <input
              type="number"
              value={profile.academicPercentage}
              onChange={(e) => setProfile({ ...profile, academicPercentage: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">APAAR / ABC ID (Mock)</label>
            <input
              type="text"
              value={profile.apaarId || ''}
              onChange={(e) => setProfile({ ...profile, apaarId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Income & Bank Details */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-700" />
          <span>3. Income & DBT Bank Details</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Annual Family Income (₹)</label>
            <input
              type="number"
              value={profile.familyAnnualIncome}
              onChange={(e) => setProfile({ ...profile, familyAnnualIncome: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
            <input
              type="text"
              value={profile.bankName}
              onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bank IFSC Code</label>
            <input
              type="text"
              value={profile.bankIfsc}
              onChange={(e) => setProfile({ ...profile, bankIfsc: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bank Account Number</label>
            <input
              type="text"
              value={profile.bankAccountNo}
              onChange={(e) => setProfile({ ...profile, bankAccountNo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
