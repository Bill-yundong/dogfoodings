import { Component } from 'solid-js';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-solid';
import type { Alert } from '@/types';

interface AlertBannerProps {
  alert: Alert;
  onDismiss: (id: string) => void;
}

const severityConfig: Record<Alert['severity'], { bg: string; border: string; icon: Component; text: string }> = {
  info: {
    bg: 'bg-neon-cyan/10',
    border: 'border-neon-cyan/30',
    icon: Info,
    text: 'text-neon-cyan',
  },
  warning: {
    bg: 'bg-alert-orange/10',
    border: 'border-alert-orange/30',
    icon: AlertTriangle,
    text: 'text-alert-orange',
  },
  critical: {
    bg: 'bg-alert-red/10',
    border: 'border-alert-red/30',
    icon: AlertCircle,
    text: 'text-alert-red',
  },
};

export const AlertBanner: Component<AlertBannerProps> = (props) => {
  const config = () => severityConfig[props.alert.severity];

  if (props.alert.dismissed) return null;

  return (
    <div
      class={`flex items-start gap-3 p-4 rounded-xl border ${config().bg} ${config().border} animate-fade-in`}
    >
      <div class={config().text}>
        <div class="w-5 h-5">
          {(() => {
            const Icon = config().icon;
            return <Icon />;
          })()}
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <h4 class={`font-semibold ${config().text}`}>{props.alert.title}</h4>
        <p class="mt-1 text-sm text-metal-300">{props.alert.message}</p>
        <p class="mt-1 text-xs text-metal-500">
          {new Date(props.alert.timestamp).toLocaleTimeString()}
        </p>
      </div>
      <button
        onClick={() => props.onDismiss(props.alert.id)}
        class="text-metal-500 hover:text-metal-200 transition-colors p-1"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  );
};
