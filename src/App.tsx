import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { SyncProvider, useSync } from './context/SyncContext';
import { Header } from './components/Header';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DemoLoginModal } from './components/DemoLoginModal';
import { StudentDashboard } from './components/StudentDashboard';
import { EligibilityChecker } from './components/EligibilityChecker';
import { SchemesCatalog } from './components/SchemesCatalog';
import { ApplicationForm } from './components/ApplicationForm';
import { DocumentWallet } from './components/DocumentWallet';
import { ApplicationTracking } from './components/ApplicationTracking';
import { DeficiencyResolution } from './components/DeficiencyResolution';
import { PaymentTracking } from './components/PaymentTracking';
import { NotificationsView } from './components/NotificationsView';
import { ProfileManagement } from './components/ProfileManagement';
import { JagoChatbot } from './components/JagoChatbot';
import { OfficerDashboard } from './components/OfficerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { MyApplicationsList } from './components/MyApplicationsList';
import {
  LayoutDashboard, BookOpen, Sparkles, FolderLock, CreditCard,
  Bell, User, Shield, Award, FileText, CheckCircle2, AlertTriangle
} from 'lucide-react';

function MainApp() {
  const { user, isLoading } = useAuth();
  const { t, lang } = useLanguage();
  const { syncState } = useSync();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>(undefined);
  const [targetSchemeForApplication, setTargetSchemeForApplication] = useState<string | undefined>(undefined);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [demoModalTab, setDemoModalTab] = useState<'demo' | 'signin' | 'register'>('demo');

  const openAuthModal = (tab: 'demo' | 'signin' | 'register' = 'demo') => {
    setDemoModalTab(tab);
    setShowDemoModal(true);
  };

  // If user is not yet logged in, auto open Demo login modal or show landing
  const isOfficer = user?.role === 'OFFICER';
  const isAdmin = user?.role === 'ADMIN';
  const isStudent = !user || user?.role === 'STUDENT';

  const handleStartApplication = (schemeId?: string) => {
    if (!user) {
      openAuthModal('signin');
      return;
    }
    setTargetSchemeForApplication(schemeId);
    setActiveTab('apply');
  };

  const handleSelectApplication = (id: string) => {
    if (!user) {
      openAuthModal('signin');
      return;
    }
    setSelectedApplicationId(id);
    setActiveTab('tracking');
  };

  const handleTabClick = (tab: string) => {
    if (!user && ['my_applications', 'wallet', 'payments', 'notifications', 'profile'].includes(tab)) {
      openAuthModal('signin');
      return;
    }
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">TribalScholar Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans">
      {/* Gov Header */}
      <Header onOpenDemoLogin={openAuthModal} />

      {/* Main Navigation Subbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-[72px] sm:top-[76px] z-20 shadow-sm overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 sm:gap-2 py-2">
          {/* Student Tabs */}
          {isStudent && (
            <>
              <button
                onClick={() => handleTabClick('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'dashboard' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{t.navDashboard}</span>
              </button>

              <button
                onClick={() => handleTabClick('schemes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'schemes' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{t.navSchemes}</span>
              </button>

              <button
                onClick={() => handleTabClick('eligibility')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'eligibility' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.navEligibility}</span>
              </button>

              <button
                onClick={() => handleTabClick('my_applications')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'my_applications' || activeTab === 'tracking' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.navMyApplications}</span>
              </button>

              <button
                onClick={() => handleTabClick('wallet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'wallet' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FolderLock className="w-3.5 h-3.5" />
                <span>{t.navDocumentWallet}</span>
              </button>

              <button
                onClick={() => handleTabClick('payments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'payments' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{t.navPayments}</span>
              </button>

              <button
                onClick={() => handleTabClick('notifications')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'notifications' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{t.navNotifications}</span>
              </button>

              <button
                onClick={() => handleTabClick('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'profile' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{'Profile'}</span>
              </button>
            </>
          )}

          {/* Officer Navigation */}
          {isOfficer && (
            <>
              <button
                onClick={() => setActiveTab('officer_queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'officer_queue' ? 'bg-purple-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t.navOfficerReview}</span>
              </button>
            </>
          )}

          {/* Admin Navigation */}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('admin_console')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'admin_console' ? 'bg-amber-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{t.adminTitle}</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {/* If user is not logged in, show callout to try demo personas */}
        {!user && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white mb-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                {t.sihBadge}
              </span>
              <h2 className="text-xl font-extrabold mt-1">
                {t.appSubtitle}
              </h2>
              <p className="text-xs text-blue-200 mt-1 max-w-xl">
                {t.portalTagline}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => openAuthModal('register')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
              >
                {'Create Account'}
              </button>
              <button
                onClick={() => openAuthModal('demo')}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow transition"
              >
                {t.demoLogin}
              </button>
            </div>
          </div>
        )}

        {/* View Switcher */}
        {isOfficer ? (
          <OfficerDashboard />
        ) : isAdmin ? (
          <AdminDashboard />
        ) : activeTab === 'dashboard' ? (
          <StudentDashboard
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectApplication={handleSelectApplication}
          />
        ) : activeTab === 'schemes' ? (
          <SchemesCatalog onStartApplication={handleStartApplication} />
        ) : activeTab === 'eligibility' ? (
          <EligibilityChecker onStartApplication={handleStartApplication} />
        ) : activeTab === 'apply' ? (
          <ApplicationForm
            initialSchemeId={targetSchemeForApplication}
            onSubmitted={(appId) => {
              setSelectedApplicationId(appId);
              setActiveTab('tracking');
            }}
            onCancel={() => setActiveTab('dashboard')}
          />
        ) : activeTab === 'my_applications' ? (
          <MyApplicationsList
            onSelectApplication={handleSelectApplication}
            onNavigate={(tab) => setActiveTab(tab)}
            onStartApplication={handleStartApplication}
          />
        ) : activeTab === 'wallet' ? (
          <DocumentWallet onOpenAuth={openAuthModal} />
        ) : activeTab === 'tracking' ? (
          <ApplicationTracking
            applicationId={selectedApplicationId}
            onBack={() => setActiveTab('dashboard')}
          />
        ) : activeTab === 'deficiencies' ? (
          <DeficiencyResolution onSuccess={() => setActiveTab('dashboard')} />
        ) : activeTab === 'payments' ? (
          <PaymentTracking />
        ) : activeTab === 'notifications' ? (
          <NotificationsView onNavigate={(tab) => setActiveTab(tab)} />
        ) : activeTab === 'profile' ? (
          <ProfileManagement />
        ) : (
          <StudentDashboard
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectApplication={handleSelectApplication}
          />
        )}
      </main>

      {/* Floating JAGO Chatbot (Available for all roles & students) */}
      <JagoChatbot onNavigate={(tab) => setActiveTab(tab)} />

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Demo & Registration Modal */}
      <DemoLoginModal
        isOpen={showDemoModal}
        initialTab={demoModalTab}
        onClose={() => setShowDemoModal(false)}
      />

      {/* Government Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-white text-xs py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-amber-400">
              <img src="/tribal-logo.svg" alt="TribalScholar Seal" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-bold text-slate-200">
                {t.appTitle} — {t.appSubtitle}
              </p>
              <p className="text-[11px] text-slate-400">
                {t.motaFull} • {t.govIndia}
              </p>
            </div>
          </div>

          <div className="text-center md:text-right text-[11px] text-slate-400 space-y-1">
            <p>Designed for Smart India Hackathon 2026 • Problem Statement ID: 26238</p>
            <p className="text-slate-500 font-mono">
              Enforcing: One Student One Scholarship Rule • DigiLocker / APAAR / UIDAI Automated Mock Pipeline
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SyncProvider>
          <MainApp />
        </SyncProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
