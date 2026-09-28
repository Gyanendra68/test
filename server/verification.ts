import { VerificationResult, VerificationSource } from '../src/types';

export interface VerificationInput {
  applicationId: string;
  studentName: string;
  dob: string;
  gender: string;
  category: string;
  stCertificateNo: string;
  apaarId?: string;
  institutionName: string;
  institutionType: string;
  institutionCode?: string;
  courseLevel: string;
  familyAnnualIncome: number;
  incomeCertificateNo?: string;
  academicPercentage?: number;
}

export interface AdapterExecutionResult {
  source: VerificationSource;
  outcome: 'VERIFIED' | 'MISMATCH' | 'NOT_FOUND' | 'PENDING' | 'MANUAL_REVIEW';
  submittedValue: string;
  verifiedValue: string;
  mismatchField?: string;
  officerAction?: string;
  notes: string;
}

export class MockVerificationEngine {
  /**
   * Run automated mock verification against all relevant external Gov registries
   * Clearly marked as "Demo / Mock Integration"
   */
  public static async runVerification(input: VerificationInput): Promise<AdapterExecutionResult[]> {
    const results: AdapterExecutionResult[] = [];

    // 1. DigiLocker / State e-District Adapter
    results.push(this.verifyDigiLockerST(input));

    // 2. UIDAI Demographic Check (Mock)
    results.push(this.verifyUIDAI(input));

    // 3. APAAR / Academic Bank of Credits Adapter
    if (input.courseLevel !== 'PRE_MATRIC') {
      results.push(this.verifyAPAAR(input));
    } else {
      // For Pre-Matric, run UDISE+ School registry check
      results.push(this.verifyUDISEPlus(input));
    }

    // 4. AISHE / Higher Education Institute Registry
    if (input.courseLevel !== 'PRE_MATRIC') {
      results.push(this.verifyAISHE(input));
    }

    // 5. Income Certificate Verification via State Revenue Registry
    results.push(this.verifyIncomeCertificate(input));

    return results;
  }

  private static verifyDigiLockerST(input: VerificationInput): AdapterExecutionResult {
    // If certificate starts with recognized state code, simulate verified
    const cert = (input.stCertificateNo || '').trim().toUpperCase();
    if (cert.length > 5 && (cert.includes('ST') || cert.includes('JH') || cert.includes('OD') || cert.includes('CG') || cert.includes('MP'))) {
      return {
        source: 'DIGILOCKER',
        outcome: 'VERIFIED',
        submittedValue: input.stCertificateNo,
        verifiedValue: `${input.stCertificateNo} [Issued to: ${input.studentName}, Scheduled Tribe]`,
        notes: 'Demo / Mock: Verified against State e-District digital repository via DigiLocker API.'
      };
    }

    return {
      source: 'DIGILOCKER',
      outcome: 'MANUAL_REVIEW',
      submittedValue: input.stCertificateNo,
      verifiedValue: 'NOT_FOUND_IN_CENTRAL_CACHE',
      mismatchField: 'ST_CERTIFICATE_NUMBER',
      officerAction: 'Officer to manually inspect physical/uploaded certificate with District Welfare Officer seal.',
      notes: 'Demo / Mock: Certificate number not matched in automated digital repository.'
    };
  }

  private static verifyUIDAI(input: VerificationInput): AdapterExecutionResult {
    // Demographic matching: name, dob, gender
    if (input.studentName && input.dob) {
      return {
        source: 'UIDAI',
        outcome: 'VERIFIED',
        submittedValue: `Name: ${input.studentName}, DOB: ${input.dob}, Gender: ${input.gender}`,
        verifiedValue: `Name: ${input.studentName}, DOB: ${input.dob}, Gender: ${input.gender}`,
        notes: 'Demo / Mock: UIDAI 1:1 demographic match score: 98.6%. Aadhaar seeding active.'
      };
    }
    return {
      source: 'UIDAI',
      outcome: 'MISMATCH',
      submittedValue: input.studentName,
      verifiedValue: 'DEMOGRAPHIC_RECORD_MISMATCH',
      mismatchField: 'STUDENT_NAME',
      officerAction: 'Verify Gazette / Affidavit or Aadhaar update slip.',
      notes: 'Demo / Mock: Name spelling divergence exceeds allowable threshold.'
    };
  }

  private static verifyAPAAR(input: VerificationInput): AdapterExecutionResult {
    if (input.apaarId && input.apaarId.includes('APAAR')) {
      return {
        source: 'APAAR',
        outcome: 'VERIFIED',
        submittedValue: `APAAR ID: ${input.apaarId}`,
        verifiedValue: `APAAR ID: ${input.apaarId} [Enrolled: ${input.institutionName}]`,
        notes: 'Demo / Mock: Student academic credit bank verified via APAAR / ABC registry.'
      };
    }

    return {
      source: 'APAAR',
      outcome: 'MANUAL_REVIEW',
      submittedValue: input.apaarId || 'NOT_PROVIDED',
      verifiedValue: 'MANUAL_BONAFIDE_CHECK_REQUIRED',
      mismatchField: 'APAAR_ID',
      officerAction: 'Verify Bonafide Certificate issued by Head of Institution.',
      notes: 'Demo / Mock: APAAR ID not linked; manual verification of bonafide certificate required.'
    };
  }

  private static verifyUDISEPlus(input: VerificationInput): AdapterExecutionResult {
    return {
      source: 'UDISE_PLUS',
      outcome: 'VERIFIED',
      submittedValue: input.institutionName,
      verifiedValue: `UDISE School Code: 20260901234 - ${input.institutionName}`,
      notes: 'Demo / Mock: Verified active school enrollment in UDISE+ database.'
    };
  }

  private static verifyAISHE(input: VerificationInput): AdapterExecutionResult {
    return {
      source: 'AISHE',
      outcome: 'VERIFIED',
      submittedValue: input.institutionName,
      verifiedValue: `${input.institutionCode || 'AISHE-U-RECOGNIZED'} - ${input.institutionName}`,
      notes: 'Demo / Mock: Recognized higher education institution under MoE / AISHE directory.'
    };
  }

  private static verifyIncomeCertificate(input: VerificationInput): AdapterExecutionResult {
    // If income <= 250000 -> verified; if higher or flagged, manual review
    if (input.familyAnnualIncome <= 800000) {
      return {
        source: 'STATE_EDISTRICT',
        outcome: 'VERIFIED',
        submittedValue: `Annual Income: ₹${input.familyAnnualIncome.toLocaleString('en-IN')}`,
        verifiedValue: `Revenue Record Income: ₹${input.familyAnnualIncome.toLocaleString('en-IN')}`,
        notes: 'Demo / Mock: Income Certificate verified from State Revenue Department.'
      };
    }

    return {
      source: 'STATE_EDISTRICT',
      outcome: 'MANUAL_REVIEW',
      submittedValue: `₹${input.familyAnnualIncome}`,
      verifiedValue: 'EXCEEDS_INCOME_CEILING',
      mismatchField: 'FAMILY_ANNUAL_INCOME',
      officerAction: 'Check income certificate issuing officer authority and validity period.',
      notes: 'Demo / Mock: Income requires officer verification against scheme ceiling.'
    };
  }
}
