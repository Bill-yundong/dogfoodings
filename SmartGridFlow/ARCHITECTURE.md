# SmartGridFlow 架构设计

## 目录结构

```
src/
├── 1. domain/                     # 领域层 - 核心业务模型和规则
│   ├── types/                    # 类型定义
│   │   └── energy.ts             # 能源系统相关类型
│   └── constants/                # 常量定义
│       └── energy.ts             # 能源系统常量
│
├── 2. infrastructure/            # 基础设施层 - 外部依赖
│   └── repositories/             # 数据仓库
│       └── SnapshotRepository.ts # IndexedDB 快照存储
│
├── 3. services/                  # 应用服务层 - 业务逻辑编排
│   ├── EnergySolverService.ts    # 多能源潮流算法服务
│   ├── WeatherService.ts         # 气象数据处理服务
│   ├── CarbonService.ts          # 碳排放计算服务
│   └── SnapshotService.ts        # 快照管理服务
│
├── 4. store/                     # 状态管理层 - UI状态
│   └── useEnergyStore.ts         # 能源系统状态管理
│
├── 5. components/                # 组件层
│   ├── shared/                   # 共享基础组件
│   │   ├── Card.tsx             # 卡片组件
│   │   └── ProgressBar.tsx      # 进度条组件
│   └── features/                 # 业务组件
│       ├── EnergyBalanceCard.tsx # 能源平衡卡片
│       ├── StationList.tsx       # 能源站列表
│       ├── SystemMetrics.tsx     # 系统指标面板
│       └── EnergyChart.tsx       # 能源趋势图表
│
├── App.tsx                       # 应用层 - 主入口
└── index.tsx                     # 渲染入口
```

## 架构分层说明

### 1. Domain Layer (领域层)
- **职责**: 定义核心业务模型和业务规则
- **内容**: TypeScript 类型定义、常量配置
- **特点**: 无外部依赖，纯业务逻辑
- **文件**:
  - `types/energy.ts`: EnergyData, EnergyStation, WeatherData 等类型
  - `constants/energy.ts`: 天气类型标签、能源类型映射等

### 2. Infrastructure Layer (基础设施层)
- **职责**: 处理外部系统交互，提供数据持久化
- **内容**: 数据库访问、API 调用封装
- **特点**: 依赖外部库，实现具体技术细节
- **文件**:
  - `repositories/SnapshotRepository.ts`: IndexedDB 封装，提供 CRUD 操作

### 3. Services Layer (服务层)
- **职责**: 编排业务逻辑，实现核心算法
- **内容**: 业务服务类，封装业务流程
- **特点**: 依赖领域层和基础设施层，不依赖 UI
- **文件**:
  - `EnergySolverService.ts`: 多能源潮流优化算法实现
  - `WeatherService.ts`: 天气因素计算和模拟
  - `CarbonService.ts`: 碳排放强度计算
  - `SnapshotService.ts`: 典型快照预加载和管理

### 4. Store Layer (状态层)
- **职责**: 管理应用状态，提供响应式数据
- **内容**: SolidJS store 实现
- **特点**: 响应式，UI 专用，依赖服务层
- **文件**:
  - `useEnergyStore.ts`: 能源系统全局状态管理

### 5. Components Layer (组件层)
- **职责**: 呈现用户界面，处理用户交互
- **内容**: React/Solid 组件
- **特点**: 分层设计（共享组件 vs 业务组件）
- **文件**:
  - `shared/`: 通用基础组件（Card, ProgressBar）
  - `features/`: 业务功能组件（能源平衡、能源站列表等）

## 数据流

```
用户交互 → Store → Service → Repository (IndexedDB)
    ↑          ↓
    └──────────┘
      响应式更新
```

## 设计原则

1. **单一职责原则 (SRP)**: 每层每个文件只负责一项职责
2. **依赖倒置原则 (DIP)**: 高层不依赖低层，都依赖抽象
3. **开闭原则 (OCP)**: 对扩展开放，对修改关闭
4. **分层架构**: 清晰的边界定义，便于测试和维护
5. **可测试性**: 业务逻辑与 UI 分离，便于单元测试

## 关键业务流程

### 能源优化流程
1. 定时器触发或手动触发优化
2. Store 调用 EnergySolverService
3. Service 调用 WeatherService 获取天气因素
4. Service 执行梯度下降算法求解最优解
5. Store 更新能源站输出数据
6. Service 调用 SnapshotService 保存快照
7. UI 响应式更新显示

### 实时数据同步流程
1. 定时器触发同步
2. Store 模拟各能源站数据变化
3. 更新能源平衡计算
4. UI 响应式更新

## 扩展方向

1. 添加更多能源站类型（光伏、风电等）
2. 实现后端 API 对接
3. 添加更多优化算法
4. 实现用户配置持久化
5. 添加单元测试和 E2E 测试
6. 实现多场景对比功能
