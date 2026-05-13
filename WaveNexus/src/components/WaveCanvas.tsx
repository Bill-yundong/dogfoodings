import React, { useEffect, useRef, useCallback } from "react";
import {
  waveEngine,
  WaveParams,
  SimulationResult,
  EnergyFlowData,
} from "../engine/WaveTheoryEngine";

interface WaveCanvasProps {
  waveHeight: number;
  wavePeriod: number;
  waterDepth: number;
  showEnergyFlow?: boolean;
  showBreakingZones?: boolean;
  width?: number;
  height?: number;
}

export const WaveCanvas: React.FC<WaveCanvasProps> = ({
  waveHeight,
  wavePeriod,
  waterDepth,
  showEnergyFlow = true,
  showBreakingZones = true,
  width = 800,
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const waveParamsRef = useRef<WaveParams | null>(null);
  const simulationResultRef = useRef<SimulationResult | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const drawWave = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      params: WaveParams,
      time: number,
      simulationResult: SimulationResult
    ) => {
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#1a5f7a");
      gradient.addColorStop(0.5, "#0d7377");
      gradient.addColorStop(1, "#0f4c5c");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const shoreGradient = ctx.createLinearGradient(0, height - 60, 0, height);
      shoreGradient.addColorStop(0, "rgba(210, 180, 140, 0.3)");
      shoreGradient.addColorStop(1, "rgba(194, 154, 108, 0.6)");
      ctx.fillStyle = shoreGradient;
      ctx.fillRect(0, height - 60, width, 60);

      const waveBaseY = height * 0.7;
      const amplitude = (waveHeight / 10) * 30;
      const k = params.waveNumber;
      const omega = params.angularFrequency;

      ctx.beginPath();
      ctx.moveTo(0, waveBaseY);

      for (let x = 0; x <= width; x += 2) {
        const normalizedX = (x / width) * 20;
        const y =
          waveBaseY +
          amplitude * Math.sin(k * normalizedX - omega * time) +
          amplitude * 0.3 * Math.sin(2 * k * normalizedX - 2 * omega * time);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const waterGradient = ctx.createLinearGradient(0, waveBaseY - amplitude, 0, height);
      waterGradient.addColorStop(0, "rgba(64, 224, 208, 0.8)");
      waterGradient.addColorStop(0.3, "rgba(0, 139, 139, 0.7)");
      waterGradient.addColorStop(1, "rgba(0, 100, 120, 0.9)");
      ctx.fillStyle = waterGradient;
      ctx.fill();

      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const normalizedX = (x / width) * 20;
        const y =
          waveBaseY +
          amplitude * Math.sin(k * normalizedX - omega * time) +
          amplitude * 0.3 * Math.sin(2 * k * normalizedX - 2 * omega * time);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (showEnergyFlow && simulationResult.energyField) {
        drawEnergyFlow(ctx, simulationResult.energyField);
      }

      if (showBreakingZones && simulationResult.breakingZones) {
        drawBreakingZones(ctx, simulationResult.breakingZones, time);
      }

      drawFoam(ctx, width, height, waveBaseY, amplitude, k, omega, time);
      drawLegend(ctx, params);
    },
    [width, height, waveHeight, showEnergyFlow, showBreakingZones]
  );

  const drawEnergyFlow = (
    ctx: CanvasRenderingContext2D,
    energyField: EnergyFlowData[]
  ) => {
    const cellWidth = width / 50;
    const cellHeight = (height * 0.6) / 50;

    energyField.forEach((data) => {
      const x = (data.x / 1000) * width;
      const y = (data.y / 500) * height * 0.6;

      const normalizedEnergy = Math.min(1, data.energyDensity / 10000);
      const hue = 200 - normalizedEnergy * 150;
      ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${0.2 + normalizedEnergy * 0.3})`;
      ctx.fillRect(
        x - cellWidth / 2,
        y - cellHeight / 2,
        cellWidth,
        cellHeight
      );

      if (Math.random() < 0.05) {
        const arrowLength = 10 + normalizedEnergy * 15;
        const angle = data.direction;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(arrowLength, 0);
        ctx.lineTo(arrowLength - 4, -3);
        ctx.moveTo(arrowLength, 0);
        ctx.lineTo(arrowLength - 4, 3);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + normalizedEnergy * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    });
  };

  const drawBreakingZones = (
    ctx: CanvasRenderingContext2D,
    breakingZones: { x: number; y: number; intensity: number }[],
    time: number
  ) => {
    breakingZones.forEach((zone) => {
      const x = (zone.x / 1000) * width;
      const y = height * 0.5 + (zone.y / 500) * height * 0.3;
      const radius = 15 + zone.intensity * 25;
      const pulse = 0.7 + 0.3 * Math.sin(time * 5);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(255, 200, 100, ${0.6 * pulse})`);
      gradient.addColorStop(0.5, `rgba(255, 150, 50, ${0.3 * pulse})`);
      gradient.addColorStop(1, "rgba(255, 100, 50, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * pulse})`;
      for (let i = 0; i < 5; i++) {
        const px = x + (Math.random() - 0.5) * radius * 1.5;
        const py = y + (Math.random() - 0.5) * radius * 0.8;
        const pr = 1 + Math.random() * 3;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  };

  const drawFoam = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    waveBaseY: number,
    amplitude: number,
    k: number,
    omega: number,
    time: number
  ) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    const foamStartY = height - 50;

    for (let i = 0; i < 100; i++) {
      const x = (i / 100) * width;
      const waveY =
        waveBaseY +
        amplitude * Math.sin(k * (x / width) * 20 - omega * time);
      const y = Math.max(waveY, foamStartY) + Math.random() * 10;
      const size = 1 + Math.random() * 3;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawLegend = (
    ctx: CanvasRenderingContext2D,
    params: WaveParams
  ) => {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(10, 10, 220, 110);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.strokeRect(10, 10, 220, 110);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText(`波高: ${params.waveHeight.toFixed(2)} m`, 20, 32);
    ctx.fillText(`周期: ${params.wavePeriod.toFixed(2)} s`, 20, 50);
    ctx.fillText(`波长: ${params.wavelength.toFixed(2)} m`, 20, 68);
    ctx.fillText(`水深: ${params.waterDepth.toFixed(2)} m`, 20, 86);
    ctx.fillText(
      `波速: ${params.phaseSpeed.toFixed(2)} m/s`,
      20,
      104
    );
  };

  useEffect(() => {
    const initWave = async () => {
      const params = await waveEngine.calculateWaveParameters(
        waveHeight,
        wavePeriod,
        waterDepth
      );
      waveParamsRef.current = params;

      const result = await waveEngine.simulateEnergyFlow(
        params,
        1000,
        500,
        0
      );
      simulationResultRef.current = result;
    };

    initWave();
  }, [waveHeight, wavePeriod, waterDepth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = async (timestamp: number) => {
      timeRef.current = timestamp / 1000;

      if (waveParamsRef.current && timestamp - lastUpdateRef.current > 100) {
        simulationResultRef.current = await waveEngine.simulateEnergyFlow(
          waveParamsRef.current,
          1000,
          500,
          timeRef.current
        );
        lastUpdateRef.current = timestamp;
      }

      if (waveParamsRef.current && simulationResultRef.current) {
        drawWave(
          ctx,
          waveParamsRef.current,
          timeRef.current,
          simulationResultRef.current
        );
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawWave]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
      }}
    />
  );
};
