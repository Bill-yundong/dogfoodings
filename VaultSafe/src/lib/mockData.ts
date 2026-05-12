import { SecurityNode, BiometricHash, MockUser } from '@/types/security';
import { BiometricHasher } from './biometricHash';

export const generateMockNodes = (): SecurityNode[] => [
  {
    id: 'node-001',
    name: '金库主入口',
    type: 'door',
    location: '一层东区',
    level: 3,
    status: 'online',
    lastHeartbeat: Date.now(),
    latency: 5,
    coordinates: { x: 100, y: 150 },
  },
  {
    id: 'node-002',
    name: '监控摄像头-A1',
    type: 'camera',
    location: '一层入口',
    level: 2,
    status: 'online',
    lastHeartbeat: Date.now(),
    latency: 3,
    coordinates: { x: 80, y: 100 },
  },
  {
    id: 'node-003',
    name: '监控摄像头-A2',
    type: 'camera',
    location: '一层走廊',
    level: 2,
    status: 'online',
    lastHeartbeat: Date.now(),
    latency: 4,
    coordinates: { x: 150, y: 200 },
  },
  {
    id: 'node-004',
    name: '金库内门',
    type: 'door',
    location: '二层金库区',
    level: 4,
    status: 'online',
    lastHeartbeat: Date.now(),
    latency: 6,
    coordinates: { x: 200, y: 250 },
  },
  {
    id: 'node-005',
    name: '红外传感器-B1',
    type: 'sensor',
    location: '二层走廊',
    level: 3,
    status: 'online',
    lastHeartbeat: Date.now(),
    latency: 2,
    coordinates: { x: 180, y: 220 },
  },
  {
    id: 'node-006',
    name: '保险柜门禁',
    type: 'vault',
    location: '二层核心区',
    level: 5,
    status: 'online',
    lastHeartbeat: Date.now(),
    latency: 8,
    coordinates: { x: 250, y: 300 },
  },
  {
    id: 'node-007',
    name: '监控摄像头-B1',
    type: 'camera',
    location: '二层核心区',
    level: 4,
    status: 'warning',
    lastHeartbeat: Date.now() - 20000,
    latency: 15,
    coordinates: { x: 230, y: 280 },
  },
  {
    id: 'node-008',
    name: '备用出口',
    type: 'door',
    location: '一层西区',
    level: 2,
    status: 'offline',
    lastHeartbeat: Date.now() - 70000,
    latency: 25,
    coordinates: { x: 50, y: 150 },
  },
];

export interface MockUser {
  id: string;
  name: string;
  level: number;
  fingerprint: string;
  facial: string;
  iris: string;
}

export const generateMockUsers = (): MockUser[] => [
  {
    id: 'user-001',
    name: '张经理',
    level: 5,
    fingerprint: 'fingerprint-data-zhang-manager-001',
    facial: 'facial-data-zhang-manager-001',
    iris: 'iris-data-zhang-manager-001',
  },
  {
    id: 'user-002',
    name: '李主管',
    level: 4,
    fingerprint: 'fingerprint-data-li-supervisor-002',
    facial: 'facial-data-li-supervisor-002',
    iris: 'iris-data-li-supervisor-002',
  },
  {
    id: 'user-003',
    name: '王柜员',
    level: 3,
    fingerprint: 'fingerprint-data-wang-teller-003',
    facial: 'facial-data-wang-teller-003',
    iris: 'iris-data-wang-teller-003',
  },
  {
    id: 'user-004',
    name: '赵保安',
    level: 2,
    fingerprint: 'fingerprint-data-zhao-security-004',
    facial: 'facial-data-zhao-security-004',
    iris: 'iris-data-zhao-security-004',
  },
];

export const generateUserBiometricHashes = (user: MockUser, nodeId: string): BiometricHash[] => [
  BiometricHasher.generateHash(user.fingerprint, 'fingerprint', user.id, nodeId),
  BiometricHasher.generateHash(user.facial, 'facial', user.id, nodeId),
  BiometricHasher.generateHash(user.iris, 'iris', user.id, nodeId),
];

export const getRandomMockUser = (): MockUser => {
  const users = generateMockUsers();
  return users[Math.floor(Math.random() * users.length)];
};

export const getRandomMockNode = (): SecurityNode => {
  const nodes = generateMockNodes();
  return nodes[Math.floor(Math.random() * nodes.length)];
};

export const simulateRandomAccessEvent = (): {
  user: MockUser;
  node: SecurityNode;
  biometricType: BiometricHash['hashType'];
} => {
  const user = getRandomMockUser();
  const node = getRandomMockNode();
  const types: BiometricHash['hashType'][] = ['fingerprint', 'facial', 'iris', 'palm'];
  const biometricType = types[Math.floor(Math.random() * types.length)];
  
  return { user, node, biometricType };
};
