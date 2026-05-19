<template>
  <div class="database-view">
    <div class="view-header">
      <h2>🗄️ 流体特征数据库</h2>
      <p>IndexedDB 缓存的不同物性流体搅拌特征快照</p>
    </div>

    <div class="database-stats">
      <div class="stat-card">
        <div class="stat-icon">💧</div>
        <div>
          <div class="stat-value">{{ fluids.length }}</div>
          <div class="stat-label">流体类型</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📸</div>
        <div>
          <div class="stat-value">{{ snapshots.length }}</div>
          <div class="stat-label">特征快照</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🧪</div>
        <div>
          <div class="stat-value">{{ simulations.length }}</div>
          <div class="stat-label">仿真记录</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💾</div>
        <div>
          <div class="stat-value">{{ storageSize }}</div>
          <div class="stat-label">存储大小</div>
        </div>
      </div>
    </div>

    <div class="database-layout">
      <div class="fluids-section">
        <div class="section-header">
          <h3>💧 流体物性库</h3>
          <button class="btn btn-secondary btn-sm" @click="showAddFluid = true">
            ➕ 添加流体
          </button>
        </div>
        
        <div class="fluids-grid">
          <div 
            v-for="fluid in fluids" 
            :key="fluid.id" 
            class="fluid-card"
            :class="{ active: selectedFluidId === fluid.id }"
            @click="selectFluid(fluid.id)"
          >
            <div class="fluid-color" :style="{ background: fluid.color }"></div>
            <div class="fluid-info">
              <div class="fluid-name">{{ fluid.name }}</div>
              <div class="fluid-props">
                <span>μ: {{ fluid.viscosity }} Pa·s</span>
                <span>ρ: {{ fluid.density }} kg/m³</span>
              </div>
            </div>
            <button 
              class="delete-btn" 
              @click.stop="deleteFluid(fluid.id)"
              title="删除流体"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <div class="snapshots-section">
        <div class="section-header">
          <h3>📸 搅拌特征快照</h3>
          <div class="filter-controls">
            <select class="form-input form-select form-input-sm" v-model="filterFluidId">
              <option :value="null">全部流体</option>
              <option v-for="fluid in fluids" :key="fluid.id" :value="fluid.id">
                {{ fluid.name }}
              </option>
            </select>
            <button class="btn btn-secondary btn-sm" @click="loadSnapshots">
              🔄 刷新
            </button>
            <button class="btn btn-secondary btn-sm" @click="exportData">
              📤 导出
            </button>
          </div>
        </div>

        <div class="snapshots-table-container">
          <table class="snapshots-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>流体</th>
                <th>混合均匀度</th>
                <th>死区占比</th>
                <th>雷诺数</th>
                <th>步数</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="snapshot in filteredSnapshots" 
                :key="snapshot.id"
                class="snapshot-row"
                @click="viewSnapshot(snapshot)"
              >
                <td>#{{ snapshot.id }}</td>
                <td>
                  <span class="fluid-badge">{{ snapshot.fluidName }}</span>
                </td>
                <td>
                  <div class="progress-cell">
                    <div 
                      class="progress-fill" 
                      :style="{ 
                        width: (snapshot.mixingQuality * 100) + '%',
                        background: getQualityColor(snapshot.mixingQuality)
                      }"
                    ></div>
                    <span class="progress-text">{{ (snapshot.mixingQuality * 100).toFixed(1) }}%</span>
                  </div>
                </td>
                <td :class="snapshot.deadZoneRatio > 0.1 ? 'text-danger' : 'text-success'">
                  {{ (snapshot.deadZoneRatio * 100).toFixed(2) }}%
                </td>
                <td class="monospace">{{ snapshot.reynoldsNumber?.toExponential(2) || '-' }}</td>
                <td>{{ snapshot.step || '-' }}</td>
                <td class="monospace">{{ formatTime(snapshot.timestamp) }}</td>
                <td>
                  <button 
                    class="btn-icon" 
                    @click.stop="deleteSnapshot(snapshot.id)"
                    title="删除快照"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
              <tr v-if="filteredSnapshots.length === 0">
                <td colspan="8" class="empty-state">
                  <div class="empty-icon">📭</div>
                  <div>暂无快照数据</div>
                  <div class="empty-hint">在仿真页面开始仿真以生成快照</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showAddFluid" class="modal-overlay" @click.self="showAddFluid = false">
      <div class="modal">
        <div class="modal-header">
          <h3>➕ 添加新流体</h3>
          <button class="close-btn" @click="showAddFluid = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">流体名称</label>
            <input class="form-input" v-model="newFluid.name" placeholder="例如: 乙醇溶液" />
          </div>
          <div class="form-group">
            <label class="form-label">粘度 (Pa·s)</label>
            <input 
              class="form-input" 
              type="number" 
              step="0.001" 
              v-model.number="newFluid.viscosity" 
              placeholder="0.001"
            />
          </div>
          <div class="form-group">
            <label class="form-label">密度 (kg/m³)</label>
            <input 
              class="form-input" 
              type="number" 
              v-model.number="newFluid.density" 
              placeholder="1000"
            />
          </div>
          <div class="form-group">
            <label class="form-label">标识颜色</label>
            <input class="form-input" type="color" v-model="newFluid.color" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddFluid = false">取消</button>
          <button class="btn btn-primary" @click="addFluid">添加</button>
        </div>
      </div>
    </div>

    <div v-if="selectedSnapshot" class="modal-overlay" @click.self="selectedSnapshot = null">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>📊 快照详情 #{{ selectedSnapshot.id }}</h3>
          <button class="close-btn" @click="selectedSnapshot = null">✕</button>
        </div>
        <div class="modal-body">
          <div class="snapshot-detail-grid">
            <div class="detail-section">
              <h4>基本信息</h4>
              <div class="detail-row">
                <span>流体:</span>
                <span>{{ selectedSnapshot.fluidName }}</span>
              </div>
              <div class="detail-row">
                <span>混合均匀度:</span>
                <span class="text-primary">{{ (selectedSnapshot.mixingQuality * 100).toFixed(2) }}%</span>
              </div>
              <div class="detail-row">
                <span>死区占比:</span>
                <span :class="selectedSnapshot.deadZoneRatio > 0.1 ? 'text-danger' : 'text-success'">
                  {{ (selectedSnapshot.deadZoneRatio * 100).toFixed(2) }}%
                </span>
              </div>
              <div class="detail-row">
                <span>雷诺数:</span>
                <span class="monospace">{{ selectedSnapshot.reynoldsNumber?.toExponential(2) }}</span>
              </div>
              <div class="detail-row">
                <span>仿真步数:</span>
                <span>{{ selectedSnapshot.step }}</span>
              </div>
              <div class="detail-row">
                <span>保存时间:</span>
                <span class="monospace">{{ formatTime(selectedSnapshot.timestamp) }}</span>
              </div>
            </div>
            
            <div class="detail-section">
              <h4>仿真参数</h4>
              <div class="detail-row" v-if="selectedSnapshot.parameters">
                <span>搅拌转速:</span>
                <span>{{ selectedSnapshot.parameters.impellerSpeed }} RPM</span>
              </div>
              <div class="detail-row" v-if="selectedSnapshot.parameters">
                <span>网格分辨率:</span>
                <span>{{ selectedSnapshot.parameters.gridSize?.x }} × {{ selectedSnapshot.parameters.gridSize?.y }}</span>
              </div>
              <div class="detail-row" v-if="selectedSnapshot.parameters">
                <span>粘度:</span>
                <span>{{ selectedSnapshot.parameters.viscosity }} Pa·s</span>
              </div>
              <div class="detail-row" v-if="selectedSnapshot.parameters">
                <span>密度:</span>
                <span>{{ selectedSnapshot.parameters.density }} kg/m³</span>
              </div>
            </div>
          </div>
          
          <div class="snapshot-preview" v-if="selectedSnapshot.concentration">
            <h4>浓度场预览</h4>
            <canvas ref="previewCanvas" width="256" height="256" class="preview-canvas"></canvas>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="selectedSnapshot = null">关闭</button>
          <button class="btn btn-primary" @click="syncSnapshot">📡 同步数据</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useSimulationStore } from '../stores/simulation'
import { db } from '../utils/indexedDB'
import { syncManager } from '../utils/dataSync'

const store = useSimulationStore()

const fluids = computed(() => store.fluids)
const snapshots = computed(() => store.snapshots)
const simulations = computed(() => store.simulations)

const filterFluidId = ref(null)
const selectedFluidId = ref(null)
const showAddFluid = ref(false)
const selectedSnapshot = ref(null)
const previewCanvas = ref(null)
const storageSize = ref('计算中...')

const newFluid = ref({
  name: '',
  viscosity: 0.001,
  density: 1000,
  color: '#00d4ff'
})

const filteredSnapshots = computed(() => {
  if (!filterFluidId.value) return snapshots.value
  return snapshots.value.filter(s => s.fluidId === filterFluidId.value)
})

function formatTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getQualityColor(quality) {
  if (quality >= 0.9) return 'var(--success)'
  if (quality >= 0.7) return 'var(--primary)'
  if (quality >= 0.4) return 'var(--warning)'
  return 'var(--danger)'
}

async function selectFluid(id) {
  selectedFluidId.value = id
  await store.loadSnapshots(id)
}

async function addFluid() {
  if (!newFluid.value.name) return
  
  try {
    const id = await db.addFluid({ ...newFluid.value })
    newFluid.value = { name: '', viscosity: 0.001, density: 1000, color: '#00d4ff' }
    showAddFluid.value = false
    await store.loadFluids()
  } catch (e) {
    console.error('Failed to add fluid:', e)
  }
}

async function deleteFluid(id) {
  if (!confirm('确定要删除此流体类型吗？')) return
  try {
    await db.deleteFluid(id)
    if (selectedFluidId.value === id) {
      selectedFluidId.value = null
      filterFluidId.value = null
    }
    await store.loadFluids()
    await store.loadSnapshots()
  } catch (e) {
    console.error('Failed to delete fluid:', e)
  }
}

async function deleteSnapshot(id) {
  if (!confirm('确定要删除此快照吗？')) return
  await store.deleteSnapshot(id)
}

async function loadSnapshots() {
  try {
    await store.loadSnapshots(filterFluidId.value)
    updateStorageSize()
  } catch (e) {
    console.error('Failed to load snapshots:', e)
    alert('加载快照失败，请刷新页面重试')
  }
}

function viewSnapshot(snapshot) {
  selectedSnapshot.value = snapshot
  nextTick(() => {
    renderPreview(snapshot)
  })
}

function renderPreview(snapshot) {
  const canvas = previewCanvas.value
  if (!canvas || !snapshot.concentration) return
  
  const ctx = canvas.getContext('2d')
  const conc = snapshot.concentration
  const size = Math.sqrt(conc.length)
  
  if (size !== Math.floor(size)) return
  
  const cellSize = canvas.width / size
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const idx = i * size + j
      const val = conc[idx]
      
      const px = Math.floor(i * cellSize)
      const py = Math.floor(j * cellSize)
      
      const r = Math.floor(10 + val * 0)
      const g = Math.floor(10 + val * 100)
      const b = Math.floor(26 + val * 229)
      
      for (let x = 0; x < cellSize; x++) {
        for (let y = 0; y < cellSize; y++) {
          const pidx = ((py + y) * canvas.width + (px + x)) * 4
          imageData.data[pidx] = r
          imageData.data[pidx + 1] = g
          imageData.data[pidx + 2] = b
          imageData.data[pidx + 3] = 255
        }
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0)
}

async function syncSnapshot() {
  if (!selectedSnapshot.value) return
  await syncManager.broadcastSnapshot(selectedSnapshot.value)
  alert('快照已加入同步队列！')
}

async function exportData() {
  try {
    const data = await db.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mixlogic-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Failed to export data:', e)
    alert('导出数据失败，请重试')
  }
}

async function updateStorageSize() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage || 0
    if (usage > 1024 * 1024) {
      storageSize.value = (usage / (1024 * 1024)).toFixed(2) + ' MB'
    } else if (usage > 1024) {
      storageSize.value = (usage / 1024).toFixed(2) + ' KB'
    } else {
      storageSize.value = usage + ' B'
    }
  } else {
    storageSize.value = '未知'
  }
}

watch(selectedSnapshot, (snap) => {
  if (snap) {
    nextTick(() => renderPreview(snap))
  }
})

onMounted(async () => {
  try {
    await store.loadFluids()
    await store.loadSnapshots()
    await store.loadSimulations()
    updateStorageSize()
  } catch (e) {
    console.error('Failed to initialize database view:', e)
    alert('数据库初始化失败，请刷新页面重试')
  }
})
</script>

<style scoped>
.database-view {
  width: 100%;
}

.view-header {
  margin-bottom: 24px;
}

.view-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: var(--text-primary);
}

.view-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.database-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.stat-icon {
  font-size: 32px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
  font-family: monospace;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.database-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
  align-items: start;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.filter-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-input-sm {
  padding: 6px 10px;
  font-size: 12px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.fluids-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fluid-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.fluid-card:hover {
  border-color: var(--primary);
  transform: translateX(4px);
}

.fluid-card.active {
  border-color: var(--primary);
  background: rgba(0, 212, 255, 0.1);
}

.fluid-color {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.fluid-info {
  flex: 1;
  min-width: 0;
}

.fluid-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.fluid-props {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}

.delete-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: rgba(255, 71, 87, 0.2);
  color: var(--danger);
}

.snapshots-table-container {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.snapshots-table {
  width: 100%;
  border-collapse: collapse;
}

.snapshots-table th {
  background: rgba(0, 212, 255, 0.1);
  padding: 14px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}

.snapshots-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 13px;
  color: var(--text-primary);
}

.snapshot-row {
  cursor: pointer;
  transition: background 0.2s ease;
}

.snapshot-row:hover {
  background: rgba(0, 212, 255, 0.05);
}

.fluid-badge {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(0, 212, 255, 0.15);
  color: var(--primary);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.progress-cell {
  position: relative;
  width: 120px;
  height: 24px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.monospace {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: rgba(255, 71, 87, 0.2);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.7;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 71, 87, 0.2);
  color: var(--danger);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border);
}

.snapshot-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 13px;
}

.detail-row span:first-child {
  color: var(--text-secondary);
}

.snapshot-preview h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--primary);
}

.preview-canvas {
  border-radius: 8px;
  border: 1px solid var(--border);
  image-rendering: pixelated;
}

@media (max-width: 1000px) {
  .database-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .database-layout {
    grid-template-columns: 1fr;
  }
  
  .snapshot-detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
