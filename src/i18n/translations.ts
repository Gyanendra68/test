export type Language =
  | 'en'
  | 'hi'
  | 'bn'
  | 'te'
  | 'mr'
  | 'ta'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'pa'
  | 'or'
  | 'as'
  | 'ne'
  | 'ur';

export interface LanguageMeta {
  code: Language;
  name: string;
  nativeName: string;
}

// These MyMemory language codes were verified against the live API.
export const supportedLanguages: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
];

export interface TranslationDictionary {
  govIndia: string;
  motaFull: string;
  appTitle: string;
  appSubtitle: string;
  sihBadge: string;
  portalTagline: string;
  singleScholarshipRuleNotice: string;

  login: string;
  logout: string;
  demoLogin: string;
  createAccount: string;
  studentRole: string;
  officerRole: string;
  adminRole: string;
  welcomeBack: string;

  navDashboard: string;
  navSchemes: string;
  navEligibility: string;
  navMyApplications: string;
  navDocumentWallet: string;
  navPayments: string;
  navNotifications: string;
  navAskJago: string;
  navOutreach: string;
  navOfficerReview: string;
  navSystemMetrics: string;

  profileCompletion: string;
  stStatusVerified: string;
  pvtgIdentified: string;
  eligibleSchemesCount: string;
  activeApplicationTitle: string;
  noActiveApplication: string;
  viewDetails: string;
  quickActions: string;
  applyNow: string;
  trackStatus: string;
  recentNotifications: string;
  markAllRead: string;

  statusDraft: string;
  statusSubmitted: string;
  statusUnderVerification: string;
  statusDeficiency: string;
  statusResubmitted: string;
  statusVerified: string;
  statusApproved: string;
  statusSanctioned: string;
  statusDisbursed: string;
  statusRejected: string;

  eligibilityTitle: string;
  eligibilitySubtitle: string;
  evaluatingProfile: string;
  eligibleLabel: string;
  notEligibleLabel: string;
  needsVerificationLabel: string;
  matchedCriteria: string;
  failedCriteria: string;
  documentsRequired: string;
  maxIncomeLimit: string;
  applyForThisScheme: string;
  alreadyAppliedAnother: string;

  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  step6: string;
  step7: string;
  step8: string;
  step9: string;

  saveDraft: string;
  saving: string;
  previousStep: string;
  nextStep: string;
  submitApplication: string;
  submitting: string;
  appIdGenerated: string;
  reuseFromWallet: string;
  uploadNewFile: string;
  confirmSubmission: string;

  walletTitle: string;
  walletSubtitle: string;
  uploadDocument: string;
  docType: string;
  selectFile: string;
  dragDropText: string;
  documentName: string;
  uploadDate: string;
  fileSize: string;
  actions: string;
  preview: string;
  delete: string;
  noDocsInWallet: string;

  trackingTitle: string;
  timelineStage1: string;
  timelineStage2: string;
  timelineStage3: string;
  timelineStage4: string;
  timelineStage5: string;
  timelineStage6: string;
  timelineStage7: string;
  timelineStage8: string;
  statusHistoryTitle: string;

  deficiencyBannerTitle: string;
  deficiencyReason: string;
  requiredAction: string;
  deadline: string;
  resolveDeficiencyNow: string;
  uploadCorrectedDoc: string;
  resolutionNotes: string;
  resubmitApp: string;

  paymentTitle: string;
  paymentSubtitle: string;
  sanctionId: string;
  sanctionAmount: string;
  paymentStatus: string;
  transactionRef: string;
  dbtBatch: string;
  disbursementDate: string;
  bankAccount: string;

  jagoTitle: string;
  jagoSubtitle: string;
  jagoPlaceholder: string;
  jagoSuggestions: string[];

  officerTitle: string;
  officerSubtitle: string;
  totalApplications: string;
  pendingVerification: string;
  deficienciesOpen: string;
  approvedSanctioned: string;
  disbursedCount: string;
  manualReviewRequired: string;
  searchApplications: string;
  filterByScheme: string;
  filterByStatus: string;
  reviewAction: string;
  verifyAction: string;
  approveAction: string;
  rejectAction: string;
  raiseDeficiency: string;
  issueSanction: string;
  disburseDBT: string;

  adminTitle: string;
  adminSubtitle: string;
  analyticsOverview: string;
  mockIntegrationsHealth: string;
  outreachTitle: string;
  outreachSubtitle: string;
  candidateName: string;
  sourceDatabase: string;
  location: string;
  courseInst: string;
  matchConfidence: string;
  suggestedScheme: string;
  outreachAction: string;
  sendSmsAlert: string;

  loading: string;
  close: string;
  cancel: string;
  save: string;
  search: string;
  filter: string;
  all: string;
  demoBadge: string;
  mockNotice: string;
  offlineNotice: string;
  onlineNotice: string;
}

const en: TranslationDictionary = {
  govIndia: 'GOVERNMENT OF INDIA',
  motaFull: 'MINISTRY OF TRIBAL AFFAIRS',
  appTitle: 'TRIBAL SCHOLAR',
  appSubtitle: 'Unified Scholarship Platform for Tribal Students',
  sihBadge: 'Smart India Hackathon 2026 • PS ID: 26238',
  portalTagline: 'Empowering Scheduled Tribe & PVTG students through centralized digital access to all MoTA scholarship and fellowship schemes',
  singleScholarshipRuleNotice: 'MoTA Guideline: One Student Can Avail Only One Scholarship Scheme at a Time.',

  login: 'Login',
  logout: 'Logout',
  demoLogin: 'Demo Login',
  createAccount: 'Create Account',
  studentRole: 'Student',
  officerRole: 'Verification Officer',
  adminRole: 'MoTA Admin',
  welcomeBack: 'Welcome back',

  navDashboard: 'Dashboard',
  navSchemes: 'Scholarship Schemes',
  navEligibility: 'Check Eligibility',
  navMyApplications: 'My Applications',
  navDocumentWallet: 'Document Wallet',
  navPayments: 'DBT Payments',
  navNotifications: 'Notifications',
  navAskJago: 'Ask JAGO',
  navOutreach: 'Outreach & Identification',
  navOfficerReview: 'Officer Verification',
  navSystemMetrics: 'System Statistics',

  profileCompletion: 'Profile Completion',
  stStatusVerified: 'ST Status: Verified',
  pvtgIdentified: 'PVTG (Particularly Vulnerable Tribal Group)',
  eligibleSchemesCount: 'Eligible Schemes',
  activeApplicationTitle: 'Current Scholarship Application',
  noActiveApplication: 'No active application submitted yet. Check eligibility to apply.',
  viewDetails: 'View Details',
  quickActions: 'Quick Actions',
  applyNow: 'Apply for Scholarship',
  trackStatus: 'Track Status',
  recentNotifications: 'Recent Notifications',
  markAllRead: 'Mark all as read',

  statusDraft: 'Draft',
  statusSubmitted: 'Submitted',
  statusUnderVerification: 'Under Verification',
  statusDeficiency: 'Action Required (Deficiency)',
  statusResubmitted: 'Resubmitted',
  statusVerified: 'Verified',
  statusApproved: 'Approved',
  statusSanctioned: 'Sanctioned',
  statusDisbursed: 'Disbursed (DBT)',
  statusRejected: 'Rejected',

  eligibilityTitle: 'MoTA Rule-Based Eligibility Engine',
  eligibilitySubtitle: 'Automated evaluation according to Ministry of Tribal Affairs guidelines for ST students',
  evaluatingProfile: 'Evaluating your profile against all 5 Central ST Schemes...',
  eligibleLabel: 'Eligible',
  notEligibleLabel: 'Not Eligible',
  needsVerificationLabel: 'Needs Verification',
  matchedCriteria: 'Criteria Matched',
  failedCriteria: 'Ineligible Condition(s)',
  documentsRequired: 'Documents Required to Apply',
  maxIncomeLimit: 'Annual Family Income Limit',
  applyForThisScheme: 'Apply for this Scheme',
  alreadyAppliedAnother: 'Cannot apply: You already hold an active application in another scheme.',

  step1: 'Personal Details',
  step2: 'Academic Details',
  step3: 'Family & Income',
  step4: 'Bank Details',
  step5: 'Scheme Eligibility',
  step6: 'Documents',
  step7: 'Digital Verification',
  step8: 'Declaration',
  step9: 'Submission',

  saveDraft: 'Save Draft',
  saving: 'Saving...',
  previousStep: 'Previous',
  nextStep: 'Next Step',
  submitApplication: 'Submit Final Application',
  submitting: 'Submitting...',
  appIdGenerated: 'Generated Application ID',
  reuseFromWallet: 'Reuse from Document Wallet',
  uploadNewFile: 'Upload New File',
  confirmSubmission: 'I declare that the information provided is true and I am not availing any other scholarship scheme concurrently.',

  walletTitle: 'Digital Document Wallet',
  walletSubtitle: 'Upload once, reuse across applications. Direct integration with DigiLocker.',
  uploadDocument: 'Upload Document',
  docType: 'Document Type',
  selectFile: 'Select File',
  dragDropText: 'Drag and drop file here, or click to browse (PDF, PNG, JPG up to 10MB)',
  documentName: 'Document Name',
  uploadDate: 'Upload Date',
  fileSize: 'Size',
  actions: 'Actions',
  preview: 'Preview',
  delete: 'Delete',
  noDocsInWallet: 'No documents in wallet yet. Upload your ST Certificate, Income Proof, and Bonafide.',

  trackingTitle: 'Application Status Timeline',
  timelineStage1: 'Application Submitted',
  timelineStage2: 'Automated Registry Verification',
  timelineStage3: 'Document Verification',
  timelineStage4: 'Institution Verification',
  timelineStage5: 'Department Officer Verification',
  timelineStage6: 'Sanction Order Issued',
  timelineStage7: 'PFMS DBT Processing',
  timelineStage8: 'Disbursed to Bank Account',
  statusHistoryTitle: 'Detailed Status Audit Log',

  deficiencyBannerTitle: 'Attention: Deficiency Flagged by Verification Officer',
  deficiencyReason: 'Deficiency Reason',
  requiredAction: 'Required Action',
  deadline: 'Resolution Deadline',
  resolveDeficiencyNow: 'Resolve Deficiency & Resubmit',
  uploadCorrectedDoc: 'Upload Corrected Document',
  resolutionNotes: 'Explanation / Resolution Notes',
  resubmitApp: 'Resubmit Application for Re-verification',

  paymentTitle: 'Direct Benefit Transfer (DBT) Tracker',
  paymentSubtitle: 'MoTA scholarship funds transferred directly via PFMS into Aadhaar-seeded student bank account',
  sanctionId: 'Sanction Order No.',
  sanctionAmount: 'Sanctioned Amount',
  paymentStatus: 'DBT Status',
  transactionRef: 'PFMS Transaction Reference',
  dbtBatch: 'DBT Batch Number',
  disbursementDate: 'Disbursement Date',
  bankAccount: 'Bank Account',

  jagoTitle: 'JAGO - Scholarship Assistant',
  jagoSubtitle: 'Scholarship Assistance & Guidance Assistant • Connected to Live Database',
  jagoPlaceholder: 'Ask in English or Hindi (e.g., "What is my status?", "Why pending?")...',
  jagoSuggestions: ['What is my application status?', 'Why is my application pending?', 'Do I have any deficiency?', 'Which schemes am I eligible for?', 'What is the one-scholarship rule?'],

  officerTitle: 'Verification Officer Portal',
  officerSubtitle: 'District Welfare & State Verification Console • MoTA Scholarship Automation',
  totalApplications: 'Total Applications',
  pendingVerification: 'Pending Verification',
  deficienciesOpen: 'Open Deficiencies',
  approvedSanctioned: 'Approved & Sanctioned',
  disbursedCount: 'DBT Disbursed',
  manualReviewRequired: 'Manual Review Required',
  searchApplications: 'Search by student name, application ID, or ST cert...',
  filterByScheme: 'All Schemes',
  filterByStatus: 'All Statuses',
  reviewAction: 'Review',
  verifyAction: 'Verify',
  approveAction: 'Approve',
  rejectAction: 'Reject',
  raiseDeficiency: 'Raise Deficiency',
  issueSanction: 'Issue Sanction',
  disburseDBT: 'Disburse via Mock DBT',

  adminTitle: 'MoTA Central Administrative Console',
  adminSubtitle: 'National Dashboard, Scheme Analytics & Automated Outreach Engine',
  analyticsOverview: 'Scholarship Scheme Analytics',
  mockIntegrationsHealth: 'Mock Gov Integrations Health',
  outreachTitle: 'Smart Outreach & Identification Engine',
  outreachSubtitle: 'Identifying eligible ST/PVTG students not yet availing scholarships (UDISE+, APAAR & OTR Matching)',
  candidateName: 'Candidate',
  sourceDatabase: 'Source System',
  location: 'District, State',
  courseInst: 'Course & Institute',
  matchConfidence: 'Match Score',
  suggestedScheme: 'Suggested Scheme',
  outreachAction: 'Outreach Action',
  sendSmsAlert: 'Notify Student',

  loading: 'Loading...',
  close: 'Close',
  cancel: 'Cancel',
  save: 'Save',
  search: 'Search',
  filter: 'Filter',
  all: 'All',
  demoBadge: 'DEMO INTEGRATION',
  mockNotice: 'Demonstration simulation: Uses realistic structured responses mirroring live Government API standards.',
  offlineNotice: 'Offline Mode: Changes saved locally. Will synchronize once network restores.',
  onlineNotice: 'Online: Synchronized with MoTA central servers.'
};

export const englishTranslations: TranslationDictionary = en;
export const translations = { en: englishTranslations } as const;
