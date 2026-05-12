# VaultSafe - 银行金库多级安防中枢系统

基于 Next.js 的金融级高可靠数据协同中枢系统，实现生物特征哈希数据在门禁鉴权与安保监控系统间的毫秒级对齐。

## 核心特性

### 🔐 生物特征哈希处理
- 支持指纹、人脸识别、虹膜、掌纹等多种生物特征类型
- 高性能哈希生成与验证算法
- 毫秒级的快速匹配机制

### 🔄 异步空间一致性检测
- 多路图像识别并行处理
- 空间特征向量相似度校验
- 时间窗口内的一致性验证

### 💾 IndexedDB 离线快照存储
- 节点状态的持久化存储
- 自动快照与手动快照功能
- 离线数据恢复与同步

### ⚡ 毫秒级数据对齐
- 跨节点时钟同步校验
- 生物特征数据的分布式对齐
- 实时延迟监控与优化

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    VaultSafe 安防中枢                     │
├──────────────────┬──────────────────┬───────────────────┤
│  生物特征哈希模块  │  空间一致性检测   │  IndexedDB 存储   │
│  - 哈希生成       │  - 多路识别       │  - 快照管理       │
│  - 快速匹配       │  - 特征校验       │  - 离线存储       │
│  - 权限控制       │  - 异步处理       │  - 数据恢复       │
└──────────────────┴──────────────────┴───────────────────┘
```

## 项目结构

```
src/
├── app/                    # Next.js 应用路由
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 布局组件
│   └── page.tsx           # 主页面
├── components/            # React 组件
│   ├── NodeStatusCard.tsx
│   ├── AccessEventLog.tsx
│   ├── SystemStats.tsx
│   └── AccessControlPanel.tsx
├── lib/                   # 核心业务逻辑
│   ├── biometricHash.ts   # 生物特征哈希处理
│   ├── accessControl.ts   # 门禁控制与毫秒级对齐
│   ├── spaceConsistency.ts # 空间一致性检测
│   ├── indexedDB.ts       # IndexedDB 存储封装
│   ├── securityHub.ts     # 安全中枢协调器
│   └── mockData.ts        # 模拟数据生成
└── types/                 # TypeScript 类型定义
    └── security.ts
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm start
```

## 核心模块说明

### BiometricHasher (`src/lib/biometricHash.ts`)
- `generateHash()`: 生成生物特征哈希
- `verifyHash()`: 验证两个哈希是否匹配
- `fastMatch()`: 快速匹配算法

### MillisecondAligner (`src/lib/accessControl.ts`)
- `alignAcrossNodes()`: 跨节点毫秒级数据对齐
- `getNetworkTime()`: 获取网络时间
- `calculateClockDrift()`: 计算时钟漂移

### SpaceConsistencyDetector (`src/lib/spaceConsistency.ts`)
- `processMultiNodeFrames()`: 处理多节点帧数据
- `verifySpatialConsistency()`: 验证空间一致性
- `calculateFeatureSimilarity()`: 计算特征相似度

### SnapshotStore (`src/lib/indexedDB.ts`)
- `createSnapshot()`: 创建快照
- `getRecentSnapshots()`: 获取最近快照
- `clearOldSnapshots()`: 清理旧快照

### SecurityHub (`src/lib/securityHub.ts`)
- 协调所有模块的中央控制器
- 节点心跳监控
- 自动快照管理
- 系统状态统计

## 安全等级说明

| 等级 | 说明 | 典型场景 |
|------|------|----------|
| L1 | 基础 | 外围区域 |
| L2 | 普通 | 一般办公区 |
| L3 | 重要 | 现金柜台 |
| L4 | 机密 | 金库外围 |
| L5 | 最高 | 金库核心 |

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
