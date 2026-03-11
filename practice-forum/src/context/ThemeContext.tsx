import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ThemeColor = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'cyan';

interface ThemeContextType {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  color: ThemeColor;
  setMode: (mode: ThemeMode) => void;
  setColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemMode = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const colorMap: Record<ThemeColor, string> = {
  blue: '#1890ff',
  green: '#52c41a',
  purple: '#722ed1',
  red: '#f5222d',
  orange: '#fa8c16',
  cyan: '#13c2c2',
};

const hoverColorMap: Record<ThemeColor, string> = {
  blue: '#40a9ff',
  green: '#73d13d',
  purple: '#9254de',
  red: '#ff4d4f',
  orange: '#ffa940',
  cyan: '#36cfc9',
};

const darkColorMap: Record<ThemeColor, string> = {
  blue: '#096dd9',
  green: '#389e0d',
  purple: '#531dab',
  red: '#cf1322',
  orange: '#d46b08',
  cyan: '#08979c',
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('theme_mode') as ThemeMode) || 'system';
  });

  const [color, setColor] = useState<ThemeColor>(() => {
    if (typeof window === 'undefined') return 'blue';
    return (localStorage.getItem('theme_color') as ThemeColor) || 'blue';
  });

  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme_mode') as ThemeMode;
    if (saved === 'system') return getSystemMode();
    return saved || 'light';
  });

  useEffect(() => {
    const updateTheme = () => {
      console.log('updateTheme called with mode:', mode, 'color:', color);
      let resolved: 'light' | 'dark';
      if (mode === 'system') {
        resolved = getSystemMode();
      } else {
        resolved = mode;
      }
      setResolvedMode(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.setAttribute('data-color', color);
      
      const colorValue = colorMap[color];
      const hoverColorValue = hoverColorMap[color];
      const darkColorValue = darkColorMap[color];
      console.log('Setting CSS variables: --primary-color:', colorValue, '--primary-hover:', hoverColorValue, '--primary-dark:', darkColorValue);
      document.documentElement.style.setProperty('--primary-color', colorValue);
      document.documentElement.style.setProperty('--primary-hover', hoverColorValue);
      document.documentElement.style.setProperty('--primary-dark', darkColorValue);
    };

    updateTheme();

    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [mode, color]);

  useEffect(() => {
    localStorage.setItem('theme_mode', mode);
    localStorage.setItem('theme_color', color);
  }, [mode, color]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedMode, color, setMode, setColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { colorMap };
export type { ThemeMode, ThemeColor };
