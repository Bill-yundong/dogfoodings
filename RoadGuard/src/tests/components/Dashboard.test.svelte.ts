import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Dashboard from '../../components/Dashboard.svelte';
import { dataStore } from '../../services/dataStore';

describe('Dashboard Component', () => {
  beforeEach(async () => {
    await dataStore.init();
  });

  describe('渲染测试', () => {
    it('应该正确渲染 Dashboard 组件', () => {
      render(Dashboard);
      expect(document.querySelector('.dashboard')).toBeInTheDocument();
    });

    it('应该显示裂缝列表区域', () => {
      render(Dashboard);
      const crackList = document.querySelector('.crack-list');
      expect(crackList).toBeInTheDocument();
    });

    it('裂缝列表应该显示正确数量的裂缝项', () => {
      render(Dashboard);
      const crackItems = document.querySelectorAll('.crack-item');
      const cracks = dataStore.getCracks();
      expect(crackItems.length).toBe(cracks.length);
    });

    it('每个裂缝项应该显示ID和严重程度标签', () => {
      render(Dashboard);
      const firstCrack = document.querySelector('.crack-item');
      expect(firstCrack).toBeInTheDocument();
      expect(firstCrack?.querySelector('.crack-id')).toBeInTheDocument();
      expect(firstCrack?.querySelector('.status-badge')).toBeInTheDocument();
    });
  });

  describe('统计卡片测试', () => {
    it('应该显示统计卡片网格', () => {
      render(Dashboard);
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards.length).toBe(3);
    });

    it('统计卡片应该包含图标和数值', () => {
      render(Dashboard);
      const firstCard = document.querySelector('.stat-card');
      expect(firstCard?.querySelector('.stat-number')).toBeInTheDocument();
      expect(firstCard?.querySelector('.stat-title')).toBeInTheDocument();
    });

    it('统计数值应该与服务层数据一致', async () => {
      render(Dashboard);
      const stats = dataStore.getStatistics();
      const statNumbers = document.querySelectorAll('.stat-number');

      expect(statNumbers[0]?.textContent).toContain(String(stats.totalCracks));
      expect(statNumbers[2]?.textContent).toContain(String(stats.maintenanceCost));
    });
  });

  describe('养护记录表测试', () => {
    it('应该显示养护记录表', () => {
      render(Dashboard);
      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('表格应该包含正确的表头', () => {
      render(Dashboard);
      const headers = document.querySelectorAll('th');
      const headerTexts = Array.from(headers).map(h => h.textContent);

      expect(headerTexts).toContain('记录编号');
      expect(headerTexts).toContain('裂缝ID');
      expect(headerTexts).toContain('操作类型');
      expect(headerTexts).toContain('描述');
      expect(headerTexts).toContain('执行日期');
      expect(headerTexts).toContain('费用');
    });

    it('表格应该显示养护记录数据', () => {
      render(Dashboard);
      const rows = document.querySelectorAll('tbody tr');
      const maintenance = dataStore.getMaintenanceRecords();
      expect(rows.length).toBe(Math.min(maintenance.length, 5));
    });
  });

  describe('详情面板测试', () => {
    it('初始状态应该显示空状态提示', () => {
      render(Dashboard);
      const emptyState = document.querySelector('.empty-state');
      expect(emptyState).toBeInTheDocument();
    });

    it('点击裂缝后应该显示裂缝详情', async () => {
      render(Dashboard);
      const crackItems = document.querySelectorAll('.crack-item');

      if (crackItems.length > 0) {
        (crackItems[0] as HTMLElement).click();

        await new Promise(resolve => setTimeout(resolve, 100));

        const detailPanel = document.querySelector('.detail-panel');
        expect(detailPanel).toBeInTheDocument();
        expect(document.querySelector('.detail-grid')).toBeInTheDocument();
      }
    });

    it('详情面板应该包含裂缝可视化区域', async () => {
      render(Dashboard);
      const crackItems = document.querySelectorAll('.crack-item');

      if (crackItems.length > 0) {
        (crackItems[0] as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 100));

        const visualization = document.querySelector('.visualization');
        expect(visualization).toBeInTheDocument();
        expect(visualization?.querySelector('svg')).toBeInTheDocument();
      }
    });

    it('详情面板应该显示相关养护记录', async () => {
      render(Dashboard);
      const crackItems = document.querySelectorAll('.crack-item');

      if (crackItems.length > 0) {
        (crackItems[0] as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 100));

        const relatedSection = document.querySelector('.related-maintenance');
        expect(relatedSection).toBeInTheDocument();
      }
    });
  });

  describe('交互测试', () => {
    it('点击裂缝应该高亮选中状态', async () => {
      render(Dashboard);
      const crackItems = document.querySelectorAll('.crack-item');

      if (crackItems.length > 0) {
        (crackItems[0] as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(crackItems[0]).toHaveClass('selected');
      }
    });

    it('详情应该显示正确的裂缝信息', async () => {
      render(Dashboard);
      const cracks = dataStore.getCracks();
      const crackItems = document.querySelectorAll('.crack-item');

      if (crackItems.length > 0) {
        (crackItems[0] as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 100));

        const detailId = document.querySelector('.detail-id');
        expect(detailId?.textContent).toBe(cracks[0].id);
      }
    });
  });

  describe('严重程度样式测试', () => {
    it('不同严重程度的裂缝应该有不同的状态徽章样式', () => {
      render(Dashboard);
      const badges = document.querySelectorAll('.status-badge');

      badges.forEach(badge => {
        const hasClass = ['status-normal', 'status-warning', 'status-danger'].some(
          className => badge.classList.contains(className)
        );
        expect(hasClass).toBe(true);
      });
    });
  });
});
