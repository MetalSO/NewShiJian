import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';

export type FontFamily = 'simsun' | 'heiti' | 'songti' | 'kaiti' | 'yahei' | 'arial';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type LineHeight = 'compact' | 'normal' | 'relaxed';

export interface ReadingPreferences {
  fontFamily: FontFamily;
  fontSize: FontSize;
  lineHeight: LineHeight;
  maxWidth: boolean;
}

interface ReadingPreferencesContextType {
  preferences: ReadingPreferences;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: FontSize) => void;
  setLineHeight: (height: LineHeight) => void;
  setMaxWidth: (enabled: boolean) => void;
  applyStyles: () => React.CSSProperties;
  fontSizeMap: Record<FontSize, number>;
  lineHeightMap: Record<LineHeight, number>;
  fontFamilyMap: Record<FontFamily, string>;
}

const defaultPreferences: ReadingPreferences = {
  fontFamily: 'simsun',
  fontSize: 'medium',
  lineHeight: 'relaxed',
  maxWidth: true,
};

const fontSizeMap: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
};

const lineHeightMap: Record<LineHeight, number> = {
  compact: 1.5,
  normal: 1.8,
  relaxed: 2.0,
};

const fontFamilyMap: Record<FontFamily, string> = {
  simsun: '"SimSun", "宋体", serif',
  heiti: '"SimHei", "黑体", sans-serif',
  songti: '"Songti SC", "宋体", serif',
  kaiti: '"KaiTi", "楷体", serif',
  yahei: '"Microsoft YaHei", "微软雅黑", sans-serif',
  arial: 'Arial, sans-serif',
};

export { fontSizeMap, lineHeightMap, fontFamilyMap };

const STORAGE_KEY = 'reading-preferences';

const ReadingPreferencesContext = createContext<ReadingPreferencesContextType | undefined>(undefined);

export const ReadingPreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<ReadingPreferences>(() => {
    if (typeof window === 'undefined') return defaultPreferences;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...defaultPreferences, ...JSON.parse(saved) };
      } catch {
        return defaultPreferences;
      }
    }
    return defaultPreferences;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const setFontFamily = (font: FontFamily) => {
    setPreferences(prev => ({ ...prev, fontFamily: font }));
  };

  const setFontSize = (size: FontSize) => {
    setPreferences(prev => ({ ...prev, fontSize: size }));
  };

  const setLineHeight = (height: LineHeight) => {
    setPreferences(prev => ({ ...prev, lineHeight: height }));
  };

  const setMaxWidth = (enabled: boolean) => {
    setPreferences(prev => ({ ...prev, maxWidth: enabled }));
  };

  const appliedStyles = useMemo(
    (): React.CSSProperties => ({
      fontFamily: fontFamilyMap[preferences.fontFamily],
      fontSize: `${fontSizeMap[preferences.fontSize]}px`,
      lineHeight: lineHeightMap[preferences.lineHeight],
    }),
    [preferences],
  );

  const applyStyles = (): React.CSSProperties => appliedStyles;

  return (
    <ReadingPreferencesContext.Provider value={{
      preferences,
      setFontFamily,
      setFontSize,
      setLineHeight,
      setMaxWidth,
      applyStyles,
      fontSizeMap,
      lineHeightMap,
      fontFamilyMap,
    }}>
      {children}
    </ReadingPreferencesContext.Provider>
  );
};

export const useReadingPreferences = (): ReadingPreferencesContextType => {
  const context = useContext(ReadingPreferencesContext);
  if (!context) {
    throw new Error('useReadingPreferences must be used within a ReadingPreferencesProvider');
  }
  return context;
};
