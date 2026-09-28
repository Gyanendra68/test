import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type Language = 'en' | 'hi' | 'pa' | 'bn' | 'te' | 'mr' | 'ta' | 'gu' | 'kn' | 'ml';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
];

const PROTECTED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'PRE', 'CODE']);

function shouldSkipNode(node: Node): boolean {
  if (node.nodeType !== Node.TEXT_NODE) return true;
  const parent = node.parentElement;
  if (!parent) return true;
  
  if (PROTECTED_TAGS.has(parent.tagName)) return true;
  if (parent.closest('svg')) return true;
  if (parent.closest('[aria-hidden="true"]')) return true;
  if (parent.closest('[data-no-translate]')) return true;

  const text = node.nodeValue?.trim();
  if (!text || /^\d+$/.test(text) \vert{}\vert{} /^[\s\p{P}]+$/u.test(text)) return true;

  return false;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('tribal_scholar_lang') as Language) || 'en';
  });

  const langRef = useRef<Language>(lang);
  langRef.current = lang;

  const originalTextByNode = useRef<Map<Node, string>>(new Map());
  const translationCache = useRef<Map<string, string>>(new Map());
  const pendingTranslations = useRef<Map<string, Promise<string>>>(new Map());
  const translatingNodes = useRef<WeakSet<Node>>(new WeakSet());
  
  const isTranslatingRef = useRef<boolean>(false);
  const pendingRescanRef = useRef<boolean>(false);
  const translationRunId = useRef<number>(0);
  const mutationTimeoutRef = useRef<number | null>(null);

  const t = useCallback((text: string): string => {
    if (!text) return text;
    if (lang === 'en') return text;
    const trimmed = text.trim();
    if (!trimmed) return text;
    const cacheKey = `${lang}:${trimmed}`;
    return translationCache.current.get(cacheKey) || text;
  }, [lang]);

  const translateTexts = useCallback(async (texts: string[], currentRunId: number, targetLang: Language): Promise<Map<string, string>> => {
    const results = new Map<string, string>();
    const uniqueToFetch: string[] = [];

    for (const text of texts) {
      if (translationRunId.current !== currentRunId || langRef.current !== targetLang) break;
      const cacheKey = `${targetLang}:${text}`;
      if (translationCache.current.has(cacheKey)) {
        results.set(text, translationCache.current.get(cacheKey)!);
      } else {
        uniqueToFetch.push(text);
      }
    }

    if (uniqueToFetch.length === 0 || translationRunId.current !== currentRunId) return results;

    const CONCURRENCY = 3;
    let index = 0;

    const worker = async () => {
      while (index < uniqueToFetch.length) {
        if (translationRunId.current !== currentRunId || langRef.current !== targetLang) break;
        const text = uniqueToFetch[index++];
        const cacheKey = `${targetLang}:${text}`;

        if (translationCache.current.has(cacheKey)) {
          results.set(text, translationCache.current.get(cacheKey)!);
          continue;
        }

        try {
          let promise = pendingTranslations.current.get(cacheKey);
          if (!promise) {
            promise = fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, targetLang }),
            })
              .then(async (res) => {
                if (!res.ok) {
                  return text;
                }
                const data = await res.json();
                return data.translatedText || text;
              })
              .catch(() => text)
              .finally(() => {
                pendingTranslations.current.delete(cacheKey);
              });
            pendingTranslations.current.set(cacheKey, promise);
          }

          const translated = await promise;
          if (translationRunId.current === currentRunId && langRef.current === targetLang) {
            translationCache.current.set(cacheKey, translated);
            results.set(text, translated);
          }
        } catch {
          results.set(text, text);
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, uniqueToFetch.length) }, () => worker());
    await Promise.all(workers);

    return results;
  }, []);

  const scanAndTranslateDom = useCallback(async (currentRunId: number, targetLang: Language) => {
    if (targetLang === 'en' || translationRunId.current !== currentRunId) return;
    isTranslatingRef.current = true;

    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => (shouldSkipNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });

      const textNodes: Text[] = [];
      let currentNode: Node | null;
      while ((currentNode = walker.nextNode())) {
        textNodes.push(currentNode as Text);
      }

      if (translationRunId.current !== currentRunId) return;

      const nodesBySource = new Map<string, Text[]>();
      const sourcesToTranslate: string[] = [];

      for (const node of textNodes) {
        if (!originalTextByNode.current.has(node)) {
          const raw = node.nodeValue || '';
          originalTextByNode.current.set(node, raw);
        }

        const original = originalTextByNode.current.get(node) || '';
        const trimmed = original.trim();
        if (!trimmed) continue;

        if (!nodesBySource.has(trimmed)) {
          nodesBySource.set(trimmed, []);
          sourcesToTranslate.push(trimmed);
        }
        nodesBySource.get(trimmed)!.push(node);
      }

      if (sourcesToTranslate.length === 0 || translationRunId.current !== currentRunId) return;

      const translations = await translateTexts(sourcesToTranslate, currentRunId, targetLang);

      if (translationRunId.current !== currentRunId) return;

      for (const [source, translatedText] of translations.entries()) {
        const nodes = nodesBySource.get(source);
        if (!nodes) continue;

        const prefixMatch = (originalTextByNode.current.get(nodes[0]) || '').match(/^(\s*)/);
        const suffixMatch = (originalTextByNode.current.get(nodes[0]) || '').match(/(\s*)$/);
        const finalText = (prefixMatch ? prefixMatch[1] : '') + translatedText + (suffixMatch ? suffixMatch[1] : '');

        for (const node of nodes) {
          if (node.isConnected && translationRunId.current === currentRunId) {
            translatingNodes.current.add(node);
            node.nodeValue = finalText;
            setTimeout(() => {
              translatingNodes.current.delete(node);
            }, 100);
          }
        }
      }
    } finally {
      isTranslatingRef.current = false;
      if (pendingRescanRef.current && translationRunId.current === currentRunId && langRef.current === targetLang) {
        pendingRescanRef.current = false;
        setTimeout(() => {
          if (translationRunId.current === currentRunId && langRef.current === targetLang) {
            scanAndTranslateDom(currentRunId, targetLang);
          }
        }, 150);
      }
    }
  }, [translateTexts]);

  const handleLanguageChange = useCallback((newLang: Language) => {
    translationRunId.current++;
    const currentRunId = translationRunId.current;

    setLangState(newLang);
    localStorage.setItem('tribal_scholar_lang', newLang);
    langRef.current = newLang;

    if (newLang === 'en') {
      isTranslatingRef.current = false;
      pendingRescanRef.current = false;
      for (const [node, originalText] of originalTextByNode.current.entries()) {
        if (node.isConnected) {
          translatingNodes.current.add(node);
          node.nodeValue = originalText;
          setTimeout(() => translatingNodes.current.delete(node), 100);
        }
      }
      originalTextByNode.current.clear();
      return;
    }

    scanAndTranslateDom(currentRunId, newLang);
  }, [scanAndTranslateDom]);

  useEffect(() => {
    if (lang === 'en') return;

    translationRunId.current++;
    const currentRunId = translationRunId.current;
    scanAndTranslateDom(currentRunId, lang);

    const observer = new MutationObserver((mutations) => {
      let hasRelevantMutation = false;
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          if (mutation.target && translatingNodes.current.has(mutation.target)) {
            continue;
          }
          hasRelevantMutation = true;
        } else if (mutation.type === 'childList') {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              hasRelevantMutation = true;
              break;
            }
          }
        }
        if (hasRelevantMutation) break;
      }

      if (!hasRelevantMutation) return;

      if (mutationTimeoutRef.current) {
        window.clearTimeout(mutationTimeoutRef.current);
      }

      mutationTimeoutRef.current = window.setTimeout(() => {
        if (langRef.current === 'en') return;
        if (isTranslatingRef.current) {
          pendingRescanRef.current = true;
        } else {
          scanAndTranslateDom(translationRunId.current, langRef.current);
        }
      }, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (mutationTimeoutRef.current) {
        window.clearTimeout(mutationTimeoutRef.current);
      }
    };
  }, [lang, scanAndTranslateDom]);

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleLanguageChange, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};