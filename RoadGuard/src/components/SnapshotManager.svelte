<script lang="ts">
  import type { Snapshot } from '../types';

  type SnapshotService = typeof import('../services/snapshot').snapshotService;

  let { snapshotService }: { snapshotService: SnapshotService } = $props();

  let snapshots = $state<Snapshot[]>([]);
  let selectedSnapshot = $state<Snapshot | null>(null);
  let filterYear = $state<string>('all');
  let filterType = $state<string>('all');
  let filterSection = $state<string>('all');
  let availableYears = $state<number[]>([]);
  let stats = $state<{
    total: number;
    byYear: Record<number, number>;
    byType: Record<string, number>;
    bySection: Record<string, number>;
  } | null>(null);

  const imageTypeLabels: Record<string, string> = {
    'visual': '可见光影像',
    'thermal': '热红外影像',
    '3d_scan': '3D扫描',
    'radar': '雷达影像'
  };

  const annotationTypeLabels: Record<string, string> = {
    'crack': '裂缝',
    'pothole': '坑洞',
    'rutting': '车辙',
    'deformation': '变形'
  };

  async function loadSnapshots() {
    snapshots = await snapshotService.getAllSnapshots();
    availableYears = Array.from(new Set(snapshots.map(s => s.year))).sort((a, b) => b - a);
    stats = await snapshotService.getStats();
  }

  const filteredSnapshots = $derived(() => {
    return snapshots.filter(s => {
      const yearMatch = filterYear === 'all' || s.year === parseInt(filterYear);
      const typeMatch = filterType === 'all' || s.imageType === filterType;
      const sectionMatch = filterSection === 'all' || s.roadSection === filterSection;
      return yearMatch && typeMatch && sectionMatch;
    });
  });

  const roadSections = $derived(() => {
    return Array.from(new Set(snapshots.map(s => s.roadSection))).sort();
  });

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  }

  $effect(() => {
    loadSnapshots();
  });
</script>

<div class="snapshot-manager">
  <div class="filters-panel card">
    <div class="filter-group">
      <label>年份筛选</label>
      <select bind:value={filterYear}>
        <option value="all">全部年份</option>
        {#each availableYears as year}
          <option value={String(year)}>{year}年</option>
        {/each}
      </select>
    </div>
    <div class="filter-group">
      <label>影像类型</label>
      <select bind:value={filterType}>
        <option value="all">全部类型</option>
        <option value="visual">可见光</option>
        <option value="thermal">热红外</option>
        <option value="3d_scan">3D扫描</option>
        <option value="radar">雷达</option>
      </select>
    </div>
    <div class="filter-group">
      <label>路段筛选</label>
      <select bind:value={filterSection}>
        <option value="all">全部路段</option>
        {#each roadSections() as section}
          <option value={section}>{section}</option>
        {/each}
      </select>
    </div>
    <div class="count-badge">
      共 {filteredSnapshots().length} 张快照
    </div>
  </div>

  {#if stats}
    <div class="grid grid-4 stats-grid">
      <div class="stat-card">
        <span class="stat-label">快照总数</span>
        <span class="stat-value">{stats.total}</span>
      </div>
      {#each Object.entries(stats.byYear) as [year, count]}
        <div class="stat-card">
          <span class="stat-label">{year}年</span>
          <span class="stat-value">{count}张</span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="main-content grid grid-2">
    <div class="card gallery-panel">
      <h3 class="card-title">影像列表</h3>
      <div class="snapshot-grid">
        {#each filteredSnapshots() as snapshot (snapshot.id)}
          <div
            class={`snapshot-card ${selectedSnapshot?.id === snapshot.id ? 'selected' : ''}`}
            onclick={() => (selectedSnapshot = snapshot)}
          >
            <div class="thumbnail">
              <img src={snapshot.imageData} alt={snapshot.id} />
              <span class="type-badge">{imageTypeLabels[snapshot.imageType]}</span>
            </div>
            <div class="info">
              <span class="road-section">{snapshot.roadSection}</span>
              <span class="date">{formatDate(snapshot.captureDate)}</span>
            </div>
          </div>
        {:else}
          <div class="no-snapshots">
            <span class="empty-icon">📷</span>
            <p>暂无符合条件的快照</p>
          </div>
        {/each}
      </div>
    </div>

    <div class="card detail-panel">
      <h3 class="card-title">快照详情</h3>
      {#if selectedSnapshot}
        <div class="detail-content">
          <div class="image-container">
            <img src={selectedSnapshot.imageData} alt={selectedSnapshot.id} />
            <svg class="annotation-overlay" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
              {#each selectedSnapshot.annotations as ann}
                <g>
                  <rect
                    x={ann.boundingBox.x}
                    y={ann.boundingBox.y}
                    width={ann.boundingBox.width}
                    height={ann.boundingBox.height}
                    fill="none"
                    stroke="#ef4444"
                    stroke-width="2"
                  />
                  <rect
                    x={ann.boundingBox.x}
                    y={ann.boundingBox.y - 24}
                    width={120}
                    height={20}
                    fill="#ef4444"
                    opacity="0.9"
                  />
                  <text
                    x={ann.boundingBox.x + 5}
                    y={ann.boundingBox.y - 9}
                    fill="white"
                    font-size="12"
                    font-weight="500"
                  >
                    {annotationTypeLabels[ann.type]} ({(ann.confidence * 100).toFixed(0)}%)
                  </text>
                </g>
              {/each}
            </svg>
          </div>

          <div class="metadata-grid">
            <div class="meta-item">
              <span class="meta-label">快照ID</span>
              <span class="meta-value">{selectedSnapshot.id}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">路段编号</span>
              <span class="meta-value">{selectedSnapshot.roadSection}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">拍摄日期</span>
              <span class="meta-value">{formatDate(selectedSnapshot.captureDate)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">年份</span>
              <span class="meta-value">{selectedSnapshot.year}年</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">影像类型</span>
              <span class="meta-value">{imageTypeLabels[selectedSnapshot.imageType]}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">分辨率</span>
              <span class="meta-value">{selectedSnapshot.resolution.width} × {selectedSnapshot.resolution.height}</span>
            </div>
          </div>

          <div class="metadata-section">
            <h4>采集元数据</h4>
            <div class="meta-grid">
              {#if selectedSnapshot.metadata.weather}
                <div class="meta-item">
                  <span class="meta-label">天气</span>
                  <span class="meta-value">{selectedSnapshot.metadata.weather}</span>
                </div>
              {/if}
              {#if selectedSnapshot.metadata.temperature}
                <div class="meta-item">
                  <span class="meta-label">温度</span>
                  <span class="meta-value">{selectedSnapshot.metadata.temperature}°C</span>
                </div>
              {/if}
              {#if selectedSnapshot.metadata.humidity}
                <div class="meta-item">
                  <span class="meta-label">湿度</span>
                  <span class="meta-value">{selectedSnapshot.metadata.humidity}%</span>
                </div>
              {/if}
              {#if selectedSnapshot.metadata.equipment}
                <div class="meta-item">
                  <span class="meta-label">设备</span>
                  <span class="meta-value">{selectedSnapshot.metadata.equipment}</span>
                </div>
              {/if}
              {#if selectedSnapshot.metadata.operator}
                <div class="meta-item">
                  <span class="meta-label">操作员</span>
                  <span class="meta-value">{selectedSnapshot.metadata.operator}</span>
                </div>
              {/if}
            </div>
          </div>

          <div class="annotations-section">
            <h4>病害标注 ({selectedSnapshot.annotations.length})</h4>
            {#each selectedSnapshot.annotations as ann}
              <div class="annotation-item">
                <span class={`ann-type ann-${ann.type}`}>{annotationTypeLabels[ann.type]}</span>
                <span class="ann-confidence">{(ann.confidence * 100).toFixed(0)}%</span>
                {#if ann.notes}
                  <span class="ann-notes">{ann.notes}</span>
                {/if}
              </div>
            {/each}
          </div>

          <div class="related-section">
            <h4>关联裂缝</h4>
            <div class="related-cracks">
              {#each selectedSnapshot.associatedCracks as crackId}
                <span class="crack-tag">{crackId}</span>
              {/each}
            </div>
          </div>
        </div>
      {:else}
        <div class="empty-state">
          <span class="empty-icon">👆</span>
          <p>选择左侧快照查看详情</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .snapshot-manager {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .filters-panel {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-group label {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  select {
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
    background: white;
    min-width: 150px;
  }

  select:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .count-badge {
    margin-left: auto;
    padding: 8px 16px;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }

  .grid-4 {
    grid-template-columns: repeat(4, 1fr);
  }

  .stat-card {
    background: white;
    padding: 16px;
    border-radius: 8px;
    text-align: center;
    border: 1px solid var(--border-color);
  }

  .stat-label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .stat-value {
    display: block;
    font-size: 20px;
    font-weight: 700;
    color: var(--primary-color);
  }

  .main-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--text-primary);
  }

  .gallery-panel {
    max-height: 600px;
    overflow-y: auto;
  }

  .snapshot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .snapshot-card {
    background: #f8fafc;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .snapshot-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
  }

  .snapshot-card.selected {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  }

  .thumbnail {
    position: relative;
    aspect-ratio: 4/3;
    background: #e2e8f0;
  }

  .thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .type-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    padding: 2px 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 10px;
    border-radius: 4px;
  }

  .info {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .road-section {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .date {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .no-snapshots {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: var(--text-secondary);
  }

  .detail-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: 550px;
    overflow-y: auto;
  }

  .image-container {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    background: #f1f5f9;
  }

  .image-container img {
    width: 100%;
    height: auto;
    display: block;
  }

  .annotation-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .meta-value {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .metadata-section,
  .annotations-section,
  .related-section {
    background: #f8fafc;
    padding: 16px;
    border-radius: 8px;
  }

  .metadata-section h4,
  .annotations-section h4,
  .related-section h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }

  .annotation-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: white;
    border-radius: 6px;
    margin-bottom: 8px;
  }

  .ann-type {
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  .ann-crack { background: #fee2e2; color: #991b1b; }
  .ann-pothole { background: #fef3c7; color: #92400e; }
  .ann-rutting { background: #dbeafe; color: #1e40af; }
  .ann-deformation { background: #f3e8ff; color: #7c3aed; }

  .ann-confidence {
    font-size: 12px;
    font-weight: 600;
    color: var(--primary-color);
  }

  .ann-notes {
    font-size: 12px;
    color: var(--text-secondary);
    margin-left: auto;
  }

  .related-cracks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .crack-tag {
    padding: 4px 12px;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  @media (max-width: 768px) {
    .main-content {
      grid-template-columns: 1fr;
    }

    .grid-4 {
      grid-template-columns: repeat(2, 1fr);
    }

    .filters-panel {
      flex-direction: column;
      align-items: stretch;
    }

    .count-badge {
      margin-left: 0;
      text-align: center;
    }
  }
</style>