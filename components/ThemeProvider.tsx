'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  // Handle initial mount and localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setTheme(stored);
    }
  }, []);

  // Update resolved theme and apply to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Disable transitions during theme change
    root.classList.add('theme-transitioning');

    let resolved: 'dark' | 'light';
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);

    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);

    // Re-enable transitions after theme change is complete
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 0);
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.add('theme-transitioning');

      setResolvedTheme(e.matches ? 'dark' : 'light');
      root.classList.toggle('dark', e.matches);

      setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 0);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, resolvedTheme]
  );

  // Prevent flash by rendering nothing until mounted
  // But still provide context so hooks don't fail
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: defaultTheme, setTheme: () => {}, resolvedTheme: 'dark' }}>
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
