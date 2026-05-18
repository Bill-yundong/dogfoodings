'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface WaveformChartProps {
  data: number[];
  color?: string;
  label?: string;
  unit?: string;
  height?: number;
  showGrid?: boolean;
  highlightRanges?: Array<{ start: number; end: number; color: string }>;
}

export default function WaveformChart({
  data,
  color = '#00D4FF',
  label,
  unit,
  height = 200,
  showGrid = true,
  highlightRanges = [],
}: WaveformChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = height - 40;
    const padding = { top: 20, right: 20, bottom: 20, left: 60 };
    const chartWidth = width - padding.left - padding.right;

    ctx.fillStyle = '#051322';
    ctx.fillRect(0, 0, width, height);

    if (showGrid) {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      for (let i = 0; i <= 10; i++) {
        const x = padding.left + (chartWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      }
    }

    const minVal = Math.min(...data) * 0.95;
    const maxVal = Math.max(...data) * 1.05;
    const range = maxVal - minVal || 1;

    highlightRanges.forEach((range) => {
      const startX = padding.left + (range.start / data.length) * chartWidth;
      const endX = padding.left + (range.end / data.length) * chartWidth;
      ctx.fillStyle = range.color;
      ctx.fillRect(startX, padding.top, endX - startX, chartHeight);
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((value, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((value - minVal) / range) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');
    
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = '#60A5FA';
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      const value = maxVal - (range / 5) * i;
      ctx.fillText(value.toFixed(0), padding.left - 8, y + 4);
    }

    if (label) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(label, padding.left, height - 5);
    }

    if (unit) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(unit, width - padding.right, height - 5);
    }
  }, [data, color, label, unit, height, showGrid, highlightRanges]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-lg overflow-hidden border border-industrial-700 bg-industrial-950"
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="block"
      />
    </motion.div>
  );
}
