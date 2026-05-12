# WindPulse - 远海风机叶片结冰预警系统

基于 Vue 3 的远海风机叶片结冰预警系统，实现高空湿度与气温关联数据在运维平台与除冰系统间的语义同步，利用异步热传导-对流耦合模型预测覆冰质量。

## 核心功能

### 1. 语义同步模块 (SemanticSyncService)
- 实现运维平台与除冰系统之间的数据同步
- 支持高空湿度、温度、风速、海拔等传感器数据融合
- 数据语义增强，确保多源数据一致性
- 实时同步状态监控

### 2. 覆冰质量预测模块 (IcingPredictionService)
- 基于异步热传导-对流耦合模型
- 考虑雷诺数、努塞尔特数等流体力学参数
- 计算液态水含量和收集效率
- 预测覆冰质量并划分风险等级（低/中/高/严重）
- 置信度评估

### 3. IndexedDB 事件档案存储 (IcingEventDB)
- 持久化存储历史覆冰事件
- 按风电场、严重程度、时间范围查询
- 维护成本统计和节省估算
- 离线可用

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **图表库**: ECharts + vue-echarts
- **本地存储**: IndexedDB (idb 库)

## 项目结构

```
src/
├── components/
│   ├── IcingWarningPanel.vue    # 结冰预警面板
│   ├── SyncStatusPanel.vue       # 同步状态面板
│   ├── IcingTrendChart.vue       # 结冰趋势图表
│   └── IcingEventList.vue        # 历史事件列表
├── services/
│   ├── SemanticSyncService.ts    # 语义同步服务
│   ├── IcingPredictionService.ts # 覆冰预测服务
│   └── IcingEventDB.ts           # IndexedDB 数据库服务
├── types/
│   └── index.ts                   # TypeScript 类型定义
├── App.vue
├── main.ts
└── style.css
```

## 快速开始

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 构建生产版本：
```bash
npm run build
```

## 使用说明

1. **连接系统**：依次点击「运维平台」和「除冰系统」的连接按钮
2. **启动同步**：点击「开始同步」启动数据模拟和同步流程
3. **监控预警**：左侧面板显示实时传感器数据和覆冰预测结果
4. **查看趋势**：右侧上方图表展示覆冰质量和温度的历史趋势
5. **历史事件**：右侧下方列表展示历史覆冰事件档案，支持按严重程度筛选

## 算法原理

### 热传导-对流耦合模型

1. **热传递计算**：
   - 雷诺数：$Re = \frac{v \cdot L}{\nu}$
   - 努塞尔特数：$Nu = 0.664 \cdot Re^{0.5} \cdot Pr^{0.33}$
   - 对流换热系数 + 热传导耦合

2. **覆冰预测**：
   - 液态水含量 (LWC) 计算
   - 水滴收集效率估算
   - 结冰率 = 水含量 × 收集效率 × 冻结分数
   - 预测质量 = 结冰率 × 时间

## 成本节约

系统通过预警提前启动除冰系统，预计可减少约 30% 的严重覆冰事件，显著降低运维成本。
