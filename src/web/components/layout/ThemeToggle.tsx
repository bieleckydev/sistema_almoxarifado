'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAppStore } from '@/core/store/useAppStore';

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { setThemeMode } = useAppStore();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    const stored = localStorage.getItem('almoxarifado_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = stored ? stored === 'dark' : prefersDark;

    setIsDarkMode(initialDark);
    setThemeMode(initialDark ? 'dark' : 'light');

    if (initialDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('almoxarifado_theme')) {
        setIsDarkMode(e.matches);
        setThemeMode(e.matches ? 'dark' : 'light');
        if (e.matches) {
          root.classList.add('dark');
          root.setAttribute('data-theme', 'dark');
        } else {
          root.classList.remove('dark');
          root.setAttribute('data-theme', 'light');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [setThemeMode]);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    const nextTheme = nextDark ? 'dark' : 'light';
    setThemeMode(nextTheme);

    try {
      localStorage.setItem('almoxarifado_theme', nextTheme);
    } catch (_) {}

    const root = document.documentElement;
    if (nextDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted && isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={mounted && isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white dark:bg-[#2b2b2e] border border-slate-300 dark:border-[#3e3e42] hover:border-slate-400 dark:hover:border-slate-500 transition-colors cursor-pointer ${className}`}
    >
      {mounted && isDarkMode ? (
        <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      )}
    </button>
  );
}
