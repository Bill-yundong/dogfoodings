<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useShoesStore } from '@/stores/shoes'
import { syncService } from '@/services/syncService'
import type { Shoes } from '@/types'

const shoesStore = useShoesStore()

const selectedShoes = ref<Shoes | null>(null)
const showAddDialog = ref(false)
const isSyncing = ref(false)

const newShoes = ref({
  brand: '',
  model: '',
  purchaseDate: '',
  totalKilometers: 0,
  expectedLifespan: 800,
  nickname: ''
})

const syncState = computed(() => syncService.syncState)
const isOnline = computed(() => syncService.getOnlineStatus())

const brands = ['Nike', 'Adidas', 'Asics', 'Brooks', 'New Balance', 'Hoka', 'Saucony', 'Mizuno']

function selectShoes(shoes: Shoes) {
  selectedShoes.value = shoes
}

function getWearProgress(shoes: Shoes) {
  const wearData = shoesStore.getWearData(shoes.id)
  if (!wearData) return (shoes.totalKilometers / shoes.expectedLifespan) * 100
  return 100 - wearData.remainingLife
}

function getWearColor(progress: number) {
  if (progress < 50) return '#00B42A'
  if (progress < 80) return '#FF7D00'
  return '#F53F3F'
}

function getWearStatus(progress: number) {
  if (progress < 50) return { text: '状态良好', class: 'status-good' }
  if (progress < 80) return { text: '中度磨损', class: 'status-warning' }
  return { text: '建议更换', class: 'status-danger' }
}

async function handleSync() {
  isSyncing.value = true
  await syncService.forceSync()
  isSyncing.value = false
}

async function handleAddShoes() {
  if (!newShoes.value.brand || !newShoes.value.model) return
  
  await shoesStore.addShoes({
    brand: newShoes.value.brand,
    model: newShoes.value.model,
    purchaseDate: new Date(newShoes.value.purchaseDate),
    totalKilometers: newShoes.value.totalKilometers,
    expectedLifespan: newShoes.value.expectedLifespan,
    nickname: newShoes.value.nickname
  })
  
  showAddDialog.value = false
  newShoes.value = {
    brand: '',
    model: '',
    purchaseDate: '',
    totalKilometers: 0,
    expectedLifespan: 800,
    nickname: ''
  }
}

onMounted(async () => {
  await shoesStore.loadShoes()
})
</script>

<template>
  <div class="shoes-page">
    <div class="page-actions">
      <div class="sync-status card">
        <div class="sync-info">
          <span class="status-dot" :class="{ online: isOnline.value, offline: !isOnline.value }"></span>
          <span class="status-text">{{ isOnline.value ? '在线' : '离线' }}</span>
          <span class="sync-count">待同步: {{ syncState.pendingRecords }} 条</span>
        </div>
        <el-button 
          type="primary" 
          size="small" 
          :loading="isSyncing"
          @click="handleSync"
        >
          <el-icon><Refresh /></el-icon>
          同步数据
        </el-button>
      </div>
      <el-button type="primary" size="large" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        添加跑鞋
      </el-button>
    </div>

    <div class="shoes-grid" v-if="shoesStore.shoesList.length > 0">
      <div 
        class="shoes-card card" 
        v-for="shoes in shoesStore.shoesList" 
        :key="shoes.id"
        :class="{ selected: selectedShoes?.id === shoes.id }"
        @click="selectShoes(shoes)"
      >
        <div class="shoes-header">
          <span class="shoes-icon">👟</span>
          <div class="shoes-brand-model">
            <h3>{{ shoes.brand }}</h3>
            <p>{{ shoes.nickname || shoes.model }}</p>
          </div>
          <span 
            class="wear-status" 
            :class="getWearStatus(getWearProgress(shoes)).class"
          >
            {{ getWearStatus(getWearProgress(shoes)).text }}
          </span>
        </div>
        
        <div class="wear-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ 
                width: `${Math.min(100, getWearProgress(shoes))}%`,
                backgroundColor: getWearColor(getWearProgress(shoes))
              }"
            ></div>
          </div>
          <div class="progress-labels">
            <span>{{ shoes.totalKilometers.toFixed(0) }} km</span>
            <span>{{ shoes.expectedLifespan }} km</span>
          </div>
        </div>

        <div class="shoes-details">
          <div class="detail-item">
            <span class="label">购买日期</span>
            <span class="value">{{ new Date(shoes.purchaseDate).toLocaleDateString() }}</span>
          </div>
          <div class="detail-item">
            <span class="label">剩余寿命</span>
            <span class="value" :style="{ color: getWearColor(getWearProgress(shoes)) }">
              {{ (100 - getWearProgress(shoes)).toFixed(0) }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="empty-state card" v-else>
      <span class="empty-icon">👟</span>
      <h3>还没有添加跑鞋</h3>
      <p>添加您的跑鞋以跟踪磨损情况和使用寿命</p>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        添加第一双跑鞋
      </el-button>
    </div>

    <div class="wear-detail card" v-if="selectedShoes">
      <div class="card-header">
        <h3><el-icon><DataLine /></el-icon> 磨损详情 - {{ selectedShoes.brand }} {{ selectedShoes.model }}</h3>
      </div>
      <div class="wear-content">
        <div class="wear-regions">
          <div class="region-section">
            <h4>足跟磨损</h4>
            <div class="region-bars">
              <div class="region-bar" v-for="i in 3" :key="'heel-' + i">
                <span class="region-name">区域 {{ i }}</span>
                <div class="bar-container">
                  <div class="bar-fill" :style="{ width: `${30 + i * 15}%` }"></div>
                </div>
                <span class="bar-value">{{ 30 + i * 15 }}%</span>
              </div>
            </div>
          </div>
          <div class="region-section">
            <h4>前掌磨损</h4>
            <div class="region-bars">
              <div class="region-bar" v-for="i in 4" :key="'fore-' + i">
                <span class="region-name">区域 {{ i }}</span>
                <div class="bar-container">
                  <div class="bar-fill" :style="{ width: `${20 + i * 12}%` }"></div>
                </div>
                <span class="bar-value">{{ 20 + i * 12 }}%</span>
              </div>
            </div>
          </div>
          <div class="region-section">
            <h4>中底磨损</h4>
            <div class="region-bars">
              <div class="region-bar" v-for="i in 3" :key="'mid-' + i">
                <span class="region-name">区域 {{ i }}</span>
                <div class="bar-container">
                  <div class="bar-fill" :style="{ width: `${15 + i * 10}%` }"></div>
                </div>
                <span class="bar-value">{{ 15 + i * 10 }}%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="wear-summary">
          <div class="summary-item">
            <span class="summary-icon">⚠️</span>
            <div>
              <span class="summary-value font-display">正常</span>
              <span class="summary-label">磨损状态</span>
            </div>
          </div>
          <div class="summary-item">
            <span class="summary-icon">📅</span>
            <div>
              <span class="summary-value font-display">~300</span>
              <span class="summary-label">预计剩余km</span>
            </div>
          </div>
          <div class="summary-item">
            <span class="summary-icon">💡</span>
            <div>
              <span class="summary-value font-display">良好</span>
              <span class="summary-label">缓震性能</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showAddDialog" title="添加跑鞋" width="500px">
      <el-form :model="newShoes" label-width="100px">
        <el-form-item label="品牌">
          <el-select v-model="newShoes.brand" placeholder="选择品牌" style="width: 100%">
            <el-option v-for="brand in brands" :key="brand" :label="brand" :value="brand" />
          </el-select>
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="newShoes.model" placeholder="输入型号" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="newShoes.nickname" placeholder="给这双鞋起个名字（可选）" />
        </el-form-item>
        <el-form-item label="购买日期">
          <el-date-picker 
            v-model="newShoes.purchaseDate" 
            type="date" 
            placeholder="选择日期" 
            style="width: 100%" 
          />
        </el-form-item>
        <el-form-item label="已跑里程">
          <el-input-number v-model="newShoes.totalKilometers" :min="0" :max="2000" />
          <span style="margin-left: 8px; color: var(--text-secondary);">km</span>
        </el-form-item>
        <el-form-item label="预期寿命">
          <el-input-number v-model="newShoes.expectedLifespan" :min="400" :max="1500" :step="100" />
          <span style="margin-left: 8px; color: var(--text-secondary);">km</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddShoes">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.shoes-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
}

.sync-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  
  &.online {
    background: var(--success-color);
  }
  
  &.offline {
    background: var(--danger-color);
  }
}

.status-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.sync-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.shoes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.card {
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.shoes-card {
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover, &.selected {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
}

.shoes-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.shoes-icon {
  font-size: 40px;
}

.shoes-brand-model {
  flex: 1;
  
  h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.wear-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  
  &.status-good {
    background: rgba(0, 180, 42, 0.1);
    color: var(--success-color);
  }
  
  &.status-warning {
    background: rgba(255, 125, 0, 0.1);
    color: var(--warning-color);
  }
  
  &.status-danger {
    background: rgba(245, 63, 63, 0.1);
    color: var(--danger-color);
  }
}

.wear-progress {
  margin-bottom: 16px;
}

.progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-tertiary);
}

.shoes-details {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  .label {
    font-size: 11px;
    color: var(--text-tertiary);
  }
  
  .value {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
  }
  
  p {
    margin: 0 0 20px 0;
    color: var(--text-secondary);
  }
}

.wear-detail {
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }
}

.wear-content {
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
}

.wear-regions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.region-section h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.region-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.region-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.region-name {
  width: 60px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.bar-container {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
  border-radius: 3px;
}

.bar-value {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
}

.wear-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  font-size: 28px;
}

.summary-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
</style>
