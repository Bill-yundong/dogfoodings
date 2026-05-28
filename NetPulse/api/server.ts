import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import type { Request, Response } from 'express';
import type {
  ClientMessage,
  ServerMessage,
  ProbeResult,
  AcceleratorNode,
  DailySummary,
} from '@shared/protocol';
import { MOCK_NODES, PROTOCOL_VERSION } from '@shared/protocol';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

interface ClientConnection {
  id: string;
  lastSeen: number;
  clientVersion: string;
  protocolVersion: string;
  lastProbeResults: Map<string, ProbeResult[]>;
}

const clients = new Map<string, ClientConnection>();
const nodeLoads = new Map(MOCK_NODES.map(n => [n.id, n.load]));

setInterval(() => {
  for (const nodeId of nodeLoads.keys()) {
    const current = nodeLoads.get(nodeId) || 0.5;
    const change = (Math.random() - 0.5) * 0.1;
    const newLoad = Math.max(0.1, Math.min(0.95, current + change));
    nodeLoads.set(nodeId, newLoad);
  }
}, 5000);

const getCurrentNodes = (): AcceleratorNode[] => {
  return MOCK_NODES.map(node => ({
    ...node,
    load: nodeLoads.get(node.id) || node.load,
    currentUsers: Math.floor((nodeLoads.get(node.id) || node.load) * node.maxCapacity),
  }));
};

app.get('/api/nodes', (_req: Request, res: Response) => {
  res.json(getCurrentNodes());
});

app.get('/api/nodes/:id', (req: Request, res: Response) => {
  const node = getCurrentNodes().find(n => n.id === req.params.id);
  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }
  res.json(node);
});

app.post('/api/paths/switch', (req: Request, res: Response) => {
  const { fromPathId, toPathId, reason } = req.body;

  if (!fromPathId || !toPathId) {
    res.status(400).json({ error: 'Missing path IDs' });
    return;
  }

  const targetNode = getCurrentNodes().find(n => n.id === toPathId);
  if (!targetNode || targetNode.status !== 'online') {
    res.status(400).json({ error: 'Target node not available' });
    return;
  }

  const switchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const estimatedTime = 50 + Math.random() * 150;

  setTimeout(() => {
    console.log(`Switch completed: ${fromPathId} -> ${toPathId}, reason: ${reason}`);
  }, estimatedTime);

  res.json({
    switchId,
    success: true,
    estimatedTime,
  });
});

app.get('/api/history/summary', (_req: Request, res: Response) => {
  const summaries: DailySummary[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayFactor = Math.sin(i / 3) * 0.2 + 1;
    const weekendFactor = (date.getDay() === 0 || date.getDay() === 6) ? 1.2 : 1;

    summaries.push({
      date: dateStr,
      avgLatency: Math.round((25 + Math.random() * 40) * dayFactor * weekendFactor * 100) / 100,
      avgJitter: Math.round((5 + Math.random() * 15) * dayFactor * 100) / 100,
      avgPacketLoss: Math.round((0.005 + Math.random() * 0.02) * 10000) / 10000,
      totalSwitches: Math.floor(Math.random() * 10),
      uptime: 86400 * (0.95 + Math.random() * 0.05),
      qualityDistribution: {
        excellent: 0.5 + Math.random() * 0.3,
        good: 0.2 + Math.random() * 0.2,
        fair: 0.05 + Math.random() * 0.15,
        poor: Math.random() * 0.1,
      },
    });
  }

  res.json(summaries);
});

app.post('/api/report/export', (_req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/report/netpulse-report.json',
    expiresAt: Date.now() + 3600000,
  });
});

wss.on('connection', (ws) => {
  const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`Client connected: ${clientId}`);

  const connection: ClientConnection = {
    id: clientId,
    lastSeen: Date.now(),
    clientVersion: '',
    protocolVersion: '',
    lastProbeResults: new Map(),
  };
  clients.set(clientId, connection);

  const send = (message: ServerMessage) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage | { type: string };
      connection.lastSeen = Date.now();

      if ('type' in message && message.type === 'PING') {
        send({ type: 'HANDSHAKE_ACK', serverTime: Date.now(), syncInterval: 5000 });
        return;
      }

      if (!('type' in message)) return;

      switch (message.type) {
        case 'HANDSHAKE': {
          const handshake = 'handshake' in message ? message.handshake : null;
          if (handshake) {
            connection.clientVersion = handshake.clientVersion;
            connection.protocolVersion = handshake.protocolVersion;
          }
          send({
            type: 'HANDSHAKE_ACK',
            serverTime: Date.now(),
            syncInterval: 5000,
          });
          send({
            type: 'NODE_STATUS',
            nodes: getCurrentNodes(),
          });
          break;
        }

        case 'PROBE_REPORT': {
          const results = 'data' in message ? message.data : [];
          for (const result of results) {
            const pathResults = connection.lastProbeResults.get(result.pathId) || [];
            pathResults.push(result);
            if (pathResults.length > 100) pathResults.shift();
            connection.lastProbeResults.set(result.pathId, pathResults);
          }

          const avgLoss = results.length > 0
            ? results.reduce((sum, r) => sum + r.packetLoss, 0) / results.length
            : 0;
          const avgLatency = results.length > 0
            ? results.reduce((sum, r) => sum + r.latency, 0) / results.length
            : 0;

          if (avgLoss > 0.05 || avgLatency > 150) {
            const worstPath = results.sort((a, b) => b.latency - a.latency)[0];
            if (worstPath) {
              send({
                type: 'QUALITY_ALERT',
                pathId: worstPath.pathId,
                severity: avgLoss > 0.1 || avgLatency > 200 ? 'critical' : 'warning',
                metric: avgLoss > 0.05 ? 'packetLoss' : 'latency',
              });
            }
          }
          break;
        }

        case 'PATH_SWITCH_REQUEST': {
          const targetPathId = 'targetPathId' in message ? message.targetPathId : '';
          const reason = 'reason' in message ? message.reason : '';
          console.log(`Switch request: ${clientId} -> ${targetPathId}, reason: ${reason}`);

          const switchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const estimatedTime = 50 + Math.random() * 150;

          send({
            type: 'PATH_SWITCH_ACK',
            switchId,
            approved: true,
            estimatedTime,
          });
          break;
        }

        case 'NODE_DISCOVERY': {
          send({
            type: 'NODE_STATUS',
            nodes: getCurrentNodes(),
          });
          break;
        }

        case 'STATUS_SYNC': {
          break;
        }
      }
    } catch (e) {
      console.error('Parse message error:', e);
    }
  });

  const nodeStatusInterval = setInterval(() => {
    send({
      type: 'NODE_STATUS',
      nodes: getCurrentNodes(),
    });
  }, 10000);

  const suggestions = [
    {
      id: '1',
      type: 'path' as const,
      priority: 'high' as const,
      title: '建议切换到北京节点',
      description: '北京节点当前负载较低，预计可降低时延 15-20ms',
      expectedImprovement: { latency: 18 },
    },
    {
      id: '2',
      type: 'config' as const,
      priority: 'medium' as const,
      title: '建议增加探测频率',
      description: '当前网络波动较大，提高探测频率可提升切换响应速度',
      expectedImprovement: { jitter: 5 },
    },
    {
      id: '3',
      type: 'protocol' as const,
      priority: 'low' as const,
      title: '建议启用 QUIC 协议',
      description: 'QUIC 协议在弱网环境下表现更优',
      expectedImprovement: { loss: 0.01 },
    },
  ];

  let suggestionIndex = 0;
  const suggestionInterval = setInterval(() => {
    send({
      type: 'OPTIMIZATION_SUGGESTION',
      suggestion: suggestions[suggestionIndex % suggestions.length],
    });
    suggestionIndex++;
  }, 30000);

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    clearInterval(nodeStatusInterval);
    clearInterval(suggestionInterval);
    clients.delete(clientId);
  });

  ws.on('error', (error) => {
    console.error(`Client error ${clientId}:`, error);
  });
});

server.listen(PORT, () => {
  console.log(`NetPulse server running on port ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`HTTP API: http://localhost:${PORT}/api`);
  console.log(`Protocol version: ${PROTOCOL_VERSION}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  wss.close();
  server.close();
  process.exit(0);
});
