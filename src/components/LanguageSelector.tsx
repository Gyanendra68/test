import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supportedLanguages, Language } from '../i18n/translations';
import { Globe, Check, ChevronDown } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang = supportedLanguages.find((l) => l.code === lang) || supportedLanguages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: Language) => {
    if (code !== lang) {
      setLang(code);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} data-no-translate>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-semibold border border-slate-700 transition shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Select Language"
      >
        <Globe className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="font-bold">{activeLang.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white text-slate-900 shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Choose Language
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {supportedLanguages.map((item) => {
              const isSelected = item.code === lang;
              return (
                <button
                  key={item.code}
                  onClick={() => handleSelect(item.code)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition hover:bg-blue-50 ${
                    isSelected ? 'bg-blue-50/80 text-blue-800 font-bold' : 'text-slate-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{item.nativeName}</span>
                    <span className="text-[10px] text-slate-400">{item.name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-700" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
