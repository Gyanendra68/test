import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Language, TranslationDictionary, englishTranslations, supportedLanguages } from '../i18n/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationDictionary;
  translateText: (text: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Translation client (module level, shared by every component)
//
// One request per unique language + text:
//   1. result cache (successful translations only, also kept in localStorage)
//   2. pending map  (same text+language already in flight -> reuse its promise)
//   3. cooldowns    (failed / rate limited -> no network call at all)
//   4. small concurrency limit for the calls that really have to be made
// ---------------------------------------------------------------------------

const TRANSLATION_STORAGE_KEY = 'tribal_translation_cache_v1';
const MAX_TEXT_LENGTH = 1000;
const MAX_IN_FLIGHT = 4;
const MAX_STORED_TRANSLATIONS = 3000;
const FAILURE_COOLDOWN_MS = 60000;
const RATE_LIMIT_COOLDOWN_MS = 60000;
const STORAGE_SAVE_DELAY_MS = 1000;

const resultCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();
const failedUntil = new Map<string, number>();
let pausedUntil = 0;
let inFlight = 0;
const slotWaiters: Array<() => void> = [];
let storageTimer: ReturnType<typeof setTimeout> | null = null;

const requestKey = (language: Language, text: string) => `${language}\u0000${text}`;

try {
  const stored = localStorage.getItem(TRANSLATION_STORAGE_KEY);
  if (stored) {
    const entries = JSON.parse(stored) as Array<[string, string]>;
    if (Array.isArray(entries)) {
      entries.forEach((entry) => {
        if (Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'string' && entry[1]) {
          resultCache.set(entry[0], entry[1]);
        }
      });
    }
  }
} catch {
  // Unreadable stored cache: start empty.
}

function scheduleStorageSave() {
  if (storageTimer) return;
  storageTimer = setTimeout(() => {
    storageTimer = null;
    try {
      const entries = Array.from(resultCache.entries()).slice(-MAX_STORED_TRANSLATIONS);
      localStorage.setItem(TRANSLATION_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage full or unavailable: the in-memory cache still works.
    }
  }, STORAGE_SAVE_DELAY_MS);
}

function getCachedResult(language: Language, text: string): string | undefined {
  return resultCache.get(requestKey(language, text));
}

function acquireSlot(): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => slotWaiters.push(resolve));
}

function releaseSlot() {
  const next = slotWaiters.shift();
  if (next) {
    next(); // the slot is handed over, inFlight stays the same
  } else {
    inFlight -= 1;
  }
}

// Returns the translation, or null when none is available right now.
// Never rejects, never retries, and never calls the server for a text+language
// that is cached, pending, cooling down, or while the server reported a 429.
function requestTranslation(text: string, language: Language): Promise<string | null> {
  const trimmed = text.trim();
  if (language === 'en' || !trimmed || trimmed.length > MAX_TEXT_LENGTH) return Promise.resolve(null);

  const key = requestKey(language, trimmed);

  const cached = resultCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  if (pausedUntil > Date.now() || (failedUntil.get(key) || 0) > Date.now()) return Promise.resolve(null);

  const request = acquireSlot()
    .then(async (): Promise<string | null> => {
      try {
        // Re-check: a 429 may have arrived while this request was waiting.
        if (pausedUntil > Date.now()) return null;

        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, language })
        });

        if (!response.ok) {
          failedUntil.set(key, Date.now() + FAILURE_COOLDOWN_MS);
          if (response.status === 429 || response.status === 503) {
            pausedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
          }
          return null;
        }

        const payload = await response.json() as {
          text?: string;
          cached?: boolean;
          translated?: boolean;
          rateLimited?: boolean;
          retryAfterMs?: number;
        };

        if (payload.rateLimited) {
          pausedUntil = Date.now() + (payload.retryAfterMs && payload.retryAfterMs > 0 ? payload.retryAfterMs : RATE_LIMIT_COOLDOWN_MS);
          failedUntil.set(key, pausedUntil);
          return null;
        }

        const translatedText = typeof payload.text === 'string' ? payload.text.trim() : '';
        const isRealTranslation = payload.translated ?? (payload.cached === true || translatedText !== trimmed);

        if (!translatedText || !isRealTranslation) {
          failedUntil.set(key, Date.now() + FAILURE_COOLDOWN_MS);
          return null;
        }

        resultCache.set(key, translatedText);
        scheduleStorageSave();
        return translatedText;
      } catch {
        failedUntil.set(key, Date.now() + FAILURE_COOLDOWN_MS);
        return null;
      } finally {
        releaseSlot();
      }
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);
  return request;
}

function retryDelayMs(): number {
  const paused = pausedUntil - Date.now();
  return (paused > 0 ? paused : FAILURE_COOLDOWN_MS) + 500;
}

// ---------------------------------------------------------------------------
// DOM translation bookkeeping
// ---------------------------------------------------------------------------

type NodeStatus = 'idle' | 'pending' | 'done' | 'failed';

interface TextNodeState {
  source: string;     // the English text the app rendered
  applied: string;    // what this node currently holds because of us
  lang: Language | null;
  status: NodeStatus;
  generation: number; // which translation pass asked for this node
  retryAt: number;
}

const ignoredTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'PRE', 'CODE']);
const protectedTokens = new Set(['J', 'JAGO', 'MoTA', 'DigiLocker', 'APAAR', 'UIDAI', 'PFMS', 'ST', 'PVTG']);

function isTranslatableText(trimmed: string): boolean {
  if (!trimmed) return false;
  if (!/\p{L}/u.test(trimmed)) return false; // punctuation / symbols only, nothing to translate
  if (protectedTokens.has(trimmed) || (/^[A-Z0-9][A-Z0-9 .&/+-]{1,24}$/.test(trimmed) && !/\s/.test(trimmed))) return false;
  if (/^(https?:\/\/|mailto:|tel:|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i.test(trimmed)) return false;
  if (/^[\d\s.,:/#%+()₹$€£-]+$/.test(trimmed)) return false;
  return true;
}

// Puts the translated text between the original leading/trailing whitespace.
function withOriginalWhitespace(source: string, translated: string): string {
  const start = source.length - source.trimStart().length;
  const end = source.trimEnd().length;
  return source.slice(0, start) + translated + source.slice(end);
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('tribal_lang') as Language | null;
    return saved && supportedLanguages.some((item) => item.code === saved) ? saved : 'en';
  });
  const nodeStates = useRef(new WeakMap<Text, TextNodeState>());
  const trackedTextNodes = useRef(new Set<Text>());
  const generationCounter = useRef(0);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('tribal_lang', newLang);
  };

  const t = englishTranslations;

  const translateText = useCallback(async (text: string): Promise<string> => {
    const trimmed = text.trim();
    if (lang === 'en' || !trimmed) return text;

    const translated = await requestTranslation(trimmed, lang);
    return translated ? withOriginalWhitespace(text, translated) : text;
  }, [lang]);

  useEffect(() => {
    const states = nodeStates.current;
    const tracked = trackedTextNodes.current;

    const restoreOriginalText = () => {
      tracked.forEach((textNode) => {
        const state = states.get(textNode);
        if (state && textNode.isConnected && textNode.nodeValue === state.applied) {
          textNode.nodeValue = state.source;
        }
        if (state) {
          state.applied = state.source;
          state.lang = null;
          state.status = 'idle';
        }
      });
      tracked.clear();
    };

    if (lang === 'en') {
      restoreOriginalText();
      return;
    }

    const generation = ++generationCounter.current;
    let cancelled = false;
    let scanTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let automaticRetries = 0;

    // Nodes translated for another language are kept as they are and simply
    // re-translated from their English source to the newly selected language.
    tracked.forEach((textNode) => {
      const state = states.get(textNode);
      if (state) {
        state.status = 'idle';
        state.lang = null;
      }
    });

    const observer = new MutationObserver(() => scheduleScan());
    const observe = () => observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    function scheduleScan() {
      if (cancelled || scanTimer) return;
      scanTimer = setTimeout(() => {
        scanTimer = null;
        scan();
      }, 50);
    }

    function scheduleRetry() {
      if (cancelled || retryTimer || automaticRetries >= 2) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        automaticRetries += 1;
        scan();
      }, retryDelayMs());
    }

    // Writes our own translation into a text node without the observer
    // treating that write as a new page change (this is what prevents loops).
    function applyTranslation(textNode: Text, state: TextNodeState, translated: string) {
      const current = textNode.nodeValue ?? '';
      if (current !== state.applied && current !== state.source) return; // the app changed it meanwhile

      const next = translated === state.source.trim() ? state.source : withOriginalWhitespace(state.source, translated);

      if (current !== next) {
        if (observer.takeRecords().length > 0) scheduleScan(); // genuine changes seen before our write
        textNode.nodeValue = next;
        observer.takeRecords(); // discard the mutation record caused by our own write
      }

      state.applied = next;
      state.status = 'done';
      state.lang = lang;
    }

    function scan() {
      if (cancelled) return;

      const now = Date.now();
      const groups = new Map<string, Array<{ textNode: Text; state: TextNodeState }>>();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let currentNode: Node | null;

      tracked.forEach((textNode) => {
        if (!textNode.isConnected) tracked.delete(textNode);
      });

      while ((currentNode = walker.nextNode())) {
        const textNode = currentNode as Text;
        const parent = textNode.parentElement;
        const value = textNode.nodeValue || '';
        if (!parent || !value.trim() || ignoredTags.has(parent.tagName) || parent.closest('svg, [aria-hidden="true"], [data-no-translate]')) continue;

        let state = states.get(textNode);

        // Text the app rendered or re-rendered itself (new or changed English).
        if (!state || (value !== state.source && value !== state.applied)) {
          state = { source: value, applied: value, lang: null, status: 'idle', generation: 0, retryAt: 0 };
          states.set(textNode, state);
        }

        // Already handled for this language: no request, no work.
        if (state.status === 'done' && state.lang === lang && value === state.applied) continue;
        if (state.status === 'pending' && state.generation === generation) continue;
        if (state.status === 'failed' && state.retryAt > now) continue;

        const trimmed = state.source.trim();
        if (!isTranslatableText(trimmed) || trimmed.length > MAX_TEXT_LENGTH) continue;

        state.status = 'pending';
        state.generation = generation;
        state.lang = lang;
        tracked.add(textNode);

        const group = groups.get(trimmed);
        if (group) {
          group.push({ textNode, state });
        } else {
          groups.set(trimmed, [{ textNode, state }]);
        }
      }

      groups.forEach((entries, text) => {
        const cached = getCachedResult(lang, text);

        if (cached !== undefined) {
          entries.forEach(({ textNode, state }) => applyTranslation(textNode, state, cached));
          return;
        }

        // Unique text+language: exactly one requestTranslation() call for all nodes using it.
        void requestTranslation(text, lang).then((translated) => {
          if (cancelled) return;
          let anyFailed = false;

          entries.forEach(({ textNode, state }) => {
            if (state.status !== 'pending' || state.generation !== generation) return;

            if (translated === null) {
              state.status = 'failed';
              state.retryAt = Date.now() + retryDelayMs();
              anyFailed = true;
            } else if (textNode.isConnected) {
              applyTranslation(textNode, state, translated);
            } else {
              state.status = 'idle';
            }
          });

          if (anyFailed) scheduleRetry();
        });
      });
    }

    observe();
    scan(); // translation starts right away when the language changes

    return () => {
      cancelled = true;
      observer.disconnect();
      if (scanTimer) clearTimeout(scanTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translateText }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}