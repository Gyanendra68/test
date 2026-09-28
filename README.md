# TribalScholar — Unified Scholarship Portal for Scheduled Tribe Students

**Ministry of Tribal Affairs (MoTA), Government of India**  
**Smart India Hackathon 2026 | Problem Statement ID: 26238**

---

## 🏛️ Project Overview
TribalScholar is an enterprise-grade, offline-first Progressive Web Application (PWA) designed to eliminate duplicate scholarship disbursements, bridge the digital divide for indigenous (ST & PVTG) students, automate eligibility checks with DigiLocker/APAAR verification, and provide real-time DBT tracking.

### 🌟 Key Features
1. **Rule-Based Eligibility Checker**: Checks real-time eligibility across Post-Matric, Pre-Matric, National Overseas Scholarship (NOS), National Fellowship (NFST), and Top Class Education schemes.
2. **"One Student, One Scholarship" Enforcement**: Automated duplicate detection cross-checks Aadhaar, APAAR ID, bank accounts, and academic year across Central and State portals before allowing submission.
3. **9-Step Streamlined Application**: Guided wizard with auto-fetch from DigiLocker, offline draft saving, document upload, and bank validation.
4. **Interactive Multi-Stage Tracking**: Real-time status pipeline from Submission to Verification, Sanction, and DBT PFMS disbursement.
5. **Two-Way Deficiency Resolution**: Officer can raise specific queries/objections, and students can re-upload corrected documents and resubmit.
6. **DigiLocker Document Wallet**: Secure client-side and cloud vault for Caste, Income, Bonafide, Marksheet, and Bank Passbook documents.
7. **JAGO Virtual Assistant**: Multi-language AI chatbot trained on MoTA guidelines to answer questions, guide schemes, and assist applications.
8. **Multi-Language Support (9 Languages)**: English, हिन्दी (Hindi), অসমীয়া (Assamese), বাংলা (Bengali), नेपाली (Nepali), Mizo (মিজো), মণিপুরী (Meitei), Ka Ktien Khasi, and A·chik (Garo).
9. **Role-Based Portals**:
   - **Student Dashboard**: Application progress, document vault, DBT payment breakdown.
   - **Officer Review Console**: Verify, raise deficiency, issue sanction orders, and trigger DBT disbursement.
   - **Central MoTA Admin Console**: National analytics, outreach engine (identifies un-enrolled ST students via UDISE+/APAAR), and system logs.

---

## 🚀 Quick Start Guide (Local Setup)

### Prerequisites
- Node.js 18+ or 20+
- npm or bun

### 1. Installation
```bash
# Clone or unzip repository
cd tribalscholar

# Install dependencies
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 3. Production Build
```bash
npm run build
npm start
```

---

## 🔐 Pre-Configured Test Credentials

| Role | Name | Email | Password | Scenario / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Student (Verified)** | Sunita Bai Munda | `student@example.com` | `Student@123` | Application in VERIFIED state awaiting sanction |
| **Student (Deficiency)** | Birsa Soren | `deficiency.student@example.com` | `Student@123` | Active deficiency on Income Certificate for resolution demo |
| **Student (PVTG Fresh)** | Kavita Gond | `fresh.student@example.com` | `Student@123` | PVTG Maria Gond applicant; fresh eligibility & application |
| **Verification Officer** | Dr. Rameshwar Oraon | `officer@example.com` | `Officer@123` | District Verification Officer; approve, sanction & DBT payout |
| **MoTA Central Admin** | Shri Arjun Meena, IAS | `admin@example.com` | `Admin@123` | Central analytics, UDISE+ outreach & system monitor |

*Or click the **"1-Click Demo"** button on the top right header to instantly log in as any persona!*

---

## 📦 Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend**: Node.js, Express, SQLite3 (better-sqlite3)
- **PWA**: Service Worker with offline caching, Web App Manifest
- **Security**: JWT Authentication, bcryptjs password hashing, role-based middleware
# Tribal-Scholar
