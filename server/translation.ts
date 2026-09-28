import fs from 'fs';
import path from 'path';

export type SupportedTranslationLanguage =
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

type TargetLanguage = Exclude<SupportedTranslationLanguage, 'en'>;

type TranslationCache = {
  version: 2;
  sourceLanguage: 'en';
  translations: Partial<Record<TargetLanguage, Record<string, string>>>;
};

type MyMemoryResponse = {
  responseData?: { translatedText?: string };
  responseStatus?: number | string;
  responseDetails?: string;
  quotaFinished?: boolean;
};

// Response of translateText(). `text` and `cached` are unchanged from before;
// `translated` and the rate-limit fields are additive so the frontend can tell
// a real translation apart from an English fallback and can stop asking.
export type TranslateResult = {
  text: string;
  cached: boolean;
  translated: boolean;
  rateLimited?: boolean;
  retryAfterMs?: number;
};

type Outcome =
  | { ok: true; text: string }
  | { ok: false; rateLimited: boolean; retryAfterMs?: number };

class MyMemoryError extends Error {
  rateLimited: boolean;
  retryAfterMs?: number;

  constructor(message: string, rateLimited = false, retryAfterMs?: number) {
    super(message);
    this.rateLimited = rateLimited;
    this.retryAfterMs = retryAfterMs;
  }
}

const CACHE_FILE = process.env.TRANSLATION_CACHE_FILE
  ? path.resolve(process.env.TRANSLATION_CACHE_FILE)
  : path.resolve('data', 'translations-cache-v2.json');

const REQUEST_TIMEOUT_MS = 8000;
const FAILURE_COOLDOWN_MS = 30000;
const RATE_LIMIT_COOLDOWN_MS = 60000;
const MAX_RATE_LIMIT_COOLDOWN_MS = 10 * 60000;
const QUOTA_COOLDOWN_MS = 10 * 60000;
const PERSIST_DELAY_MS = 500;
const MAX_CONCURRENT_REQUESTS = 3;
const MAX_TEXT_LENGTH = 1000;
const MAX_FAILURE_ENTRIES = 5000;
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL?.trim();

// One entry per unique (language + text). Every caller asking for the same
// translation while it is in flight shares this single promise, so MyMemory
// is called once. The promise never rejects: it resolves to an Outcome.
const pendingRequests = new Map<string, Promise<Outcome>>();
const failedUntil = new Map<string, number>();

// While MyMemory is answering HTTP 429 (or says the quota is finished) we stop
// calling it entirely instead of hammering it with more requests.
let rateLimitedUntil = 0;

const queue: Array<{
  key: string;
  text: string;
  language: TargetLanguage;
  resolve: (value: Outcome) => void;
}> = [];

let activeRequests = 0;
let cache: TranslationCache | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistCounter = 0;
let cacheDirty = false;

function createEmptyCache(): TranslationCache {
  return {
    version: 2,
    sourceLanguage: 'en',
    translations: {}
  };
}

function ensureCacheLoaded(): TranslationCache {
  if (cache) return cache;

  try {
    if (!fs.existsSync(CACHE_FILE)) {
      cache = createEmptyCache();
      return cache;
    }

    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as Partial<TranslationCache>;

    if (
      parsed.version !== 2 ||
      parsed.sourceLanguage !== 'en' ||
      !parsed.translations ||
      typeof parsed.translations !== 'object'
    ) {
      console.warn('[Translation] Invalid cache format; starting with an empty v2 cache.');
      cache = createEmptyCache();
      return cache;
    }

    cache = {
      version: 2,
      sourceLanguage: 'en',
      translations: parsed.translations
    };
  } catch (error) {
    console.error('[Translation] Cache read failed; starting empty:', error);
    cache = createEmptyCache();
  }

  return cache;
}

// Atomic write: write to a unique temporary file, then rename over the cache.
// Writes are debounced so a burst of new translations produces one file write
// instead of one full-file rewrite per translation.
function writeCacheFile(): void {
  if (!cacheDirty) return;

  const currentCache = ensureCacheLoaded();
  persistCounter += 1;
  const temporaryFile = `${CACHE_FILE}.${process.pid}.${persistCounter}.tmp`;

  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(temporaryFile, JSON.stringify(currentCache, null, 2), 'utf8');
    fs.renameSync(temporaryFile, CACHE_FILE);
    cacheDirty = false;
  } catch (error) {
    console.error('[Translation] Cache write failed:', error);

    try {
      fs.rmSync(temporaryFile, { force: true });
    } catch {
      // Nothing more to do; the in-memory cache still works.
    }
  }
}

function schedulePersist(): void {
  cacheDirty = true;

  if (persistTimer) return;

  persistTimer = setTimeout(() => {
    persistTimer = null;
    writeCacheFile();
  }, PERSIST_DELAY_MS);

  // Never keep the process alive just for a pending cache write.
  persistTimer.unref?.();
}

process.on('exit', () => {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  writeCacheFile();
});

function cacheKey(text: string, language: TargetLanguage): string {
  return `en:${language}:${text}`;
}

function getCachedTranslation(text: string, language: TargetLanguage): string | undefined {
  const languageCache = ensureCacheLoaded().translations[language];

  if (!languageCache || !Object.prototype.hasOwnProperty.call(languageCache, text)) {
    return undefined;
  }

  const value = languageCache[text];

  return typeof value === 'string' && value ? value : undefined;
}

// Only ever called with a successful MyMemory translation.
function setCachedTranslation(text: string, language: TargetLanguage, translatedText: string): void {
  const currentCache = ensureCacheLoaded();

  currentCache.translations[language] ??= {};
  currentCache.translations[language]![text] = translatedText;

  schedulePersist();
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;

  const seconds = Number(header);

  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, MAX_RATE_LIMIT_COOLDOWN_MS);
  }

  const date = Date.parse(header);

  if (Number.isFinite(date)) {
    const diff = date - Date.now();
    if (diff > 0) return Math.min(diff, MAX_RATE_LIMIT_COOLDOWN_MS);
  }

  return undefined;
}

async function requestFromMyMemory(text: string, language: TargetLanguage): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL('https://api.mymemory.translated.net/get');

    url.searchParams.set('q', text);
    url.searchParams.set('langpair', `en|${language}`);

    if (MYMEMORY_EMAIL) {
      url.searchParams.set('de', MYMEMORY_EMAIL);
    }

    console.info(`[Translation] MyMemory request started for ${language}.`);

    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      if (response.status === 429) {
        throw new MyMemoryError(
          'MyMemory returned HTTP 429',
          true,
          parseRetryAfterMs(response.headers.get('retry-after')) ?? RATE_LIMIT_COOLDOWN_MS
        );
      }

      throw new MyMemoryError(`MyMemory returned HTTP ${response.status}`);
    }

    let payload: MyMemoryResponse;

    try {
      payload = (await response.json()) as MyMemoryResponse;
    } catch {
      throw new MyMemoryError('MyMemory returned malformed JSON');
    }

    const status = Number(payload.responseStatus);

    if (payload.quotaFinished === true) {
      throw new MyMemoryError('MyMemory quota finished', true, QUOTA_COOLDOWN_MS);
    }

    if (status === 429) {
      throw new MyMemoryError('MyMemory returned status 429', true, RATE_LIMIT_COOLDOWN_MS);
    }

    const translatedText = payload.responseData?.translatedText?.trim();

    if (
      !translatedText ||
      status !== 200 ||
      /^MYMEMORY WARNING/i.test(translatedText)
    ) {
      throw new MyMemoryError(
        `MyMemory returned no usable translation ` +
          `(status=${payload.responseStatus ?? 'unknown'}, ` +
          `quotaFinished=${payload.quotaFinished ?? 'unknown'}, ` +
          `details=${payload.responseDetails ?? 'none'})`
      );
    }

    console.info(`[Translation] MyMemory response received for ${language}.`);

    return translatedText;
  } catch (error) {
    if (error instanceof MyMemoryError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new MyMemoryError(`MyMemory request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function rememberFailure(key: string): void {
  if (failedUntil.size >= MAX_FAILURE_ENTRIES) {
    const now = Date.now();

    for (const [failedKey, until] of failedUntil) {
      if (until <= now) failedUntil.delete(failedKey);
    }

    if (failedUntil.size >= MAX_FAILURE_ENTRIES) failedUntil.clear();
  }

  failedUntil.set(key, Date.now() + FAILURE_COOLDOWN_MS);
}

function processQueue(): void {
  while (activeRequests < MAX_CONCURRENT_REQUESTS && queue.length > 0) {
    const item = queue.shift();

    if (!item) return;

    // A 429 arrived while this item was waiting: do not call MyMemory at all.
    if (rateLimitedUntil > Date.now()) {
      pendingRequests.delete(item.key);
      item.resolve({
        ok: false,
        rateLimited: true,
        retryAfterMs: rateLimitedUntil - Date.now()
      });
      continue;
    }

    activeRequests += 1;

    requestFromMyMemory(item.text, item.language)
      .then((translatedText) => {
        failedUntil.delete(item.key);

        // Only a successful translation is ever cached.
        setCachedTranslation(item.text, item.language, translatedText);

        pendingRequests.delete(item.key);
        item.resolve({ ok: true, text: translatedText });
      })
      .catch((error: unknown) => {
        pendingRequests.delete(item.key);

        if (error instanceof MyMemoryError && error.rateLimited) {
          const cooldown = Math.min(
            error.retryAfterMs ?? RATE_LIMIT_COOLDOWN_MS,
            MAX_RATE_LIMIT_COOLDOWN_MS
          );
          const alreadyLimited = rateLimitedUntil > Date.now();

          rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + cooldown);

          if (!alreadyLimited) {
            console.error(
              `[Translation] ${error.message}; pausing MyMemory requests for ` +
                `${Math.round(cooldown / 1000)}s and using English fallback.`
            );
          }

          item.resolve({ ok: false, rateLimited: true, retryAfterMs: cooldown });
          return;
        }

        rememberFailure(item.key);

        console.error(
          `[Translation] MyMemory request failed for ${item.language}; using English fallback:`,
          error
        );

        item.resolve({ ok: false, rateLimited: false });
      })
      .finally(() => {
        activeRequests -= 1;
        processQueue();
      });
  }
}

export function isSupportedTranslationLanguage(
  value: string
): value is SupportedTranslationLanguage {
  return [
    'en',
    'hi',
    'bn',
    'te',
    'mr',
    'ta',
    'gu',
    'kn',
    'ml',
    'pa',
    'or',
    'as',
    'ne',
    'ur'
  ].includes(value);
}

function fallback(text: string, outcome?: { rateLimited: boolean; retryAfterMs?: number }): TranslateResult {
  return {
    text,
    cached: false,
    translated: false,
    ...(outcome?.rateLimited
      ? { rateLimited: true, retryAfterMs: outcome.retryAfterMs ?? RATE_LIMIT_COOLDOWN_MS }
      : {})
  };
}

// Order of operations for every call:
//   1. English / empty / too long  -> return immediately, no MyMemory
//   2. cache lookup                -> return immediately
//   3. same text+language pending  -> reuse the one in-flight request
//   4. recent failure / 429 pause  -> English fallback, no MyMemory
//   5. otherwise                   -> ONE queued MyMemory request, cached on success
// This function never throws and never retries.
export async function translateText(
  text: string,
  language: SupportedTranslationLanguage
): Promise<TranslateResult> {
  const normalizedText = text.trim();

  if (!normalizedText || language === 'en') {
    return { text, cached: true, translated: false };
  }

  if (normalizedText.length > MAX_TEXT_LENGTH) {
    return fallback(text);
  }

  const targetLanguage = language as TargetLanguage;

  const cachedTranslation = getCachedTranslation(normalizedText, targetLanguage);

  if (cachedTranslation) {
    return { text: cachedTranslation, cached: true, translated: true };
  }

  const key = cacheKey(normalizedText, targetLanguage);

  const existingRequest = pendingRequests.get(key);

  if (existingRequest) {
    const outcome = await existingRequest;
    return outcome.ok ? { text: outcome.text, cached: false, translated: true } : fallback(text, outcome);
  }

  if (rateLimitedUntil > Date.now()) {
    return fallback(text, { rateLimited: true, retryAfterMs: rateLimitedUntil - Date.now() });
  }

  if ((failedUntil.get(key) || 0) > Date.now()) {
    return fallback(text);
  }

  const request = new Promise<Outcome>((resolve) => {
    queue.push({
      key,
      text: normalizedText,
      language: targetLanguage,
      resolve
    });
  });

  pendingRequests.set(key, request);
  processQueue();

  const outcome = await request;

  return outcome.ok ? { text: outcome.text, cached: false, translated: true } : fallback(text, outcome);
}