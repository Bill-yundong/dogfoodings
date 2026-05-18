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

const initialState: SettingsStoreState = {
  theme: 'dark',
  language: 'zh-CN',
  dataRetentionDays: 30,
  autoRefresh: true,
  refreshInterval: 1000,
  soundEnabled: true,
  notificationEnabled: true,
};

export const [settings, setSettings] = createStore<SettingsStoreState>(initialState);

export function updateSetting<K extends keyof SettingsStoreState>(
  key: K,
  value: SettingsStoreState[K]
) {
  setSettings(key, value);
}

export function updateSettings(settings: Partial<SettingsStoreState>) {
  setSettings((prev) => ({ ...prev, ...settings }));
}
