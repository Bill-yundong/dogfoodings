import React from 'react';
import { Tag } from 'antd';
import type { RiskLevel, DataQuality, PlatformStatus, CableStatus } from '@/types';

interface StatusBadgeProps {
  type: 'risk' | 'quality' | 'platform' | 'cable' | 'sync';
  value: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'safe': return 'green';
      case 'caution': return 'orange';
      case 'danger': return 'red';
    }
  };

  const getQualityColor = (quality: DataQuality) => {
    switch (quality) {
      case 'good': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
    }
  };

  const getPlatformColor = (status: PlatformStatus) => {
    switch (status) {
      case 'active': return 'green';
      case 'maintenance': return 'blue';
      case 'emergency': return 'red';
    }
  };

  const getCableColor = (status: CableStatus) => {
    switch (status) {
      case 'normal': return 'green';
      case 'warning': return 'orange';
      case 'damaged': return 'red';
    }
  };

  const getSyncColor = (status: string) => {
    switch (status) {
      case 'online': return 'green';
      case 'degraded': return 'orange';
      case 'offline': return 'red';
      case 'synced': return 'green';
      case 'pending': return 'blue';
      case 'conflict': return 'orange';
      case 'failed': return 'red';
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'risk':
        return { safe: '安全', caution: '注意', danger: '危险' }[value as RiskLevel] || value;
      case 'quality':
        return { good: '良好', warning: '警告', critical: '严重' }[value as DataQuality] || value;
      case 'platform':
        return { active: '运行中', maintenance: '维护中', emergency: '应急' }[value as PlatformStatus] || value;
      case 'cable':
        return { normal: '正常', warning: '警告', damaged: '损坏' }[value as CableStatus] || value;
      case 'sync':
        return { online: '在线', degraded: '降级', offline: '离线', synced: '已同步', pending: '待同步', conflict: '冲突', failed: '失败' }[value] || value;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'risk': return getRiskColor(value as RiskLevel);
      case 'quality': return getQualityColor(value as DataQuality);
      case 'platform': return getPlatformColor(value as PlatformStatus);
      case 'cable': return getCableColor(value as CableStatus);
      case 'sync': return getSyncColor(value);
    }
  };

  return <Tag color={getColor()}>{getLabel()}</Tag>;
};
