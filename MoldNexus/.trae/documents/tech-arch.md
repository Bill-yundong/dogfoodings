## 1. 架构设计

```mermaid
flowchart TB
    subgraph "Frontend Layer"
        A["SolidJS SPA"]
        B["UI Components"]
        C["Fluid Visualization (WebGL)"]
        D["State Management (Solid Stores)"]
    end

    subgraph "Computation Layer"
        E["LBM Fluid Engine (WebWorker)"]
        F["Defect Prediction Engine"]
        G["Pressure Wave Analyzer"]
    end

    subgraph "Data Layer"
        H["IndexedDB (Parameter Snapshots)"]
        I["LocalStorage (User Preferences)"]
        J["Semantic Mapping Engine"]
    end

    subgraph "Integration Layer"
        K["MES System Adapter"]
        L["REST API Client"]
        M["WebSocket (Real-time Data)"]
    end

    A --> B
    A --> C
    A --> D
    D --> E
    D --> F
    D --> G
    E --> C
    F --> C
    G --> C
    D --> H
    D --> I
    J --> H
    J --> K
    K --> L
    K --> M
```

## 2. 技术描述

- **前端框架**：SolidJS 1.8 + TypeScript 5.0
- **构建工具**：Vite 5.0
- **样式方案**：TailwindCSS 3.4
- **状态管理**：SolidJS 内置 Store
- **流体可视化**：WebGL2 + 自定义粒子渲染引擎
- **计算引擎**：WebWorker + LBM 格子玻尔兹曼方法实现
- **数据存储**：IndexedDB (idb) + LocalStorage
- **路由管理**：@solidjs/router
- **图表库**：@antv/g2
- **图标库**：lucide-solid
- **日期处理**：date-fns

## 3. 路由定义

| 路由 | 页面组件 | 权限控制 | 描述 |
|-------|---------|----------|------|
| / | Dashboard | 所有角色 | 系统概览与快捷入口 |
| /simulation | SimulationWorkbench | 工艺工程师/质量工程师 | 充填动力学模拟工作台 |
| /parameters | ParameterManager | 工艺工程师/质量工程师 | 参数快照管理与对比 |
| /mapping | SemanticMapping | 工艺工程师/管理员 | 语义映射规则配置 |
| /collaboration | CollaborationCenter | 所有角色 | 跨部门协作中心 |
| /analytics | AnalyticsReport | 质量工程师/管理员 | 分析报告与统计 |
| /settings | SystemSettings | 管理员 | 系统设置 |

## 4. 数据模型

### 4.1 核心数据结构

```mermaid
erDiagram
    SIMULATION ||--o{ SNAPSHOT : has
    SNAPSHOT ||--o{ DEFECT : predicts
    MOLD ||--o{ SIMULATION : uses
    PARAMETER_SET ||--o{ SNAPSHOT : belongs_to
    MAPPING_RULE ||--o{ PARAMETER_SET : transforms
    USER ||--o{ SIMULATION : creates
    USER ||--o{ COMMENT : posts
    SIMULATION ||--o{ COMMENT : has

    USER {
        uuid id PK
        string name
        string role
        string email
        datetime created_at
    }

    MOLD {
        uuid id PK
        string name
        json geometry
        string material
        float cavity_volume
    }

    SIMULATION {
        uuid id PK
        uuid mold_id FK
        uuid user_id FK
        string name
        string status
        datetime created_at
        datetime updated_at
    }

    PARAMETER_SET {
        uuid id PK
        uuid simulation_id FK
        float melt_temperature
        float mold_temperature
        float injection_speed
        float packing_pressure
        float packing_time
        float cooling_time
        json custom_params
    }

    SNAPSHOT {
        uuid id PK
        uuid simulation_id FK
        uuid parameter_set_id FK
        int version
        float fill_time
        float max_pressure
        float temperature_distribution
        json flow_front_data
        json pressure_wave_data
        datetime created_at
    }

    DEFECT {
        uuid id PK
        uuid snapshot_id FK
        string type
        float severity
        json position
        string description
    }

    MAPPING_RULE {
        uuid id PK
        string source_field
        string target_field
        string transform_expression
        string system_type
        boolean is_active
    }

    COMMENT {
        uuid id PK
        uuid simulation_id FK
        uuid user_id FK
        text content
        datetime created_at
    }
```

### 4.2 IndexedDB Schema

| Object Store | Key Path | Indexes | 描述 |
|-------------|----------|---------|------|
| snapshots | id | [simulation_id, version, created_at] | 模拟快照存储 |
| parameter_sets | id | [simulation_id, created_at] | 参数集存储 |
| mapping_rules | id | [system_type, is_active] | 语义映射规则 |
| simulations | id | [user_id, status, created_at] | 模拟任务 |
| molds | id | [material, created_at] | 模具信息 |
| defects | id | [snapshot_id, type, severity] | 缺陷预测结果 |

## 5. 核心模块

### 5.1 流体演化引擎 (LBM)

**核心算法**：D2Q9 格子玻尔兹曼模型
- 平衡分布函数计算
- 碰撞步 (BGK 模型)
- 迁移步
- 边界条件处理 (反弹边界)

**性能优化**：
- WebWorker 异步计算
- TypedArray 内存优化
- 分块计算策略
- 增量数据传输

### 5.2 缺陷预测模型

**缺陷类型**：
- 熔接痕 (Weld Line)：基于流速差与温度梯度检测
- 气泡 (Air Trap)：基于压力场与充填顺序分析
- 短射 (Short Shot)：基于充填率与压力阈值判断
- 焦烧 (Burn Mark)：基于剪切速率与温度预测

### 5.3 语义映射引擎

**映射策略**：
- 字段级直接映射
- 单位转换映射
- 公式计算映射
- 枚举值映射
- 条件分支映射

## 6. 性能指标

- 流体模拟帧率：2D 模拟 ≥ 30fps (100x100 网格)
- 快照存储性能：单条写入 < 10ms
- 万级数据查询：< 500ms
- 压力波可视化延迟：< 100ms
- 页面加载时间：< 2s
