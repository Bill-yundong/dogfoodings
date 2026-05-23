import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GaugeMeterProps {
  value: number;
  max: number;
  min?: number;
  label: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  segments?: { threshold: number; color: string }[];
  showValue?: boolean;
}

export const GaugeMeter: React.FC<GaugeMeterProps> = ({
  value,
  max,
  min = 0,
  label,
  unit = '',
  size = 'md',
  segments = [
    { threshold: 0.6, color: '#1B998B' },
    { threshold: 0.85, color: '#F46036' },
    { threshold: 1, color: '#EF4444' },
  ],
  showValue = true,
}) => {
  const sizeMap = {
    sm: { width: 100, height: 50, strokeWidth: 8 },
    md: { width: 140, height: 70, strokeWidth: 10 },
    lg: { width: 200, height: 100, strokeWidth: 12 },
  };

  const { width, height, strokeWidth } = sizeMap[size];
  const radius = (width - strokeWidth) / 2;
  const centerX = width / 2;
  const centerY = height;
  const normalizedValue = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = Math.PI * normalizedValue;

  const endX = centerX + radius * Math.cos(Math.PI + angle);
  const endY = centerY + radius * Math.sin(Math.PI + angle);

  const largeArc = normalizedValue > 0.5 ? 1 : 0;

  const getColor = () => {
    for (const seg of segments) {
      if (normalizedValue <= seg.threshold) return seg.color;
    }
    return segments[segments.length - 1].color;
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`gauge-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3369B8" stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke="#323F4B"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: normalizedValue }}
          transition={{ duration: 1, ease: 'easeOut' }}
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter={`url(#glow-${label})`}
        />

        {showValue && (
          <motion.text
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            fill={color}
            className="font-mono font-bold"
            style={{ fontSize: size === 'sm' ? 14 : size === 'md' ? 18 : 24 }}
          >
            {value.toFixed(1)}
            <tspan fill="#9AA5B1" fontSize={size === 'sm' ? 8 : 10}>
              {unit}
            </tspan>
          </motion.text>
        )}
      </svg>

      <span className="data-label text-center mt-1">{label}</span>
    </div>
  );
};
