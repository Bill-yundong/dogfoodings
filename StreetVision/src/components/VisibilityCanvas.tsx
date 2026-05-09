import { useEffect, useRef } from 'react';
import type { Building, RoadSegment, Viewpoint, VisibilityAnalysisResult, StreetPerceptionScore } from '../types';

interface VisibilityCanvasProps {
  buildings: Building[];
  segments: RoadSegment[];
  viewpoints: Viewpoint[];
  visibilityResults: VisibilityAnalysisResult[];
  perceptionScores: StreetPerceptionScore[];
  selectedViewpointId: string | null;
  onViewpointClick?: (viewpointId: string) => void;
  width?: number;
  height?: number;
}

function getRoadColor(type: RoadSegment['type']): string {
  const colors: Record<RoadSegment['type'], string> = {
    primary: '#2C3E50',
    secondary: '#34495E',
    tertiary: '#7F8C8D',
    pedestrian: '#27AE60'
  };
  return colors[type];
}

function getScoreColor(score: number): string {
  if (score >= 0.75) return '#2ECC71';
  if (score >= 0.5) return '#F39C12';
  if (score >= 0.25) return '#E67E22';
  return '#E74C3C';
}

export function VisibilityCanvas({
  buildings,
  segments,
  viewpoints,
  visibilityResults,
  perceptionScores,
  selectedViewpointId,
  onViewpointClick,
  width = 650,
  height = 600
}: VisibilityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ECF0F1';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#BDC3C7';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (const segment of segments) {
      if (segment.points.length < 2) continue;

      const score = perceptionScores.find((s) => s.segmentId === segment.id);

      ctx.beginPath();
      ctx.moveTo(segment.points[0].x, segment.points[0].y);
      for (let i = 1; i < segment.points.length; i++) {
        ctx.lineTo(segment.points[i].x, segment.points[i].y);
      }
      ctx.strokeStyle = score ? getScoreColor(score.overallScore) : getRoadColor(segment.type);
      ctx.lineWidth = segment.width / 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      if (segment.points.length >= 2) {
        const midIndex = Math.floor(segment.points.length / 2);
        const midPoint = segment.points[midIndex];
        if (segment.name) {
          ctx.fillStyle = '#2C3E50';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(segment.name, midPoint.x, midPoint.y - 8);
        }
      }
    }

    for (const building of buildings) {
      if (building.polygon.length < 3) continue;

      ctx.beginPath();
      ctx.moveTo(building.polygon[0].x, building.polygon[0].y);
      for (let i = 1; i < building.polygon.length; i++) {
        ctx.lineTo(building.polygon[i].x, building.polygon[i].y);
      }
      ctx.closePath();

      const intensity = Math.min(1, building.height / 80);
      ctx.fillStyle = `rgba(44, 62, 80, ${0.5 + intensity * 0.4})`;
      ctx.fill();
      ctx.strokeStyle = '#1A252F';
      ctx.lineWidth = 1;
      ctx.stroke();

      const centerX = building.polygon.reduce((sum, p) => sum + p.x, 0) / building.polygon.length;
      const centerY = building.polygon.reduce((sum, p) => sum + p.y, 0) / building.polygon.length;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${building.height}m`, centerX, centerY);
    }

    for (const result of visibilityResults) {
      for (const cell of result.cells) {
        if (cell.visible) {
          const alpha = Math.max(0.05, 1 - cell.distance / 150);
          ctx.fillStyle = `rgba(46, 204, 113, ${alpha * 0.4})`;
          ctx.fillRect(cell.x - 2, cell.y - 2, 4, 4);
        }
      }
    }

    for (const viewpoint of viewpoints) {
      const isSelected = viewpoint.id === selectedViewpointId;
      const result = visibilityResults.find((r) => r.viewpointId === viewpoint.id);

      ctx.beginPath();
      ctx.arc(viewpoint.position.x, viewpoint.position.y, isSelected ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#E74C3C' : '#3498DB';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      const dirRad = (viewpoint.direction * Math.PI) / 180;
      const fovRad = (viewpoint.fieldOfView * Math.PI) / 360;

      ctx.beginPath();
      ctx.moveTo(viewpoint.position.x, viewpoint.position.y);
      ctx.arc(
        viewpoint.position.x,
        viewpoint.position.y,
        viewpoint.maxDistance,
        dirRad - fovRad,
        dirRad + fovRad
      );
      ctx.closePath();
      ctx.fillStyle = isSelected ? 'rgba(231, 76, 60, 0.15)' : 'rgba(52, 152, 219, 0.1)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (result) {
        ctx.fillStyle = '#2C3E50';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${(result.visibilityRatio * 100).toFixed(1)}%`,
          viewpoint.position.x,
          viewpoint.position.y + 22
        );
      }
    }
  }, [
    buildings,
    segments,
    viewpoints,
    visibilityResults,
    perceptionScores,
    selectedViewpointId,
    width,
    height
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onViewpointClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const vp of viewpoints) {
      const dist = Math.sqrt(Math.pow(x - vp.position.x, 2) + Math.pow(y - vp.position.y, 2));
      if (dist <= 15) {
        onViewpointClick(vp.id);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleCanvasClick}
      style={{ cursor: 'pointer', borderRadius: '8px' }}
    />
  );
}
