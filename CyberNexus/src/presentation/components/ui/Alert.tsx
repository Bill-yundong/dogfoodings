import type { Component, JSX } from 'solid-js';

type AlertType = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  children: JSX.Element;
  type?: AlertType;
  title?: string;
  closable?: boolean;
  onClose?: () => void;
}

const typeClasses: Record<AlertType, { bg: string; text: string; border: string; icon: string }> = {
  info: { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-600', icon: 'ℹ️' },
  success: { bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-600', icon: '✅' },
  warning: { bg: 'bg-yellow-900/30', text: 'text-yellow-300', border: 'border-yellow-600', icon: '⚠️' },
  danger: { bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-600', icon: '❌' },
};

export const Alert: Component<AlertProps> = (props) => {
  const type = props.type || 'info';
  const classes = typeClasses[type];

  return (
    <div class={`${classes.bg} ${classes.text} ${classes.border} border rounded-lg p-4`}>
      <div class="flex items-start">
        <span class="mr-2">{classes.icon}</span>
        <div class="flex-1">
          {props.title && <p class="font-medium mb-1">{props.title}</p>}
          <div class="text-sm">{props.children}</div>
        </div>
        {props.closable && (
          <button onClick={props.onClose} class="ml-2 hover:opacity-70">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
