import { settings } from '@/stores/settingsStore';

export function getChartTheme(): 'dark' | undefined {
  return settings.theme === 'dark' ? 'dark' : undefined;
}

export function getChartGridColors() {
  const isDark = settings.theme === 'dark';
  return {
    backgroundColor: 'transparent',
    textColor: isDark ? '#9ca3af' : '#6b7280',
    lineColor: isDark ? '#374151' : '#e5e7eb',
    splitLineColor: isDark ? '#1f2937' : '#f3f4f6',
  };
}
