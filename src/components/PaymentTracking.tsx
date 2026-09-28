import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PaymentRecord } from '../types';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, ArrowRight, Building, Check } from 'lucide-react';

export const PaymentTracking: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) {
        setLoading(false);
        setPayments([]);
        return;
      }
      try {
        setLoading(true);
        const data = await apiFetch('/api/payments');
        if (Array.isArray(data)) setPayments(data);
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{t.paymentTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            {t.paymentSubtitle}
          </p>
        </div>
      </div>

      {/* Payment Records */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">{t.loading}</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">
            {'No Payment Records Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {'Once your application is sanctioned by the Department Officer, DBT transaction details will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => {
            const isSuccess = p.status === 'SUCCESS';
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      {p.sanctionNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      Sanctioned Amount: <span className="text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</span>
                    </h3>
                  </div>

                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    isSuccess
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {isSuccess ? 'Disbursed (Success)' : 'DBT Queued'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">{t.transactionRef}</span>
                    <span className="font-mono font-bold text-slate-800">{p.transactionRef || 'QUEUED_IN_BATCH'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">{t.dbtBatch}</span>
                    <span className="font-mono text-slate-700">{p.dbtBatchNo || 'MOTA-2026-PFMS'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">{t.bankAccount}</span>
                    <span className="font-mono text-slate-700">XXXXXX{p.bankAccountLast4} ({p.bankIfsc})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">{t.disbursementDate}</span>
                    <span className="text-slate-700">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'Processing'}</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Direct Benefit Transfer initiated directly to the beneficiary's Aadhaar-linked bank account as per DBT Mission guidelines.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
