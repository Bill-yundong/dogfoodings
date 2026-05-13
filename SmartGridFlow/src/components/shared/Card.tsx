import { Component, JSX } from 'solid-js';

interface CardProps {
  title?: string;
  children: JSX.Element;
  class?: string;
}

export const Card: Component<CardProps> = (props) => {
  return (
    <div class={`bg-white rounded-lg shadow-md p-6 ${props.class || ''}`}>
      {props.title && <h3 class="text-lg font-semibold text-gray-800 mb-4">{props.title}</h3>}
      {props.children}
    </div>
  );
};
