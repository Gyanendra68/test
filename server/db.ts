import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import bcrypt from 'bcryptjs';
import { getDataDir } from './runtime.js';

const DATA_DIR = getDataDir();
const DB_FILE = path.join(DATA_DIR, 'tribalscholar.sqlite');

let db: Database;

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  }
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}

export async function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Create tables
  createSchema();
  seedInitialData();
  saveDb();
  console.log('TribalScholar Relational Database initialized successfully with SQLite WASM.');
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('STUDENT', 'OFFICER', 'ADMIN')),
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      dob TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('MALE', 'FEMALE', 'OTHER')),
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      village_town TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'ST',
      st_certificate_no TEXT NOT NULL,
      st_status TEXT NOT NULL DEFAULT 'VERIFIED',
      pvtg_status INTEGER NOT NULL DEFAULT 0,
      pvtg_group TEXT,
      aadhaar_masked TEXT NOT NULL,
      aadhaar_verified INTEGER NOT NULL DEFAULT 1,
      apaar_id TEXT,
      otr_id TEXT,
      institution_name TEXT NOT NULL,
      institution_type TEXT NOT NULL,
      institution_code TEXT,
      course_name TEXT NOT NULL,
      course_level TEXT NOT NULL,
      class_year TEXT NOT NULL,
      academic_percentage REAL NOT NULL,
      family_annual_income REAL NOT NULL,
      bank_account_no TEXT NOT NULL,
      bank_ifsc TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      bank_verified INTEGER NOT NULL DEFAULT 1,
      profile_completed INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schemes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_hi TEXT NOT NULL,
      ministry TEXT NOT NULL,
      description_en TEXT NOT NULL,
      description_hi TEXT NOT NULL,
      max_income_limit REAL NOT NULL,
      academic_level TEXT NOT NULL,
      eligible_classes TEXT NOT NULL,
      benefits_en TEXT NOT NULL,
      benefits_hi TEXT NOT NULL,
      application_period_start TEXT NOT NULL,
      application_period_end TEXT NOT NULL,
      sample_sanction_amount REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      faqs_json TEXT
    );

    CREATE TABLE IF NOT EXISTS eligibility_rules (
      id TEXT PRIMARY KEY,
      scheme_id TEXT NOT NULL,
      rule_key TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      rule_description TEXT NOT NULL,
      criteria_json TEXT NOT NULL,
      is_mandatory INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      application_number TEXT UNIQUE NOT NULL,
      student_id TEXT NOT NULL,
      scheme_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SUBMITTED', 'UNDER_VERIFICATION', 'DEFICIENCY', 'RESUBMITTED', 'VERIFIED', 'APPROVED', 'SANCTIONED', 'DISBURSED', 'REJECTED')),
      submitted_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(scheme_id) REFERENCES schemes(id)
    );

    CREATE TABLE IF NOT EXISTS application_details (
      id TEXT PRIMARY KEY,
      application_id TEXT UNIQUE NOT NULL,
      personal_details_json TEXT NOT NULL,
      academic_details_json TEXT NOT NULL,
      family_income_details_json TEXT NOT NULL,
      bank_details_json TEXT NOT NULL,
      declaration_signed INTEGER NOT NULL DEFAULT 1,
      declaration_date TEXT NOT NULL,
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      doc_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS application_documents (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'VERIFIED', 'DEFICIENT')),
      officer_remarks TEXT,
      verified_at TEXT,
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_results (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      adapter_source TEXT NOT NULL,
      outcome TEXT NOT NULL CHECK(outcome IN ('VERIFIED', 'MISMATCH', 'NOT_FOUND', 'PENDING', 'MANUAL_REVIEW')),
      submitted_value TEXT,
      verified_value TEXT,
      mismatch_field TEXT,
      officer_action TEXT,
      notes TEXT,
      verified_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_logs (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deficiencies (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      created_by_officer_id TEXT NOT NULL,
      deficiency_type TEXT NOT NULL,
      field_name TEXT NOT NULL,
      reason_en TEXT NOT NULL,
      reason_hi TEXT NOT NULL,
      required_action_en TEXT NOT NULL,
      required_action_hi TEXT NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'RESOLVED', 'REJECTED')),
      resolution_remarks TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by_officer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      remarks TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sanctions (
      id TEXT PRIMARY KEY,
      application_id TEXT UNIQUE NOT NULL,
      sanction_number TEXT UNIQUE NOT NULL,
      sanctioned_by_officer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      academic_year TEXT NOT NULL,
      remarks TEXT,
      sanctioned_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY(sanctioned_by_officer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      application_id TEXT UNIQUE NOT NULL,
      sanction_id TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
      dbt_batch_no TEXT,
      transaction_ref TEXT,
      payment_date TEXT,
      bank_ifsc TEXT NOT NULL,
      bank_account_last4 TEXT NOT NULL,
      failure_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY(sanction_id) REFERENCES sanctions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      message_en TEXT NOT NULL,
      message_hi TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('INFO', 'ACTION_REQUIRED', 'DEFICIENCY', 'SUCCESS', 'WARNING')),
      is_read INTEGER NOT NULL DEFAULT 0,
      link TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS outreach_candidates (
      id TEXT PRIMARY KEY,
      source_system TEXT NOT NULL CHECK(source_system IN ('UDISE_PLUS', 'APAAR', 'OTR')),
      candidate_name TEXT NOT NULL,
      masked_id TEXT NOT NULL,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      current_class_course TEXT NOT NULL,
      institution TEXT NOT NULL,
      estimated_income REAL NOT NULL,
      pvtg_status INTEGER NOT NULL DEFAULT 0,
      st_status TEXT NOT NULL,
      recommended_scheme_id TEXT NOT NULL,
      match_confidence INTEGER NOT NULL,
      outreach_status TEXT NOT NULL DEFAULT 'IDENTIFIED',
      notes TEXT,
      FOREIGN KEY(recommended_scheme_id) REFERENCES schemes(id)
    );

    CREATE TABLE IF NOT EXISTS chat_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      message TEXT NOT NULL,
      reply TEXT NOT NULL,
      intent TEXT,
      session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_apps_student ON applications(student_id);
    CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_docs_user ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_deficiencies_app ON deficiencies(application_id);
  `);
}

function seedInitialData() {
  const userCount = queryOne('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial schemes and demo accounts...');

  // 1. Seed the 5 Official MoTA Schemes
  const schemesData = [
    {
      id: 'scheme_pre_matric',
      code: 'PRE_MATRIC',
      name_en: 'Pre-Matric Scholarship for ST Students',
      name_hi: 'अनुसूचित जनजाति (एसटी) छात्रों के लिए प्री-मैट्रिक छात्रवृत्ति',
      ministry: 'Ministry of Tribal Affairs, Govt. of India',
      description_en: 'Centrally Sponsored Scheme to support ST parents in sending their children to school in Class IX and X, reducing dropout rates at transition to secondary stage.',
      description_hi: 'कक्षा 9 और 10 में एसटी छात्रों को स्कूल भेजने हेतु अभिभावकों को सहायता प्रदान करने तथा माध्यमिक स्तर पर ड्रॉपआउट दर को कम करने हेतु केंद्र प्रायोजित योजना।',
      max_income_limit: 250000,
      academic_level: 'PRE_MATRIC',
      eligible_classes: 'Class IX & X',
      benefits_en: 'Day Scholars: ₹3,500/yr + ₹1,000 book grant; Hostellers: ₹7,000/yr + ₹1,000 grant (Sample GoI rates)',
      benefits_hi: 'डे स्कॉलर: ₹3,500/वर्ष + ₹1,000 पुस्तक अनुदान; छात्रावास: ₹7,000/वर्ष + ₹1,000 अनुदान',
      application_period_start: '2026-07-01',
      application_period_end: '2026-11-30',
      sample_sanction_amount: 4500,
      faqs_json: JSON.stringify([
        {
          questionEn: 'Who is eligible for Pre-Matric ST Scholarship?',
          questionHi: 'प्री-मैट्रिक एसटी छात्रवृत्ति के लिए कौन पात्र है?',
          answerEn: 'Regular ST students studying in Class IX or X in government or recognized schools with parental annual income not exceeding ₹2,50,000.',
          answerHi: 'सरकारी या मान्यता प्राप्त विद्यालयों में कक्षा 9 या 10 में अध्ययनरत नियमित एसटी छात्र, जिनकी पारिवारिक वार्षिक आय ₹2,50,000 से अधिक न हो।'
        },
        {
          questionEn: 'Are hostellers eligible for higher allowance?',
          questionHi: 'क्या छात्रावास में रहने वाले छात्रों को अधिक भत्ता मिलता है?',
          answerEn: 'Yes, hostellers receive enhanced maintenance allowance to cover boarding expenses.',
          answerHi: 'हाँ, छात्रावास के खर्चों की प्रतिपूर्ति के लिए अतिरिक्त निर्वाह भत्ता दिया जाता है।'
        }
      ])
    },
    {
      id: 'scheme_post_matric',
      code: 'POST_MATRIC',
      name_en: 'Post-Matric Scholarship for ST Students',
      name_hi: 'अनुसूचित जनजाति (एसटी) छात्रों के लिए पोस्ट-मैट्रिक छात्रवृत्ति',
      ministry: 'Ministry of Tribal Affairs, Govt. of India',
      description_en: 'Primary flagship scheme offering financial assistance to ST students studying at post-matriculation or post-secondary stages (Class XI to PG & Professional Courses) to enable completion of education.',
      description_hi: 'मैट्रिक के बाद (कक्षा 11 से लेकर स्नातक, स्नातकोत्तर एवं व्यावसायिक पाठ्यक्रमों) अध्ययनरत अनुसूचित जनजाति के छात्रों को वित्तीय सहायता प्रदान करने वाली प्रमुख योजना।',
      max_income_limit: 250000,
      academic_level: 'POST_MATRIC_HS, UNDERGRADUATE, POSTGRADUATE',
      eligible_classes: 'Class XI, XII, ITI, Polytechnic, BA, BSc, BCom, BTech, MBBS, MA, MSc, MCom',
      benefits_en: 'Full reimbursement of compulsory non-refundable fees + monthly maintenance allowance (₹2,500 to ₹12,000/yr depending on course group)',
      benefits_hi: 'अनिवार्य गैर-वापसी योग्य शिक्षण शुल्क की पूर्ण प्रतिपूर्ति + मासिक निर्वाह भत्ता (पाठ्यक्रम वर्ग अनुसार ₹2,500 से ₹12,000 प्रति वर्ष)',
      application_period_start: '2026-07-15',
      application_period_end: '2026-12-31',
      sample_sanction_amount: 18500,
      faqs_json: JSON.stringify([
        {
          questionEn: 'Can I apply for Post-Matric if I am doing a diploma course?',
          questionHi: 'क्या मैं डिप्लोमा कोर्स करने पर पोस्ट-मैट्रिक के लिए आवेदन कर सकता हूँ?',
          answerEn: 'Yes, all recognized diploma, polytechnic, ITI and degree courses are eligible.',
          answerHi: 'हाँ, सभी मान्यता प्राप्त डिप्लोमा, पॉलिटेक्निक, आईटीआई एवं डिग्री पाठ्यक्रम पात्र हैं।'
        },
        {
          questionEn: 'Is Aadhaar seeding with bank account mandatory?',
          questionHi: 'क्या बैंक खाते से आधार सीडिंग अनिवार्य है?',
          answerEn: 'Yes, Direct Benefit Transfer (DBT) requires Aadhaar-seeded bank accounts for direct credit.',
          answerHi: 'हाँ, डीबीटी के माध्यम से सीधे बैंक खाते में भुगतान हेतु आधार सीडिंग अनिवार्य है।'
        }
      ])
    },
    {
      id: 'scheme_top_class',
      code: 'TOP_CLASS',
      name_en: 'Top Class Education Scholarship for ST Students',
      name_hi: 'एसटी छात्रों के लिए शीर्ष श्रेणी शिक्षा छात्रवृत्ति (टॉप क्लास)',
      ministry: 'Ministry of Tribal Affairs, Govt. of India',
      description_en: 'Promotes quality higher education among ST students by providing full financial support for studies in premier notified institutions such as IITs, NITs, IIMs, AIIMS, NLUs, and premier central institutes.',
      description_hi: 'आईआईटी, एनआईटी, आईआईएम, एम्स, एनएलयू जैसे अधिसूचित प्रतिष्ठित संस्थानों में अध्ययन हेतु एसटी छात्रों को पूर्ण वित्तीय सहयोग प्रदान करने वाली योजना।',
      max_income_limit: 600000,
      academic_level: 'UNDERGRADUATE, POSTGRADUATE',
      eligible_classes: 'B.Tech/BE (IIT/NIT), MBBS (AIIMS), MBA (IIM), BA LLB (NLU), etc. in 260+ notified institutes',
      benefits_en: 'Full tuition fee & non-refundable charges (up to ₹2.5L/yr private, actual for gov) + living expenses (₹3,000/mo) + book allowance (₹5,000/yr) + computer grant (₹45,000 one-time)',
      benefits_hi: 'पूर्ण शिक्षण शुल्क + जीवन निर्वाह खर्च (₹3,000/माह) + पुस्तक अनुदान (₹5,000/वर्ष) + लैपटॉप/कंप्यूटर हेतु ₹45,000 एकमुश्त सहायता',
      application_period_start: '2026-08-01',
      application_period_end: '2026-11-15',
      sample_sanction_amount: 86000,
      faqs_json: JSON.stringify([
        {
          questionEn: 'Is there income relaxation for PVTG students in Top Class?',
          questionHi: 'क्या टॉप क्लास में पीवीटीजी छात्रों के लिए विशेष प्राथमिकता है?',
          answerEn: 'PVTG (Particularly Vulnerable Tribal Groups) students receive priority allotment within available slots.',
          answerHi: 'उपलब्ध स्लॉट में विशेष रूप से कमजोर जनजातीय समूहों (पीवीटीजी) के छात्रों को प्राथमिकता दी जाती है।'
        }
      ])
    },
    {
      id: 'scheme_nfst',
      code: 'NFST',
      name_en: 'National Fellowship for Higher Education of ST Students (NFST)',
      name_hi: 'एसटी छात्रों की उच्च शिक्षा के लिए राष्ट्रीय अध्येतावृत्ति (NFST)',
      ministry: 'Ministry of Tribal Affairs, Govt. of India',
      description_en: 'Provides fellowships to ST candidates to pursue higher studies leading to M.Phil and Ph.D. degrees in Sciences, Humanities, Social Sciences, and Engineering/Technology in UGC recognized universities.',
      description_hi: 'यूजीसी से मान्यता प्राप्त विश्वविद्यालयों में विज्ञान, मानविकी, सामाजिक विज्ञान एवं इंजीनियरिंग में एम.फिल तथा पीएचडी हेतु फेलोशिप प्रदान करना।',
      max_income_limit: 600000,
      academic_level: 'MPHIL_PHD',
      eligible_classes: 'Full-time M.Phil / Ph.D. Scholars',
      benefits_en: 'JRF: ₹31,000/month; SRF: ₹35,000/month + Contingency grant (₹10,000 - ₹25,000/yr) + HRA as per norms',
      benefits_hi: 'जेआरएफ: ₹31,000/माह; एसआरएफ: ₹35,000/माह + आकस्मिक अनुदान (₹10,000 - ₹25,000/वर्ष) + मकान किराया भत्ता',
      application_period_start: '2026-06-01',
      application_period_end: '2026-10-31',
      sample_sanction_amount: 372000,
      faqs_json: JSON.stringify([
        {
          questionEn: 'Can employed candidates apply for NFST?',
          questionHi: 'क्या सेवारत उम्मीदवार एनएफएसटी के लिए आवेदन कर सकते हैं?',
          answerEn: 'Only regular full-time registered scholars who are not availing any other fellowship/salary are eligible.',
          answerHi: 'केवल नियमित पूर्णकालिक पंजीकृत शोधार्थी जो किसी अन्य फेलोशिप या वेतन का लाभ नहीं ले रहे हैं, वही पात्र हैं।'
        }
      ])
    },
    {
      id: 'scheme_nos',
      code: 'NOS',
      name_en: 'National Overseas Scholarship for ST Students (NOS)',
      name_hi: 'एसटी छात्रों के लिए राष्ट्रीय विदेशी छात्रवृत्ति (NOS)',
      ministry: 'Ministry of Tribal Affairs, Govt. of India',
      description_en: 'Enables meritorious ST students to acquire higher education at Master’s level, Ph.D. and Post-Doctoral research abroad in renowned foreign universities (Top 500 QS/THE ranked).',
      description_hi: 'मेधावी एसटी छात्रों को शीर्ष 500 अंतरराष्ट्रीय विश्वविद्यालयों से मास्टर डिग्री, पीएचडी एवं पोस्ट-डॉक्टोरल अनुसंधान करने हेतु वित्तीय सहायता।',
      max_income_limit: 800000,
      academic_level: 'OVERSEAS_MASTERS_PHD',
      eligible_classes: 'Master’s Degree, Ph.D. programs abroad in specified subjects',
      benefits_en: 'Full Tuition Fees + Annual Maintenance Allowance (£9,900 for UK / $15,400 for USA & others) + Contingency + Economy class return airfare + Medical insurance',
      benefits_hi: 'पूर्ण विदेशी शिक्षण शुल्क + वार्षिक निर्वाह भत्ता (£9,900 ब्रिटेन / $15,400 अमेरिका व अन्य) + आकस्मिक भत्ता + वापसी विमान किराया + चिकित्सा बीमा',
      application_period_start: '2026-05-01',
      application_period_end: '2026-09-30',
      sample_sanction_amount: 1450000,
      faqs_json: JSON.stringify([
        {
          questionEn: 'What is the minimum qualification percentage for NOS?',
          questionHi: 'एनओएस के लिए न्यूनतम योग्यता प्रतिशत क्या है?',
          answerEn: 'Candidate must have secured minimum 55% marks or equivalent grade in the qualifying degree examination.',
          answerHi: 'उम्मीदवार को योग्यता डिग्री परीक्षा में न्यूनतम 55% अंक या समकक्ष ग्रेड प्राप्त होना चाहिए।'
        }
      ])
    }
  ];

  for (const s of schemesData) {
    db.run(
      `INSERT INTO schemes (
        id, code, name_en, name_hi, ministry, description_en, description_hi,
        max_income_limit, academic_level, eligible_classes, benefits_en, benefits_hi,
        application_period_start, application_period_end, sample_sanction_amount, is_active, faqs_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        s.id, s.code, s.name_en, s.name_hi, s.ministry, s.description_en, s.description_hi,
        s.max_income_limit, s.academic_level, s.eligible_classes, s.benefits_en, s.benefits_hi,
        s.application_period_start, s.application_period_end, s.sample_sanction_amount, s.faqs_json
      ]
    );
  }

  // 2. Seed Configurable Eligibility Rules for all schemes
  const rules = [
    // Pre-Matric
    { id: 'rule_pm_st', scheme_id: 'scheme_pre_matric', rule_key: 'CATEGORY_ST', rule_name: 'Scheduled Tribe Verification', rule_description: 'Applicant must belong to recognized Scheduled Tribe community', criteria_json: JSON.stringify({ category: 'ST', stVerified: true }) },
    { id: 'rule_pm_income', scheme_id: 'scheme_pre_matric', rule_key: 'MAX_INCOME', rule_name: 'Annual Family Income Limit', rule_description: 'Annual family income must not exceed ₹2,50,000', criteria_json: JSON.stringify({ maxIncome: 250000 }) },
    { id: 'rule_pm_level', scheme_id: 'scheme_pre_matric', rule_key: 'ACADEMIC_LEVEL', rule_name: 'Class IX or X Enrollment', rule_description: 'Must be actively enrolled in Class IX or Class X', criteria_json: JSON.stringify({ allowedLevels: ['PRE_MATRIC'], allowedClasses: ['Class 9', 'Class 10', 'Class IX', 'Class X'] }) },

    // Post-Matric
    { id: 'rule_pomm_st', scheme_id: 'scheme_post_matric', rule_key: 'CATEGORY_ST', rule_name: 'Scheduled Tribe Verification', rule_description: 'Applicant must belong to recognized Scheduled Tribe community', criteria_json: JSON.stringify({ category: 'ST', stVerified: true }) },
    { id: 'rule_pomm_income', scheme_id: 'scheme_post_matric', rule_key: 'MAX_INCOME', rule_name: 'Annual Family Income Limit', rule_description: 'Annual family income must not exceed ₹2,50,000', criteria_json: JSON.stringify({ maxIncome: 250000 }) },
    { id: 'rule_pomm_level', scheme_id: 'scheme_post_matric', rule_key: 'ACADEMIC_LEVEL', rule_name: 'Post-Secondary Education', rule_description: 'Must be enrolled in Class XI, XII, Diploma, UG, or PG degree', criteria_json: JSON.stringify({ allowedLevels: ['POST_MATRIC_HS', 'UNDERGRADUATE', 'POSTGRADUATE'] }) },

    // Top Class
    { id: 'rule_tc_st', scheme_id: 'scheme_top_class', rule_key: 'CATEGORY_ST', rule_name: 'Scheduled Tribe Verification', rule_description: 'Must belong to recognized Scheduled Tribe community', criteria_json: JSON.stringify({ category: 'ST', stVerified: true }) },
    { id: 'rule_tc_income', scheme_id: 'scheme_top_class', rule_key: 'MAX_INCOME', rule_name: 'Annual Family Income Limit', rule_description: 'Annual family income must not exceed ₹6,00,000', criteria_json: JSON.stringify({ maxIncome: 600000 }) },
    { id: 'rule_tc_institute', scheme_id: 'scheme_top_class', rule_key: 'NOTIFIED_INSTITUTE', rule_name: 'Premier Notified Institution', rule_description: 'Admission in IIT, NIT, IIM, AIIMS, NLU, or recognized central premier institute', criteria_json: JSON.stringify({ instituteTypes: ['PREMIER_INSTITUTE_IIT_NIT_IIM', 'CENTRAL_INSTITUTE'] }) },

    // NFST
    { id: 'rule_nfst_st', scheme_id: 'scheme_nfst', rule_key: 'CATEGORY_ST', rule_name: 'Scheduled Tribe Verification', rule_description: 'Must belong to recognized Scheduled Tribe community', criteria_json: JSON.stringify({ category: 'ST', stVerified: true }) },
    { id: 'rule_nfst_level', scheme_id: 'scheme_nfst', rule_key: 'MPHIL_PHD_ENROLLMENT', rule_name: 'M.Phil / Ph.D. Scholar', rule_description: 'Must be enrolled full-time in M.Phil / Ph.D. program in recognized university', criteria_json: JSON.stringify({ allowedLevels: ['MPHIL_PHD'] }) },
    { id: 'rule_nfst_income', scheme_id: 'scheme_nfst', rule_key: 'MAX_INCOME', rule_name: 'Income Limit', rule_description: 'Family income ceiling of ₹6,00,000', criteria_json: JSON.stringify({ maxIncome: 600000 }) },

    // NOS
    { id: 'rule_nos_st', scheme_id: 'scheme_nos', rule_key: 'CATEGORY_ST', rule_name: 'Scheduled Tribe Verification', rule_description: 'Must belong to recognized Scheduled Tribe community', criteria_json: JSON.stringify({ category: 'ST', stVerified: true }) },
    { id: 'rule_nos_income', scheme_id: 'scheme_nos', rule_key: 'MAX_INCOME', rule_name: 'Annual Family Income Limit', rule_description: 'Annual family income must not exceed ₹8,00,000', criteria_json: JSON.stringify({ maxIncome: 800000 }) },
    { id: 'rule_nos_marks', scheme_id: 'scheme_nos', rule_key: 'MIN_MARKS', rule_name: 'Minimum Qualifying Marks', rule_description: 'Minimum 55% marks in qualifying degree examination', criteria_json: JSON.stringify({ minPercentage: 55 }) },
    { id: 'rule_nos_offer', scheme_id: 'scheme_nos', rule_key: 'FOREIGN_OFFER', rule_name: 'Unconditional Foreign Admission Offer', rule_description: 'Offer letter from top-ranked foreign institution', criteria_json: JSON.stringify({ foreignUniversityRequired: true }) }
  ];

  for (const r of rules) {
    db.run(
      `INSERT INTO eligibility_rules (id, scheme_id, rule_key, rule_name, rule_description, criteria_json, is_mandatory)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [r.id, r.scheme_id, r.rule_key, r.rule_name, r.rule_description, r.criteria_json]
    );
  }

  // 3. Seed Demo Users with hashed passwords
  // All demo passwords:
  // Student: Student@123
  // Officer: Officer@123
  // Admin: Admin@123
  const studentPwHash = bcrypt.hashSync('Student@123', 8);
  const officerPwHash = bcrypt.hashSync('Officer@123', 8);
  const adminPwHash = bcrypt.hashSync('Admin@123', 8);

  // User 1: Sunita Bai Munda (Student with an active Post-Matric application at 'VERIFIED' stage)
  db.run(
    `INSERT INTO users (id, email, password_hash, role, full_name, mobile)
     VALUES (?, ?, ?, 'STUDENT', ?, ?)`,
    ['user_student_1', 'student@example.com', studentPwHash, 'Sunita Bai Munda', '9876543210']
  );

  db.run(
    `INSERT INTO profiles (
      user_id, full_name, dob, gender, mobile, email, state, district, village_town,
      category, st_certificate_no, st_status, pvtg_status, pvtg_group,
      aadhaar_masked, aadhaar_verified, apaar_id, otr_id,
      institution_name, institution_type, institution_code, course_name, course_level,
      class_year, academic_percentage, family_annual_income,
      bank_account_no, bank_ifsc, bank_name, bank_verified, profile_completed
    ) VALUES (
      'user_student_1', 'Sunita Bai Munda', '2004-03-12', 'FEMALE', '9876543210', 'student@example.com',
      'Jharkhand', 'Ranchi', 'Khunti', 'ST', 'JH-ST-2023-99410', 'VERIFIED', 0, NULL,
      'XXXX-XXXX-9142', 1, 'APAAR-2026-8812-4091', 'OTR-JH-2026-00441',
      'Ranchi University / St. Xavier’s College Ranchi', 'STATE_UNIVERSITY', 'AISHE-U-0205',
      'Bachelor of Science (Botany Hons)', 'UNDERGRADUATE', '2nd Year', 78.4, 140000,
      'XXXXXX4512', 'SBIN0000167', 'State Bank of India', 1, 1
    )`
  );

  // User 2: Birsa Soren (Student with active application having an open DEFICIENCY on Income Certificate)
  db.run(
    `INSERT INTO users (id, email, password_hash, role, full_name, mobile)
     VALUES (?, ?, ?, 'STUDENT', ?, ?)`,
    ['user_student_deficiency', 'deficiency.student@example.com', studentPwHash, 'Birsa Soren', '9811223344']
  );

  db.run(
    `INSERT INTO profiles (
      user_id, full_name, dob, gender, mobile, email, state, district, village_town,
      category, st_certificate_no, st_status, pvtg_status, pvtg_group,
      aadhaar_masked, aadhaar_verified, apaar_id, otr_id,
      institution_name, institution_type, institution_code, course_name, course_level,
      class_year, academic_percentage, family_annual_income,
      bank_account_no, bank_ifsc, bank_name, bank_verified, profile_completed
    ) VALUES (
      'user_student_deficiency', 'Birsa Soren', '2005-08-20', 'MALE', '9811223344', 'deficiency.student@example.com',
      'Odisha', 'Mayurbhanj', 'Baripada', 'ST', 'OD-ST-2022-77142', 'VERIFIED', 0, NULL,
      'XXXX-XXXX-5521', 1, 'APAAR-2026-9932-1102', 'OTR-OD-2026-00782',
      'North Orissa University Baripada', 'STATE_UNIVERSITY', 'AISHE-U-0351',
      'Diploma in Mechanical Engineering', 'UNDERGRADUATE', '1st Year', 68.2, 180000,
      'XXXXXX8921', 'PUNB0123400', 'Punjab National Bank', 1, 1
    )`
  );

  // User 3: Kavita Gond (Fresh student, PVTG Maria Gond, eligible for Top Class and Post-Matric, no application yet)
  db.run(
    `INSERT INTO users (id, email, password_hash, role, full_name, mobile)
     VALUES (?, ?, ?, 'STUDENT', ?, ?)`,
    ['user_student_fresh', 'fresh.student@example.com', studentPwHash, 'Kavita Gond', '9722334455']
  );

  db.run(
    `INSERT INTO profiles (
      user_id, full_name, dob, gender, mobile, email, state, district, village_town,
      category, st_certificate_no, st_status, pvtg_status, pvtg_group,
      aadhaar_masked, aadhaar_verified, apaar_id, otr_id,
      institution_name, institution_type, institution_code, course_name, course_level,
      class_year, academic_percentage, family_annual_income,
      bank_account_no, bank_ifsc, bank_name, bank_verified, profile_completed
    ) VALUES (
      'user_student_fresh', 'Kavita Gond', '2005-11-14', 'FEMALE', '9722334455', 'fresh.student@example.com',
      'Chhattisgarh', 'Bastar', 'Jagdalpur', 'ST', 'CG-ST-2024-55091', 'VERIFIED', 1, 'Maria Gond',
      'XXXX-XXXX-3388', 1, 'APAAR-2026-7721-3312', 'OTR-CG-2026-00129',
      'National Institute of Technology (NIT) Raipur', 'PREMIER_INSTITUTE_IIT_NIT_IIM', 'AISHE-U-0092',
      'B.Tech in Computer Science & Engineering', 'UNDERGRADUATE', '1st Year', 89.6, 210000,
      'XXXXXX1190', 'BKID0008812', 'Bank of India', 1, 1
    )`
  );

  // User 4: Verification Officer
  db.run(
    `INSERT INTO users (id, email, password_hash, role, full_name, mobile)
     VALUES (?, ?, ?, 'OFFICER', ?, ?)`,
    ['user_officer_1', 'officer@example.com', officerPwHash, 'Dr. Rameshwar Oraon', '9431122334']
  );

  // User 5: MoTA Administrator
  db.run(
    `INSERT INTO users (id, email, password_hash, role, full_name, mobile)
     VALUES (?, ?, ?, 'ADMIN', ?, ?)`,
    ['user_admin_1', 'admin@example.com', adminPwHash, 'Shri Arjun Meena, IAS (Director MoTA)', '9412345678']
  );

  // 4. Seed Documents for Sunita Bai Munda (User 1)
  const docsSunita = [
    {
      id: 'doc_sunita_st',
      user_id: 'user_student_1',
      doc_type: 'ST_CERTIFICATE',
      doc_name: 'ST_Caste_Certificate_Jharkhand.pdf',
      file_url: '/demo-docs/st-cert-sunita.pdf',
      file_size: 428000,
      mime_type: 'application/pdf',
      status: 'ACTIVE'
    },
    {
      id: 'doc_sunita_income',
      user_id: 'user_student_1',
      doc_type: 'INCOME_CERTIFICATE',
      doc_name: 'Income_Certificate_Tehsil_Khunti_2025.pdf',
      file_url: '/demo-docs/income-cert-sunita.pdf',
      file_size: 380000,
      mime_type: 'application/pdf',
      status: 'ACTIVE'
    },
    {
      id: 'doc_sunita_bonafide',
      user_id: 'user_student_1',
      doc_type: 'BONAFIDE_CERTIFICATE',
      doc_name: 'St_Xaviers_College_Bonafide_2026.pdf',
      file_url: '/demo-docs/bonafide-sunita.pdf',
      file_size: 512000,
      mime_type: 'application/pdf',
      status: 'ACTIVE'
    },
    {
      id: 'doc_sunita_passbook',
      user_id: 'user_student_1',
      doc_type: 'BANK_PASSBOOK',
      doc_name: 'SBI_Passbook_Aadhaar_Seeded.pdf',
      file_url: '/demo-docs/passbook-sunita.pdf',
      file_size: 610000,
      mime_type: 'application/pdf',
      status: 'ACTIVE'
    }
  ];

  for (const d of docsSunita) {
    db.run(
      `INSERT INTO documents (id, user_id, doc_type, doc_name, file_url, file_size, mime_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id, d.user_id, d.doc_type, d.doc_name, d.file_url, d.file_size, d.mime_type, d.status]
    );
  }

  // 5. Seed Documents for Birsa Soren (User 2)
  const docsBirsa = [
    {
      id: 'doc_birsa_st',
      user_id: 'user_student_deficiency',
      doc_type: 'ST_CERTIFICATE',
      doc_name: 'ST_Certificate_Baripada_Odisha.pdf',
      file_url: '/demo-docs/st-cert-birsa.pdf',
      file_size: 450000,
      mime_type: 'application/pdf',
      status: 'ACTIVE'
    },
    {
      id: 'doc_birsa_income_expired',
      user_id: 'user_student_deficiency',
      doc_type: 'INCOME_CERTIFICATE',
      doc_name: 'Income_Certificate_2023_Expired.pdf',
      file_url: '/demo-docs/income-expired-birsa.pdf',
      file_size: 320000,
      mime_type: 'application/pdf',
      status: 'ACTIVE'
    }
  ];

  for (const d of docsBirsa) {
    db.run(
      `INSERT INTO documents (id, user_id, doc_type, doc_name, file_url, file_size, mime_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id, d.user_id, d.doc_type, d.doc_name, d.file_url, d.file_size, d.mime_type, d.status]
    );
  }

  // 6. Seed Application 1: Sunita Bai Munda -> Post-Matric -> Status 'VERIFIED'
  const app1Id = 'app_sunita_pm_2026';
  const app1Number = 'TRIBAL-2026-004921';
  db.run(
    `INSERT INTO applications (
      id, application_number, student_id, scheme_id, academic_year, status, submitted_at, updated_at
    ) VALUES (?, ?, 'user_student_1', 'scheme_post_matric', '2026-27', 'VERIFIED', '2026-08-10 11:30:00', '2026-08-14 15:45:00')`,
    [app1Id, app1Number]
  );

  db.run(
    `INSERT INTO application_details (
      id, application_id, personal_details_json, academic_details_json, family_income_details_json, bank_details_json, declaration_signed, declaration_date
    ) VALUES (
      'appdet_sunita', '${app1Id}',
      '{"fullName":"Sunita Bai Munda","dob":"2004-03-12","gender":"FEMALE","mobile":"9876543210","email":"student@example.com","state":"Jharkhand","district":"Ranchi","villageTown":"Khunti","category":"ST","stCertificateNo":"JH-ST-2023-99410","pvtgStatus":false,"aadhaarMasked":"XXXX-XXXX-9142"}',
      '{"institutionName":"St. Xavier’s College Ranchi","institutionType":"STATE_UNIVERSITY","institutionCode":"AISHE-U-0205","courseName":"Bachelor of Science (Botany Hons)","courseLevel":"UNDERGRADUATE","classYear":"2nd Year","previousPercentage":78.4,"apaarId":"APAAR-2026-8812-4091"}',
      '{"fatherName":"Shri Mangal Munda","motherName":"Smt. Somari Munda","guardianOccupation":"Agriculture / Farming","familyAnnualIncome":140000,"incomeCertificateNo":"JH-INC-2025-11029","issuingAuthority":"Tahasildar, Khunti","issueDate":"2025-06-15"}',
      '{"accountHolderName":"Sunita Bai Munda","bankName":"State Bank of India","accountNumber":"XXXXXX4512","ifscCode":"SBIN0000167","branchName":"Ranchi Main Branch"}',
      1, '2026-08-10'
    )`
  );

  // Link Sunita's docs to Application
  for (const d of docsSunita) {
    db.run(
      `INSERT INTO application_documents (id, application_id, document_id, doc_type, verification_status, officer_remarks, verified_at)
       VALUES (?, ?, ?, ?, 'VERIFIED', 'Verified against DigiLocker / State e-District record', '2026-08-14 15:30:00')`,
      [`appdoc_${d.id}`, app1Id, d.id, d.doc_type]
    );
  }

  // Verification results for Sunita
  db.run(
    `INSERT INTO verification_results (id, application_id, adapter_source, outcome, submitted_value, verified_value, mismatch_field, notes)
     VALUES
     ('vr_s1_dl', '${app1Id}', 'DIGILOCKER', 'VERIFIED', 'JH-ST-2023-99410', 'JH-ST-2023-99410', NULL, 'Caste certificate verified via Jharkhand JharSewa / DigiLocker API (Demo)'),
     ('vr_s1_ap', '${app1Id}', 'APAAR', 'VERIFIED', 'APAAR-2026-8812-4091', 'APAAR-2026-8812-4091', NULL, 'Academic credit and institution match verified via APAAR / ABC registry'),
     ('vr_s1_ui', '${app1Id}', 'UIDAI', 'VERIFIED', 'Sunita Bai Munda, 2004-03-12', 'Sunita Bai Munda, 2004-03-12', NULL, 'Aadhaar demographic authentication successful (Demo Mock)'),
     ('vr_s1_ai', '${app1Id}', 'AISHE', 'VERIFIED', 'AISHE-U-0205', 'AISHE-U-0205 - St. Xavier College Ranchi', NULL, 'Accredited higher education institute confirmed')`
  );

  // Timeline for Sunita
  db.run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks, created_at)
     VALUES
     ('sh_s1_1', '${app1Id}', 'DRAFT', 'SUBMITTED', 'user_student_1', 'STUDENT', 'Application submitted by student online.', '2026-08-10 11:30:00'),
     ('sh_s1_2', '${app1Id}', 'SUBMITTED', 'UNDER_VERIFICATION', 'SYSTEM', 'SYSTEM', 'Automated mock verification adapters initiated (DigiLocker, APAAR, UIDAI).', '2026-08-10 11:31:00'),
     ('sh_s1_3', '${app1Id}', 'UNDER_VERIFICATION', 'VERIFIED', 'user_officer_1', 'OFFICER', 'All mandatory documents and academic records verified. Ready for sanction.', '2026-08-14 15:45:00')`
  );

  // 7. Seed Application 2: Birsa Soren -> Post-Matric -> Status 'DEFICIENCY'
  const app2Id = 'app_birsa_pm_2026';
  const app2Number = 'TRIBAL-2026-003844';
  db.run(
    `INSERT INTO applications (
      id, application_number, student_id, scheme_id, academic_year, status, submitted_at, updated_at
    ) VALUES (?, ?, 'user_student_deficiency', 'scheme_post_matric', '2026-27', 'DEFICIENCY', '2026-08-18 10:15:00', '2026-08-20 14:20:00')`,
    [app2Id, app2Number]
  );

  db.run(
    `INSERT INTO application_details (
      id, application_id, personal_details_json, academic_details_json, family_income_details_json, bank_details_json, declaration_signed, declaration_date
    ) VALUES (
      'appdet_birsa', '${app2Id}',
      '{"fullName":"Birsa Soren","dob":"2005-08-20","gender":"MALE","mobile":"9811223344","email":"deficiency.student@example.com","state":"Odisha","district":"Mayurbhanj","villageTown":"Baripada","category":"ST","stCertificateNo":"OD-ST-2022-77142","pvtgStatus":false,"aadhaarMasked":"XXXX-XXXX-5521"}',
      '{"institutionName":"North Orissa University Baripada","institutionType":"STATE_UNIVERSITY","institutionCode":"AISHE-U-0351","courseName":"Diploma in Mechanical Engineering","courseLevel":"UNDERGRADUATE","classYear":"1st Year","previousPercentage":68.2,"apaarId":"APAAR-2026-9932-1102"}',
      '{"fatherName":"Shri Gurva Soren","motherName":"Smt. Mani Soren","guardianOccupation":"Artisan","familyAnnualIncome":180000,"incomeCertificateNo":"OD-INC-2023-44102","issuingAuthority":"Tahsildar Baripada","issueDate":"2023-04-10"}',
      '{"accountHolderName":"Birsa Soren","bankName":"Punjab National Bank","accountNumber":"XXXXXX8921","ifscCode":"PUNB0123400","branchName":"Baripada Main Branch"}',
      1, '2026-08-18'
    )`
  );

  // Deficiency record for Birsa Soren
  db.run(
    `INSERT INTO deficiencies (
      id, application_id, created_by_officer_id, deficiency_type, field_name,
      reason_en, reason_hi, required_action_en, required_action_hi, deadline, status, created_at
    ) VALUES (
      'def_birsa_1', '${app2Id}', 'user_officer_1', 'EXPIRED_INCOME_CERTIFICATE', 'INCOME_CERTIFICATE',
      'Uploaded Income Certificate was issued in financial year 2023-24 and is expired. Valid income certificate issued for current financial year 2025-26 by Competent Revenue Authority is required.',
      'अपलोड किया गया आय प्रमाण पत्र वित्तीय वर्ष 2023-24 का है और इसकी वैधता समाप्त हो चुकी है। चालू वित्तीय वर्ष 2025-26 हेतु सक्षम राजस्व अधिकारी द्वारा जारी वैध प्रमाण पत्र अपलोड करें।',
      'Upload a newly issued Income Certificate for FY 2025-26 issued by Tahsildar / SDO.',
      'तहसीलदार/एसडीओ द्वारा जारी चालू वित्तीय वर्ष 2025-26 का नवीन आय प्रमाण पत्र अपलोड करें।',
      '2026-10-15', 'OPEN', '2026-08-20 14:20:00'
    )`
  );

  db.run(
    `INSERT INTO status_history (id, application_id, from_status, to_status, actor_id, actor_role, remarks, created_at)
     VALUES
     ('sh_b1_1', '${app2Id}', 'DRAFT', 'SUBMITTED', 'user_student_deficiency', 'STUDENT', 'Application submitted by student.', '2026-08-18 10:15:00'),
     ('sh_b1_2', '${app2Id}', 'SUBMITTED', 'UNDER_VERIFICATION', 'SYSTEM', 'SYSTEM', 'Mock verification initiated.', '2026-08-18 10:16:00'),
     ('sh_b1_3', '${app2Id}', 'UNDER_VERIFICATION', 'DEFICIENCY', 'user_officer_1', 'OFFICER', 'Income certificate expired. Deficiency flagged for student re-upload.', '2026-08-20 14:20:00')`
  );

  // Seed Notifications
  db.run(
    `INSERT INTO notifications (id, user_id, title_en, title_hi, message_en, message_hi, type, is_read, link)
     VALUES
     ('notif_1', 'user_student_1', 'Application Verified', 'आवेदन सत्यापित हुआ', 'Your application TRIBAL-2026-004921 has been verified by the Verification Officer. Sanction order pending.', 'आपका आवेदन TRIBAL-2026-004921 सत्यापन अधिकारी द्वारा सत्यापित कर दिया गया है। स्वीकृति आदेश प्रतीक्षित है।', 'SUCCESS', 0, '/applications/app_sunita_pm_2026'),
     ('notif_2', 'user_student_deficiency', 'Action Required: Income Certificate Deficiency', 'कार्रवाई आवश्यक: आय प्रमाण पत्र में कमी', 'Your application TRIBAL-2026-003844 has a deficiency: Expired income certificate. Please upload updated certificate before 15 Oct 2026.', 'आपके आवेदन TRIBAL-2026-003844 में कमी पाई गई है: पुराना आय प्रमाण पत्र। कृपया 15 अक्टूबर 2026 से पूर्व अद्यतन प्रमाण पत्र अपलोड करें।', 'DEFICIENCY', 0, '/deficiencies'),
     ('notif_3', 'user_student_fresh', 'Welcome to TribalScholar', 'ट्राइबल स्कॉलर में आपका स्वागत है', 'Complete your profile to check eligible scholarship schemes under Ministry of Tribal Affairs.', 'जनजातीय कार्य मंत्रालय की छात्रवृत्ति योजनाओं की पात्रता जांचने हेतु अपनी प्रोफाइल पूर्ण करें।', 'INFO', 0, '/profile')`
  );

  // 8. Seed Outreach Candidates (Potential eligible students not availing scholarship yet)
  const outreachCandidates = [
    {
      id: 'out_1',
      source_system: 'UDISE_PLUS',
      candidate_name: 'Budhram Munda',
      masked_id: 'UDISE-JH-XXXX-9912',
      district: 'Khunti',
      state: 'Jharkhand',
      current_class_course: 'Class IX (Secondary)',
      institution: 'Govt. High School Torpa, Khunti',
      estimated_income: 95000,
      pvtg_status: 0,
      st_status: 'VERIFIED_ST',
      recommended_scheme_id: 'scheme_pre_matric',
      match_confidence: 96,
      outreach_status: 'IDENTIFIED',
      notes: 'Enrolled in UDISE+ database with confirmed ST category; no active NSP/MoTA application found.'
    },
    {
      id: 'out_2',
      source_system: 'APAAR',
      candidate_name: 'Mangli Bai Baiga',
      masked_id: 'APAAR-MP-XXXX-4421',
      district: 'Dindori',
      state: 'Madhya Pradesh',
      current_class_course: 'B.Sc Agriculture (1st Year)',
      institution: 'Jawaharlal Nehru Krishi Vishwavidyalaya, Jabalpur',
      estimated_income: 110000,
      pvtg_status: 1, // PVTG Baiga tribe
      st_status: 'VERIFIED_ST_PVTG',
      recommended_scheme_id: 'scheme_post_matric',
      match_confidence: 94,
      outreach_status: 'NOTIFIED',
      notes: 'Particularly Vulnerable Tribal Group (Baiga). SMS awareness sent in Hindi regarding Post-Matric scheme.'
    },
    {
      id: 'out_3',
      source_system: 'APAAR',
      candidate_name: 'Jaipal Singh Murmu',
      masked_id: 'APAAR-WB-XXXX-7108',
      district: 'Purulia',
      state: 'West Bengal',
      current_class_course: 'B.Tech Metallurgical Engineering',
      institution: 'Indian Institute of Technology (IIT) Kharagpur',
      estimated_income: 340000,
      pvtg_status: 0,
      st_status: 'VERIFIED_ST',
      recommended_scheme_id: 'scheme_top_class',
      match_confidence: 98,
      outreach_status: 'IDENTIFIED',
      notes: 'Admitted in IIT Kharagpur (Premier notified institute). Highly eligible for Top Class Scheme full fee waiver + laptop grant.'
    },
    {
      id: 'out_4',
      source_system: 'OTR',
      candidate_name: 'Anita Kumari Korwa',
      masked_id: 'OTR-CG-XXXX-3319',
      district: 'Surguja',
      state: 'Chhattisgarh',
      current_class_course: 'Ph.D. Forestry & Wildlife',
      institution: 'Guru Ghasidas Vishwavidyalaya Bilaspur',
      estimated_income: 220000,
      pvtg_status: 1, // PVTG Birhor / Pahadi Korwa
      st_status: 'VERIFIED_ST_PVTG',
      recommended_scheme_id: 'scheme_nfst',
      match_confidence: 92,
      outreach_status: 'APPLICATION_STARTED',
      notes: 'Enrolled Ph.D. scholar from Pahadi Korwa PVTG. Eligible for NFST regular fellowship of ₹31,000/month.'
    }
  ];

  for (const c of outreachCandidates) {
    db.run(
      `INSERT INTO outreach_candidates (
        id, source_system, candidate_name, masked_id, district, state,
        current_class_course, institution, estimated_income, pvtg_status,
        st_status, recommended_scheme_id, match_confidence, outreach_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id, c.source_system, c.candidate_name, c.masked_id, c.district, c.state,
        c.current_class_course, c.institution, c.estimated_income, c.pvtg_status,
        c.st_status, c.recommended_scheme_id, c.match_confidence, c.outreach_status, c.notes
      ]
    );
  }
}
