import React from 'react';
import { Language, LANGUAGES } from '../lib/i18n';

interface LanguageSwitcherProps {
  value: Language;
  onChange: (language: Language) => void;
  /** 'glass' for the home hero, 'solid' for inner pages. */
  variant?: 'glass' | 'solid';
}

/** Three-way segmented control: ҚАЗ · РУС · ENG. */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ value, onChange, variant = 'solid' }) => (
  <div
    role="radiogroup"
    aria-label="Language / Язык / Тіл"
    className={`inline-flex items-center gap-0.5 p-1 rounded-2xl border ${
      variant === 'glass' ? 'bg-white/5 backdrop-blur-md border-white/10' : 'bg-slate-900 border-slate-800'
    }`}
  >
    {LANGUAGES.map(({ code, short, name }) => {
      const active = code === value;
      return (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={active}
          title={name}
          lang={code}
          onClick={() => !active && onChange(code)}
          className={`px-2.5 sm:px-3 py-2 rounded-xl text-[11px] font-black tracking-widest transition-colors ${
            active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          {short}
        </button>
      );
    })}
  </div>
);

export default LanguageSwitcher;
