'use client';

import { useEffect, useRef } from 'react';
import { SeismicDataPoint } from '../types/seismic';

interface SeismicWaveformProps {
  data: SeismicDataPoint[];
  width?: number;
  height?: number;
  showPWave?: boolean;
  showSWave?: boolean;
  pWaveTime?: number;
  sWaveTime?: number;
}

export default function SeismicWaveform({
  data,
  width = 800,
  height = 200,
  showPWave = true,
  showSWave = true,
  pWaveTime,
  sWaveTime
}: SeismicWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const centerY = height / 2;

    const maxMagnitude = Math.max(...data.map(d => Math.abs(d.magnitude)));
    const scale = maxMagnitude > 0 ? (chartHeight / 2) / maxMagnitude : 1;

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = centerY - point.magnitude * scale;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    if (showPWave && pWaveTime) {
      const pWaveIndex = data.findIndex(d => d.timestamp >= pWaveTime);
      if (pWaveIndex !== -1) {
        const x = padding + (pWaveIndex / (data.length - 1)) * chartWidth;
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();

        ctx.fillStyle = '#ffcc00';
        ctx.font = '12px Arial';
        ctx.fillText('P波', x + 5, padding + 15);
      }
    }

    if (showSWave && sWaveTime) {
      const sWaveIndex = data.findIndex(d => d.timestamp >= sWaveTime);
      if (sWaveIndex !== -1) {
        const x = padding + (sWaveIndex / (data.length - 1)) * chartWidth;
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();

        ctx.fillStyle = '#ff4444';
        ctx.font = '12px Arial';
        ctx.fillText('S波', x + 5, padding + 15);
      }
    }
  }, [data, width, height, showPWave, showSWave, pWaveTime, sWaveTime]);

  return (
    <div className="relative bg-[#0a0a1a] rounded-lg overflow-hidden border border-gray-700">
      <canvas ref={canvasRef} width={width} height={height} className="block" />
    </div>
  );
}
