import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Scheme } from '../types';
import { BookOpen, Search, ArrowRight, HelpCircle, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

interface SchemesCatalogProps {
  onStartApplication: (schemeId: string) => void;
}

export const SchemesCatalog: React.FC<SchemesCatalogProps> = ({ onStartApplication }) => {
  const { apiFetch } = useAuth();
  const { t, lang } = useLanguage();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaqSchemeId, setExpandedFaqSchemeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/api/schemes');
        if (Array.isArray(data)) setSchemes(data);
      } catch (err) {
        console.error('Failed to load schemes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchemes();
  }, []);

  const filteredSchemes = schemes.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.nameEn.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term) ||
      s.descriptionEn.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search & Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {t.navSchemes}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {'5 Unified Central Scholarship & Fellowship Schemes administered by Ministry of Tribal Affairs (MoTA)'}
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={'Search schemes...'}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Schemes Grid */}
      <div className="space-y-5">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">{t.loading}</p>
          </div>
        ) : (
          filteredSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                      {scheme.code}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {scheme.ministry}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {scheme.nameEn}
                  </h3>
                </div>

                <button
                  onClick={() => onStartApplication(scheme.id)}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 flex-shrink-0"
                >
                  <span>{t.applyNow}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                {scheme.descriptionEn}
              </p>

              {/* Key Specs Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">{t.maxIncomeLimit}</span>
                  <span className="font-bold text-slate-800 text-sm">₹{scheme.maxIncomeLimit.toLocaleString('en-IN')}/year</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">{'Eligible Classes'}</span>
                  <span className="font-medium text-slate-800 line-clamp-1">{scheme.eligibleClasses}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">{'Sample Sanction'}</span>
                  <span className="font-bold text-emerald-700 text-sm">₹{scheme.sampleSanctionAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-950 mb-3">
                <span className="font-bold text-emerald-900 block mb-1">
                  {'Scheme Benefits & Grants:'}
                </span>
                <p className="leading-relaxed">
                  {scheme.benefitsEn}
                </p>
              </div>

              {/* FAQs Accordion */}
              {scheme.faqs && scheme.faqs.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setExpandedFaqSchemeId(expandedFaqSchemeId === scheme.id ? null : scheme.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{'Frequently Asked Questions (FAQ)'}</span>
                    {expandedFaqSchemeId === scheme.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {expandedFaqSchemeId === scheme.id && (
                    <div className="mt-3 space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      {scheme.faqs.map((faq, i) => (
                        <div key={i} className="text-xs">
                          <p className="font-bold text-slate-800">
                            Q: {faq.questionEn}
                          </p>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">
                            A: {faq.answerEn}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
