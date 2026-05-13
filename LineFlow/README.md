# LineFlow - 离散制造业总装线动态平衡与仿真系统

基于 Vue 3 和排队论的离散制造业生产线仿真平台，支持瓶颈识别、异常模拟和离线数据存储。

## 架构设计

### 分层架构

```
src/
├── domain/                    # 领域层
│   ├── entities/             # 领域实体
│   │   ├── Workstation.ts     # 工位实体
│   │   ├── Product.ts         # 产品实体
│   │   └── ProductionLine.ts # 生产线实体
│   └── value-objects/       # 值对象
│       ├── WorkstationStatus.ts # 工位状态
│       └── QueueMetrics.ts  # 排队指标
│
├── infra/                     # 基础设施层
│   ├── engine/             # 核心引擎
│   │   ├── QueueingTheoryEngine.ts # 排队论引擎
│   │   └── SimulationEngine.ts   # 仿真引擎
│   └── storage/            # 存储模块
│       └── IndexedDBStore.ts     # IndexedDB 存储
│
├── application/               # 应用服务层
│   └── ProductionLineService.ts   # 生产线服务
│
├── presentation/              # 表示层
│   ├── components/        # UI 组件
│   │   ├── WorkstationCard.vue
│   │   ├── MetricsPanel.vue
│   │   ├── AlertPanel.vue
│   │   ├── OptimizationPanel.vue
│   │   └── ControlPanel.vue
│   ├── views/             # 页面视图
│   │   └── KanbanView.vue
│   └── stores/            # 状态管理
│       └── productionLine.ts
│
├── styles/                  # 样式
│   └── global.css
├── App.vue
└── main.ts
```

## 核心功能

### 1. 排队论引擎 (QueueingTheoryEngine)
- 基于 M/M/1 排队模型计算各工位指标
- 到达率、服务率、利用率、平均队列长度
- 瓶颈工位自动识别
- OEE（设备综合效率计算
- 优化建议生成

### 2. 离散事件仿真引擎 (SimulationEngine)
- 事件驱动的生产流程仿真
- 产品到达、加工完成、故障触发、维修等事件
- 随机故障模拟（泊松分布）
- 可调节仿真速度 (0.1x - 5x)
- 实时状态更新

### 3. IndexedDB 离线存储 (IndexedDBStore)
- 自动定期保存生产线状态快照
- 告警数据持久化
- 最多存储 50000+ 条历史快照
- 按时间范围、生产线 ID 查询

### 4. 瓶颈识别与优化建议
- 实时计算各工位利用率
- 瓶颈严重程度分级（低/中/高/严重）
- 针对瓶颈工位的优化建议
- 工艺改进、设备维护、操作员培训等

## 技术栈

- **框架**: Vue 3 + Composition API
- **状态管理**: Pinia
- **样式**: Tailwind CSS 3
- **数据库**: IndexedDB (idb 库)
- **语言**: TypeScript
- **构建工具**: Vite

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 功能说明

### 控制面板
- **开始仿真**: 启动生产线仿真
- **暂停/继续**: 暂停或恢复仿真
- **停止**: 停止仿真
- **速度调节**: 0.1x - 5x 仿真速度

### 工位卡片
- 实时显示工位状态（空闲/运行/阻塞/故障
- 节拍时间、实际用时、队列长度
- 利用率进度条
- 点击触发故障
- 瓶颈工位高亮

### 关键指标
- OEE 综合效率
- 产出率（件/小时）
- 在制品数量 (WIP)
- 可用率、性能率、质量率
- 运行工位数量

### 告警中心
- 故障告警实时推送
- 队列溢出告警
- 告警确认功能
- 按严重程度分级显示

### 优化建议
- 瓶颈工位识别
- 严重程度评估
- 针对性改进建议
- 优化效果预期

## 仿真流程

1. **产品按设定节拍时间持续到达生产线
2. **产品按顺序经过各工位加工
3. **各工位处理时间存在随机波动
4. **可能随机发生故障并自动修复
5. **队列过长时触发阻塞告警
6. **排队论算法实时计算指标
7. **识别瓶颈工位并给出建议

## 核心算法

### 排队论 M/M/1 模型

```
利用率 ρ = 到达率 λ / 服务率 μ
平均队列长度 Lq = ρ² / (1 - ρ)
平均等待时间 Wq = Lq / λ
```

### OEE 计算

```
OEE = 可用率 × 性能率 × 质量率
可用率 = 运行工位数 / 总工位数
性能率 = 目标节拍时间总和 / 实际节拍时间总和
质量率 = 合格品率 (默认 98.5%)
```

## 数据持久化

系统使用 IndexedDB 存储：
- 生产线状态快照（每 2 秒自动保存）
- 告警记录
- 同步队列
- 最多保留 50000 条快照记录

## 开发说明

### 添加新工位
在 `ProductionLineService.ts` 中修改 `createDefaultProductionLine` 方法：

```typescript
const workstations = [
  new Workstation({
    id: 'WS-001',
    name: '工位名称',
    index: 0,
    cycleTime: 45,  // 目标节拍时间（秒）
    capacity: 15    // 队列容量
  }),
  // ...
]
```

### 调整故障概率
在 `SimulationEngine.ts` 中修改：

```typescript
// 约 0.2% 概率触发随机故障
if (Math.random() < 0.002) {
  this.scheduleBreakdown(stationIndex)
}
```

### 修改快照保存间隔
在 `ProductionLineService.ts` 中修改：

```typescript
// 每 2 秒保存一次快照
this.snapshotInterval = window.setInterval(async () => {
  // ...
}, 2000)
```

## License

MIT
