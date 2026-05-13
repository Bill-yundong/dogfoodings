import type { Component } from 'solid-js';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-blue-900/50 text-blue-300',
  secondary: 'bg-gray-700 text-gray-300',
  success: 'bg-green-900/50 text-green-300',
  warning: 'bg-yellow-900/50 text-yellow-300',
  danger: 'bg-red-900/50 text-red-300',
};

export const Badge: Component<BadgeProps> = (props) => {
  const variant = props.variant || 'primary';

  return (
    <span
      class={`
        px-2 py-1 text-xs font-medium rounded
        ${variantClasses[variant]}
        ${props.pulse ? 'animate-pulse' : ''}
      `}
    >
      {props.children}
    </span>
  );
};
