import { ConveyorNode } from '../types/core';
import { SYSTEM_CONFIG } from './constants';

export const createDefaultTopology = (): ConveyorNode[] => {
  const { CAPACITY } = SYSTEM_CONFIG.NODES;
  
  return [
    {
      id: 'ENTRY_1',
      name: '入口1',
      type: 'entry',
      x: 80,
      y: 180,
      neighbors: ['CB_1'],
      capacity: CAPACITY.ENTRY,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'ENTRY_2',
      name: '入口2',
      type: 'entry',
      x: 80,
      y: 380,
      neighbors: ['CB_2'],
      capacity: CAPACITY.ENTRY,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'CB_1',
      name: '交叉带1',
      type: 'cross-belt',
      x: 220,
      y: 130,
      neighbors: ['CB_2', 'JUNCTION_1'],
      capacity: CAPACITY.CROSS_BELT,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'CB_2',
      name: '交叉带2',
      type: 'cross-belt',
      x: 220,
      y: 430,
      neighbors: ['CB_1', 'JUNCTION_2'],
      capacity: CAPACITY.CROSS_BELT,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'JUNCTION_1',
      name: '分拣口1',
      type: 'junction',
      x: 400,
      y: 130,
      neighbors: ['CHUTE_A', 'CHUTE_B', 'CB_3'],
      capacity: CAPACITY.JUNCTION,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'JUNCTION_2',
      name: '分拣口2',
      type: 'junction',
      x: 400,
      y: 430,
      neighbors: ['CHUTE_C', 'CHUTE_D', 'CB_3'],
      capacity: CAPACITY.JUNCTION,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'CB_3',
      name: '交叉带3',
      type: 'cross-belt',
      x: 580,
      y: 280,
      neighbors: ['JUNCTION_1', 'JUNCTION_2', 'EXIT'],
      capacity: CAPACITY.CROSS_BELT,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'CHUTE_A',
      name: '滑槽A-北京',
      type: 'chute',
      x: 580,
      y: 60,
      neighbors: [],
      capacity: CAPACITY.CHUTE,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'CHUTE_B',
      name: '滑槽B-上海',
      type: 'chute',
      x: 580,
      y: 150,
      neighbors: [],
      capacity: CAPACITY.CHUTE,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'CHUTE_C',
      name: '滑槽C-广州',
      type: 'chute',
      x: 580,
      y: 400,
      neighbors: [],
      capacity: CAPACITY.CHUTE,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'CHUTE_D',
      name: '滑槽D-深圳',
      type: 'chute',
      x: 580,
      y: 490,
      neighbors: [],
      capacity: CAPACITY.CHUTE,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'EXIT',
      name: '出口',
      type: 'exit',
      x: 760,
      y: 280,
      neighbors: [],
      capacity: CAPACITY.EXIT,
      currentLoad: 0,
      isActive: true
    },
    {
      id: 'RECOVERY_CHUTE',
      name: '回收滑槽',
      type: 'chute',
      x: 760,
      y: 450,
      neighbors: [],
      capacity: CAPACITY.RECOVERY,
      currentLoad: 0,
      isActive: true
    }
  ];
};

export const createDestinationMap = (): Map<string, string> => {
  const map = new Map<string, string>();
  map.set('北京', 'CHUTE_A');
  map.set('上海', 'CHUTE_B');
  map.set('广州', 'CHUTE_C');
  map.set('深圳', 'CHUTE_D');
  map.set('默认', 'EXIT');
  return map;
};

export const getNodeColor = (type: string, isActive: boolean): string => {
  if (!isActive) return '#a0aec0';
  
  const colors: Record<string, string> = {
    entry: '#48bb78',
    'cross-belt': '#667eea',
    junction: '#9f7aea',
    chute: '#ed8936',
    exit: '#f56565'
  };
  
  return colors[type] || '#4299e1';
};

export const getPackageColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: '#68d391',
    sorting: '#63b3ed',
    sorted: '#48bb78',
    error: '#fc8181'
  };
  
  return colors[status] || '#68d391';
};
