import type { Component, JSX } from 'solid-js';

interface CardProps {
  children: JSX.Element;
  class?: string;
  border?: boolean;
  hover?: boolean;
}

export const Card: Component<CardProps> = (props) => {
  const baseClasses = 'bg-gray-800 rounded-lg p-6';
  const borderClasses = props.border !== false ? 'border border-gray-700' : '';
  const hoverClasses = props.hover ? 'hover:border-gray-600 transition-colors cursor-pointer' : '';
  const customClasses = props.class || '';

  return (
    <div class={`${baseClasses} ${borderClasses} ${hoverClasses} ${customClasses}`}>
      {props.children}
    </div>
  );
};
