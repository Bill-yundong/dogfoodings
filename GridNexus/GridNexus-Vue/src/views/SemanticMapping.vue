<template>
  <div class="semantic-mapping">
    <h1>电网负荷流转中枢</h1>
    
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <span class="label">总负载:</span>
        <span class="value">{{ formatNumber(gridState?.keyMetrics.totalLoad || 0) }} MW</span>
      </div>
      <div class="status-item">
        <span class="label">总发电量:</span>
        <span class="value">{{ formatNumber(gridState?.keyMetrics.totalGeneration || 0) }} MW</span>
      </div>
      <div class="status-item">
        <span class="label">峰值负载:</span>
        <span class="value">{{ formatNumber(gridState?.keyMetrics.peakLoad || 0) }} MW</span>
      </div>
      <div class="status-item">
        <span class="label">平均负载:</span>
        <span class="value">{{ formatNumber(gridState?.keyMetrics.averageLoad || 0) }} MW</span>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧：拓扑图 -->
      <div class="topology-section">
        <h2>电网拓扑</h2>
        <div class="topology-canvas" ref="topologyCanvas"></div>
        <div class="topology-controls">
          <button @click="simulateTopologyChange" class="btn">模拟拓扑变化</button>
          <button @click="generateStateSnapshot" class="btn">生成状态快照</button>
        </div>
      </div>

      <!-- 右侧：语义映射 -->
      <div class="mapping-section">
        <h2>语义映射管理</h2>
        
        <div class="mapping-controls">
          <button @click="createDefaultMapping" class="btn">创建默认映射</button>
          <button @click="executeMapping" class="btn">执行映射</button>
          <button @click="sendDataToSubstation" class="btn">发送数据到变电站</button>
          <button @click="receiveDataFromSubstation" class="btn">接收变电站数据</button>
        </div>

        <!-- 数据传输日志 -->
        <div v-if="messageQueue.length > 0" class="message-log">
          <h3>数据传输日志</h3>
          <div class="message-list">
            <div v-for="(message, index) in messageQueue" :key="index" class="message-item" :class="message.type">
              <span class="message-type">{{ message.type === 'from-control-center' ? '发送' : '接收' }}</span>
              <span class="message-time">{{ formatDate(message.timestamp) }}</span>
              <pre class="message-data">{{ JSON.stringify(message.data, null, 2) }}</pre>
            </div>
          </div>
          <button @click="clearMessageQueue" class="btn btn-sm">清空日志</button>
        </div>

        <div class="mapping-list">
          <div v-for="mapping in mappings" :key="mapping.id" class="mapping-item">
            <h3>{{ mapping.sourceSystem }} → {{ mapping.targetSystem }}</h3>
            <div class="mapping-details">
              <div v-for="(item, index) in mapping.mappings" :key="index" class="mapping-field">
                <span class="source-field">{{ item.sourceField }}</span>
                <span class="arrow">→</span>
                <span class="target-field">{{ item.targetField }}</span>
                <span v-if="item.transformation" class="transformation">({{ item.transformation }})</span>
              </div>
            </div>
            <div class="mapping-actions">
              <button @click="editMapping(mapping)" class="btn btn-sm">编辑</button>
              <button @click="deleteMapping(mapping.id)" class="btn btn-sm btn-danger">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：扩容决策 -->
    <div class="expansion-section">
      <h2>扩容决策分析</h2>
      <div class="expansion-controls">
        <button @click="analyzeExpansion" :disabled="isAnalyzing" class="btn">
          {{ isAnalyzing ? '分析中...' : '分析扩容需求' }}
        </button>
        <button @click="generateOptimalPlan" :disabled="isAnalyzing" class="btn">
          {{ isAnalyzing ? '生成中...' : '生成最优扩容计划' }}
        </button>
      </div>

      <div v-if="expansionDecision" class="expansion-result">
        <div class="decision-header">
          <span class="decision-priority" :class="expansionDecision.priority">
            优先级: {{ expansionDecision.priority }}
          </span>
          <span class="decision-time">{{ formatDate(expansionDecision.timestamp) }}</span>
        </div>
        <div class="decision-reasoning">
          <pre>{{ expansionDecision.reasoning }}</pre>
        </div>
        <div class="decision-recommendations">
          <h3>建议</h3>
          <div v-for="(rec, index) in expansionDecision.recommendations" :key="index" class="recommendation-item">
            <div class="rec-header">
              <span class="rec-action">{{ getActionText(rec.action) }}</span>
              <span class="rec-cost">成本: {{ formatNumber(rec.estimatedCost) }} 元</span>
            </div>
            <div class="rec-details">{{ getRecDetails(rec) }}</div>
            <div class="rec-metrics">
              <span>预期收益: {{ formatNumber(rec.expectedBenefit) }} 元</span>
              <span>回收期: {{ rec.paybackPeriod.toFixed(1) }} 年</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 告警信息 -->
    <div v-if="gridState?.alerts && gridState.alerts.length > 0" class="alerts-section">
      <h2>告警信息</h2>
      <div class="alert-list">
        <div v-for="alert in gridState.alerts" :key="alert.id" class="alert-item" :class="alert.type">
          <span class="alert-type">{{ getAlertTypeText(alert.type) }}</span>
          <span class="alert-message">{{ alert.message }}</span>
          <span class="alert-time">{{ formatDate(alert.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { GridTopologyModel } from '../core/models/GridTopologyModel';
import { SemanticMappingService } from '../core/services/SemanticMappingService';
import { StateSnapshotService } from '../core/services/StateSnapshotService';
import { ExpansionDecisionService } from '../core/services/ExpansionDecisionService';
import type { GridState, SemanticMapping, ExpansionDecision } from '../core/types';

// 服务实例
const topologyModel = new GridTopologyModel();
const mappingService = new SemanticMappingService();
const snapshotService = new StateSnapshotService();
const expansionService = new ExpansionDecisionService();

// 响应式数据
const gridState = ref<GridState | null>(null);
const mappings = ref<SemanticMapping[]>([]);
const expansionDecision = ref<ExpansionDecision | null>(null);
const isAnalyzing = ref(false);
const topologyCanvas = ref<HTMLElement | null>(null);
const messageQueue = ref<any[]>([]);

// 初始化数据
onMounted(async () => {
  // 初始化数据库
  await snapshotService.init();
  
  // 初始化示例拓扑
  initializeSampleTopology();
  
  // 生成初始状态
  gridState.value = topologyModel.generateStateSnapshot();
  
  // 存储初始快照
  if (gridState.value) {
    await snapshotService.storeSnapshot(gridState.value);
  }
  
  // 生成默认映射
  const defaultMapping = mappingService.generateDefaultMapping('调度中心', '变电站');
  mappingService.createMapping(defaultMapping);
  mappings.value = mappingService.getAllMappings();
  
  // 绘制拓扑图
  drawTopology();
});

// 初始化示例拓扑
function initializeSampleTopology() {
  // 添加节点
  const nodes = [
    { id: 'sub1', name: '变电站1', type: 'substation' as const, capacity: 1000, currentLoad: 750, voltageLevel: 110, coordinates: { x: 100, y: 100 } },
    { id: 'sub2', name: '变电站2', type: 'substation' as const, capacity: 1200, currentLoad: 950, voltageLevel: 110, coordinates: { x: 300, y: 150 } },
    { id: 'gen1', name: '发电机1', type: 'generator' as const, capacity: 800, currentLoad: 700, voltageLevel: 35, coordinates: { x: 50, y: 200 } },
    { id: 'gen2', name: '发电机2', type: 'generator' as const, capacity: 1000, currentLoad: 850, voltageLevel: 35, coordinates: { x: 350, y: 250 } },
    { id: 'load1', name: '负荷1', type: 'load' as const, capacity: 600, currentLoad: 550, voltageLevel: 10, coordinates: { x: 150, y: 300 } },
    { id: 'load2', name: '负荷2', type: 'load' as const, capacity: 800, currentLoad: 720, voltageLevel: 10, coordinates: { x: 250, y: 350 } },
    { id: 'load3', name: '负荷3', type: 'load' as const, capacity: 500, currentLoad: 480, voltageLevel: 10, coordinates: { x: 400, y: 300 } }
  ];

  // 添加边
  const edges = [
    { id: 'edge1', source: 'gen1', target: 'sub1', capacity: 800, currentFlow: 700, impedance: 0.1 },
    { id: 'edge2', source: 'gen2', target: 'sub2', capacity: 1000, currentFlow: 850, impedance: 0.1 },
    { id: 'edge3', source: 'sub1', target: 'load1', capacity: 600, currentFlow: 550, impedance: 0.05 },
    { id: 'edge4', source: 'sub1', target: 'load2', capacity: 800, currentFlow: 720, impedance: 0.05 },
    { id: 'edge5', source: 'sub2', target: 'load3', capacity: 500, currentFlow: 480, impedance: 0.05 },
    { id: 'edge6', source: 'sub1', target: 'sub2', capacity: 500, currentFlow: 100, impedance: 0.08 }
  ];

  nodes.forEach(node => topologyModel.addNode(node));
  edges.forEach(edge => topologyModel.addEdge(edge));
}

// 绘制拓扑图
function drawTopology() {
  if (!topologyCanvas.value) return;
  
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 获取拓扑数据
  const topology = topologyModel.getTopology();
  
  // 绘制边
  topology.edges.forEach(edge => {
    const sourceNode = topology.nodes.find(n => n.id === edge.source);
    const targetNode = topology.nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      // 计算负载率
      const loadFactor = edge.currentFlow / edge.capacity;
      
      // 设置线条颜色和宽度
      ctx.strokeStyle = loadFactor > 0.8 ? '#ff4444' : loadFactor > 0.6 ? '#ffaa00' : '#44ff44';
      ctx.lineWidth = 2 + loadFactor * 3;
      
      // 绘制线条
      ctx.beginPath();
      ctx.moveTo(sourceNode.coordinates.x, sourceNode.coordinates.y);
      ctx.lineTo(targetNode.coordinates.x, targetNode.coordinates.y);
      ctx.stroke();
      
      // 绘制流量标签
      const midX = (sourceNode.coordinates.x + targetNode.coordinates.x) / 2;
      const midY = (sourceNode.coordinates.y + targetNode.coordinates.y) / 2;
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${edge.currentFlow}/${edge.capacity}`, midX, midY - 5);
    }
  });
  
  // 绘制节点
  topology.nodes.forEach(node => {
    // 计算负载率
    const loadFactor = node.currentLoad / node.capacity;
    
    // 设置节点颜色
    ctx.fillStyle = loadFactor > 0.8 ? '#ff4444' : loadFactor > 0.6 ? '#ffaa00' : '#44ff44';
    
    // 绘制节点圆圈
    ctx.beginPath();
    ctx.arc(node.coordinates.x, node.coordinates.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制节点名称
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(node.name, node.coordinates.x, node.coordinates.y + 5);
    
    // 绘制负载信息
    ctx.font = '10px Arial';
    ctx.fillText(`${node.currentLoad}/${node.capacity}`, node.coordinates.x, node.coordinates.y + 25);
  });
  
  // 清空容器并添加画布
  topologyCanvas.value.innerHTML = '';
  topologyCanvas.value.appendChild(canvas);
}

// 模拟拓扑变化
async function simulateTopologyChange() {
  topologyModel.simulateTopologyChange();
  gridState.value = topologyModel.generateStateSnapshot();
  
  // 存储快照
  if (gridState.value) {
    await snapshotService.storeSnapshot(gridState.value);
  }
  
  // 重绘拓扑图
  drawTopology();
}

// 生成状态快照
async function generateStateSnapshot() {
  gridState.value = topologyModel.generateStateSnapshot();
  
  // 存储快照
  if (gridState.value) {
    await snapshotService.storeSnapshot(gridState.value);
    console.log('状态快照已存储');
  }
}

// 创建默认映射
function createDefaultMapping() {
  const mapping = mappingService.generateDefaultMapping('调度中心', '变电站');
  mappingService.createMapping(mapping);
  mappings.value = mappingService.getAllMappings();
}

// 执行映射
function executeMapping() {
  if (!gridState.value) return;
  
  const mapping = mappings.value[0];
  if (!mapping) return;
  
  const sourceData = gridState.value.topology.nodes;
  const mappedData = mappingService.batchExecuteMapping(sourceData, mapping);
  
  console.log('映射结果:', mappedData);
  alert('映射执行完成，结果已输出到控制台');
}

// 编辑映射
function editMapping(mapping: SemanticMapping) {
  // 这里可以实现编辑逻辑，例如打开编辑对话框
  console.log('编辑映射:', mapping);
  alert(`编辑映射: ${mapping.sourceSystem} → ${mapping.targetSystem}`);
}

// 删除映射
function deleteMapping(id: string) {
  mappingService.deleteMapping(id);
  mappings.value = mappingService.getAllMappings();
}

// 发送数据到变电站
function sendDataToSubstation() {
  if (!gridState.value) return;
  
  const mapping = mappings.value[0];
  if (!mapping) return;
  
  const sourceData = gridState.value.topology.nodes[0]; // 取第一个节点作为示例数据
  try {
    mappingService.sendDataToSubstation(sourceData, mapping.id);
    messageQueue.value = mappingService.getMessageQueue();
    alert('数据已发送到变电站');
  } catch (error) {
    console.error('发送数据失败:', error);
    alert('发送数据失败: ' + error);
  }
}

// 接收变电站数据
function receiveDataFromSubstation() {
  const mapping = mappings.value[0];
  if (!mapping) return;
  
  // 模拟变电站数据
  const substationData = {
    id: 'sub1',
    name: '变电站1',
    capacity: 1000,
    currentLoad: 850,
    voltageLevel: 110,
    load: 850000, // 单位为瓦特
    maxCapacity: 1000000 // 单位为瓦特
  };
  
  try {
    mappingService.receiveDataFromSubstation(substationData, mapping.id);
    messageQueue.value = mappingService.getMessageQueue();
    alert('已接收变电站数据');
  } catch (error) {
    console.error('接收数据失败:', error);
    alert('接收数据失败: ' + error);
  }
}

// 清空消息队列
function clearMessageQueue() {
  mappingService.clearMessageQueue();
  messageQueue.value = [];
}

// 分析扩容需求
async function analyzeExpansion() {
  isAnalyzing.value = true;
  
  try {
    const topology = topologyModel.getTopology();
    expansionDecision.value = await expansionService.analyzeTopology(topology);
  } catch (error) {
    console.error('分析扩容需求失败:', error);
  } finally {
    isAnalyzing.value = false;
  }
}

// 生成最优扩容计划
async function generateOptimalPlan() {
  isAnalyzing.value = true;
  
  try {
    const topology = topologyModel.getTopology();
    const budget = 500000; // 50万预算
    expansionDecision.value = await expansionService.generateOptimalExpansionPlan(topology, budget);
  } catch (error) {
    console.error('生成最优扩容计划失败:', error);
  } finally {
    isAnalyzing.value = false;
  }
}

// 辅助函数
function formatNumber(num: number): string {
  return num.toFixed(2);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function getActionText(action: string): string {
  const actionMap: Record<string, string> = {
    add_capacity: '增加容量',
    add_node: '新增节点',
    upgrade_line: '升级线路'
  };
  return actionMap[action] || action;
}

function getRecDetails(rec: any): string {
  if (rec.action === 'add_capacity') {
    return `${rec.details.currentCapacity} → ${rec.details.recommendedCapacity}`;
  } else if (rec.action === 'upgrade_line') {
    return `${rec.details.source} → ${rec.details.target}: ${rec.details.currentCapacity} → ${rec.details.recommendedCapacity}`;
  }
  return '';
}

function getAlertTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    critical: '严重',
    warning: '警告',
    info: '信息'
  };
  return typeMap[type] || type;
}
</script>

<style scoped>
.semantic-mapping {
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 30px;
}

/* 状态栏 */
.status-bar {
  display: flex;
  justify-content: space-around;
  background-color: #f0f0f0;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.status-item {
  text-align: center;
}

.status-item .label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.status-item .value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

/* 主内容区 */
.main-content {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

/* 拓扑图部分 */
.topology-section {
  flex: 1;
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.topology-section h2 {
  color: #333;
  margin-bottom: 15px;
}

.topology-canvas {
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  height: 400px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.topology-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

/* 语义映射部分 */
.mapping-section {
  flex: 1;
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mapping-section h2 {
  color: #333;
  margin-bottom: 15px;
}

.mapping-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.mapping-list {
  max-height: 400px;
  overflow-y: auto;
}

.mapping-item {
  background-color: white;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.mapping-item h3 {
  color: #333;
  margin-bottom: 10px;
  font-size: 16px;
}

.mapping-field {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
  font-size: 14px;
}

.source-field {
  font-weight: bold;
  color: #0066cc;
}

.arrow {
  color: #666;
}

.target-field {
  color: #009933;
}

.transformation {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.mapping-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

/* 数据传输日志 */
.message-log {
  background-color: white;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-log h3 {
  color: #333;
  margin-bottom: 10px;
  font-size: 16px;
}

.message-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.message-item {
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  border-left: 4px solid #0066cc;
  background-color: #f8f9fa;
}

.message-item.from-control-center {
  border-left-color: #009933;
  background-color: #f1f8e9;
}

.message-item.from-substation {
  border-left-color: #0066cc;
  background-color: #e3f2fd;
}

.message-type {
  font-weight: bold;
  margin-right: 10px;
}

.message-time {
  font-size: 12px;
  color: #666;
  margin-right: 10px;
}

.message-data {
  margin-top: 5px;
  font-size: 12px;
  background-color: white;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ddd;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 扩容决策部分 */
.expansion-section {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.expansion-section h2 {
  color: #333;
  margin-bottom: 15px;
}

.expansion-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.expansion-result {
  background-color: white;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.decision-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.decision-priority {
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: bold;
}

.decision-priority.high {
  background-color: #ffdddd;
  color: #cc0000;
}

.decision-priority.medium {
  background-color: #fff3cd;
  color: #856404;
}

.decision-priority.low {
  background-color: #d4edda;
  color: #155724;
}

.decision-time {
  font-size: 14px;
  color: #666;
}

.decision-reasoning {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
}

.decision-recommendations h3 {
  margin-bottom: 10px;
  color: #333;
}

.recommendation-item {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  border-left: 4px solid #0066cc;
}

.rec-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-weight: bold;
}

.rec-details {
  margin-bottom: 5px;
  font-size: 14px;
  color: #666;
}

.rec-metrics {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #666;
}

/* 告警信息部分 */
.alerts-section {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.alerts-section h2 {
  color: #333;
  margin-bottom: 15px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  background-color: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.alert-item.critical {
  border-left: 4px solid #ff4444;
}

.alert-item.warning {
  border-left: 4px solid #ffaa00;
}

.alert-item.info {
  border-left: 4px solid #44aaff;
}

.alert-type {
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.alert-item.critical .alert-type {
  background-color: #ffdddd;
  color: #cc0000;
}

.alert-item.warning .alert-type {
  background-color: #fff3cd;
  color: #856404;
}

.alert-item.info .alert-type {
  background-color: #cce7ff;
  color: #004085;
}

.alert-message {
  flex: 1;
  font-size: 14px;
}

.alert-time {
  font-size: 12px;
  color: #666;
}

/* 按钮样式 */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn:hover {
  opacity: 0.8;
}

.btn:active {
  transform: translateY(1px);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .status-bar {
    flex-direction: column;
    gap: 10px;
  }
  
  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
