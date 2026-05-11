'use client';

import { useEffect, useRef } from 'react';

interface StressFieldProps {
  width?: number;
  height?: number;
  intensity?: number;
  stations?: { x: number; y: number; intensity: number }[];
}

export default function StressField({
  width = 600,
  height = 400,
  intensity = 0.5,
  stations = []
}: StressFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      timeRef.current += 0.02;
      const time = timeRef.current;

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, width, height);

      const gridSize = 30;
      for (let x = 0; x <= width; x += gridSize) {
        for (let y = 0; y <= height; y += gridSize) {
          let stress = 0;
          stations.forEach(station => {
            const dx = x - station.x * width;
            const dy = y - station.y * height;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const wave = Math.sin(dist / 50 - time * 2) * station.intensity * intensity;
            stress += wave * Math.exp(-dist / 200);
          });

          const hue = 60 + stress * 60;
          const saturation = 70 + Math.abs(stress) * 30;
          const lightness = 20 + Math.abs(stress) * 20;

          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.beginPath();
          ctx.arc(x, y, 3 + Math.abs(stress) * 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.3)`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + stress * 10, y + stress * 10);
          ctx.stroke();
        }
      }

      stations.forEach(station => {
        const x = station.x * width;
        const y = station.y * height;
        const pulse = Math.sin(time * 3) * 0.5 + 0.5;
        const radius = 15 + pulse * 10 * station.intensity * intensity;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, intensity, stations]);

  return (
    <div className="relative bg-[#050510] rounded-lg overflow-hidden border border-gray-700">
      <canvas ref={canvasRef} width={width} height={height} className="block" />
      <div className="absolute top-2 right-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span>应力场可视化</span>
        </div>
      </div>
    </div>
  );
}
