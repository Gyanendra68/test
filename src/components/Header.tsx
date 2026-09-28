import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PWAInstallButton } from './PWAInstallButton';
import { Globe, UserCheck, Shield, Award, LogOut, KeyRound, UserPlus, LogIn } from 'lucide-react';

import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  onOpenDemoLogin: (tab?: 'demo' | 'signin' | 'register') => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDemoLogin }) => {
  const { user, logout } = useAuth();
  const { lang, t } = useLanguage();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      {/* Top National Strip */}
      <div className="bg-[#0b3c5d] text-white text-[11px] px-4 py-1 flex items-center justify-between border-b border-blue-900/40">
        <div className="flex items-center gap-2 font-medium">
          <span className="text-amber-400 font-semibold">{t.govIndia}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-200">{t.motaFull}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-500/30">
            {t.sihBadge}
          </span>
          {/* Multi-language Selector */}
          <LanguageSelector />
        </div>
      </div>

      {/* Main Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white p-0.5 shadow-md flex-shrink-0 border-2 border-amber-400">
            <img src="/tribal-logo.svg" alt="TribalScholar Seal" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-wide text-white font-serif">
                {t.appTitle}
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase tracking-wider">
                MoTA
              </span>
            </div>
            <p className="text-xs text-slate-300 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton />

          {!user ? (
            <>
              <button
                onClick={() => onOpenDemoLogin('register')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition border border-emerald-400"
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-300" />
                <span>{'Create Account'}</span>
              </button>

              <button
                onClick={() => onOpenDemoLogin('demo')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm transition border border-blue-500"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{'Sign In / Demo'}</span>
                <span className="sm:hidden">Login</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onOpenDemoLogin('demo')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold shadow-sm transition border border-blue-500"
                title="Switch Demo Users"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">{t.demoLogin}</span>
                <span className="sm:hidden">Demo</span>
              </button>

              <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] font-semibold text-amber-400 flex items-center justify-end gap-1">
                    {user.role === 'OFFICER' && <Shield className="w-3 h-3 text-emerald-400" />}
                    {user.role === 'ADMIN' && <Award className="w-3 h-3 text-amber-400" />}
                    {user.role === 'STUDENT' && <UserCheck className="w-3 h-3 text-blue-400" />}
                    {user.role === 'STUDENT' ? t.studentRole : user.role === 'OFFICER' ? t.officerRole : t.adminRole}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-red-400 transition rounded"
                  title={t.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Single Scholarship Rule Notice Banner */}
      <div className="bg-amber-500/10 border-t border-b border-amber-500/20 px-4 py-1 text-center text-xs font-medium text-amber-300 flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        <span>{t.singleScholarshipRuleNotice}</span>
      </div>
    </header>
  );
};
