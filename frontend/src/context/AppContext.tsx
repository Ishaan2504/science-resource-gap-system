/**
 * AppContext — app-wide state shared between LoginPage and all internal pages:
 *   • lang  — active language ('en' | 'hi')
 *   • fontIdx — active font-size step index
 * Keeps accessibility controls (A-/A/A+) and language toggle in sync across
 * the utility ribbon regardless of which page is mounted.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'en' | 'hi';
export const FONT_STEPS = [14, 16, 18, 20] as const;
export const DEFAULT_FONT_IDX = 1; // 16 px

interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  fontIdx: number;
  decreaseFont: () => void;
  resetFont: () => void;
  increaseFont: () => void;
  atMinFont: boolean;
  atMaxFont: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [fontIdx, setFontIdx] = useState(DEFAULT_FONT_IDX);

  function setLang(l: Lang) {
    setLangState(l);
    document.documentElement.lang = l === 'hi' ? 'hi' : 'en';
  }

  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_STEPS[fontIdx]}px`;
  }, [fontIdx]);

  const value: AppContextValue = {
    lang,
    setLang,
    fontIdx,
    decreaseFont: () => setFontIdx((i) => Math.max(0, i - 1)),
    resetFont: () => setFontIdx(DEFAULT_FONT_IDX),
    increaseFont: () => setFontIdx((i) => Math.min(FONT_STEPS.length - 1, i + 1)),
    atMinFont: fontIdx === 0,
    atMaxFont: fontIdx === FONT_STEPS.length - 1,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
