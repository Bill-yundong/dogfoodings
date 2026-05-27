'use client';

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
import { REGIONS } from '@/lib/constants';
import { cn, formatDate } from '@/lib/utils';
import type { StoreLocation } from '@/types';
import {
  MapPin,
  Globe,
  Thermometer,
  Droplets,
  Mountain,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Store as StoreIcon,
  Coffee,
} from 'lucide-react';

interface StoreCardProps {
  store: StoreLocation;
  onSync?: (store: StoreLocation) => void;
  onView?: (store: StoreLocation) => void;
  onManage?: (store: StoreLocation) => void;
  className?: string;
}

const syncStatusConfig = {
  online: { label: '在线', variant: 'success' as const, icon: CheckCircle, color: 'text-green-600' },
  syncing: { label: '同步中', variant: 'warning' as const, icon: RefreshCw, color: 'text-yellow-600' },
  offline: { label: '离线', variant: 'default' as const, icon: WifiOff, color: 'text-gray-500' },
  error: { label: '异常', variant: 'error' as const, icon: AlertCircle, color: 'text-red-600' },
};

export function StoreCard({
  store,
  onSync,
  onView,
  onManage,
  className,
}: StoreCardProps) {
  const regionInfo = REGIONS.find(r => r.id === store.region);
  const statusInfo = syncStatusConfig[store.syncStatus];
  const StatusIcon = statusInfo.icon;

  const qualityScoreColor =
    store.qualityScore >= 90
      ? 'text-green-600'
      : store.qualityScore >= 75
      ? 'text-yellow-600'
      : 'text-red-600';

  const qualityScoreBg =
    store.qualityScore >= 90
      ? 'from-green-500 to-emerald-500'
      : store.qualityScore >= 75
      ? 'from-yellow-500 to-amber-500'
      : 'from-red-500 to-rose-500';

  return (
    <Card className={cn('hover:shadow-lg transition-shadow duration-300', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-coffee-100 to-amber-100 rounded-xl flex items-center justify-center">
              <StoreIcon className="w-6 h-6 text-coffee-600" />
            </div>
            <div>
              <CardTitle className="text-base">{store.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {store.city}, {store.country}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={statusInfo.variant} size="sm" className="flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Badge size="sm" variant="default" className="bg-blue-50 text-blue-700">
            <Globe className="w-3 h-3 mr-1" />
            {regionInfo?.name}
          </Badge>
          <Badge size="sm" variant="default" className="bg-purple-50 text-purple-700">
            <Coffee className="w-3 h-3 mr-1" />
            {store.activePresets.length} 个配方
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn('w-16 h-16 rounded-full bg-gradient-to-br', qualityScoreBg, 'flex items-center justify-center')}>
              <span className="text-white text-xl font-bold">{store.qualityScore.toFixed(0)}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
              <span className="text-xs font-bold text-coffee-700">分</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-coffee-600">品质评分</span>
              <span className={cn('text-sm font-semibold', qualityScoreColor)}>
                {store.qualityScore.toFixed(1)}
              </span>
            </div>
            <div className="h-2 bg-coffee-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', qualityScoreBg)}
                style={{ width: `${store.qualityScore}%` }}
              />
            </div>
            <p className="text-xs text-coffee-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              最后同步: {formatDate(store.lastSyncAt).split(' ')[1]}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg">
            <Mountain className="w-4 h-4 mx-auto text-blue-500 mb-1" />
            <p className="text-xs text-coffee-500">海拔</p>
            <p className="text-sm font-bold text-coffee-900">{store.altitude}m</p>
          </div>
          <div className="text-center p-2 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg">
            <Droplets className="w-4 h-4 mx-auto text-amber-500 mb-1" />
            <p className="text-xs text-coffee-500">硬度</p>
            <p className="text-sm font-bold text-coffee-900">{store.waterHardness}ppm</p>
          </div>
          <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg">
            <Thermometer className="w-4 h-4 mx-auto text-purple-500 mb-1" />
            <p className="text-xs text-coffee-500">碱度</p>
            <p className="text-sm font-bold text-coffee-900">{store.waterAlkalinity}ppm</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-coffee-600">设备状态</p>
          <div className="space-y-1.5">
            {store.equipment.slice(0, 3).map(equip => {
              const needsCalibration = equip.nextCalibrationDate < Date.now() + 86400000 * 7;
              return (
                <div key={equip.id} className="flex items-center justify-between text-xs">
                  <span className="text-coffee-600">{equip.model}</span>
                  <Badge
                    size="sm"
                    variant={needsCalibration ? 'warning' : 'success'}
                    className="text-[10px]"
                  >
                    {needsCalibration ? '需校准' : '正常'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <div className="text-xs text-coffee-400">
          时区: {store.timezone}
        </div>
        <div className="flex gap-2">
          {onSync && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSync(store)}
              disabled={store.syncStatus === 'syncing'}
            >
              <RefreshCw className={cn('w-4 h-4 mr-1', store.syncStatus === 'syncing' && 'animate-spin')} />
              同步
            </Button>
          )}
          {onView && (
            <Button variant="primary" size="sm" onClick={() => onView(store)}>
              查看
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
