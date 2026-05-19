import { createStore } from 'solid-js/store';

interface SettingsStoreState {
  theme: 'dark' | 'light';
  language: 'zh-CN' | 'en-US';
  dataRetentionDays: number;
  autoRefresh: boolean;
  refreshInterval: number;
  soundEnabled: boolean;
  notificationEnabled: boolean;
}

const STORAGE_KEY = 'beltnexus-settings';

function loadSettings(): SettingsStoreState {
  const defaults: SettingsStoreState = {
    theme: 'dark',
    language: 'zh-CN',
    dataRetentionDays: 30,
    autoRefresh: true,
    refreshInterval: 1000,
    soundEnabled: true,
    notificationEnabled: true,
  };
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  
  return defaults;
}

function saveSettings(settings: SettingsStoreState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export const [settings, setSettings] = createStore<SettingsStoreState>(loadSettings());

export function updateSetting<K extends keyof SettingsStoreState>(
  key: K,
  value: SettingsStoreState[K]
) {
  setSettings(key, value);
  saveSettings(settings);
  
  if (key === 'theme') {
    applyTheme(value as 'dark' | 'light');
  }
  if (key === 'language') {
    applyLanguage(value as 'zh-CN' | 'en-US');
  }
}

export function updateSettings(newSettings: Partial<SettingsStoreState>) {
  setSettings((prev) => {
    const updated = { ...prev, ...newSettings };
    saveSettings(updated);
    
    if (newSettings.theme) {
      applyTheme(newSettings.theme);
    }
    if (newSettings.language) {
      applyLanguage(newSettings.language);
    }
    
    return updated;
  });
}

export function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.remove('theme-dark', 'theme-light');
  if (theme === 'light') {
    root.classList.add('theme-light');
  }
}

export function applyLanguage(language: 'zh-CN' | 'en-US') {
  document.documentElement.lang = language;
}

export function initSettings() {
  applyTheme(settings.theme);
  applyLanguage(settings.language);
}
