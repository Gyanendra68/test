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

type TranslationCache = {
  version: 2;
  sourceLanguage: 'en';
  translations: Partial<Record<Exclude<SupportedTranslationLanguage, 'en'>, Record<string, string>>>;
};

type MyMemoryResponse = {
  responseData?: { translatedText?: string };
  responseStatus?: number;
  responseDetails?: string;
  quotaFinished?: boolean;
};

const CACHE_FILE = process.env.TRANSLATION_CACHE_FILE
  ? path.resolve(process.env.TRANSLATION_CACHE_FILE)
  : path.resolve('data', 'translations-cache-v2.json');

const REQUEST_TIMEOUT_MS = 8000;
const FAILURE_COOLDOWN_MS = 30000;
const MAX_CONCURRENT_REQUESTS = 3;
const MAX_TEXT_LENGTH = 1000;
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL?.trim();

const pendingRequests = new Map<string, Promise<string>>();
const failedUntil = new Map<string, number>();

const queue: Array<{
  key: string;
  text: string;
  language: Exclude<SupportedTranslationLanguage, 'en'>;
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

let activeRequests = 0;
let cache: TranslationCache | null = null;

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

function persistCache(): void {
  const currentCache = ensureCacheLoaded();

  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });

    const temporaryFile = `${CACHE_FILE}.${process.pid}.tmp`;

    fs.writeFileSync(
      temporaryFile,
      JSON.stringify(currentCache, null, 2),
      'utf8'
    );

    fs.renameSync(temporaryFile, CACHE_FILE);
  } catch (error) {
    console.error('[Translation] Cache write failed:', error);
  }
}

function cacheKey(
  text: string,
  language: Exclude<SupportedTranslationLanguage, 'en'>
): string {
  return `en:${language}:${text}`;
}

function getCachedTranslation(
  text: string,
  language: Exclude<SupportedTranslationLanguage, 'en'>
): string | undefined {
  return ensureCacheLoaded().translations[language]?.[text];
}

function setCachedTranslation(
  text: string,
  language: Exclude<SupportedTranslationLanguage, 'en'>,
  translatedText: string
): void {
  const currentCache = ensureCacheLoaded();

  currentCache.translations[language] ??= {};
  currentCache.translations[language]![text] = translatedText;

  persistCache();
}

async function requestFromMyMemory(
  text: string,
  language: Exclude<SupportedTranslationLanguage, 'en'>
): Promise<string> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const url = new URL('https://api.mymemory.translated.net/get' );

    url.searchParams.set('q', text);
    url.searchParams.set('langpair', `en|${language}`);

    if (MYMEMORY_EMAIL) {
      url.searchParams.set('de', MYMEMORY_EMAIL);
    }

    console.info(
      `[Translation] MyMemory request started for ${language}.`
    );

    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `MyMemory returned HTTP ${response.status}`
      );
    }

    let payload: MyMemoryResponse;

    try {
      payload = await response.json() as MyMemoryResponse;
    } catch {
      throw new Error(
        'MyMemory returned malformed JSON'
      );
    }

    const translatedText =
      payload.responseData?.translatedText?.trim();

    if (
      !translatedText ||
      payload.responseStatus !== 200 ||
      payload.quotaFinished === true
    ) {
      throw new Error(
        `MyMemory returned no usable translation ` +
        `(status=${payload.responseStatus ?? 'unknown'}, ` +
        `quotaFinished=${payload.quotaFinished ?? 'unknown'}, ` +
        `details=${payload.responseDetails ?? 'none'})`
      );
    }

    console.info(
      `[Translation] MyMemory response received for ${language}.`
    );

    return translatedText;
  } finally {
    clearTimeout(timeout);
  }
}

function processQueue(): void {
  while (
    activeRequests < MAX_CONCURRENT_REQUESTS &&
    queue.length > 0
  ) {
    const item = queue.shift();

    if (!item) return;

    activeRequests += 1;

    requestFromMyMemory(item.text, item.language)
      .then((translatedText) => {
        failedUntil.delete(item.key);

        setCachedTranslation(
          item.text,
          item.language,
          translatedText
        );

        item.resolve(translatedText);
      })
      .catch((error) => {
        failedUntil.set(
          item.key,
          Date.now() + FAILURE_COOLDOWN_MS
        );

        item.reject(error);
      })
      .finally(() => {
        activeRequests -= 1;
        pendingRequests.delete(item.key);
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

export async function translateText(
  text: string,
  language: SupportedTranslationLanguage
): Promise<{ text: string; cached: boolean }> {
  const normalizedText = text.trim();

  if (!normalizedText || language === 'en') {
    return {
      text,
      cached: true
    };
  }

  if (normalizedText.length > MAX_TEXT_LENGTH) {
    return {
      text,
      cached: false
    };
  }

  const targetLanguage =
    language as Exclude<SupportedTranslationLanguage, 'en'>;

  const cachedTranslation = getCachedTranslation(
    normalizedText,
    targetLanguage
  );

  if (cachedTranslation) {
    console.info(
      `[Translation] Cache hit for ${targetLanguage}.`
    );

    return {
      text: cachedTranslation,
      cached: true
    };
  }

  const key = cacheKey(
    normalizedText,
    targetLanguage
  );

  const existingRequest = pendingRequests.get(key);

  if (existingRequest) {
    return {
      text: await existingRequest,
      cached: false
    };
  }

  if (
    (failedUntil.get(key) || 0) > Date.now()
  ) {
    return {
      text,
      cached: false
    };
  }

  console.info(
    `[Translation] Cache miss for ${targetLanguage}.`
  );

  const request = new Promise<string>(
    (resolve, reject) => {
      queue.push({
        key,
        text: normalizedText,
        language: targetLanguage,
        resolve,
        reject
      });
    }
  );

  pendingRequests.set(key, request);
  processQueue();

  try {
    return {
      text: await request,
      cached: false
    };
  } catch (error) {
    console.error(
      `[Translation] MyMemory request failed for ${targetLanguage}; ` +
      `using English fallback:`,
      error
    );

    return {
      text,
      cached: false
    };
  }
}
