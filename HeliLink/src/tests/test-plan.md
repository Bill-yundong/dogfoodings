# HeliLink 集成测试计划

## 1. 测试范围

### 1.1 核心业务场景
| 场景ID | 业务场景 | 优先级 | 涉及模块 |
|--------|----------|--------|----------|
| SC-001 | 系统初始化与种子数据加载 | P0 | services/seedData, db/index |
| SC-002 | 用户认证与权限控制 | P0 | store/authStore, pages/Login, components/ProtectedRoute |
| SC-003 | 综合监控大屏气象数据展示 | P0 | pages/Dashboard, components/DataCard, store/weatherStore |
| SC-004 | DWA算法着陆窗口计算 | P0 | services/dwaEngine, workers/dwa.worker |
| SC-005 | 三维地图可视化 | P1 | components/ThreeDMap |
| SC-006 | 航线规划与DWA参数配置 | P0 | pages/RoutePlanning, store/routeStore |
| SC-007 | 语义同步引擎 | P0 | services/semanticSync, store/syncStore |
| SC-008 | 三端同步状态监控 | P0 | pages/SemanticSync, components/SyncStatusPanel |
| SC-009 | 离线缓存管理 | P0 | store/offlineStore, db/index |
| SC-010 | 应急模式切换 | P0 | pages/OfflineManagement |
| SC-011 | 系统用户管理 | P1 | pages/SystemManagement |
| SC-012 | 实时告警推送 | P1 | store/alertStore, services/websocket |

### 1.2 核心技术模块
| 模块ID | 技术模块 | 优先级 |
|--------|----------|--------|
| TM-001 | DWA动态窗算法引擎 | P0 |
| TM-002 | 语义同步引擎 | P0 |
| TM-003 | IndexedDB数据层 | P0 |
| TM-004 | Zustand状态管理 | P0 |
| TM-005 | Web Worker多线程计算 | P1 |
| TM-006 | API服务层 | P0 |
| TM-007 | 通用组件库 | P1 |

### 1.3 代码覆盖率目标
- 语句覆盖率: ≥ 70%
- 分支覆盖率: ≥ 60%
- 函数覆盖率: ≥ 70%
- 行覆盖率: ≥ 70%

## 2. 测试用例设计

### 2.1 单元测试用例

#### TC-UNIT-001: DWA算法安全评分计算
- 前置条件: 无
- 测试步骤: 调用DWASolver.calculateSafetyScore传入不同气象参数
- 预期结果: 安全评分 = 风速评分*40% + 浪高评分*40% + 能见度评分*20%
- 覆盖范围: services/dwaEngine.ts

#### TC-UNIT-002: DWA算法着陆窗口识别
- 前置条件: 模拟气象数据序列
- 测试步骤: 调用DWASolver.solve识别着陆窗口
- 预期结果: 正确识别满足阈值条件的连续时间窗口
- 覆盖范围: services/dwaEngine.ts

#### TC-UNIT-003: DWA参数权重归一化
- 前置条件: DWAParams对象
- 测试步骤: 传入safetyWeight=0.6, timeWeight=0.25, fuelWeight=0.15
- 预期结果: 权重和为1.0，综合评分计算正确
- 覆盖范围: services/dwaEngine.ts

#### TC-UNIT-004: 语义标签映射
- 前置条件: 气象数据(风速=18m/s)
- 测试步骤: 调用SemanticSyncEngine.mapToSemanticTag
- 预期结果: 映射到"高风速预警"标签，严重程度=warning
- 覆盖范围: services/semanticSync.ts

#### TC-UNIT-005: 三端一致性校验
- 前置条件: 三端同步数据
- 测试步骤: 调用SemanticSyncEngine.verifyConsensus
- 预期结果: ≥70%一致返回true，否则返回false
- 覆盖范围: services/semanticSync.ts

#### TC-UNIT-006: 冲突解决策略
- 前置条件: 三端数据冲突(危险状态)
- 测试步骤: 调用SemanticSyncEngine.resolveConflict
- 预期结果: 危险优先级 > 气象系统优先 > 时间戳最新
- 覆盖范围: services/semanticSync.ts

#### TC-UNIT-007: IndexedDB数据增删改查
- 前置条件: 数据库连接正常
- 测试步骤: 对platformMetadata表执行CRUD操作
- 预期结果: 所有操作正确执行
- 覆盖范围: db/index.ts

#### TC-UNIT-008: 离线队列管理
- 前置条件: 数据库连接正常
- 测试步骤: 添加队列项、处理队列、统计队列状态
- 预期结果: 队列状态正确更新
- 覆盖范围: db/index.ts, store/offlineStore.ts

#### TC-UNIT-009: 权限校验
- 前置条件: 不同角色用户
- 测试步骤: 调用hasPermission检查各种权限
- 预期结果: admin拥有全部权限，其他角色按配置返回
- 覆盖范围: store/authStore.ts

#### TC-UNIT-010: 种子数据初始化
- 前置条件: 空数据库
- 测试步骤: 调用SeedDataService.initialize()
- 预期结果: 所有种子数据正确插入
- 覆盖范围: services/seedData.ts

### 2.2 集成测试用例

#### TC-INT-001: 登录流程集成
- 前置条件: 未登录状态
- 测试步骤:
  1. 访问/login页面
  2. 输入admin/123456
  3. 点击登录按钮
- 预期结果:
  1. 登录成功
  2. 自动跳转到/dashboard
  3. authStore状态正确更新
  4. localStorage持久化认证状态
- 覆盖范围: pages/Login.tsx, store/authStore.ts, services/api.ts

#### TC-INT-002: 监控大屏数据加载集成
- 前置条件: 已登录为admin
- 测试步骤:
  1. 访问/dashboard页面
  2. 等待数据加载完成
- 预期结果:
  1. 显示当前平台气象数据(风速、浪高、能见度、温度)
  2. 显示着陆可行性评分仪表盘
  3. 显示三维地球可视化
  4. 显示气象趋势图表
  5. 显示三端同步状态
  6. 显示着陆窗口时间轴
- 覆盖范围: pages/Dashboard.tsx, store/weatherStore.ts, services/websocket.ts

#### TC-INT-003: 航线规划流程集成
- 前置条件: 已登录，拥有route:create权限
- 测试步骤:
  1. 访问/route页面
  2. 选择起点平台和终点平台
  3. 调整DWA参数(安全权重0.7，时效权重0.2，油耗权重0.1)
  4. 点击"计算航线"按钮
- 预期结果:
  1. 生成3条备选航线方案
  2. 显示航线对比表格(距离、时间、油耗、风险)
  3. 三维地图高亮显示选中航线
  4. routeStore状态正确更新
- 覆盖范围: pages/RoutePlanning.tsx, store/routeStore.ts, services/api.ts

#### TC-INT-004: 语义同步管理集成
- 前置条件: 已登录，拥有sync:configure权限
- 测试步骤:
  1. 访问/semantic页面
  2. 查看三端同步状态
  3. 编辑某个语义标签的阈值
  4. 保存修改
  5. 点击"立即同步"按钮
- 预期结果:
  1. 显示三端系统的在线状态和延迟
  2. 标签修改正确保存到IndexedDB
  3. 同步状态刷新，显示同步进度
  4. 存在冲突时显示冲突解决选项
- 覆盖范围: pages/SemanticSync.tsx, store/syncStore.ts, services/semanticSync.ts

#### TC-INT-005: 离线管理应急模式集成
- 前置条件: 已登录，拥有offline:configure权限
- 测试步骤:
  1. 访问/offline页面
  2. 查看缓存统计和队列状态
  3. 开启"应急模式"开关
  4. 确认进入应急模式
  5. 查看应急安全指引
- 预期结果:
  1. 显示IndexedDB各表的存储统计
  2. 应急模式激活，系统切换到离线优先策略
  3. 显示应急安全指引弹窗
  4. offlineStore状态正确更新
  5. 告警中心产生应急模式告警
- 覆盖范围: pages/OfflineManagement.tsx, store/offlineStore.ts, store/alertStore.ts

#### TC-INT-006: 系统管理用户操作集成
- 前置条件: 已登录为admin
- 测试步骤:
  1. 访问/system页面
  2. 查看用户列表
  3. 添加新用户(指定角色)
  4. 编辑用户信息
  5. 删除用户
- 预期结果:
  1. 显示所有用户列表和角色权限
  2. 新用户正确添加到mock数据
  3. 用户信息更新正确
  4. 用户删除成功
- 覆盖范围: pages/SystemManagement.tsx

#### TC-INT-007: 平台切换与数据联动集成
- 前置条件: 已登录，在/dashboard页面
- 测试步骤:
  1. 从平台选择下拉框切换到不同平台
  2. 观察各组件数据更新
- 预期结果:
  1. 气象数据卡片更新为选中平台的数据
  2. 着陆窗口重新计算
  3. 气象趋势图表更新
  4. 三维地图聚焦到选中平台
- 覆盖范围: pages/Dashboard.tsx, store/weatherStore.ts

#### TC-INT-008: WebSocket实时数据推送集成
- 前置条件: 已登录，WebSocket连接正常
- 测试步骤:
  1. 在/dashboard页面等待
  2. 观察气象数据更新
- 预期结果:
  1. 每3秒自动更新气象数据
  2. 每2秒更新直升机位置
  3. 异常气象数据自动触发告警
- 覆盖范围: services/websocket.ts, store/weatherStore.ts, store/alertStore.ts

### 2.3 边界条件测试

#### TC-EDGE-001: 极端气象条件
- 测试数据: 风速=30m/s, 浪高=8m, 能见度=0.5km
- 预期结果: 着陆可行性评分<30，无安全着陆窗口

#### TC-EDGE-002: 完美气象条件
- 测试数据: 风速=5m/s, 浪高=1m, 能见度=15km
- 预期结果: 着陆可行性评分>90，连续多个安全窗口

#### TC-EDGE-003: 权限不足访问
- 测试步骤: 以safety角色访问/system页面
- 预期结果: 自动重定向到/dashboard，显示无权限提示

#### TC-EDGE-004: DWA参数极端值
- 测试数据: safetyWeight=1.0, timeWeight=0, fuelWeight=0
- 预期结果: 仅考虑安全性，不考虑时间和油耗

## 3. 测试执行计划

### 3.1 测试环境
- Node.js: v18+
- 浏览器: jsdom (测试环境)
- 数据库: IndexedDB (内存模式)
- 测试框架: Vitest 1.0+

### 3.2 测试执行顺序
1. 单元测试 (核心算法、数据层、状态管理)
2. 组件测试 (通用组件)
3. 集成测试 (业务场景)
4. 边界条件测试

### 3.3 缺陷等级定义
- **P0 (Critical)**: 核心功能无法使用，数据丢失，系统崩溃
- **P1 (High)**: 主要功能异常，影响业务流程
- **P2 (Medium)**: 次要功能异常，不影响主流程
- **P3 (Low)**: UI显示问题，文案错误

## 4. 测试报告模板

测试报告将包含以下内容：
1. 测试概述 (执行时间、环境、范围)
2. 测试用例执行统计 (通过/失败/跳过)
3. 代码覆盖率报告 (各模块覆盖率)
4. 缺陷汇总 (按等级分类)
5. 核心业务场景验证结果
6. 设计预期符合性评估
7. 风险评估与建议
