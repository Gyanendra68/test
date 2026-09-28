import fs from 'fs';
import path from 'path';

interface CacheStore {
  [key: string]: string;
}

const CACHE_FILE = path.resolve(process.cwd(), 'data', 'translations-cache-v2.json');

let translationCache: CacheStore = {};

try {
  if (fs.existsSync(CACHE_FILE)) {
    const data = fs.readFileSync(CACHE_FILE, 'utf-8');
    translationCache = JSON.parse(data);
  } else {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify({}, null, 2));
  }
} catch (err) {
  console.error('Failed to load translations cache:', err);
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(translationCache, null, 2));
  } catch (err) {
    console.error('Failed to save translations cache:', err);
  }
}

const pendingRequests = new Map<string, Promise<string>>();
const queue: { text: string; targetLang: string; resolve: (val: string) => void; reject: (err: any) => void }[] = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 2;

function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || queue.length === 0) {
    return;
  }

  const item = queue.shift();
  if (!item) return;

  activeRequests++;
  const { text, targetLang, resolve, reject } = item;
  const cacheKey = `${targetLang}:${text}`;

  fetchTranslationFromMyMemory(text, targetLang)
    .then((translated) => {
      if (translated && translated !== text) {
        translationCache[cacheKey] = translated;
        saveCache();
      }
      resolve(translated);
    })
    .catch((err) => {
      reject(err);
    })
    .finally(() => {
      activeRequests--;
      pendingRequests.delete(cacheKey);
      processQueue();
    });
}

async function fetchTranslationFromMyMemory(text: string, targetLang: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
  try {
    const response = await fetch(url);
    if (response.status === 429) {
      console.warn('MyMemory API returned HTTP 429 (Rate Limit). Falling back to source text.');
      return text;
    }
    if (!response.ok) {
      return text;
    }
    const data = await response.json();
    if (data && data.responseData && data.responseData.translatedText) {
      const translated = data.responseData.translatedText;
      if (translated.includes('QUOTA EXCEEDED') || translated.includes('MYMEMORY')) {
        return text;
      }
      return translated;
    }
    return text;
  } catch (error) {
    console.error('MyMemory fetch error:', error);
    return text;
  }
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || !targetLang || targetLang === 'en') {
    return text;
  }

  const trimmed = text.trim();
  if (!trimmed || /^\d+$/.test(trimmed) \vert{}\vert{} /^[\s\p{P}]+$/u.test(trimmed)) {
    return text;
  }

  const cacheKey = `${targetLang}:${trimmed}`;

  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const promise = new Promise<string>((resolve, reject) => {
    queue.push({ text: trimmed, targetLang, resolve, reject });
    processQueue();
  });

  pendingRequests.set(cacheKey, promise);
  return promise;
}