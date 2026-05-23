## 1. 架构设计

```mermaid
flowchart TB
    subgraph "表现层 (Vue 3 + TypeScript)"
        A1["主控台 Dashboard"]
        A2["点云处理中心"]
        A3["三维可视化 WebGL"]
        A4["数据同步管理"]
        A5["拓扑快照管理"]
    end

    subgraph "业务逻辑层 (Composables)"
        B1["任务调度管理器"]
        B2["点云数据处理器"]
        B3["同步状态机"]
        B4["缓存策略引擎"]
    end

    subgraph "核心计算层 (Web Workers)"
        C1["体素下采样 Worker"]
        C2["点云去噪清洗 Worker"]
        C3["拓扑重建 Worker"]
        C4["数据编码压缩 Worker"]
    end

    subgraph "数据持久层"
        D1["IndexedDB 快照存储"]
        D2["LocalStorage 配置存储"]
        D3["File System Access API"]
    end

    subgraph "网络传输层"
        E1["断点续传管理器"]
        E2["增量同步引擎"]
        E3["省电网空间数据库 API"]
    end

    subgraph "渲染引擎层"
        F1["Three.js WebGL 渲染器"]
        F2["LOD 层级加载器"]
        F3["着色器材质系统"]
        F4["交互控制器"]
    end

    A1 --> B1
    A2 --> B2
    A3 --> F1
    A4 --> B3
    A5 --> B4

    B2 --> C1
    B2 --> C2
    B2 --> C3
    B2 --> C4

    C1 --> D1
    C2 --> D1
    C3 --> D1
    C4 --> D1

    B3 --> E1
    B3 --> E2
    E2 --> E3

    B4 --> D1
    F1 --> F2
    F1 --> F3
    F1 --> F4
```

## 2. 技术描述

### 前端技术栈
- **核心框架**：Vue 3.4 + TypeScript 5.3 + Vite 5.0
- **路由管理**：Vue Router 4.x
- **状态管理**：Pinia 2.x
- **样式方案**：Tailwind CSS 3.4 + SCSS
- **3D渲染**：Three.js 0.160 + WebGL 2.0
- **图表可视化**：ECharts 5.4
- **图标库**：Lucide Icons
- **多线程**：Web Workers API + Comlink
- **本地存储**：IndexedDB + idb.js封装

### 核心算法模块
- **体素下采样算法**：基于空间网格的均匀下采样，支持自适应体素尺寸
- **统计滤波去噪**：基于K近邻的离群点去除算法
- **点云编码压缩**：Draco几何压缩 + 增量差分编码
- **空间索引**：Octree八叉树空间划分，加速邻域查询

### 性能优化策略
- **Web Worker池**：4线程并行处理，CPU亲和性调度
- **流式处理**：数据分片边传边处理，无需等待完整文件
- **LOD层级加载**：视距相关的点密度动态调整
- **内存池管理**：TypedArray复用，减少GC开销

## 3. 路由定义

| 路由路径 | 页面名称 | 功能说明 |
|----------|----------|----------|
| `/` | 主控台 | 任务概览、系统状态、实时数据统计 |
| `/processing` | 点云处理中心 | 文件上传、下采样配置、处理队列管理 |
| `/visualizer` | 三维可视化 | WebGL点云渲染、交互测量、图层控制 |
| `/sync` | 数据同步管理 | 链路监控、传输队列、断点续传 |
| `/snapshots` | 拓扑快照管理 | IndexedDB缓存浏览、快照详情、缓存策略 |
| `/settings` | 系统设置 | 参数配置、用户管理、日志查看 |

## 4. API 定义（模拟省电网空间数据库）

### TypeScript 类型定义

```typescript
// 点云数据结构
interface PointCloud {
  id: string;
  taskId: string;
  metadata: PointCloudMetadata;
  points: Float32Array;
  colors: Uint8Array;
  intensities: Float32Array;
  pointCount: number;
  bounds: BoundingBox;
  createdAt: number;
}

interface PointCloudMetadata {
  filename: string;
  originalSize: number;
  compressedSize: number;
  originalPointCount: number;
  downsampledPointCount: number;
  voxelSize: number;
  compressionRatio: number;
  acquisitionTime: number;
  droneId: string;
  location: GeoLocation;
}

interface BoundingBox {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude: number;
}

// 任务状态
interface ProcessingTask {
  id: string;
  filename: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  workerId?: number;
  priority: number;
  config: DownsamplingConfig;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

interface DownsamplingConfig {
  voxelSize: number;
  distanceThreshold: number;
  intensityFilter: { min: number; max: number };
  removeOutliers: boolean;
  outlierThreshold: number;
  compressionLevel: number;
}

// 拓扑快照
interface TopologySnapshot {
  id: string;
  pointCloudId: string;
  name: string;
  description: string;
  bounds: BoundingBox;
  pointCount: number;
  dataHash: string;
  storageSize: number;
  createdAt: number;
  expiresAt?: number;
  isFavorite: boolean;
  tags: string[];
}

// 同步任务
interface SyncTask {
  id: string;
  snapshotId: string;
  direction: 'upload' | 'download';
  status: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed';
  progress: number;
  transferSpeed: number;
  bytesTransferred: number;
  totalBytes: number;
  createdAt: number;
  startedAt?: number;
}
```

### Mock API 接口

```typescript
// 获取任务列表
GET /api/tasks?status=&page=&pageSize=
Response: { data: ProcessingTask[], total: number }

// 创建处理任务
POST /api/tasks
Request: { filename: string, config: DownsamplingConfig }
Response: ProcessingTask

// 获取点云元数据
GET /api/pointclouds/:id/metadata
Response: PointCloudMetadata

// 增量同步
POST /api/sync/incremental
Request: { snapshotId: string, lastSyncTime: number }
Response: { changedChunks: ChunkInfo[], syncToken: string }

// 提交同步完成
POST /api/sync/confirm
Request: { syncToken: string }
Response: { success: boolean }

// 获取数据库点云列表
GET /api/database/pointclouds?region=&date=
Response: { data: PointCloudInfo[] }
```

## 5. 数据处理流水线架构

```mermaid
flowchart TB
    subgraph "输入层"
        A["LAS/LAZ/PCD 文件"] --> A1["FileReader API"]
        A1 --> A2["流式二进制解析"]
    end

    subgraph "预处理层 (Worker 1)"
        B["坐标归一化"]
        B1["强度值校准"]
        B2["空间范围计算"]
    end

    subgraph "核心算法层 (Worker 2-3)"
        C["体素网格划分"]
        C1["体素哈希索引"]
        C2["网格中心点采样"]
        D["统计滤波去噪"]
        D1["K近邻距离计算"]
        D2["离群点剔除"]
    end

    subgraph "拓扑重建层 (Worker 4)"
        E["法向量估计"]
        E1["局部平面拟合"]
        F["Octree空间索引构建"]
        F1["LOD层级生成"]
    end

    subgraph "输出层"
        G["Draco几何压缩"]
        G1["增量差分编码"]
        H["IndexedDB持久化"]
        H1["元数据索引"]
        I["WebGL渲染就绪"]
    end

    A2 --> B
    B --> B1 --> B2
    B2 --> C --> C1 --> C2
    C2 --> D --> D1 --> D2
    D2 --> E --> E1
    E1 --> F --> F1
    F1 --> G --> G1
    G1 --> H --> H1
    G1 --> I
```

## 6. 数据模型

### 6.1 IndexedDB 数据模型

```mermaid
erDiagram
    POINT_CLOUDS ||--o{ TOPOLOGY_SNAPSHOTS : contains
    PROCESSING_TASKS ||--|| POINT_CLOUDS : produces
    SYNC_TASKS ||--|| TOPOLOGY_SNAPSHOTS : syncs

    POINT_CLOUDS {
        string id PK
        string taskId FK
        string filename
        number originalPointCount
        number downsampledPointCount
        number voxelSize
        number compressionRatio
        Float32Array pointsData
        Uint8Array colorsData
        Float32Array intensitiesData
        object bounds
        object metadata
        number createdAt
        number updatedAt
    }

    TOPOLOGY_SNAPSHOTS {
        string id PK
        string pointCloudId FK
        string name
        string description
        object bounds
        number pointCount
        string dataHash
        number storageSize
        object data
        number createdAt
        number expiresAt
        boolean isFavorite
        string[] tags
    }

    PROCESSING_TASKS {
        string id PK
        string filename
        string status
        number progress
        number workerId
        number priority
        object config
        number createdAt
        number startedAt
        number completedAt
        string error
    }

    SYNC_TASKS {
        string id PK
        string snapshotId FK
        string direction
        string status
        number progress
        number transferSpeed
        number bytesTransferred
        number totalBytes
        number createdAt
        number startedAt
        string syncToken
    }

    WORKER_STATES {
        number workerId PK
        string status
        number cpuUsage
        number memoryUsage
        string currentTaskId
        number processedPoints
        number lastActiveTime
    }
```

### 6.2 IndexedDB 初始化脚本

```typescript
// 数据库版本与Store定义
const DB_VERSION = 1;
const DB_NAME = 'UAVScan_PointCloudDB';

const STORES = {
  pointClouds: {
    keyPath: 'id',
    indexes: [
      { name: 'taskId', keyPath: 'taskId', unique: true },
      { name: 'filename', keyPath: 'filename', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false }
    ]
  },
  topologySnapshots: {
    keyPath: 'id',
    indexes: [
      { name: 'pointCloudId', keyPath: 'pointCloudId', unique: false },
      { name: 'isFavorite', keyPath: 'isFavorite', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
      { name: 'expiresAt', keyPath: 'expiresAt', unique: false }
    ]
  },
  processingTasks: {
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'priority', keyPath: 'priority', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false }
    ]
  },
  syncTasks: {
    keyPath: 'id',
    indexes: [
      { name: 'snapshotId', keyPath: 'snapshotId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'direction', keyPath: 'direction', unique: false }
    ]
  },
  workerStates: {
    keyPath: 'workerId',
    indexes: [
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'currentTaskId', keyPath: 'currentTaskId', unique: false }
    ]
  }
};
```

## 7. 目录结构

```
src/
├── assets/                 # 静态资源
│   ├── styles/            # 全局样式
│   │   ├── main.scss
│   │   ├── variables.scss
│   │   └── animations.scss
│   └── shaders/           # WebGL着色器
│       ├── pointCloud.vert
│       └── pointCloud.frag
├── components/            # Vue组件
│   ├── dashboard/         # 主控台组件
│   ├── processing/        # 处理中心组件
│   ├── visualizer/        # 可视化组件
│   ├── sync/              # 同步管理组件
│   ├── snapshots/         # 快照管理组件
│   └── common/            # 通用组件
├── composables/           # Vue组合式函数
│   ├── useTaskManager.ts
│   ├── usePointCloudProcessor.ts
│   ├── useIndexedDB.ts
│   ├── useWebGLRenderer.ts
│   └── useSyncManager.ts
├── workers/               # Web Workers
│   ├── voxelDownsampler.worker.ts
│   ├── denoiser.worker.ts
│   ├── topologyBuilder.worker.ts
│   └── compressor.worker.ts
├── stores/                # Pinia状态管理
│   ├── taskStore.ts
│   ├── pointCloudStore.ts
│   ├── syncStore.ts
│   └── settingsStore.ts
├── utils/                 # 工具函数
│   ├── algorithm/         # 核心算法
│   │   ├── voxelGrid.ts
│   │   ├── statisticalFilter.ts
│   │   └── octree.ts
│   ├── pointcloud/        # 点云解析
│   │   ├── lasParser.ts
│   │   └── lazDecoder.ts
│   ├── storage/           # 存储封装
│   │   └── indexedDB.ts
│   └── worker/            # Worker管理
│       └── workerPool.ts
├── types/                 # TypeScript类型定义
│   ├── pointcloud.ts
│   ├── task.ts
│   ├── sync.ts
│   └── snapshot.ts
├── router/                # 路由配置
│   └── index.ts
├── views/                 # 页面视图
│   ├── Dashboard.vue
│   ├── ProcessingCenter.vue
│   ├── Visualizer.vue
│   ├── SyncManager.vue
│   ├── SnapshotManager.vue
│   └── Settings.vue
├── api/                   # API接口
│   ├── mock/              # Mock数据
│   ├── taskApi.ts
│   ├── syncApi.ts
│   └── databaseApi.ts
├── App.vue
└── main.ts
```
