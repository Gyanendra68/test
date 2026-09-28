import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';

import {
  Language,
  TranslationDictionary,
  englishTranslations,
  supportedLanguages
} from '../i18n/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationDictionary;
  translateText: (text: string) => Promise<string>;
}

type FrontendTranslationQueueItem = {
  key: string;
  text: string;
  language: Exclude<Language, 'en'>;
  resolve: (value: string) => void;
};

const MAX_FRONTEND_CONCURRENT_TRANSLATIONS = 3;
const FRONTEND_FAILURE_COOLDOWN_MS = 30000;

const LanguageContext = createContext<
  LanguageContextType | undefined
>(undefined);

export const LanguageProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem(
      'tribal_lang'
    ) as Language | null;

    return saved &&
      supportedLanguages.some(
        (item) => item.code === saved
      )
      ? saved
      : 'en';
  });

  const currentLanguage = useRef<Language>(
    lang
  );

  currentLanguage.current = lang;

  const originalTextByNode = useRef(
    new WeakMap<Text, string>()
  );

  const trackedTextNodes = useRef(
    new Set<Text>()
  );

  const pendingTranslations = useRef(
    new Map<string, Promise<string>>()
  );

  const resolvedTranslations = useRef(
    new Map<string, string>()
  );

  const failedTranslationUntil = useRef(
    new Map<string, number>()
  );

  const frontendQueue = useRef<
    FrontendTranslationQueueItem[]
  >([]);

  const activeFrontendTranslations =
    useRef(0);

  const processFrontendQueueRef = useRef<
    () => void
  >(() => undefined);

  const translationRunId = useRef(0);
  const translationRunActive = useRef(false);
  const translationRerunRequested = useRef(false);

  const translationRerunTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const setLang = (newLang: Language) => {
    if (
      newLang === currentLanguage.current
    ) {
      return;
    }

    currentLanguage.current = newLang;
    setLangState(newLang);
    localStorage.setItem(
      'tribal_lang',
      newLang
    );
  };

  const t = englishTranslations;

  const processFrontendQueue = useCallback(
    () => {
      while (
        activeFrontendTranslations.current <
          MAX_FRONTEND_CONCURRENT_TRANSLATIONS &&
        frontendQueue.current.length > 0
      ) {
        const item =
          frontendQueue.current.shift();

        if (!item) return;

        if (
          item.language !==
          currentLanguage.current
        ) {
          pendingTranslations.current.delete(
            item.key
          );

          item.resolve(item.text);
          continue;
        }

        activeFrontendTranslations.current += 1;

        fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: item.text,
            language: item.language
          })
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(
                `Translation endpoint returned HTTP ${response.status}`
              );
            }

            const payload =
              await response.json() as {
                text?: string;
              };

            const translatedText =
              typeof payload.text === 'string' &&
              payload.text
                ? payload.text
                : item.text;

            if (
              translatedText === item.text
            ) {
              failedTranslationUntil.current.set(
                item.key,
                Date.now() +
                  FRONTEND_FAILURE_COOLDOWN_MS
              );
            } else {
              resolvedTranslations.current.set(
                item.key,
                translatedText
              );

              failedTranslationUntil.current.delete(
                item.key
              );
            }

            item.resolve(translatedText);
          })
          .catch(() => {
            failedTranslationUntil.current.set(
              item.key,
              Date.now() +
                FRONTEND_FAILURE_COOLDOWN_MS
            );

            item.resolve(item.text);
          })
          .finally(() => {
            activeFrontendTranslations.current -= 1;
            pendingTranslations.current.delete(
              item.key
            );
            processFrontendQueueRef.current();
          });
      }
    },
    []
  );

  processFrontendQueueRef.current =
    processFrontendQueue;

  const translateText = useCallback(
    async (text: string): Promise<string> => {
      const normalizedText = text.trim();
      const targetLanguage =
        currentLanguage.current;

      if (
        targetLanguage === 'en' ||
        !normalizedText
      ) {
        return text;
      }

      const key =
        `${targetLanguage}:${normalizedText}`;

      const resolved =
        resolvedTranslations.current.get(
          key
        );

      if (resolved) {
        return resolved;
      }

      if (
        (
          failedTranslationUntil.current.get(
            key
          ) || 0
        ) > Date.now()
      ) {
        return text;
      }

      const pending =
        pendingTranslations.current.get(
          key
        );

      if (pending) {
        return pending;
      }

      const language =
        targetLanguage as Exclude<
          Language,
          'en'
        >;

      let resolveRequest: (
        value: string
      ) => void = () => undefined;

      const request = new Promise<string>(
        (resolve) => {
          resolveRequest = resolve;
        }
      );

      pendingTranslations.current.set(
        key,
        request
      );

      frontendQueue.current.push({
        key,
        text: normalizedText,
        language,
        resolve: resolveRequest
      });

      processFrontendQueueRef.current();

      return request;
    },
    []
  );

  useEffect(() => {
    const runId =
      ++translationRunId.current;

    let cancelled = false;
    let observer: MutationObserver;

    const restoreOriginalText = () => {
      trackedTextNodes.current.forEach(
        (textNode) => {
          const source =
            originalTextByNode.current.get(
              textNode
            );

          if (
            source !== undefined &&
            textNode.isConnected
          ) {
            textNode.nodeValue = source;
          }
        }
      );

      trackedTextNodes.current.clear();
    };

    if (lang === 'en') {
      restoreOriginalText();
      return;
    }

    const ignoredTags = new Set([
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
      'TEXTAREA',
      'INPUT',
      'SELECT',
      'OPTION',
      'PRE',
      'CODE'
    ]);

    const protectedTokens = new Set([
      'J',
      'JAGO',
      'MoTA',
      'DigiLocker',
      'APAAR',
      'UIDAI',
      'PFMS',
      'ST',
      'PVTG'
    ]);

    const isCurrentRun = () => (
      !cancelled &&
      runId === translationRunId.current &&
      lang === currentLanguage.current
    );

    const translateVisibleText = async () => {
      if (!isCurrentRun()) {
        return;
      }

      if (translationRunActive.current) {
        translationRerunRequested.current = true;
        return;
      }

      translationRunActive.current = true;
      observer.disconnect();

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );

      const nodesBySource = new Map<
        string,
        Text[]
      >();

      let currentNode: Node | null;

      while (
        (currentNode = walker.nextNode())
      ) {
        const textNode =
          currentNode as Text;

        const parent =
          textNode.parentElement;

        const value =
          textNode.nodeValue || '';

        const trimmed = value.trim();

        if (
          !parent ||
          !trimmed ||
          ignoredTags.has(parent.tagName) ||
          parent.closest(
            'svg, [aria-hidden="true"], [data-no-translate]'
          )
        ) {
          continue;
        }

        if (
          protectedTokens.has(trimmed) ||
          (
            /^[A-Z0-9][A-Z0-9 .&/+-]{1,24}$/.test(
              trimmed
            ) &&
            !/\s/.test(trimmed)
          )
        ) {
          continue;
        }

        if (
          /^(https?:\/\/|mailto:|tel:|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,} )/i
            .test(trimmed)
        ) {
          continue;
        }

        if (
          /^[\d\s.,:/#%+()₹$€£-]+$/.test(
            trimmed
          )
        ) {
          continue;
        }

        if (
          !originalTextByNode.current.has(
            textNode
          )
        ) {
          originalTextByNode.current.set(
            textNode,
            value
          );
        }

        trackedTextNodes.current.add(
          textNode
        );

        const source =
          originalTextByNode.current.get(
            textNode
          ) || value;

        const sourceText = source.trim();

        const nodes =
          nodesBySource.get(sourceText) || [];

        nodes.push(textNode);
        nodesBySource.set(
          sourceText,
          nodes
        );
      }

      const uniqueSources =
        Array.from(
          nodesBySource.entries()
        );

      let nextSourceIndex = 0;

      const worker = async () => {
        while (
          nextSourceIndex <
            uniqueSources.length &&
          isCurrentRun()
        ) {
          const currentIndex =
            nextSourceIndex;

          nextSourceIndex += 1;

          const [
            sourceText,
            textNodes
          ] = uniqueSources[
            currentIndex
          ];

          const translated =
            await translateText(sourceText);

          if (!isCurrentRun()) {
            return;
          }

          if (
            translated !== sourceText
          ) {
            textNodes.forEach(
              (textNode) => {
                const source =
                  originalTextByNode.current.get(
                    textNode
                  ) ||
                  textNode.nodeValue ||
                  '';

                if (
                  textNode.isConnected &&
                  textNode.nodeValue?.trim() !==
                    translated
                ) {
                  textNode.nodeValue =
                    source.replace(
                      source.trim(),
                      translated
                    );
                }
              }
            );
          }
        }
      };

      try {
        await Promise.all(
          Array.from(
            {
              length: Math.min(
                MAX_FRONTEND_CONCURRENT_TRANSLATIONS,
                uniqueSources.length
              )
            },
            () => worker()
          )
        );
      } finally {
        translationRunActive.current = false;

        if (isCurrentRun()) {
          observer.observe(
            document.body,
            {
              childList: true,
              subtree: true,
              characterData: true
            }
          );

          if (
            translationRerunRequested.current
          ) {
            translationRerunRequested.current = false;

            translationRerunTimer.current =
              setTimeout(
                () => void translateVisibleText(),
                0
              );
          }
        }
      }
    };

    observer = new MutationObserver(
      () => void translateVisibleText()
    );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
    );

    void translateVisibleText();

    return () => {
      cancelled = true;
      observer.disconnect();
      translationRunId.current += 1;

      if (translationRerunTimer.current) {
        clearTimeout(
          translationRerunTimer.current
        );

        translationRerunTimer.current = null;
      }

      translationRerunRequested.current = false;
      restoreOriginalText();
    };
  }, [lang, translateText]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t,
        translateText
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(
    LanguageContext
  );

  if (!context) {
    throw new Error(
      'useLanguage must be used within the LanguageProvider'
    );
  }

  return context;
}
