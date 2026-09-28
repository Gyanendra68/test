import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryAll, queryOne, run } from './db.js';
import { MockVerificationEngine } from './verification.js';
import { User, StudentProfile, ApplicationStatus, SchemeCode } from '../src/types/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUploadDir } from './runtime.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tribal-scholar-gov-india-secret-key-2026';

export const apiRouter = express.Router();

// Multer storage for document uploads
export const UPLOAD_DIR = getUploadDir();
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'DOC-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
}

// -------------------------------------------------------------
// 1. AUTHENTICATION ROUTES
// -------------------------------------------------------------

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = queryOne<any>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      mobile: user.mobile
    }
  });
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const {
    fullName,
    email,
    password,
    mobile,
    role = 'STUDENT',
    category = 'ST',
    stCertificateNo,
    state = 'Jharkhand',
    district = 'Ranchi',
    villageTown = '',
    pvtgStatus = false,
    pvtgGroup = '',
    institutionName = '',
    institutionType = 'STATE_UNIVERSITY',
    courseName = '',
    courseLevel = 'UNDERGRADUATE',
    classYear = '1st Year',
    familyAnnualIncome = 150000,
    bankName = 'State Bank of India',
    bankIfsc = 'SBIN0000167',
    bankAccountNo = 'XXXXXX1234'
  } = req.body;

  if (!fullName || !email || !password || !mobile) {
    res.status(400).json({ error: 'Full name, email, password, and mobile number are required.' });
    return;
  }

  const existing = queryOne<any>('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists. Please login instead.' });
    return;
  }

  const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const passwordHash = bcrypt.hashSync(password, 8);
  const userRole = (role === 'OFFICER' || role === 'ADMIN') ? role : 'STUDENT';

  // Insert user
  run(
    `INSERT INTO users (id, email, password_hash, role, full_name, mobile, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [userId, email.trim().toLowerCase(), passwordHash, userRole, fullName.trim(), mobile.trim()]
  );

  // If Student, create initial profile
  if (userRole === 'STUDENT') {
    const certNo = stCertificateNo?.trim() || `ST-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const randomAadhaarLast4 = Math.floor(1000 + Math.random() * 9000);
    const apaarRandom = Math.floor(1000 + Math.random() * 9000);
    const otrRandom = Math.floor(10000 + Math.random() * 90000);

    run(
      `INSERT INTO profiles (
        user_id, full_name, dob, gender, mobile, email, state, district, village_town,
        category, st_certificate_no, st_status, pvtg_status, pvtg_group,
        aadhaar_masked, aadhaar_verified, apaar_id, otr_id,
        institution_name, institution_type, institution_code, course_name, course_level,
        class_year, academic_percentage, family_annual_income,
        bank_account_no, bank_ifsc, bank_name, bank_verified, profile_completed
      ) VALUES (
        ?, ?, '2005-01-01', 'FEMALE', ?, ?, ?, ?, ?,
        ?, ?, 'VERIFIED', ?, ?,
        ?, 1, ?, ?,
        ?, ?, 'AISHE-U-AUTO', ?, ?,
        ?, 75.0, ?,
        ?, ?, ?, 1, 1
      )`,
      [
        userId, fullName.trim(), mobile.trim(), email.trim().toLowerCase(), state, district, villageTown || district,
        category, certNo, pvtgStatus ? 1 : 0, pvtgGroup || null,
        `XXXX-XXXX-${randomAadhaarLast4}`, `APAAR-2026-${apaarRandom}-9901`, `OTR-ST-2026-${otrRandom}`,
        institutionName || 'Recognized Higher Educational Institute', institutionType, courseName || 'Bachelor of Arts / Science', courseLevel,
        classYear, Number(familyAnnualIncome || 150000),
        bankAccountNo || 'XXXXXX8812', bankIfsc, bankName
      ]
    );

    // Initial welcome notification
    run(
      `INSERT INTO notifications (id, user_id, title_en, title_hi, message_en, message_hi, type, link)
       VALUES (?, ?, 'Registration Successful', 'पंजीकरण सफल', 'Welcome to TribalScholar. Your account has been registered. You can now check your scheme eligibility and apply.', 'ट्राइबल स्कॉलर में आपका स्वागत है। आपका खाता पंजीकृत हो चुका है। आप योजना पात्रता जांच कर आवेदन कर सकते हैं।', 'SUCCESS', '/eligibility')`,
      [`notif_${Date.now()}`, userId]
    );
  }

  const token = jwt.sign(
    { id: userId, email: email.trim().toLowerCase(), role: userRole, fullName: fullName.trim() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: {
      id: userId,
      email: email.trim().toLowerCase(),
      role: userRole,
      fullName: fullName.trim(),
      mobile: mobile.trim()
    },
    message: 'Account created successfully!'
  });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = queryOne<any>('SELECT id, email, role, full_name, mobile, created_at FROM users WHERE id = ?', [req.user?.id]);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    mobile: user.mobile,
    createdAt: user.created_at
  });
});

// -------------------------------------------------------------
// 2. PROFILE ROUTES
// -------------------------------------------------------------

apiRouter.get('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const profile = queryOne<any>('SELECT * FROM profiles WHERE user_id = ?', [req.user?.id]);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({
    userId: profile.user_id,
    fullName: profile.full_name,
    dob: profile.dob,
    gender: profile.gender,
    mobile: profile.mobile,
    email: profile.email,
    state: profile.state,
    district: profile.district,
    villageTown: profile.village_town,
    category: profile.category,
    stCertificateNo: profile.st_certificate_no,
    stStatus: profile.st_status,
    pvtgStatus: Boolean(profile.pvtg_status),
    pvtgGroup: profile.pvtg_group,
    aadhaarMasked: profile.aadhaar_masked,
    aadhaarVerified: Boolean(profile.aadhaar_verified),
    apaarId: profile.apaar_id,
    otrId: profile.otr_id,
    institutionName: profile.institution_name,
    institutionType: profile.institution_type,
    institutionCode: profile.institution_code,
    courseName: profile.course_name,
    courseLevel: profile.course_level,
    classYear: profile.class_year,
    academicPercentage: profile.academic_percentage,
    familyAnnualIncome: profile.family_annual_income,
    bankAccountNo: profile.bank_account_no,
    bankIfsc: profile.bank_ifsc,
    bankName: profile.bank_name,
    bankVerified: Boolean(profile.bank_verified),
    profileCompleted: Boolean(profile.profile_completed),
    updatedAt: profile.updated_at
  });
});

apiRouter.put('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const p = req.body;
  const userId = req.user?.id;

  run(
    `UPDATE profiles SET
      full_name = ?, dob = ?, gender = ?, mobile = ?, state = ?, district = ?, village_town = ?,
      st_certificate_no = ?, pvtg_status = ?, pvtg_group = ?, institution_name = ?, institution_type = ?,
      institution_code = ?, course_name = ?, course_level = ?, class_year = ?, academic_percentage = ?,
      family_annual_income = ?, bank_account_no = ?, bank_ifsc = ?, bank_name = ?, profile_completed = 1,
      updated_at = datetime('now')
    WHERE user_id = ?`,
    [
      p.fullName, p.dob, p.gender, p.mobile, p.state, p.district, p.villageTown,
      p.stCertificateNo, p.pvtgStatus ? 1 : 0, p.pvtgGroup || null, p.institutionName, p.institutionType,
      p.institutionCode || null, p.courseName, p.courseLevel, p.classYear, p.academicPercentage || 0,
      p.familyAnnualIncome || 0, p.bankAccountNo, p.bankIfsc, p.bankName,
      userId
    ]
  );

  // Sync users name
  if (p.fullName) {
    run('UPDATE users SET full_name = ? WHERE id = ?', [p.fullName, userId]);
  }

  res.json({ success: true, message: 'Profile updated successfully' });
});

// -------------------------------------------------------------
// 3. SCHEMES & REAL RULE-BASED ELIGIBILITY ENGINE
// -------------------------------------------------------------

apiRouter.get('/schemes', (req: Request, res: Response) => {
  const schemes = queryAll<any>('SELECT * FROM schemes WHERE is_active = 1 ORDER BY code ASC');
  const formatted = schemes.map((s) => ({
    id: s.id,
    code: s.code,
    nameEn: s.name_en,
    nameHi: s.name_hi,
    ministry: s.ministry,
    descriptionEn: s.description_en,
    descriptionHi: s.description_hi,
    maxIncomeLimit: s.max_income_limit,
    academicLevel: s.academic_level,
    eligibleClasses: s.eligible_classes,
    benefitsEn: s.benefits_en,
    benefitsHi: s.benefits_hi,
    applicationPeriodStart: s.application_period_start,
    applicationPeriodEnd: s.application_period_end,
    sampleSanctionAmount: s.sample_sanction_amount,
    isActive: Boolean(s.is_active),
    faqs: s.faqs_json ? JSON.parse(s.faqs_json) : []
  }));
  res.json(formatted);
});

apiRouter.get('/schemes/:id', (req: Request, res: Response) => {
  const s = queryOne<any>('SELECT * FROM schemes WHERE id = ? OR code = ?', [req.params.id, req.params.id]);
  if (!s) {
    res.status(404).json({ error: 'Scheme not found' });
    return;
  }
  res.json({
    id: s.id,
    code: s.code,
    nameEn: s.name_en,
    nameHi: s.name_hi,
    ministry: s.ministry,
    descriptionEn: s.description_en,
    descriptionHi: s.description_hi,
    maxIncomeLimit: s.max_income_limit,
    academicLevel: s.academic_level,
    eligibleClasses: s.eligible_classes,
    benefitsEn: s.benefits_en,
    benefitsHi: s.benefits_hi,
    applicationPeriodStart: s.application_period_start,
    applicationPeriodEnd: s.application_period_end,
    sampleSanctionAmount: s.sample_sanction_amount,
    isActive: Boolean(s.is_active),
    faqs: s.faqs_json ? JSON.parse(s.faqs_json) : []
  });
});

// Real Rule-based Eligibility Evaluation (Public with Optional Auth)
apiRouter.post('/eligibility/check', (req: Request, res: Response) => {
  let profile = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.id) {
        profile = queryOne<any>('SELECT * FROM profiles WHERE user_id = ?', [decoded.id]);
      }
    } catch {
      // Optional auth: ignore token errors
    }
  }
  const input = { category: 'ST', ...profile, ...req.body };

  const schemes = queryAll<any>('SELECT * FROM schemes WHERE is_active = 1');
  const rules = queryAll<any>('SELECT * FROM eligibility_rules');

  const results = schemes.map((scheme) => {
    const schemeRules = rules.filter((r) => r.scheme_id === scheme.id);
    const reasons: string[] = [];
    const failedConditions: string[] = [];
    const requiredDocuments: string[] = [];
    let needsVerification = false;

    // 1. Scheduled Tribe Condition
    if (input.category === 'ST' || input.category === 'Scheduled Tribe') {
      reasons.push('Applicant belongs to recognized Scheduled Tribe community.');
      requiredDocuments.push('ST Caste Certificate (issued by Competent Authority)');
    } else {
      failedConditions.push('Applicant does not belong to the Scheduled Tribe (ST) category.');
    }

    // ST Status Verification check
    if (input.st_status !== 'VERIFIED') {
      needsVerification = true;
    }

    // 2. Annual Family Income Check
    const income = Number(input.family_annual_income || input.familyAnnualIncome || 0);
    if (income <= scheme.max_income_limit) {
      reasons.push(`Annual family income (₹${income.toLocaleString('en-IN')}) is within the scheme ceiling of ₹${scheme.max_income_limit.toLocaleString('en-IN')}.`);
      requiredDocuments.push('Current Financial Year Income Certificate');
    } else {
      failedConditions.push(`Annual family income (₹${income.toLocaleString('en-IN')}) exceeds the scheme ceiling limit of ₹${scheme.max_income_limit.toLocaleString('en-IN')}.`);
    }

    // 3. Scheme specific criteria
    const courseLevel = input.course_level || input.courseLevel;
    const instType = input.institution_type || input.institutionType;
    const percentage = Number(input.academic_percentage || input.academicPercentage || 0);

    if (scheme.code === 'PRE_MATRIC') {
      if (courseLevel === 'PRE_MATRIC' || (input.class_year && (input.class_year.includes('9') || input.class_year.includes('10')))) {
        reasons.push('Enrolled in Class IX or X in a recognized secondary school.');
        requiredDocuments.push('School Enrollment / Bonafide Certificate', 'Previous Year Marksheet');
      } else {
        failedConditions.push('Pre-Matric scholarship is exclusively for regular students of Class IX and X.');
      }
    } else if (scheme.code === 'POST_MATRIC') {
      if (['POST_MATRIC_HS', 'UNDERGRADUATE', 'POSTGRADUATE'].includes(courseLevel)) {
        reasons.push('Enrolled in post-secondary degree, diploma, or higher secondary course.');
        requiredDocuments.push('College Bonafide Certificate', 'Fee Structure Receipt', 'Previous Qualifying Marksheet');
      } else {
        failedConditions.push('Post-Matric scholarship requires enrollment in post-secondary education (Class XI through PG).');
      }
    } else if (scheme.code === 'TOP_CLASS') {
      if (['PREMIER_INSTITUTE_IIT_NIT_IIM', 'CENTRAL_INSTITUTE'].includes(instType)) {
        reasons.push('Admitted in a notified premier institution of national importance (IIT/NIT/IIM/AIIMS/etc.).');
        requiredDocuments.push('Admission Allotment Letter', 'Hostel / Institute Fee Demand', 'Computer / Laptop Quotation');
      } else {
        failedConditions.push('Top Class Scholarship is available only for students admitted into notified premier institutes (IITs, NITs, IIMs, NLUs, AIIMS).');
      }
      if (input.pvtg_status || input.pvtgStatus) {
        reasons.push('Special reservation/priority applicable for Particularly Vulnerable Tribal Group (PVTG).');
      }
    } else if (scheme.code === 'NFST') {
      if (courseLevel === 'MPHIL_PHD') {
        reasons.push('Registered full-time scholar in M.Phil or Ph.D. program in a UGC recognized university.');
        requiredDocuments.push('Ph.D. Registration / Joining Report', 'UGC/NTA NET-JRF Certificate or Entrance Proof', 'Research Topic Summary');
      } else {
        failedConditions.push('NFST fellowship is strictly for full-time regular M.Phil / Ph.D. research scholars.');
      }
    } else if (scheme.code === 'NOS') {
      if (courseLevel === 'OVERSEAS_MASTERS_PHD' || instType === 'FOREIGN_UNIVERSITY') {
        reasons.push('Pursuing Master’s or Ph.D. program abroad in an accredited overseas university.');
      } else {
        failedConditions.push('NOS is dedicated for overseas Master’s and Doctoral studies in top-ranked foreign universities.');
      }
      if (percentage >= 55) {
        reasons.push(`Qualifying degree marks (${percentage}%) satisfy the minimum 55% requirement.`);
      } else {
        failedConditions.push(`Secured ${percentage}% in qualifying exam; minimum 55% marks required for National Overseas Scholarship.`);
      }
      requiredDocuments.push('Unconditional Foreign Admission Offer', 'Passport Copy', 'GRE / IELTS / TOEFL Scorecard (if applicable)');
    }

    // Determine Final Status
    let status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_VERIFICATION' = 'ELIGIBLE';
    if (failedConditions.length > 0) {
      status = 'NOT_ELIGIBLE';
    } else if (needsVerification) {
      status = 'NEEDS_VERIFICATION';
    }

    return {
      schemeId: scheme.id,
      schemeCode: scheme.code,
      schemeNameEn: scheme.name_en,
      schemeNameHi: scheme.name_hi,
      status,
      reasons,
      failedConditions,
      requiredDocuments,
      additionalVerificationRequired: needsVerification ? 'DigiLocker ST verification pending with State Revenue records.' : undefined,
      maxIncomeLimit: scheme.max_income_limit,
      sampleAmount: scheme.sample_sanction_amount
    };
  });

  res.json({ results });
});

// -------------------------------------------------------------
// 4. APPLICATION SYSTEM & ONE SCHOLARSHIP ENFORCEMENT
// -------------------------------------------------------------

// List applications
apiRouter.get('/applications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let apps: any[] = [];

  if (user.role === 'STUDENT') {
    apps = queryAll<any>(
      `SELECT a.*, s.name_en as scheme_name_en, s.name_hi as scheme_name_hi, s.code as scheme_code,
              u.full_name as student_name, u.email as student_email, u.mobile as student_mobile,
              p.st_certificate_no, p.family_annual_income
       FROM applications a
       JOIN schemes s ON a.scheme_id = s.id
       JOIN users u ON a.student_id = u.id
       LEFT JOIN profiles p ON a.student_id = p.user_id
       WHERE a.student_id = ?
       ORDER BY a.created_at DESC`,
      [user.id]
    );
  } else {
    // Officer & Admin can see all applications
    apps = queryAll<any>(
      `SELECT a.*, s.name_en as scheme_name_en, s.name_hi as scheme_name_hi, s.code as scheme_code,
              u.full_name as student_name, u.email as student_email, u.mobile as student_mobile,
              p.st_certificate_no, p.family_annual_income
       FROM applications a
       JOIN schemes s ON a.scheme_id = s.id
       JOIN users u ON a.student_id = u.id
       LEFT JOIN profiles p ON a.student_id = p.user_id
       ORDER BY a.updated_at DESC`
    );
  }

  const result = apps.map((a) => {
    const sanction = queryOne<any>('SELECT * FROM sanctions WHERE application_id = ?', [a.id]);
    const payment = queryOne<any>('SELECT * FROM payments WHERE application_id = ?', [a.id]);
    return {
      id: a.id,
      applicationNumber: a.application_number,
      studentId: a.student_id,
      schemeId: a.scheme_id,
      schemeCode: a.scheme_code,
      schemeNameEn: a.scheme_name_en,
      schemeNameHi: a.scheme_name_hi,
      academicYear: a.academic_year,
      status: a.status,
      submittedAt: a.submitted_at,
      updatedAt: a.updated_at,
      createdAt: a.created_at,
      studentName: a.student_name,
      studentEmail: a.student_email,
      studentMobile: a.student_mobile,
      stCertificateNo: a.st_certificate_no,
      familyAnnualIncome: a.family_annual_income,
      sanctionAmount: sanction ? sanction.amount : undefined,
      payment: payment ? {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        transactionRef: payment.transaction_ref,
        paymentDate: payment.payment_date,
        dbtBatchNo: payment.dbt_batch_no
      } : undefined
    };
  });

  res.json(result);
});

// Get single application with complete relational sub-records
apiRouter.get('/applications/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const appId = req.params.id;
  const a = queryOne<any>(
    `SELECT a.*, s.name_en as scheme_name_en, s.name_hi as scheme_name_hi, s.code as scheme_code,
            u.full_name as student_name, u.email as student_email, u.mobile as student_mobile,
            p.st_certificate_no, p.family_annual_income
     FROM applications a
     JOIN schemes s ON a.scheme_id = s.id
     JOIN users u ON a.student_id = u.id
     LEFT JOIN profiles p ON a.student_id = p.user_id
     WHERE a.id = ? OR a.application_number = ?`,
    [appId, appId]
  );

  if (!a) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  // Authorization check
  if (req.user?.role === 'STUDENT' && a.student_id !== req.user.id) {
    res.status(403).json({ error: 'Access denied: You can only view your own applications.' });
    return;
  }

  const details = queryOne<any>('SELECT * FROM application_details WHERE application_id = ?', [a.id]);
  const documents = queryAll<any>(
    `SELECT ad.*, d.doc_name, d.file_url, d.file_size, d.mime_type
     FROM application_documents ad
     JOIN documents d ON ad.document_id = d.id
     WHERE ad.application_id = ?`,
    [a.id]
  );
  const timeline = queryAll<any>('SELECT * FROM status_history WHERE application_id = ? ORDER BY created_at ASC', [a.id]);
  const deficiencies = queryAll<any>('SELECT * FROM deficiencies WHERE application_id = ? ORDER BY created_at DESC', [a.id]);
  const verificationResults = queryAll<any>('SELECT * FROM verification_results WHERE application_id = ? ORDER BY verified_at DESC', [a.id]);
  const sanction = queryOne<any>('SELECT * FROM sanctions WHERE application_id = ?', [a.id]);
  const payment = queryOne<any>('SELECT * FROM payments WHERE application_id = ?', [a.id]);

  res.json({
    id: a.id,
    applicationNumber: a.application_number,
    studentId: a.student_id,
    schemeId: a.scheme_id,
    schemeCode: a.scheme_code,
    schemeNameEn: a.scheme_name_en,
    schemeNameHi: a.scheme_name_hi,
    academicYear: a.academic_year,
    status: a.status,
    submittedAt: a.submitted_at,
    updatedAt: a.updated_at,
    createdAt: a.created_at,
    studentName: a.student_name,
    studentEmail: a.student_email,
    studentMobile: a.student_mobile,
    stCertificateNo: a.st_certificate_no,
    familyAnnualIncome: a.family_annual_income,
    sanctionAmount: sanction ? sanction.amount : undefined,
    details: details ? {
      personalDetails: JSON.parse(details.personal_details_json || '{}'),
      academicDetails: JSON.parse(details.academic_details_json || '{}'),
      familyIncomeDetails: JSON.parse(details.family_income_details_json || '{}'),
      bankDetails: JSON.parse(details.bank_details_json || '{}'),
      declarationSigned: Boolean(details.declaration_signed),
      declarationDate: details.declaration_date
    } : null,
    documents: documents.map((d) => ({
      id: d.id,
      applicationId: d.application_id,
      documentId: d.document_id,
      docType: d.doc_type,
      docName: d.doc_name,
      fileUrl: d.file_url,
      fileSize: d.file_size,
      mimeType: d.mime_type,
      verificationStatus: d.verification_status,
      officerRemarks: d.officer_remarks,
      verifiedAt: d.verified_at
    })),
    timeline: timeline.map((t) => ({
      id: t.id,
      applicationId: t.application_id,
      fromStatus: t.from_status,
      toStatus: t.to_status,
      actorId: t.actor_id,
      actorRole: t.actor_role,
      remarks: t.remarks,
      createdAt: t.created_at
    })),
    deficiencies: deficiencies.map((df) => ({
      id: df.id,
      applicationId: df.application_id,
      createdByOfficerId: df.created_by_officer_id,
      deficiencyType: df.deficiency_type,
      fieldName: df.field_name,
      reasonEn: df.reason_en,
      reasonHi: df.reason_hi,
      requiredActionEn: df.required_action_en,
      requiredActionHi: df.required_action_hi,
      deadline: df.deadline,
      status: df.status,
      resolutionRemarks: df.resolution_remarks,
      resolvedAt: df.resolved_at,
      createdAt: df.created_at
    })),
    verificationResults: verificationResults.map((v) => ({
      id: v.id,
      applicationId: v.application_id,
      adapterSource: v.adapter_source,
      outcome: v.outcome,
      submittedValue: v.submitted_value,
      verifiedValue: v.verified_value,
      mismatchField: v.mismatch_field,
      officerAction: v.officer_action,
      notes: v.notes,
      verifiedAt: v.verified_at
    })),
    payment: payment ? {
      id: payment.id,
      applicationId: payment.application_id,
      sanctionId: payment.sanction_id,
      amount: payment.amount,
      status: payment.status,
      dbtBatchNo: payment.dbt_batch_no,
      transactionRef: payment.transaction_ref,
      paymentDate: payment.payment_date,
      bankIfsc: payment.bank_ifsc,
      bankAccountLast4: payment.bank_account_last4,
      failureReason: payment.failure_reason,
      createdAt: payment.created_at
    } : null
  });
});

// Create Application - ENFORCES ONE SCHOLARSHIP RULE
apiRouter.post('/applications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user?.id;
  const { schemeId, academicYear = '2026-27', isDraft = false, details, documentIds = [] } = req.body;

  if (!schemeId) {
    res.status(400).json({ error: 'Scheme ID is required' });
    return;
  }

  // -------------------------------------------------------------
  // ONE SCHOLARSHIP RULE BACKEND VALIDATION
  // Under Ministry of Tribal Affairs guidelines:
  // "ONE STUDENT CAN AVAIL ONLY ONE SCHOLARSHIP/FELLOWSHIP SCHEME AT A TIME."
  // Check for any active application that is NOT 'REJECTED'
  // -------------------------------------------------------------
  const existingActive = queryOne<any>(
    `SELECT a.*, s.name_en FROM applications a
     JOIN schemes s ON a.scheme_id = s.id
     WHERE a.student_id = ? AND a.status NOT IN ('REJECTED')`,
    [studentId]
  );

  if (existingActive) {
    if (existingActive.status === 'DRAFT' && existingActive.scheme_id === schemeId) {
      // Allow student to continue existing draft
      res.json({
        success: true,
        isExistingDraft: true,
        applicationId: existingActive.id,
        applicationNumber: existingActive.application_number,
        message: 'Resuming existing draft application.'
      });
      return;
    }

    res.status(409).json({
      error: 'One Student One Scholarship Rule Violation',
      code: 'ACTIVE_SCHOLARSHIP_EXISTS',
      message: `You already have an active application (${existingActive.application_number}) for "${existingActive.name_en}" currently in stage "${existingActive.status}". Under Ministry of Tribal Affairs guidelines, a student can avail only one scholarship scheme at a time.`
    });
    return;
  }

  // Generate Unique Application ID
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const applicationNumber = `TRIBAL-2026-${randomSuffix}`;
  const appId = `app_${Date.now()}`;
  const status: ApplicationStatus = isDraft ? 'DRAFT' : 'SUBMITTED';

  run(
    `INSERT INTO applications (id, application_number, student_id, scheme_id, academic_year, status, submitted_at, updated_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [appId, applicationNumber, studentId, schemeId, academicYear, status, isDraft ? null : new Date().toISOString()]
  );

  // Application details
  if (details) {
    run(
      `INSERT INTO application_details (id, application_id, personal_details_json, academic_details_json, family_income_details_json, bank_details_json, declaration_signed, declaration_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `det_${appId}`,
        appId,
        JSON.stringify(details.personalDetails || {}),
        JSON.stringify(details.academicDetails || {}),
        JSON.stringify(details.familyIncomeDetails || {}),
        JSON.stringify(details.bankDetails || {}),
        details.declarationSigned ? 1 : 0,
        details.declarationDate || new Date().toISOString().split('T')[0]
      ]
    );
  }

  // Attach documents
  if (Array.isArray(documentIds)) {
    for (const docId of documentIds) {
      const doc = queryOne<any>('SELECT * FROM documents WHERE id = ?', [docId]);
      if (doc) {
        run(
          `INSERT INTO application_documents (id, application_id, document_id, doc_type, verification_status)
           VALUES (?, ?, ?, ?, 'PENDING')`,
          [`appdoc_${Date.now()}_${Math.random()}`, appId, doc.id, doc.doc_type]
        );
      }
    }
  }

  // Log timeline
  run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      `sh_${Date.now()}`,
      appId,
      'INITIATED',
      status,
      studentId,
      'STUDENT',
      isDraft ? 'Application draft created.' : 'Application submitted by student online.'
    ]
  );

  // Notification
  run(
    `INSERT INTO notifications (id, user_id, title_en, title_hi, message_en, message_hi, type, link)
     VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', ?)`,
    [
      `notif_${Date.now()}`,
      studentId,
      isDraft ? 'Application Draft Saved' : 'Application Submitted Successfully',
      isDraft ? 'आवेदन प्रारूप सहेजा गया' : 'आवेदन सफलतापूर्वक जमा किया गया',
      isDraft ? `Your draft for application ${applicationNumber} has been saved.` : `Your application ${applicationNumber} has been submitted for verification.`,
      isDraft ? `आपका आवेदन प्रारूप ${applicationNumber} सहेज लिया गया है।` : `आपका आवेदन ${applicationNumber} सत्यापन हेतु सफलतापूर्वक जमा हो गया है।`,
      `/applications/${appId}`
    ]
  );

  // If submitted immediately, run automated verification asynchronously
  if (!isDraft && details) {
    runAutomatedVerification(appId, details);
  }

  res.status(201).json({
    success: true,
    applicationId: appId,
    applicationNumber,
    status,
    message: isDraft ? 'Draft saved successfully.' : 'Application submitted successfully.'
  });
});

// Submit an existing draft application
apiRouter.post('/applications/:id/submit', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const appId = req.params.id;
  const app = queryOne<any>('SELECT * FROM applications WHERE id = ? AND student_id = ?', [appId, req.user?.id]);

  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  if (app.status !== 'DRAFT') {
    res.status(400).json({ error: `Cannot submit application in status: ${app.status}` });
    return;
  }

  // Check one scholarship rule again
  const otherActive = queryOne<any>(
    'SELECT * FROM applications WHERE student_id = ? AND id != ? AND status NOT IN (\'DRAFT\', \'REJECTED\')',
    [req.user?.id, appId]
  );
  if (otherActive) {
    res.status(409).json({
      error: 'One Student One Scholarship Rule Violation',
      message: `You already have another active submitted application (${otherActive.application_number}).`
    });
    return;
  }

  run(
    `UPDATE applications SET status = 'SUBMITTED', submitted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [appId]
  );

  run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
     VALUES (?, ?, 'DRAFT', 'SUBMITTED', ?, 'STUDENT', 'Application finalized and submitted by student.')`,
    [`sh_${Date.now()}`, appId, req.user?.id]
  );

  // Fetch details to trigger automated verification
  const detailsRow = queryOne<any>('SELECT * FROM application_details WHERE application_id = ?', [appId]);
  if (detailsRow) {
    const details = {
      personalDetails: JSON.parse(detailsRow.personal_details_json || '{}'),
      academicDetails: JSON.parse(detailsRow.academic_details_json || '{}'),
      familyIncomeDetails: JSON.parse(detailsRow.family_income_details_json || '{}')
    };
    runAutomatedVerification(appId, details);
  }

  res.json({ success: true, message: 'Application submitted successfully', status: 'SUBMITTED' });
});

// Helper: Run automated mock verification adapters and update status
async function runAutomatedVerification(appId: string, details: any) {
  try {
    const p = details.personalDetails || {};
    const a = details.academicDetails || {};
    const f = details.familyIncomeDetails || {};

    const results = await MockVerificationEngine.runVerification({
      applicationId: appId,
      studentName: p.fullName,
      dob: p.dob,
      gender: p.gender,
      category: p.category,
      stCertificateNo: p.stCertificateNo,
      apaarId: a.apaarId,
      institutionName: a.institutionName,
      institutionType: a.institutionType,
      institutionCode: a.institutionCode,
      courseLevel: a.courseLevel,
      familyAnnualIncome: Number(f.familyAnnualIncome || 0),
      incomeCertificateNo: f.incomeCertificateNo,
      academicPercentage: Number(a.previousPercentage || 0)
    });

    let hasMismatch = false;
    let hasManualReview = false;

    for (const r of results) {
      run(
        `INSERT INTO verification_results (id, application_id, adapter_source, outcome, submitted_value, verified_value, mismatch_field, officer_action, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`vr_${Date.now()}_${Math.random()}`, appId, r.source, r.outcome, r.submittedValue, r.verifiedValue, r.mismatchField || null, r.officerAction || null, r.notes]
      );
      if (r.outcome === 'MISMATCH') hasMismatch = true;
      if (r.outcome === 'MANUAL_REVIEW') hasManualReview = true;
    }

    const nextStatus = (hasMismatch || hasManualReview) ? 'UNDER_VERIFICATION' : 'VERIFIED';
    run(
      `UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [nextStatus, appId]
    );

    run(
      `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
       VALUES (?, ?, 'SUBMITTED', ?, 'SYSTEM_VERIFIER', 'SYSTEM', ?)`,
      [
        `sh_${Date.now()}`,
        appId,
        nextStatus,
        hasMismatch || hasManualReview
          ? 'Automated checks completed with flags. Forwarded for Officer Manual Review.'
          : 'Automated digital verification succeeded across all registries (DigiLocker, APAAR, UIDAI).'
      ]
    );
  } catch (e) {
    console.error('Error running automated verification:', e);
  }
}

// Student Resubmit after correcting Deficiency
apiRouter.post('/applications/:id/resubmit', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const appId = req.params.id;
  const { correctedDocumentId, resolutionNotes } = req.body;

  const app = queryOne<any>('SELECT * FROM applications WHERE id = ? AND student_id = ?', [appId, req.user?.id]);
  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  if (app.status !== 'DEFICIENCY') {
    res.status(400).json({ error: 'Application is not in DEFICIENCY state.' });
    return;
  }

  // Attach corrected document if supplied
  if (correctedDocumentId) {
    const doc = queryOne<any>('SELECT * FROM documents WHERE id = ?', [correctedDocumentId]);
    if (doc) {
      run(
        `INSERT INTO application_documents (id, application_id, document_id, doc_type, verification_status, officer_remarks)
         VALUES (?, ?, ?, ?, 'PENDING', ?)`,
        [`appdoc_resub_${Date.now()}`, appId, doc.id, doc.doc_type, `Resubmitted by student: ${resolutionNotes || 'Corrected document uploaded'}`]
      );
    }
  }

  // Mark open deficiencies as pending review
  run(
    `UPDATE deficiencies SET resolution_remarks = ? WHERE application_id = ? AND status = 'OPEN'`,
    [resolutionNotes || 'Student uploaded revised document and resubmitted application.', appId]
  );

  run(
    `UPDATE applications SET status = 'RESUBMITTED', updated_at = datetime('now') WHERE id = ?`,
    [appId]
  );

  run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
     VALUES (?, ?, 'DEFICIENCY', 'RESUBMITTED', ?, 'STUDENT', ?)`,
    [`sh_${Date.now()}`, appId, req.user?.id, `Student addressed deficiency. Notes: ${resolutionNotes || 'Corrected documents attached'}`]
  );

  res.json({
    success: true,
    message: 'Application resubmitted successfully. It is now awaiting Officer re-verification.',
    status: 'RESUBMITTED'
  });
});

// -------------------------------------------------------------
// 5. DOCUMENT WALLET & REUSE
// -------------------------------------------------------------

apiRouter.get('/documents', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const docs = queryAll<any>('SELECT * FROM documents WHERE user_id = ? AND status = "ACTIVE" ORDER BY uploaded_at DESC', [req.user?.id]);
  res.json(docs.map((d) => ({
    id: d.id,
    userId: d.user_id,
    docType: d.doc_type,
    docName: d.doc_name,
    fileUrl: d.file_url,
    fileSize: d.file_size,
    mimeType: d.mime_type,
    uploadedAt: d.uploaded_at,
    status: d.status
  })));
});

// Upload document to wallet via actual file upload or base64 data URL
apiRouter.post('/documents', authMiddleware, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  let docName = req.body.docName;
  let docType = req.body.docType;
  let fileUrl = '';
  let fileSize = 0;
  let mimeType = 'application/pdf';

  if (req.file) {
    docName = docName || req.file.originalname;
    fileUrl = `/uploads/${req.file.filename}`;
    fileSize = req.file.size;
    mimeType = req.file.mimetype;
  } else if (req.body.fileDataUrl) {
    // Handling browser dataURL
    docName = docName || 'Uploaded_Document.pdf';
    fileUrl = req.body.fileDataUrl;
    fileSize = Math.round((req.body.fileDataUrl.length * 3) / 4);
    mimeType = req.body.mimeType || 'application/pdf';
  } else {
    res.status(400).json({ error: 'No file uploaded or provided.' });
    return;
  }

  const docId = `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  run(
    `INSERT INTO documents (id, user_id, doc_type, doc_name, file_url, file_size, mime_type, uploaded_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'ACTIVE')`,
    [docId, req.user?.id, docType, docName, fileUrl, fileSize, mimeType]
  );

  res.status(201).json({
    success: true,
    document: {
      id: docId,
      userId: req.user?.id,
      docType,
      docName,
      fileUrl,
      fileSize,
      mimeType,
      uploadedAt: new Date().toISOString()
    }
  });
});

apiRouter.delete('/documents/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id;
  const doc = queryOne<any>('SELECT * FROM documents WHERE id = ? AND user_id = ?', [docId, req.user?.id]);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  run('UPDATE documents SET status = "ARCHIVED" WHERE id = ?', [docId]);
  res.json({ success: true, message: 'Document removed from active wallet' });
});

// -------------------------------------------------------------
// 6. OFFICER WORKFLOW & ACTIONS
// -------------------------------------------------------------

apiRouter.get('/officer/applications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'OFFICER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Officer role required.' });
    return;
  }

  const apps = queryAll<any>(
    `SELECT a.*, s.name_en as scheme_name_en, s.code as scheme_code,
            u.full_name as student_name, u.email as student_email, u.mobile as student_mobile,
            p.st_certificate_no, p.family_annual_income, p.institution_name, p.course_name
     FROM applications a
     JOIN schemes s ON a.scheme_id = s.id
     JOIN users u ON a.student_id = u.id
     LEFT JOIN profiles p ON a.student_id = p.user_id
     ORDER BY a.updated_at DESC`
  );

  res.json(apps);
});

// Officer Verify
apiRouter.post('/officer/applications/:id/verify', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'OFFICER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Officer role required.' });
    return;
  }

  const appId = req.params.id;
  const { remarks = 'All documents and academic criteria physically and digitally verified.' } = req.body;

  const app = queryOne<any>('SELECT * FROM applications WHERE id = ?', [appId]);
  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  run(`UPDATE applications SET status = 'VERIFIED', updated_at = datetime('now') WHERE id = ?`, [appId]);
  run(`UPDATE application_documents SET verification_status = 'VERIFIED' WHERE application_id = ?`, [appId]);

  run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
     VALUES (?, ?, ?, 'VERIFIED', ?, 'OFFICER', ?)`,
    [`sh_${Date.now()}`, appId, app.status, req.user.id, remarks]
  );

  run(
    `INSERT INTO notifications (id, user_id, title_en, title_hi, message_en, message_hi, type, link)
     VALUES (?, ?, 'Application Verified', 'आवेदन सत्यापित हुआ', 'Your scholarship application has been verified by the Officer. Pending sanction order.', 'आपका छात्रवृत्ति आवेदन अधिकारी द्वारा सत्यापित किया गया। स्वीकृति आदेश प्रतीक्षित है।', 'SUCCESS', ?)`,
    [`notif_${Date.now()}`, app.student_id, `/applications/${appId}`]
  );

  res.json({ success: true, message: 'Application marked as VERIFIED', status: 'VERIFIED' });
});

// Officer Approve
apiRouter.post('/officer/applications/:id/approve', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'OFFICER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Officer role required.' });
    return;
  }

  const appId = req.params.id;
  const { remarks = 'Application approved for sanction allocation.' } = req.body;

  const app = queryOne<any>('SELECT * FROM applications WHERE id = ?', [appId]);
  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  run(`UPDATE applications SET status = 'APPROVED', updated_at = datetime('now') WHERE id = ?`, [appId]);

  run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
     VALUES (?, ?, ?, 'APPROVED', ?, 'OFFICER', ?)`,
    [`sh_${Date.now()}`, appId, app.status, req.user.id, remarks]
  );

  run(
    `INSERT INTO notifications (id, user_id, title_en, title_hi, message_en, message_hi, type, link)
     VALUES (?, ?, 'Application Approved', 'आवेदन स्वीकृत हुआ', 'Your scholarship application has been approved. Sanction order will be issued.', 'आपका छात्रवृत्ति आवेदन स्वीकृत हो गया है। स्वीकृति आदेश जारी किया जाएगा।', 'SUCCESS', ?)`,
    [`notif_${Date.now()}`, app.student_id, `/applications/${appId}`]
  );

  res.json({ success: true, message: 'Application approved successfully', status: 'APPROVED' });
});

// Officer Reject
apiRouter.post('/officer/applications/:id/reject', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'OFFICER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Officer role required.' });
    return;
  }

  const appId = req.params.id;
  const { reason = 'Application rejected due to ineligibility.' } = req.body;

  const app = queryOne<any>('SELECT * FROM applications WHERE id = ?', [appId]);
  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  run(`UPDATE applications SET status = 'REJECTED', updated_at = datetime('now') WHERE id = ?`, [appId]);

  run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
     VALUES (?, ?, ?, 'REJECTED', ?, 'OFFICER', ?)`,
    [`sh_${Date.now()}`, appId, app.status, req.user.id, `Rejected: ${reason}`]
  );

  run(
    `INSERT INTO notifications (id, user_id, title_en, title_hi, message_en, message_hi, type, link)
     VALUES (?, ?, 'Application Rejected', 'आवेदन अस्वीकृत हुआ', ?, ?, 'WARNING', ?)`,
    [`notif_${Date.now()}`, app.student_id, `Your application was rejected: ${reason}`, `आपका आवेदन अस्वीकृत किया गया: ${reason}`, `/applications/${appId}`]
  );

  res.json({ success: true, message: 'Application rejected', status: 'REJECTED' });
});

// Officer Create Deficiency
apiRouter.post('/officer/applications/:id/deficiency', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'OFFICER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Officer role required.' });
    return;
  }

  const appId = req.params.id;
  const { deficiencyType, fieldName, reasonEn, reasonHi, requiredActionEn, requiredActionHi, deadline } = req.body;

  const app = queryOne<any>('SELECT * FROM applications WHERE id = ?', [appId]);
  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  const defId = `def_${Date.now()}`;
  run(
    `INSERT INTO deficiencies (id, application_id, created_by_officer_id, deficiency_type, field_name, reason_en, reason_hi, required_action_en, required_action_hi, deadline, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', datetime('now'))`,
    [defId, appId, req.user.id, deficiencyType || 'DOCUMENT_DEFICIENCY', fieldName || 'DOCUMENT', reasonEn, reasonHi, requiredActionEn, requiredActionHi, deadline || '2026-10-31']
  );

  run(`UPDATE applications SET status = 'DEFICIENCY', updated_at = datetime('now') WHERE id = ?`, [appId]);

  run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
     VALUES (?, ?, ?, 'DEFICIENCY', ?, 'OFFICER', ?)`,
    [`sh_${Date.now()}`, appId, app.status, req.user.id, `Deficiency raised: ${reasonEn}. Deadline: ${deadline}`]
  );

  run(
    `INSERT INTO notifications (id, user_id, title_en, title_hi, message_en, message_hi, type, link)
     VALUES (?, ?, 'Deficiency Raised: Action Required', 'कमी पाई गई: कार्रवाई आवश्यक', ?, ?, 'DEFICIENCY', ?)`,
    [
      `notif_${Date.now()}`,
      app.student_id,
      `Your application has a deficiency: ${reasonEn}. Please upload corrected document before ${deadline}.`,
      `आपके आवेदन में कमी पाई गई है: ${reasonHi}। कृपया ${deadline} से पूर्व संशोधित दस्तावेज अपलोड करें।`,
      `/deficiencies`
    ]
  );

  res.json({ success: true, message: 'Deficiency created successfully', deficiencyId: defId });
});

// Officer Sanction Order
apiRouter.post('/officer/applications/:id/sanction', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'OFFICER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Officer role required.' });
    return;
  }

  const appId = req.params.id;
  const { amount, remarks = 'Sanction order issued as per MoTA guidelines.' } = req.body;

  const app = queryOne<any>('SELECT a.*, s.sample_sanction_amount, p.bank_ifsc, p.bank_account_no FROM applications a JOIN schemes s ON a.scheme_id = s.id LEFT JOIN profiles p ON a.student_id = p.user_id WHERE a.id = ?', [appId]);
  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  const sanctionAmount = Number(amount || app.sample_sanction_amount || 18500);
  const sanctionNumber = `SANCT/MOTA/2026/${Math.floor(10000 + Math.random() * 90000)}`;
  const sanctionId = `sanct_${Date.now()}`;

  run(
    `INSERT OR REPLACE INTO sanctions (id, application_id, sanction_number, sanctioned_by_officer_id, amount, academic_year, remarks, sanctioned_at)
     VALUES (?, ?, ?, ?, ?, '2026-27', ?, datetime('now'))`,
    [sanctionId, appId, sanctionNumber, req.user.id, sanctionAmount, remarks]
  );

  // Initialize Payment record in PENDING state
  const paymentId = `pay_${Date.now()}`;
  const bankLast4 = app.bank_account_no ? app.bank_account_no.slice(-4) : '4512';
  run(
    `INSERT OR REPLACE INTO payments (id, application_id, sanction_id, amount, status, bank_ifsc, bank_account_last4, created_at)
     VALUES (?, ?, ?, ?, 'PENDING', ?, ?, datetime('now'))`,
    [paymentId, appId, sanctionId, sanctionAmount, app.bank_ifsc || 'SBIN0000167', bankLast4]
  );

  run(`UPDATE applications SET status = 'SANCTIONED', updated_at = datetime('now') WHERE id = ?`, [appId]);

  run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
     VALUES (?, ?, ?, 'SANCTIONED', ?, 'OFFICER', ?)`,
    [`sh_${Date.now()}`, appId, app.status, req.user.id, `Sanction Order ${sanctionNumber} issued for ₹${sanctionAmount.toLocaleString('en-IN')}.`]
  );

  run(
    `INSERT INTO notifications (id, user_id, title_en, title_hi, message_en, message_hi, type, link)
     VALUES (?, ?, 'Scholarship Sanctioned', 'छात्रवृत्ति स्वीकृत हुई', ?, ?, 'SUCCESS', ?)`,
    [
      `notif_${Date.now()}`,
      app.student_id,
      `Sanction Order ${sanctionNumber} issued for ₹${sanctionAmount.toLocaleString('en-IN')}. DBT disbursement will follow shortly.`,
      `स्वीकृति आदेश ${sanctionNumber} राशि ₹${sanctionAmount.toLocaleString('en-IN')} हेतु जारी कर दिया गया है। शीघ्र ही डीबीटी भुगतान होगा।`,
      `/payments`
    ]
  );

  res.json({
    success: true,
    message: 'Sanction order generated successfully',
    sanctionNumber,
    amount: sanctionAmount
  });
});

// Officer / System Mock DBT Disbursement
apiRouter.post('/officer/applications/:id/disburse', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'OFFICER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Officer role required.' });
    return;
  }

  const appId = req.params.id;
  const app = queryOne<any>('SELECT a.*, p.id as payment_id, p.amount, s.sanction_number FROM applications a JOIN payments p ON a.id = p.application_id JOIN sanctions s ON a.id = s.application_id WHERE a.id = ?', [appId]);

  if (!app) {
    res.status(404).json({ error: 'Application or sanction record not found' });
    return;
  }

  const txnRef = `PFMS-DBT-2026-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const batchNo = `MOTA-BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`;

  run(
    `UPDATE payments SET status = 'SUCCESS', dbt_batch_no = ?, transaction_ref = ?, payment_date = datetime('now') WHERE application_id = ?`,
    [batchNo, txnRef, appId]
  );

  run(`UPDATE applications SET status = 'DISBURSED', updated_at = datetime('now') WHERE id = ?`, [appId]);

  run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks)
     VALUES (?, ?, 'SANCTIONED', 'DISBURSED', ?, 'DBT_GATEWAY', ?)`,
    [`sh_${Date.now()}`, appId, req.user.id, `Direct Benefit Transfer (DBT) disbursed successfully. Txn Ref: ${txnRef}, Batch: ${batchNo}`]
  );

  run(
    `INSERT INTO notifications (id, user_id, title_en, title_hi, message_en, message_hi, type, link)
     VALUES (?, ?, 'Scholarship Disbursed via DBT', 'डीबीटी छात्रवृत्ति राशि खाते में अंतरित', ?, ?, 'SUCCESS', ?)`,
    [
      `notif_${Date.now()}`,
      app.student_id,
      `₹${app.amount.toLocaleString('en-IN')} has been credited directly to your Aadhaar-seeded bank account. Ref: ${txnRef}.`,
      `₹${app.amount.toLocaleString('en-IN')} की छात्रवृत्ति राशि आपके आधार लिंक बैंक खाते में सीधे अंतरित कर दी गई है। संदर्भ: ${txnRef}`,
      `/payments`
    ]
  );

  res.json({
    success: true,
    message: 'Mock DBT transfer completed successfully',
    transactionRef: txnRef,
    batchNo
  });
});

// -------------------------------------------------------------
// 7. PAYMENTS & DBT TRACKING
// -------------------------------------------------------------

apiRouter.get('/payments', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let payments: any[] = [];

  if (user.role === 'STUDENT') {
    payments = queryAll<any>(
      `SELECT p.*, s.sanction_number, a.application_number, sc.name_en as scheme_name_en, sc.name_hi as scheme_name_hi
       FROM payments p
       JOIN sanctions s ON p.sanction_id = s.id
       JOIN applications a ON p.application_id = a.id
       JOIN schemes sc ON a.scheme_id = sc.id
       WHERE a.student_id = ?
       ORDER BY p.created_at DESC`,
      [user.id]
    );
  } else {
    payments = queryAll<any>(
      `SELECT p.*, s.sanction_number, a.application_number, sc.name_en as scheme_name_en, u.full_name as student_name
       FROM payments p
       JOIN sanctions s ON p.sanction_id = s.id
       JOIN applications a ON p.application_id = a.id
       JOIN schemes sc ON a.scheme_id = sc.id
       JOIN users u ON a.student_id = u.id
       ORDER BY p.created_at DESC`
    );
  }

  res.json(payments.map((p) => ({
    id: p.id,
    applicationId: p.application_id,
    applicationNumber: p.application_number,
    sanctionId: p.sanction_id,
    sanctionNumber: p.sanction_number,
    schemeNameEn: p.scheme_name_en,
    studentName: p.student_name,
    amount: p.amount,
    status: p.status,
    dbtBatchNo: p.dbt_batch_no,
    transactionRef: p.transaction_ref,
    paymentDate: p.payment_date,
    bankIfsc: p.bank_ifsc,
    bankAccountLast4: p.bank_account_last4,
    failureReason: p.failure_reason,
    createdAt: p.created_at
  })));
});

// -------------------------------------------------------------
// 8. NOTIFICATIONS
// -------------------------------------------------------------

apiRouter.get('/notifications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const notifs = queryAll<any>('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user?.id]);
  res.json(notifs.map((n) => ({
    id: n.id,
    userId: n.user_id,
    titleEn: n.title_en,
    titleHi: n.title_hi,
    messageEn: n.message_en,
    messageHi: n.message_hi,
    type: n.type,
    isRead: Boolean(n.is_read),
    link: n.link,
    createdAt: n.created_at
  })));
});

apiRouter.put('/notifications/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user?.id]);
  res.json({ success: true });
});

apiRouter.put('/notifications/read-all', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user?.id]);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 9. JAGO BILINGUAL CHATBOT (Intent + Live Application State)
// -------------------------------------------------------------

apiRouter.post('/jago/chat', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { message, lang = 'en' } = req.body;
  const user = req.user!;
  const lowerMsg = (message || '').toLowerCase();

  // Retrieve current student profile, application, deficiency, payment
  const profile = queryOne<any>('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
  const activeApp = queryOne<any>(
    `SELECT a.*, s.name_en, s.name_hi, s.code as scheme_code
     FROM applications a
     JOIN schemes s ON a.scheme_id = s.id
     WHERE a.student_id = ? AND a.status NOT IN ('REJECTED')
     ORDER BY a.updated_at DESC LIMIT 1`,
    [user.id]
  );
  const openDeficiency = activeApp
    ? queryOne<any>('SELECT * FROM deficiencies WHERE application_id = ? AND status = "OPEN" LIMIT 1', [activeApp.id])
    : null;
  const payment = activeApp
    ? queryOne<any>('SELECT * FROM payments WHERE application_id = ? LIMIT 1', [activeApp.id])
    : null;

  let reply = '';
  let intent = 'general';
  let dataCard: any = null;

  // Intent 1: Application Status / Why Pending
  if (lowerMsg.includes('status') || lowerMsg.includes('स्थिति') || lowerMsg.includes('pending') || lowerMsg.includes('लंबित') || lowerMsg.includes('track') || lowerMsg.includes('आवेदन')) {
    intent = 'status';
    if (!activeApp) {
      reply = lang === 'hi'
        ? `नमस्ते ${user.fullName}, आपके नाम पर वर्तमान में कोई सक्रिय छात्रवृत्ति आवेदन दर्ज नहीं है। आप "पात्रता जांचें" विकल्प से अपनी योग्यता देख सकते हैं और आवेदन शुरू कर सकते हैं।`
        : `Hello ${user.fullName}, you do not have any active scholarship application on file yet. You can check your eligibility and apply from the dashboard.`;
    } else {
      const stageMapEn: Record<string, string> = {
        DRAFT: 'Saved as Draft (Not yet submitted)',
        SUBMITTED: 'Submitted - Queueing for automated verification',
        UNDER_VERIFICATION: 'Under Verification by District Verification Officer',
        DEFICIENCY: 'Deficiency Flagged - Action Required from you',
        RESUBMITTED: 'Resubmitted - Pending Officer Re-check',
        VERIFIED: 'Verified by Officer - Awaiting Sanction Order',
        APPROVED: 'Approved by Committee - Sanction processing',
        SANCTIONED: 'Sanction Order Generated - DBT disbursement queued',
        DISBURSED: 'Disbursed directly to your Bank Account via DBT'
      };
      const stageMapHi: Record<string, string> = {
        DRAFT: 'प्रारूप के रूप में सहेजा गया (जमा नहीं किया गया)',
        SUBMITTED: 'जमा किया गया - सत्यापन कतार में',
        UNDER_VERIFICATION: 'सत्यापन अधिकारी द्वारा समीक्षाधीन',
        DEFICIENCY: 'दस्तावेज में कमी - आपकी ओर से सुधार अपेक्षित',
        RESUBMITTED: 'पुनः प्रस्तुत - अधिकारी पुनः जांच प्रतीक्षित',
        VERIFIED: 'सत्यापित - स्वीकृति आदेश प्रतीक्षित',
        APPROVED: 'समिति द्वारा स्वीकृत - आदेश प्रक्रियाधीन',
        SANCTIONED: 'स्वीकृति आदेश जारी - डीबीटी भुगतान कतार में',
        DISBURSED: 'डीबीटी के माध्यम से सीधे आपके बैंक खाते में अंतरित'
      };

      const stageDesc = lang === 'hi' ? stageMapHi[activeApp.status] : stageMapEn[activeApp.status];
      const schemeTitle = lang === 'hi' ? activeApp.name_hi : activeApp.name_en;

      if (activeApp.status === 'DEFICIENCY') {
        reply = lang === 'hi'
          ? `आपके आवेदन ${activeApp.application_number} में एक कमी पाई गई है। कारण: "${openDeficiency?.reason_hi || 'दस्तावेज अस्पष्ट'}". कृपया समय सीमा (${openDeficiency?.deadline || 'शीघ्र'}) से पहले सही दस्तावेज अपलोड करें।`
          : `Your application ${activeApp.application_number} is in DEFICIENCY status. Reason: "${openDeficiency?.reason_en || 'Document issue'}". Please resolve before the deadline: ${openDeficiency?.deadline || 'soon'}.`;
      } else {
        reply = lang === 'hi'
          ? `आपका आवेदन संख्या ${activeApp.application_number} ("${schemeTitle}") वर्तमान में "${stageDesc}" स्थिति में है।`
          : `Your application ${activeApp.application_number} for "${schemeTitle}" is currently at the stage: "${stageDesc}".`;
      }

      dataCard = {
        type: 'status',
        title: lang === 'hi' ? 'आवेदन की वर्तमान स्थिति' : 'Live Application Status',
        details: [
          { label: lang === 'hi' ? 'आवेदन संख्या' : 'Application No', value: activeApp.application_number },
          { label: lang === 'hi' ? 'योजना' : 'Scheme', value: schemeTitle },
          { label: lang === 'hi' ? 'वर्तमान स्थिति' : 'Current Status', value: activeApp.status },
          { label: lang === 'hi' ? 'अंतिम अपडेट' : 'Last Updated', value: activeApp.updated_at }
        ],
        actionUrl: `/applications/${activeApp.id}`,
        actionLabel: lang === 'hi' ? 'विस्तार से ट्रैक करें' : 'Track Application Timeline'
      };
    }
  }

  // Intent 2: Deficiency Explanation
  else if (lowerMsg.includes('deficiency') || lowerMsg.includes('कम') || lowerMsg.includes('खामी') || lowerMsg.includes('त्रुटि') || lowerMsg.includes('reject') || lowerMsg.includes('correction')) {
    intent = 'deficiency';
    if (!openDeficiency) {
      reply = lang === 'hi'
        ? `शुभ समाचार! आपके आवेदन में वर्तमान में कोई कमी या आपत्ति दर्ज नहीं है। सभी रिकॉर्ड्स सामान्य रूप से प्रक्रियाधीन हैं।`
        : `Good news! There are currently no open deficiencies or objections on your application. Everything is proceeding normally.`;
    } else {
      reply = lang === 'hi'
        ? `आपके आवेदन में निम्न आपत्ति दर्ज की गई है:\n• कमी: ${openDeficiency.reason_hi}\n• आवश्यक कार्रवाई: ${openDeficiency.required_action_hi}\n• अंतिम तिथि: ${openDeficiency.deadline}`
        : `A deficiency has been flagged on your application:\n• Issue: ${openDeficiency.reason_en}\n• Required Action: ${openDeficiency.required_action_en}\n• Deadline: ${openDeficiency.deadline}`;

      dataCard = {
        type: 'deficiency',
        title: lang === 'hi' ? 'आपत्ति निवारण विवरण' : 'Deficiency Resolution Details',
        details: [
          { label: lang === 'hi' ? 'आपत्ति का प्रकार' : 'Type', value: openDeficiency.deficiency_type },
          { label: lang === 'hi' ? 'संबंधित क्षेत्र' : 'Field', value: openDeficiency.field_name },
          { label: lang === 'hi' ? 'समय सीमा' : 'Deadline', value: openDeficiency.deadline }
        ],
        actionUrl: '/deficiencies',
        actionLabel: lang === 'hi' ? 'सुधार करें एवं अपलोड करें' : 'Resolve Deficiency'
      };
    }
  }

  // Intent 3: Payment / DBT Disbursement
  else if (lowerMsg.includes('payment') || lowerMsg.includes('dbt') || lowerMsg.includes('disburse') || lowerMsg.includes('भुगतान') || lowerMsg.includes('पैसे') || lowerMsg.includes('रुपए')) {
    intent = 'payment';
    if (!payment) {
      reply = lang === 'hi'
        ? `आपके आवेदन के लिए अभी भुगतान आदेश जारी नहीं हुआ है। आवेदन सत्यापन एवं स्वीकृति के पश्चात डीबीटी के जरिए राशि सीधे बैंक खाते में भेजी जाएगी।`
        : `No payment order has been issued yet. Once your application completes officer verification and sanction, disbursement will be credited via DBT.`;
    } else {
      reply = lang === 'hi'
        ? `भुगतान स्थिति: ${payment.status === 'SUCCESS' ? 'सफल' : payment.status}। स्वीकृत राशि: ₹${payment.amount.toLocaleString('en-IN')}। ${payment.transaction_ref ? `लेनदेन संदर्भ: ${payment.transaction_ref}` : 'प्रक्रियाधीन है।'}`
        : `Payment Status: ${payment.status}. Sanctioned Amount: ₹${payment.amount.toLocaleString('en-IN')}. ${payment.transaction_ref ? `DBT Txn Ref: ${payment.transaction_ref}` : 'Processing.'}`;

      dataCard = {
        type: 'payment',
        title: lang === 'hi' ? 'डीबीटी भुगतान विवरण' : 'DBT Payment Details',
        details: [
          { label: lang === 'hi' ? 'स्वीकृत राशि' : 'Sanction Amount', value: `₹${payment.amount.toLocaleString('en-IN')}` },
          { label: lang === 'hi' ? 'भुगतान स्थिति' : 'Payment Status', value: payment.status },
          { label: lang === 'hi' ? 'बैंक IFSC' : 'Bank IFSC', value: payment.bank_ifsc },
          { label: lang === 'hi' ? 'खाता (अंतिम 4 अंक)' : 'Account (Last 4)', value: `XXXXXX${payment.bank_account_last4}` }
        ],
        actionUrl: '/payments',
        actionLabel: lang === 'hi' ? 'भुगतान रसीद देखें' : 'View Payment Tracker'
      };
    }
  }

  // Intent 4: Eligibility Check
  else if (lowerMsg.includes('eligible') || lowerMsg.includes('पात्र') || lowerMsg.includes('योग्यता') || lowerMsg.includes('qualify') || lowerMsg.includes('income')) {
    intent = 'eligibility';
    reply = lang === 'hi'
      ? `जनजातीय कार्य मंत्रालय (MoTA) की 5 प्रमुख योजनाएं हैं:\n1. प्री-मैट्रिक (कक्षा 9-10, आय ≤ 2.5 लाख)\n2. पोस्ट-मैट्रिक (कक्षा 11 से पीजी, आय ≤ 2.5 लाख)\n3. टॉप क्लास (आईआईटी/एनआईटी/आईआईएम आदि, आय ≤ 6 लाख)\n4. एनएफएसटी (एम.फिल/पीएचडी, आय ≤ 6 लाख)\n5. एनओएस (विदेश में उच्च अध्ययन, आय ≤ 8 लाख)\n\n"पात्रता जांचें" टैब पर क्लिक करके आप अपनी योग्यता की स्वचालित गणना देख सकते हैं।`
      : `MoTA administers 5 unified scholarship schemes:\n1. Pre-Matric (Class 9-10, Income ≤ ₹2.5L)\n2. Post-Matric (Class 11 to PG/Diploma, Income ≤ ₹2.5L)\n3. Top Class (IIT/NIT/IIM/AIIMS, Income ≤ ₹6.0L)\n4. NFST (Full-time M.Phil/Ph.D., Income ≤ ₹6.0L)\n5. NOS (Overseas Masters/Ph.D., Income ≤ ₹8.0L)\n\nClick "Check Eligibility" on your dashboard to evaluate your profile automatically.`;
  }

  // Intent 5: One Scholarship Rule Explanation
  else if (lowerMsg.includes('one') || lowerMsg.includes('multiple') || lowerMsg.includes('दो') || lowerMsg.includes('एक ही') || lowerMsg.includes('rule') || lowerMsg.includes('नियम')) {
    intent = 'rule';
    reply = lang === 'hi'
      ? `महत्वपूर्ण सरकारी नियम: "एक छात्र एक समय में केवल एक ही छात्रवृत्ति या फेलोशिप योजना का लाभ ले सकता है।" यदि आपके पास पहले से एक सक्रिय आवेदन है, तो आप दूसरी योजना में आवेदन नहीं कर सकते।`
      : `Important MoTA Guideline: "ONE STUDENT CAN AVAIL ONLY ONE SCHOLARSHIP/FELLOWSHIP SCHEME AT A TIME." If you already hold an active application, you cannot submit another scheme until the first is concluded or rejected.`;
  }

  // Intent 6: Required Documents
  else if (lowerMsg.includes('document') || lowerMsg.includes('कागजात') || lowerMsg.includes('प्रमाण') || lowerMsg.includes('wallet') || lowerMsg.includes('वॉलेट')) {
    intent = 'documents';
    reply = lang === 'hi'
      ? `मुख्य आवश्यक दस्तावेज:\n1. सक्षम प्राधिकारी द्वारा जारी एसटी जाति प्रमाण पत्र\n2. चालू वित्तीय वर्ष का आय प्रमाण पत्र\n3. आधार कार्ड (बैंक खाता आधार से सीडेड होना चाहिए)\n4. वर्तमान संस्थान का बोनाफाइड / नामांकन प्रमाण पत्र\n5. पिछली कक्षा की अंकतालिका\n\nआप अपने "डिजिटल डॉक्यूमेंट वॉलेट" में एक बार दस्तावेज अपलोड कर भविष्य के आवेदनों में पुनः उपयोग कर सकते हैं।`
      : `Essential required documents:\n1. Scheduled Tribe (ST) Certificate issued by competent revenue authority\n2. Valid Family Income Certificate for current financial year\n3. Aadhaar (Bank account must be Aadhaar-seeded for DBT)\n4. Institution Bonafide / Admission Receipt\n5. Previous qualifying Marksheet\n\nYou can store these in your "Document Wallet" and reuse them across applications without re-uploading!`;
  }

  // General Fallback
  else {
    reply = lang === 'hi'
      ? `नमस्ते! मैं "जागो" (JAGO) हूँ - जनजातीय छात्रों के लिए छात्रवृत्ति सहायता साथी। आप मुझसे पूछ सकते हैं:\n• "मेरे आवेदन की स्थिति क्या है?"\n• "क्या मेरे आवेदन में कोई कमी है?"\n• "मुझे कौन सी छात्रवृत्ति मिल सकती है?"\n• "डीबीटी भुगतान की क्या स्थिति है?"`
      : `Hello! I am JAGO (Scholarship Assistance & Guidance Assistant). You can ask me:\n• "What is my application status?"\n• "Why is my application pending?"\n• "Do I have any deficiency?"\n• "Which schemes am I eligible for?"\n• "What is my DBT payment status?"`;
  }

  // Log chat
  run(
    `INSERT INTO chat_logs (id, user_id, message, reply, intent, session_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [`chat_${Date.now()}`, user.id, message, reply, intent, `session_${user.id}`]
  );

  res.json({
    reply,
    intent,
    dataCard
  });
});

// -------------------------------------------------------------
// 10. ADMIN & OUTREACH IDENTIFICATION ENGINE
// -------------------------------------------------------------

apiRouter.get('/admin/outreach', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OFFICER') {
    res.status(403).json({ error: 'Access denied: Admin/Officer only.' });
    return;
  }

  const candidates = queryAll<any>(
    `SELECT oc.*, s.name_en as scheme_name_en, s.name_hi as scheme_name_hi
     FROM outreach_candidates oc
     JOIN schemes s ON oc.recommended_scheme_id = s.id
     ORDER BY oc.match_confidence DESC`
  );

  res.json(candidates.map((c) => ({
    id: c.id,
    sourceSystem: c.source_system,
    candidateName: c.candidate_name,
    maskedId: c.masked_id,
    district: c.district,
    state: c.state,
    currentClassCourse: c.current_class_course,
    institution: c.institution,
    estimatedIncome: c.estimated_income,
    pvtgStatus: Boolean(c.pvtg_status),
    stStatus: c.st_status,
    recommendedSchemeCode: c.scheme_code,
    recommendedSchemeName: c.scheme_name_en,
    matchConfidence: c.match_confidence,
    outreachStatus: c.outreach_status,
    notes: c.notes
  })));
});

apiRouter.post('/admin/outreach/:id/contact', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OFFICER') {
    res.status(403).json({ error: 'Access denied: Admin/Officer only.' });
    return;
  }
  const { status = 'NOTIFIED' } = req.body;
  run('UPDATE outreach_candidates SET outreach_status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ success: true, message: `Candidate marked as ${status}` });
});

apiRouter.get('/admin/stats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OFFICER') {
    res.status(403).json({ error: 'Access denied: Admin/Officer only.' });
    return;
  }

  const totalUsers = queryOne<any>('SELECT COUNT(*) as count FROM users WHERE role = "STUDENT"')?.count || 0;
  const totalApps = queryOne<any>('SELECT COUNT(*) as count FROM applications')?.count || 0;
  const verifiedApps = queryOne<any>('SELECT COUNT(*) as count FROM applications WHERE status IN ("VERIFIED", "APPROVED", "SANCTIONED", "DISBURSED")')?.count || 0;
  const pendingApps = queryOne<any>('SELECT COUNT(*) as count FROM applications WHERE status IN ("SUBMITTED", "UNDER_VERIFICATION", "RESUBMITTED")')?.count || 0;
  const deficiencyApps = queryOne<any>('SELECT COUNT(*) as count FROM applications WHERE status = "DEFICIENCY"')?.count || 0;
  const disbursedApps = queryOne<any>('SELECT COUNT(*) as count FROM applications WHERE status = "DISBURSED"')?.count || 0;
  const disbursedAmount = queryOne<any>('SELECT SUM(amount) as total FROM payments WHERE status = "SUCCESS"')?.total || 0;

  const appsByScheme = queryAll<any>(
    `SELECT s.name_en, s.code, COUNT(a.id) as count
     FROM schemes s
     LEFT JOIN applications a ON s.id = a.scheme_id
     GROUP BY s.id`
  );

  const appsByStatus = queryAll<any>(
    `SELECT status, COUNT(*) as count FROM applications GROUP BY status`
  );

  res.json({
    totalUsers,
    totalApplications: totalApps,
    verifiedApplications: verifiedApps,
    pendingVerification: pendingApps,
    openDeficiencies: deficiencyApps,
    disbursedApplications: disbursedApps,
    totalDisbursedAmount: disbursedAmount,
    appsByScheme,
    appsByStatus,
    mockAdapters: [
      { name: 'DigiLocker ST Certificate API', status: 'OPERATIONAL', latency: '120ms', successRate: '99.4%' },
      { name: 'APAAR / Academic Bank of Credits', status: 'OPERATIONAL', latency: '180ms', successRate: '98.8%' },
      { name: 'UIDAI Demographic Auth Engine', status: 'OPERATIONAL', latency: '95ms', successRate: '99.9%' },
      { name: 'UDISE+ School Registry', status: 'OPERATIONAL', latency: '140ms', successRate: '97.6%' },
      { name: 'AISHE Higher Education Portal', status: 'OPERATIONAL', latency: '110ms', successRate: '99.1%' },
      { name: 'PFMS DBT Gateway (Mock)', status: 'OPERATIONAL', latency: '210ms', successRate: '100%' }
    ]
  });
});

// Export Full Project ZIP Endpoint
apiRouter.get('/export-zip', (_req, res) => {
  const zipPath = path.join(process.cwd(), 'public', 'tribalscholar-full-project.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="tribalscholar-full-project.zip"');
    res.setHeader('Content-Type', 'application/zip');
    res.sendFile(zipPath);
  } else {
    res.status(404).json({ error: 'ZIP file not found' });
  }
});

