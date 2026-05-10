<script lang="ts">
  import { dataStore } from '../services/dataStore';

  const stats = $derived(dataStore.getStatistics());
</script>

<header class="header">
  <div class="header-content">
    <div class="logo-section">
      <div class="logo-icon">🛣️</div>
      <div class="logo-text">
        <h1>RoadGuard</h1>
        <p>路面病害演化追踪系统</p>
      </div>
    </div>
    <div class="header-stats">
      <div class="stat-item">
        <span class="stat-value">{stats.totalCracks}</span>
        <span class="stat-label">裂缝总数</span>
      </div>
      <div class="stat-item critical">
        <span class="stat-value">{stats.criticalCracks}</span>
        <span class="stat-label">危急裂缝</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">¥{stats.maintenanceCost.toLocaleString()}</span>
        <span class="stat-label">养护成本</span>
      </div>
    </div>
  </div>
</header>

<style>
  .header {
    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
    color: white;
    padding: 20px 24px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .logo-icon {
    font-size: 48px;
  }

  .logo-text h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
  }

  .logo-text p {
    font-size: 13px;
    opacity: 0.9;
    margin: 4px 0 0;
  }

  .header-stats {
    display: flex;
    gap: 24px;
  }

  .stat-item {
    text-align: right;
  }

  .stat-item.critical .stat-value {
    color: #fca5a5;
  }

  .stat-value {
    display: block;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 12px;
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }

    .header-stats {
      width: 100%;
      justify-content: space-between;
    }

    .stat-item {
      text-align: left;
    }
  }
</style>