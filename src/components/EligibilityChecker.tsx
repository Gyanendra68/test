import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { EligibilityResult, StudentProfile } from '../types';
import { Sparkles, CheckCircle2, XCircle, AlertCircle, ArrowRight, Filter, RefreshCw } from 'lucide-react';

interface EligibilityCheckerProps {
  onStartApplication: (schemeId: string) => void;
}

export const EligibilityChecker: React.FC<EligibilityCheckerProps> = ({ onStartApplication }) => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulation form states for interactive testing
  const [simIncome, setSimIncome] = useState<number>(140000);
  const [simLevel, setSimLevel] = useState<string>('UNDERGRADUATE');
  const [simInstType, setSimInstType] = useState<string>('STATE_UNIVERSITY');
  const [simPercentage, setSimPercentage] = useState<number>(78);
  const [simPVTG, setSimPVTG] = useState<boolean>(false);

  const checkEligibility = async (overrideParams?: any) => {
    try {
      setLoading(true);
      let prof = profile;
      if (!prof && user) {
        prof = await apiFetch('/api/profile').catch(() => null);
        if (prof) {
          setProfile(prof);
          setSimIncome(prof.familyAnnualIncome || 140000);
          setSimLevel(prof.courseLevel || 'UNDERGRADUATE');
          setSimInstType(prof.institutionType || 'STATE_UNIVERSITY');
          setSimPercentage(prof.academicPercentage || 78);
          setSimPVTG(Boolean(prof.pvtgStatus));
        }
      }

      const payload = overrideParams || {
        familyAnnualIncome: simIncome,
        courseLevel: simLevel,
        institutionType: simInstType,
        academicPercentage: simPercentage,
        pvtgStatus: simPVTG
      };

      const res = await apiFetch('/api/eligibility/check', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res && res.results) {
        setResults(res.results);
      }
    } catch (err) {
      console.error('Error running eligibility engine:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkEligibility();
  }, []);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    checkEligibility({
      familyAnnualIncome: Number(simIncome),
      courseLevel: simLevel,
      institutionType: simInstType,
      academicPercentage: Number(simPercentage),
      pvtgStatus: simPVTG
    });
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {t.eligibilityTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {t.eligibilitySubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Criteria Simulator */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-700" />
            <span>{'Eligibility Parameter Simulator (Test What-If Scenarios)'}</span>
          </h3>
          <button
            onClick={() => checkEligibility()}
            className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{'Recalculate'}</span>
          </button>
        </div>

        <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {'Annual Income (₹)'}
            </label>
            <input
              type="number"
              value={simIncome}
              onChange={(e) => setSimIncome(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {'Academic Level'}
            </label>
            <select
              value={simLevel}
              onChange={(e) => setSimLevel(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            >
              <option value="PRE_MATRIC">Pre-Matric (Class IX - X)</option>
              <option value="POST_MATRIC_HS">Higher Secondary (Class XI - XII)</option>
              <option value="UNDERGRADUATE">Undergraduate / Degree / Diploma</option>
              <option value="POSTGRADUATE">Postgraduate (MA, MSc, MTech, etc.)</option>
              <option value="MPHIL_PHD">M.Phil / Ph.D. Regular</option>
              <option value="OVERSEAS_MASTERS_PHD">Overseas Masters / Ph.D.</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {'Institution Type'}
            </label>
            <select
              value={simInstType}
              onChange={(e) => setSimInstType(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            >
              <option value="GOVERNMENT_SCHOOL">Government Secondary School</option>
              <option value="STATE_UNIVERSITY">State University / Affiliated College</option>
              <option value="CENTRAL_INSTITUTE">Central University</option>
              <option value="PREMIER_INSTITUTE_IIT_NIT_IIM">Premier Notified (IIT / NIT / IIM / AIIMS)</option>
              <option value="FOREIGN_UNIVERSITY">Foreign Accredited University (Top 500)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {'Qualifying Marks (%)'}
            </label>
            <input
              type="number"
              value={simPercentage}
              onChange={(e) => setSimPercentage(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm transition"
            >
              {'Check Rules'}
            </button>
          </div>
        </form>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">{t.evaluatingProfile}</p>
          </div>
        ) : (
          results.map((res) => {
            const isEligible = res.status === 'ELIGIBLE';
            const isNeedsVerif = res.status === 'NEEDS_VERIFICATION';

            return (
              <div
                key={res.schemeId}
                className={`rounded-2xl border p-5 sm:p-6 transition shadow-sm ${
                  isEligible
                    ? 'bg-white border-emerald-300 ring-1 ring-emerald-200'
                    : isNeedsVerif
                    ? 'bg-amber-50/40 border-amber-300'
                    : 'bg-white border-slate-200 opacity-90'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      {res.schemeCode}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {res.schemeNameEn}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEligible ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t.eligibleLabel}
                      </span>
                    ) : isNeedsVerif ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-full flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        {t.needsVerificationLabel}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded-full flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        {t.notEligibleLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                  {/* Matched Criteria */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      {t.matchedCriteria} ({res.reasons.length})
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {res.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Failed Criteria or Required Documents */}
                  <div className={`p-3.5 rounded-xl border ${!isEligible ? 'bg-rose-50/50 border-rose-200' : 'bg-blue-50/50 border-blue-100'}`}>
                    {!isEligible ? (
                      <div>
                        <span className="text-xs font-bold text-rose-800 block mb-2">
                          {t.failedCriteria}
                        </span>
                        <ul className="space-y-1.5 text-xs text-rose-700">
                          {res.failedConditions.map((fc, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                              <span>{fc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-blue-900 block mb-2">
                          {t.documentsRequired}
                        </span>
                        <ul className="space-y-1.5 text-xs text-blue-800">
                          {res.requiredDocuments.map((doc, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                              <span>{doc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    <span>{t.maxIncomeLimit}: </span>
                    <strong className="text-slate-800">₹{res.maxIncomeLimit.toLocaleString('en-IN')}/year</strong>
                    <span className="mx-2">•</span>
                    <span>Sample Grant/Sanction: </span>
                    <strong className="text-slate-800">₹{res.sampleAmount.toLocaleString('en-IN')}</strong>
                  </div>

                  {isEligible && (
                    <button
                      onClick={() => onStartApplication(res.schemeId)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <span>{t.applyForThisScheme}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
