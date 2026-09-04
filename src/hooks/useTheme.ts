import { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_SETTINGS, ThemeMode } from '../types/settings';
import { indexedDbService } from '../services/storage/indexedDbService';
import { soundEffects } from '../services/sound/soundEffects';

export function useTheme() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Load persisted settings
    indexedDbService.getSettings().then((saved) => {
      if (saved) {
        setSettings((prev) => ({ ...prev, ...saved }));
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Apply dark / light theme class to document
    const root = document.documentElement;
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    soundEffects.setMuted(!settings.soundEnabled);
  }, [settings.theme, settings.soundEnabled, isLoaded]);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await indexedDbService.saveSettings(updated);
  };

  const setTheme = (theme: ThemeMode) => {
    updateSettings({ theme });
  };

  return {
    theme: settings.theme,
    settings,
    updateSettings,
    setTheme,
    isLoaded,
  };
}
