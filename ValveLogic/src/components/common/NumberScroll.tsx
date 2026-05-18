import React, { useEffect, useRef, useState } from 'react';

interface NumberScrollProps {
  value: number;
  decimals?: number;
  unit?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export const NumberScroll: React.FC<NumberScrollProps> = ({
  value,
  decimals = 0,
  unit,
  prefix,
  duration = 300,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startValue = useRef(value);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (startTime.current === null) {
        startTime.current = timestamp;
      }

      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue.current + (value - startValue.current) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      }
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [value, duration]);

  const formattedValue = displayValue.toFixed(decimals);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {prefix}
      {formattedValue}
      {unit && <span className="ml-1 text-white/60">{unit}</span>}
    </span>
  );
};
