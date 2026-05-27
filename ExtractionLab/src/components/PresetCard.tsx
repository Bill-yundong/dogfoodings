'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
} from './ui/Card';
import { FlavorRadarChart } from './FlavorRadarChart';
import { BREWING_METHODS, ROAST_LEVELS, REGIONS } from '@/lib/constants';
import { cn, formatDate } from '@/lib/utils';
import type { BrewingPreset } from '@/types';
import {
  MapPin,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit3,
  Trash2,
  Copy,
  TrendingUp,
} from 'lucide-react';

interface PresetCardProps {
  preset: BrewingPreset;
  onEdit?: (preset: BrewingPreset) => void;
  onDelete?: (preset: BrewingPreset) => void;
  onDuplicate?: (preset: BrewingPreset) => void;
  onOptimize?: (preset: BrewingPreset) => void;
  onView?: (preset: BrewingPreset) => void;
  compact?: boolean;
  className?: string;
}

const statusConfig = {
  draft: { label: '草稿', variant: 'default' as const, icon: Clock },
  testing: { label: '测试中', variant: 'warning' as const, icon: Clock },
  approved: { label: '已发布', variant: 'success' as const, icon: CheckCircle2 },
  archived: { label: '已归档', variant: 'info' as const, icon: Clock },
  deprecated: { label: '已弃用', variant: 'error' as const, icon: AlertTriangle },
} as const;

export function PresetCard({
  preset,
  onEdit,
  onDelete,
  onDuplicate,
  onOptimize,
  onView,
  compact = false,
  className,
}: PresetCardProps) {
  const [hovered, setHovered] = useState(false);

  const methodInfo = BREWING_METHODS.find(m => m.value === preset.method);
  const roastInfo = ROAST_LEVELS.find(r => r.value === preset.bean.roastLevel);
  const regionInfo = REGIONS.find(r => r.id === preset.region);
  const statusInfo = statusConfig[preset.status];
  const StatusIcon = statusInfo.icon;

  return (
    <Card
      className={cn(
        'group transition-all duration-300 hover:shadow-xl',
        hovered && 'scale-[1.02]',
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{methodInfo?.icon}</span>
            <div>
              <CardTitle className="text-base leading-tight group-hover:text-coffee-700 transition-colors">
                {preset.name}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 line-clamp-1">
                {preset.bean.origin} · {preset.bean.region}
              </CardDescription>
            </div>
          </div>
          <Badge variant={statusInfo.variant} size="sm" className="flex items-center gap-1">
            <StatusIcon className="w-3 h-3" />
            {statusInfo.label}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge size="sm" variant="default" className="bg-amber-50 text-amber-700">
            {methodInfo?.label}
          </Badge>
          <Badge size="sm" variant="default" className="bg-blue-50 text-blue-700">
            {roastInfo?.label}
          </Badge>
          <Badge size="sm" variant="default" className="bg-green-50 text-green-700">
            {regionInfo?.name || '全球'}
          </Badge>
          {preset.bean.flavorNotes.slice(0, 2).map(note => (
            <Badge key={note} size="sm" variant="default" className="bg-purple-50 text-purple-700">
              {note}
            </Badge>
          ))}
        </div>
      </CardHeader>

      {!compact && (
        <CardContent className="pt-0">
          <div className="h-48 mb-4">
            <FlavorRadarChart
              profiles={[
                { name: '目标风味', profile: preset.targetFlavor, color: '#8b6914' },
              ]}
              tolerance={preset.tolerance}
              height={192}
              showDetails={false}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 bg-coffee-50 rounded-lg">
              <p className="text-xs text-coffee-500">粉量</p>
              <p className="text-lg font-bold text-coffee-900">{preset.dose.toFixed(1)}g</p>
            </div>
            <div className="text-center p-2 bg-coffee-50 rounded-lg">
              <p className="text-xs text-coffee-500">水温</p>
              <p className="text-lg font-bold text-coffee-900">{preset.waterTemperature.toFixed(0)}°C</p>
            </div>
            <div className="text-center p-2 bg-coffee-50 rounded-lg">
              <p className="text-xs text-coffee-500">时间</p>
              <p className="text-lg font-bold text-coffee-900">{preset.brewTime}s</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-coffee-600">
              <MapPin className="w-4 h-4" />
              <span>{preset.storeIds.length} 家门店</span>
            </div>
            <div className="flex items-center gap-2 text-coffee-600">
              <TrendingUp className="w-4 h-4" />
              <span>TDS {preset.targetTDS.toFixed(2)}%</span>
            </div>
          </div>
        </CardContent>
      )}

      <CardFooter className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-coffee-400">
          <User className="w-3 h-3" />
          <span>{preset.createdBy}</span>
          <span>·</span>
          <Calendar className="w-3 h-3" />
          <span>{formatDate(preset.updatedAt).split(' ')[0]}</span>
        </div>

        <div className="flex items-center gap-1">
          {onView && (
            <Button variant="ghost" size="sm" onClick={() => onView(preset)}>
              查看
            </Button>
          )}
          {onOptimize && (
            <Button variant="secondary" size="sm" onClick={() => onOptimize(preset)}>
              <TrendingUp className="w-4 h-4 mr-1" />
              优化
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(preset)}>
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
          {onDuplicate && (
            <Button variant="outline" size="sm" onClick={() => onDuplicate(preset)}>
              <Copy className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(preset)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
