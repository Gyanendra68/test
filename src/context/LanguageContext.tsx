import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Language, TranslationDictionary, englishTranslations, supportedLanguages } from '../i18n/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationDictionary;
  translateText: (text: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('tribal_lang') as Language | null;
    return saved && supportedLanguages.some((item) => item.code === saved) ? saved : 'en';
  });
  const originalTextByNode = useRef(new WeakMap<Text, string>());
  const trackedTextNodes = useRef(new Set<Text>());
  const pendingTranslations = useRef(new Map<string, Promise<string>>());
  const resolvedTranslations = useRef(new Map<string, string>());
  const failedTranslationUntil = useRef(new Map<string, number>());
  const translationRunActive = useRef(false);
  const translationRerunRequested = useRef(false);
  const translationRerunTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setLang = (newLang: Language) => {
    if (newLang === lang) return;
    setLangState(newLang);
    localStorage.setItem('tribal_lang', newLang);
  };

  const t = englishTranslations;

  const translateText = useCallback(async (text: string): Promise<string> => {
    const normalizedText = text.trim();
    if (lang === 'en' || !normalizedText) return text;

    const key = `${lang}:${normalizedText}`;
    const resolved = resolvedTranslations.current.get(key);
    if (resolved) return resolved;

    if ((failedTranslationUntil.current.get(key) || 0) > Date.now()) {
      return text;
    }

    const pending = pendingTranslations.current.get(key);
    if (pending) return pending;

    const request = fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: normalizedText, language: lang })
    })
      .then(async (response) => {
        if (!response.ok) {
          failedTranslationUntil.current.set(key, Date.now() + 30000);
          return text;
        }
        const payload = await response.json() as { text?: string };
        const translatedText = typeof payload.text === 'string' && payload.text ? payload.text : text;
        if (translatedText === normalizedText) {
          failedTranslationUntil.current.set(key, Date.now() + 30000);
        } else {
          resolvedTranslations.current.set(key, translatedText);
          failedTranslationUntil.current.delete(key);
        }
        return translatedText;
      })
      .catch(() => {
        failedTranslationUntil.current.set(key, Date.now() + 30000);
        return text;
      })
      .finally(() => {
        pendingTranslations.current.delete(key);
      });

    pendingTranslations.current.set(key, request);
    return request;
  }, [lang]);

  useEffect(() => {
    const restoreOriginalText = () => {
      trackedTextNodes.current.forEach((textNode) => {
        const source = originalTextByNode.current.get(textNode);
        if (source !== undefined && textNode.isConnected) {
          textNode.nodeValue = source;
        }
      });
      trackedTextNodes.current.clear();
    };

    if (lang === 'en') {
      restoreOriginalText();
      return;
    }

    let cancelled = false;
    let observer: MutationObserver;
    const ignoredTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'PRE', 'CODE']);
    const protectedTokens = new Set(['J', 'JAGO', 'MoTA', 'DigiLocker', 'APAAR', 'UIDAI', 'PFMS', 'ST', 'PVTG']);
    const translateVisibleText = async () => {
      if (translationRunActive.current) {
        translationRerunRequested.current = true;
        return;
      }

      translationRunActive.current = true;
      observer.disconnect();

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let currentNode: Node | null;

      while ((currentNode = walker.nextNode())) {
        const textNode = currentNode as Text;
        const parent = textNode.parentElement;
        const value = textNode.nodeValue || '';
        const trimmed = value.trim();
        if (!parent || !trimmed || ignoredTags.has(parent.tagName) || parent.closest('svg, [aria-hidden="true"], [data-no-translate]')) continue;
        if (protectedTokens.has(trimmed) || (/^[A-Z0-9][A-Z0-9 .&/+-]{1,24}$/.test(trimmed) && !/\s/.test(trimmed))) continue;
        if (/^(https?:\/\/|mailto:|tel:|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i.test(trimmed)) continue;
        if (/^[\d\s.,:/#%+()₹$€£-]+$/.test(trimmed)) continue;

        if (!originalTextByNode.current.has(textNode)) {
          originalTextByNode.current.set(textNode, value);
        }
        trackedTextNodes.current.add(textNode);
        textNodes.push(textNode);
      }

      try {
        await Promise.all(textNodes.map(async (textNode) => {
          const source = originalTextByNode.current.get(textNode) || textNode.nodeValue || '';
          const translated = await translateText(source.trim());
          if (!cancelled && translated !== source.trim() && textNode.nodeValue?.trim() !== translated) {
            textNode.nodeValue = source.replace(source.trim(), translated);
          }
        }));
      } finally {
        translationRunActive.current = false;
        if (!cancelled) {
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
          if (translationRerunRequested.current) {
            translationRerunRequested.current = false;
            translationRerunTimer.current = setTimeout(() => void translateVisibleText(), 0);
          }
        }
      }
    };

    observer = new MutationObserver(() => void translateVisibleText());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    void translateVisibleText();

    return () => {
      cancelled = true;
      observer.disconnect();
      if (translationRerunTimer.current) {
        clearTimeout(translationRerunTimer.current);
        translationRerunTimer.current = null;
      }
      translationRerunRequested.current = false;
      restoreOriginalText();
    };
  }, [lang, translateText]);

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
