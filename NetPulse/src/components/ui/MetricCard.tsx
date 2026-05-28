import { Component, createSignal, onCleanup, onMount } from 'solid-js';
import { TrendingUp, TrendingDown, Minus } from 'lucide-solid';
import type { QualityLevel } from '@/types';
import { getQualityColor } from '@/utils/quality';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  quality?: QualityLevel;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  description?: string;
  icon?: Component;
  alert?: boolean;
}

export const MetricCard: Component<MetricCardProps> = (props) => {
  const [displayValue, setDisplayValue] = createSignal<string | number>(props.value);
  const [isAnimating, setIsAnimating] = createSignal(false);
  let animationFrame: number;

  onMount(() => {
    animateValue(props.value);
  });

  const animateValue = (newValue: string | number) => {
    if (typeof newValue !== 'number' || typeof displayValue() !== 'number') {
      setDisplayValue(newValue);
      return;
    }

    setIsAnimating(true);
    const start = displayValue() as number;
    const end = newValue;
    const duration = 500;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplayValue(Math.round(current * 100) / 100);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationFrame = requestAnimationFrame(animate);
  };

  onCleanup(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  const trendIcon = () => {
    switch (props.trend) {
      case 'up':
        return <TrendingUp class="w-4 h-4 text-alert-red" />;
      case 'down':
        return <TrendingDown class="w-4 h-4 text-alert-green" />;
      default:
        return <Minus class="w-4 h-4 text-metal-500" />;
    }
  };

  return (
    <div
      class={`glass-card p-5 transition-all duration-300 ${
        props.alert ? 'animate-pulse-glow text-alert-red' : ''
      }`}
    >
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          {props.icon && <div class="text-neon-cyan"><props.icon /></div>}
          <span class="text-sm text-metal-300 font-medium">{props.title}</span>
        </div>
        {props.trend && (
          <div class="flex items-center gap-1 text-xs text-metal-400">
            {trendIcon()}
            {props.trendValue && <span>{props.trendValue}</span>}
          </div>
        )}
      </div>
      <div class="flex items-baseline gap-2">
        <span
          class={`metric-value text-3xl ${
            props.quality ? getQualityColor(props.quality) : 'text-neon-cyan'
          } ${isAnimating() ? 'animate-number-roll' : ''}`}
        >
          {typeof displayValue() === 'number'
            ? (displayValue() as number).toFixed(1)
            : displayValue()}
        </span>
        {props.unit && <span class="text-lg text-metal-400">{props.unit}</span>}
      </div>
      {props.description && (
        <p class="mt-2 text-xs text-metal-500">{props.description}</p>
      )}
    </div>
  );
};
