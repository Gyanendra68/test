import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSync } from '../context/SyncContext';
import { Scheme, StudentProfile, WalletDocument } from '../types';
import {
  CheckCircle2, ArrowRight, ArrowLeft, Save, AlertCircle,
  FileCheck, Shield, Upload, FileText, Check, AlertTriangle
} from 'lucide-react';

interface ApplicationFormProps {
  initialSchemeId?: string;
  onSubmitted: (applicationId: string) => void;
  onCancel: () => void;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  initialSchemeId,
  onSubmitted,
  onCancel
}) => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();
  const { saveOfflineDraft, getOfflineDraft, clearOfflineDraft, isOnline, enqueuePendingAction } = useSync();

  const [currentStep, setCurrentStep] = useState(1);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(initialSchemeId || 'scheme_post_matric');
  const [walletDocs, setWalletDocs] = useState<WalletDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionSuccessId, setSubmissionSuccessId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    personalDetails: {
      fullName: '',
      dob: '2005-01-15',
      gender: 'FEMALE',
      mobile: '',
      email: '',
      state: 'Jharkhand',
      district: 'Ranchi',
      villageTown: 'Khunti',
      category: 'ST',
      stCertificateNo: 'JH-ST-2024-88912',
      pvtgStatus: false,
      pvtgGroup: '',
      aadhaarMasked: 'XXXX-XXXX-9142'
    },
    academicDetails: {
      institutionName: '',
      institutionType: 'STATE_UNIVERSITY',
      institutionCode: 'AISHE-U-0205',
      courseName: 'Bachelor of Science',
      courseLevel: 'UNDERGRADUATE',
      classYear: '1st Year',
      previousPercentage: 76.5,
      apaarId: 'APAAR-2026-8812-4091',
      foreignUniversityOffer: '',
      researchTopic: ''
    },
    familyIncomeDetails: {
      fatherName: 'Mangal Munda',
      motherName: 'Somari Munda',
      guardianOccupation: 'Agriculture',
      familyAnnualIncome: 140000,
      incomeCertificateNo: 'JH-INC-2026-11234',
      issuingAuthority: 'Tahsildar, Khunti',
      issueDate: '2026-05-10'
    },
    bankDetails: {
      accountHolderName: '',
      bankName: 'State Bank of India',
      accountNumber: '38291045129',
      ifscCode: 'SBIN0000167',
      branchName: 'Main Branch'
    },
    documentIds: [] as string[],
    declarationSigned: false
  });

  // Load existing profile and wallet docs
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [schemesData, profileData, docsData] = await Promise.all([
          apiFetch('/api/schemes').catch(() => []),
          user ? apiFetch('/api/profile').catch(() => null) : Promise.resolve(null),
          user ? apiFetch('/api/documents').catch(() => []) : Promise.resolve([])
        ]);

        if (Array.isArray(schemesData)) setSchemes(schemesData);
        if (Array.isArray(docsData)) setWalletDocs(docsData);

        // Check if offline draft exists
        const cachedDraft = getOfflineDraft();
        if (cachedDraft) {
          setFormData(cachedDraft.formData);
          if (cachedDraft.schemeId) setSelectedSchemeId(cachedDraft.schemeId);
        } else if (profileData) {
          // Prefill with student profile
          setFormData((prev) => ({
            ...prev,
            personalDetails: {
              ...prev.personalDetails,
              fullName: profileData.fullName || user?.fullName || '',
              dob: profileData.dob || prev.personalDetails.dob,
              gender: profileData.gender || prev.personalDetails.gender,
              mobile: profileData.mobile || user?.mobile || '',
              email: profileData.email || user?.email || '',
              state: profileData.state || prev.personalDetails.state,
              district: profileData.district || prev.personalDetails.district,
              villageTown: profileData.villageTown || prev.personalDetails.villageTown,
              stCertificateNo: profileData.stCertificateNo || prev.personalDetails.stCertificateNo,
              pvtgStatus: Boolean(profileData.pvtgStatus),
              pvtgGroup: profileData.pvtgGroup || ''
            },
            academicDetails: {
              ...prev.academicDetails,
              institutionName: profileData.institutionName || prev.academicDetails.institutionName,
              institutionType: profileData.institutionType || prev.academicDetails.institutionType,
              courseName: profileData.courseName || prev.academicDetails.courseName,
              courseLevel: profileData.courseLevel || prev.academicDetails.courseLevel,
              classYear: profileData.classYear || prev.academicDetails.classYear,
              previousPercentage: profileData.academicPercentage || prev.academicDetails.previousPercentage,
              apaarId: profileData.apaarId || prev.academicDetails.apaarId
            },
            familyIncomeDetails: {
              ...prev.familyIncomeDetails,
              familyAnnualIncome: profileData.familyAnnualIncome || prev.familyIncomeDetails.familyAnnualIncome
            },
            bankDetails: {
              ...prev.bankDetails,
              accountHolderName: profileData.fullName || user?.fullName || '',
              bankName: profileData.bankName || prev.bankDetails.bankName,
              ifscCode: profileData.bankIfsc || prev.bankDetails.ifscCode,
              accountNumber: profileData.bankAccountNo || prev.bankDetails.accountNumber
            }
          }));
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [user]);

  const selectedScheme = schemes.find((s) => s.id === selectedSchemeId) || schemes[0];

  // Save Draft (supports offline caching and server sync)
  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      setError(null);

      // Save to local offline store
      saveOfflineDraft({ schemeId: selectedSchemeId, formData });

      if (isOnline) {
        await apiFetch('/api/applications', {
          method: 'POST',
          body: JSON.stringify({
            schemeId: selectedSchemeId,
            isDraft: true,
            details: formData,
            documentIds: formData.documentIds
          })
        });
      } else {
        enqueuePendingAction({
          type: 'SAVE_DRAFT',
          endpoint: '/api/applications',
          method: 'POST',
          payload: {
            schemeId: selectedSchemeId,
            isDraft: true,
            details: formData,
            documentIds: formData.documentIds
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Could not save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit Final Application
  const handleSubmit = async () => {
    if (!formData.declarationSigned) {
      setError('Please accept the declaration to proceed.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await apiFetch('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          schemeId: selectedSchemeId,
          isDraft: false,
          details: formData,
          documentIds: formData.documentIds
        })
      });

      clearOfflineDraft();
      setSubmissionSuccessId(res.applicationNumber);
    } catch (err: any) {
      // Handles 409 One Scholarship rule violation or validation errors
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  // Attach / Reuse document from wallet
  const toggleAttachDoc = (docId: string) => {
    setFormData((prev) => {
      const exists = prev.documentIds.includes(docId);
      const updated = exists ? prev.documentIds.filter((id) => id !== docId) : [...prev.documentIds, docId];
      return { ...prev, documentIds: updated };
    });
  };

  // Upload and immediately attach
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileDataUrl = reader.result as string;
        const res = await apiFetch('/api/documents', {
          method: 'POST',
          body: JSON.stringify({
            docName: file.name,
            docType,
            fileDataUrl,
            mimeType: file.type
          })
        });
        if (res.document) {
          setWalletDocs((prev) => [res.document, ...prev]);
          toggleAttachDoc(res.document.id);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError('Failed to upload document');
    }
  };

  if (submissionSuccessId) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md text-center max-w-xl mx-auto my-8">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          {'Submission Successful'}
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 mt-3">
          {'Application Submitted to MoTA'}
        </h2>
        <p className="text-xs text-slate-600 mt-2">
          {'Your scholarship application has been queued for automated verification across DigiLocker, APAAR, and UIDAI registries.'}
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-6">
          <span className="text-xs text-slate-500 block uppercase font-bold">{t.appIdGenerated}</span>
          <span className="text-xl font-mono font-extrabold text-blue-900">{submissionSuccessId}</span>
        </div>

        <button
          onClick={() => onSubmitted(submissionSuccessId)}
          className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition"
        >
          {'Go to Dashboard & Track Application'}
        </button>
      </div>
    );
  }

  const stepsList = [
    t.step1, t.step2, t.step3, t.step4, t.step5, t.step6, t.step7, t.step8, t.step9
  ];

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
              {'Unified MoTA Scholarship Form'}
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {stepsList[currentStep - 1]}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Step {currentStep} of {stepsList.length}
            </span>
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingDraft ? t.saving : t.saveDraft}</span>
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-9 gap-1 mt-4">
          {stepsList.map((stepName, i) => (
            <div
              key={i}
              onClick={() => setCurrentStep(i + 1)}
              className={`h-2 rounded-full cursor-pointer transition ${
                currentStep === i + 1
                  ? 'bg-blue-600'
                  : currentStep > i + 1
                  ? 'bg-emerald-500'
                  : 'bg-slate-200'
              }`}
              title={`Step ${i + 1}: ${stepName}`}
            />
          ))}
        </div>
      </div>

      {/* Error Banner (e.g. One Scholarship Rule violation) */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-300 text-red-800 text-xs rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block text-sm mb-0.5">
              {'Application Validation Notice'}
            </strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* STEP CONTENTS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm min-h-[380px]">
        {/* Step 1: Personal Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">1. Personal & Identity Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.personalDetails.fullName}
                  onChange={(e) => setFormData({ ...formData, personalDetails: { ...formData.personalDetails, fullName: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.personalDetails.dob}
                  onChange={(e) => setFormData({ ...formData, personalDetails: { ...formData.personalDetails, dob: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.personalDetails.gender}
                  onChange={(e) => setFormData({ ...formData, personalDetails: { ...formData.personalDetails, gender: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State of Domicile</label>
                <input
                  type="text"
                  value={formData.personalDetails.state}
                  onChange={(e) => setFormData({ ...formData, personalDetails: { ...formData.personalDetails, state: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
                <input
                  type="text"
                  value={formData.personalDetails.district}
                  onChange={(e) => setFormData({ ...formData, personalDetails: { ...formData.personalDetails, district: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ST Certificate Number</label>
                <input
                  type="text"
                  value={formData.personalDetails.stCertificateNo}
                  onChange={(e) => setFormData({ ...formData, personalDetails: { ...formData.personalDetails, stCertificateNo: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="pvtgCheck"
                checked={formData.personalDetails.pvtgStatus}
                onChange={(e) => setFormData({ ...formData, personalDetails: { ...formData.personalDetails, pvtgStatus: e.target.checked } })}
                className="w-4 h-4 rounded text-blue-600"
              />
              <label htmlFor="pvtgCheck" className="text-xs font-bold text-slate-800">
                Belongs to Particularly Vulnerable Tribal Group (PVTG)
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Academic Details */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">2. Current Academic Enrollment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  value={formData.academicDetails.institutionName}
                  onChange={(e) => setFormData({ ...formData, academicDetails: { ...formData.academicDetails, institutionName: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  placeholder="e.g. St. Xavier College / IIT / Government High School"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Institution Type</label>
                <select
                  value={formData.academicDetails.institutionType}
                  onChange={(e) => setFormData({ ...formData, academicDetails: { ...formData.academicDetails, institutionType: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                >
                  <option value="STATE_UNIVERSITY">State University / College</option>
                  <option value="PREMIER_INSTITUTE_IIT_NIT_IIM">Premier Notified (IIT / NIT / IIM / AIIMS)</option>
                  <option value="GOVERNMENT_SCHOOL">Government School (Class IX - XII)</option>
                  <option value="CENTRAL_INSTITUTE">Central University</option>
                  <option value="FOREIGN_UNIVERSITY">Foreign University (for NOS)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course Name</label>
                <input
                  type="text"
                  value={formData.academicDetails.courseName}
                  onChange={(e) => setFormData({ ...formData, academicDetails: { ...formData.academicDetails, courseName: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Class / Year</label>
                <input
                  type="text"
                  value={formData.academicDetails.classYear}
                  onChange={(e) => setFormData({ ...formData, academicDetails: { ...formData.academicDetails, classYear: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Previous Exam Marks (%)</label>
                <input
                  type="number"
                  value={formData.academicDetails.previousPercentage}
                  onChange={(e) => setFormData({ ...formData, academicDetails: { ...formData.academicDetails, previousPercentage: Number(e.target.value) } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">APAAR / ABC ID (Mock)</label>
                <input
                  type="text"
                  value={formData.academicDetails.apaarId}
                  onChange={(e) => setFormData({ ...formData, academicDetails: { ...formData.academicDetails, apaarId: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Family & Income Details */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">3. Family & Income Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Father's Name</label>
                <input
                  type="text"
                  value={formData.familyIncomeDetails.fatherName}
                  onChange={(e) => setFormData({ ...formData, familyIncomeDetails: { ...formData.familyIncomeDetails, fatherName: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mother's Name</label>
                <input
                  type="text"
                  value={formData.familyIncomeDetails.motherName}
                  onChange={(e) => setFormData({ ...formData, familyIncomeDetails: { ...formData.familyIncomeDetails, motherName: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Annual Family Income (₹)</label>
                <input
                  type="number"
                  value={formData.familyIncomeDetails.familyAnnualIncome}
                  onChange={(e) => setFormData({ ...formData, familyIncomeDetails: { ...formData.familyIncomeDetails, familyAnnualIncome: Number(e.target.value) } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Income Certificate No.</label>
                <input
                  type="text"
                  value={formData.familyIncomeDetails.incomeCertificateNo}
                  onChange={(e) => setFormData({ ...formData, familyIncomeDetails: { ...formData.familyIncomeDetails, incomeCertificateNo: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Issuing Authority</label>
                <input
                  type="text"
                  value={formData.familyIncomeDetails.issuingAuthority}
                  onChange={(e) => setFormData({ ...formData, familyIncomeDetails: { ...formData.familyIncomeDetails, issuingAuthority: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={formData.familyIncomeDetails.issueDate}
                  onChange={(e) => setFormData({ ...formData, familyIncomeDetails: { ...formData.familyIncomeDetails, issueDate: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Bank Details */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">4. Bank Account Details (for Direct Benefit Transfer)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.bankDetails.accountHolderName}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountHolderName: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankDetails.bankName}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, ifscCode: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
              ℹ Notice: The provided bank account must be seeded with your Aadhaar for automated PFMS DBT credit.
            </div>
          </div>
        )}

        {/* Step 5: Scheme Selection */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">5. Select Scholarship Scheme</h3>
            <p className="text-xs text-slate-600">
              {t.singleScholarshipRuleNotice}
            </p>
            <div className="space-y-2.5">
              {schemes.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                    selectedSchemeId === s.id
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="schemeSelector"
                    checked={selectedSchemeId === s.id}
                    onChange={() => setSelectedSchemeId(s.id)}
                    className="w-4 h-4 text-blue-600 mt-1"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {s.nameEn}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {t.maxIncomeLimit}: ₹{s.maxIncomeLimit.toLocaleString('en-IN')} | {s.eligibleClasses}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Documents & Reuse */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                6. Attach Documents (Upload or Reuse from Wallet)
              </h3>
              <span className="text-xs text-slate-500">
                {formData.documentIds.length} document(s) attached
              </span>
            </div>

            <p className="text-xs text-slate-600">
              {'You can attach previously uploaded valid documents directly from your Document Wallet:'}
            </p>

            {walletDocs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {walletDocs.map((doc) => {
                  const isAttached = formData.documentIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleAttachDoc(doc.id)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isAttached
                          ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className={`w-5 h-5 ${isAttached ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block truncate max-w-[200px]">
                            {doc.docName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {doc.docType} • {(doc.fileSize / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      </div>

                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        isAttached ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isAttached ? 'Attached' : t.reuseFromWallet}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No documents in wallet. Use the upload button below.</p>
            )}

            <div className="mt-4 pt-3 border-t">
              <span className="text-xs font-bold text-slate-800 block mb-2">{t.uploadNewFile}</span>
              <div className="flex flex-wrap gap-2">
                {['ST_CERTIFICATE', 'INCOME_CERTIFICATE', 'BONAFIDE_CERTIFICATE', 'MARKSHEET'].map((type) => (
                  <label key={type} className="cursor-pointer px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload {type.replace('_', ' ')}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleDirectUpload(e, type)}
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Digital Verification Preview */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
              7. Automated Digital Verification Pipeline (Demo Mock Integration)
            </h3>
            <p className="text-xs text-slate-600">
              Upon submission, your application records are checked through external government integration adapters:
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <strong className="block text-slate-900">DigiLocker / State e-District API</strong>
                  <span className="text-slate-500">Validates ST Certificate against state revenue records</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">READY</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <strong className="block text-slate-900">APAAR / Academic Bank of Credits</strong>
                  <span className="text-slate-500">Matches student identity with enrolled higher institution</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">READY</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <strong className="block text-slate-900">UIDAI Demographic Matching (Mock)</strong>
                  <span className="text-slate-500">Name, DOB, and Gender 1:1 match with Aadhaar record</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">READY</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Declaration */}
        {currentStep === 8 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">8. Student Self-Declaration</h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-3 leading-relaxed">
              <p>
                1. I hereby certify that the information given by me in this application is true, complete, and correct to the best of my knowledge and belief.
              </p>
              <p>
                2. I solemnly declare that <strong>I am not receiving any other scholarship/fellowship</strong> from any State Government, Central Government, or any other source for the same course of study.
              </p>
              <p>
                3. I understand that if any information is found false or misleading at any stage, the sanctioned scholarship will be cancelled and the amount disbursed shall be recovered as arrears of land revenue.
              </p>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/40 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.declarationSigned}
                onChange={(e) => setFormData({ ...formData, declarationSigned: e.target.checked })}
                className="w-4 h-4 text-blue-600 mt-0.5"
              />
              <span className="text-xs font-bold text-slate-900">
                {t.confirmSubmission}
              </span>
            </label>
          </div>
        )}

        {/* Step 9: Review & Submission */}
        {currentStep === 9 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">9. Final Review & Submission</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Student Details</span>
                <div>Name: <strong>{formData.personalDetails.fullName}</strong></div>
                <div>Category: <strong>ST ({formData.personalDetails.stCertificateNo})</strong></div>
                <div>State: <strong>{formData.personalDetails.state}</strong></div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Target Scheme</span>
                <div className="font-bold text-blue-700">{selectedScheme?.nameEn}</div>
                <div>Academic Year: <strong>2026-27</strong></div>
                <div>Annual Income: <strong>₹{formData.familyIncomeDetails.familyAnnualIncome.toLocaleString('en-IN')}</strong></div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{t.singleScholarshipRuleNotice}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => {
            if (currentStep === 1) onCancel();
            else setCurrentStep((prev) => prev - 1);
          }}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{currentStep === 1 ? t.cancel : t.previousStep}</span>
        </button>

        {currentStep < 9 ? (
          <button
            onClick={() => setCurrentStep((prev) => prev + 1)}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <span>{t.nextStep}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? t.submitting : t.submitApplication}</span>
          </button>
        )}
      </div>
    </div>
  );
};
