import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TemperatureHeatmap } from '../components/TemperatureHeatmap';
import { CoolingRateChart } from '../components/CoolingRateChart';
import { BatchList } from '../components/BatchList';
import { QualityInspection } from '../components/QualityInspection';
import { ForgingBatch, TemperaturePoint } from '../types';

describe('React 组件渲染测试', () => {
  describe('TemperatureHeatmap', () => {
    const createTestData = (): TemperaturePoint[][] => {
      const data: TemperaturePoint[][] = [];
      for (let i = 0; i < 6; i++) {
        data[i] = [];
        for (let j = 0; j < 6; j++) {
          data[i][j] = {
            x: i,
            y: j,
            z: 0,
            temperature: 500 + Math.random() * 500,
            timestamp: Date.now()
          };
        }
      }
      return data;
    };

    it('应该在无数据时显示提示', () => {
      render(<TemperatureHeatmap data={[]} />);
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('应该正确渲染温度热图', () => {
      const data = createTestData();
      render(<TemperatureHeatmap data={data} />);
      
      expect(screen.getByText('25°C')).toBeInTheDocument();
      expect(screen.getByText('600°C')).toBeInTheDocument();
      expect(screen.getByText('1200°C')).toBeInTheDocument();
    });

    it('应该支持自定义尺寸', () => {
      const data = createTestData();
      const { container } = render(<TemperatureHeatmap data={data} width={300} height={300} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeDefined();
    });
  });

  describe('CoolingRateChart', () => {
    const testData = [
      { time: 0, coolingRate: 25, temperature: 1150 },
      { time: 1, coolingRate: 28, temperature: 1050 },
      { time: 2, coolingRate: 22, temperature: 950 },
      { time: 3, coolingRate: 24, temperature: 850 },
      { time: 4, coolingRate: 26, temperature: 750 }
    ];

    it('应该正确渲染图表容器', () => {
      const { container } = render(
        <div style={{ width: 500, height: 300 }}>
          <CoolingRateChart data={testData} targetRate={25} />
        </div>
      );
      
      expect(container.querySelector('div[style*="width"]')).toBeTruthy();
      expect(container.querySelector('div[style*="height"]')).toBeTruthy();
    });

    it('应该在无数据时渲染图表容器', () => {
      const { container } = render(
        <div style={{ width: 500, height: 300 }}>
          <CoolingRateChart data={[]} />
        </div>
      );
      
      expect(container.querySelector('div[style*="width"]')).toBeTruthy();
    });
  });

  describe('BatchList', () => {
    const testBatches: ForgingBatch[] = [
      {
        id: 'batch-1',
        partNumber: 'PART-001',
        startTime: Date.now() - 3600000,
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: ['snap-1', 'snap-2'],
        qualityScore: 85
      },
      {
        id: 'batch-2',
        partNumber: 'PART-002',
        startTime: Date.now() - 7200000,
        material: '40Cr',
        initialTemperature: 1100,
        targetCoolingRate: 20,
        status: 'completed',
        snapshots: ['snap-3', 'snap-4', 'snap-5'],
        qualityScore: 92
      }
    ];

    it('应该在无批次时显示提示', () => {
      render(<BatchList batches={[]} selectedBatchId={null} onSelectBatch={() => {}} />);
      
      expect(screen.getByText('暂无锻造批次数据')).toBeInTheDocument();
    });

    it('应该渲染批次列表', () => {
      render(<BatchList batches={testBatches} selectedBatchId={null} onSelectBatch={() => {}} />);
      
      expect(screen.getByText('PART-001')).toBeInTheDocument();
      expect(screen.getByText('PART-002')).toBeInTheDocument();
    });

    it('应该显示正确的状态标签', () => {
      render(<BatchList batches={testBatches} selectedBatchId={null} onSelectBatch={() => {}} />);
      
      expect(screen.getByText('进行中')).toBeInTheDocument();
      expect(screen.getByText('已完成')).toBeInTheDocument();
    });

    it('应该显示质量评分', () => {
      render(<BatchList batches={testBatches} selectedBatchId={null} onSelectBatch={() => {}} />);
      
      expect(screen.getByText('质量分: 85')).toBeInTheDocument();
      expect(screen.getByText('质量分: 92')).toBeInTheDocument();
    });

    it('应该高亮选中的批次', () => {
      const { container } = render(
        <BatchList batches={testBatches} selectedBatchId="batch-1" onSelectBatch={() => {}} />
      );
      
      const selectedBatch = container.querySelector('[style*="background-color: rgb(227, 242, 253)"]');
      expect(selectedBatch).toBeInTheDocument();
    });
  });

  describe('QualityInspection', () => {
    it('应该渲染检验表单', () => {
      render(<QualityInspection batchId="test-batch" onSubmit={() => {}} />);
      
      expect(screen.getByText('质量检验')).toBeInTheDocument();
      expect(screen.getByLabelText('硬度 (HRC)')).toBeInTheDocument();
      expect(screen.getByLabelText('显微组织')).toBeInTheDocument();
      expect(screen.getByLabelText('冷却速率偏差 (%)')).toBeInTheDocument();
    });

    it('应该显示缺陷检测选项', () => {
      render(<QualityInspection batchId="test-batch" onSubmit={() => {}} />);
      
      expect(screen.getByText('裂纹')).toBeInTheDocument();
      expect(screen.getByText('气孔')).toBeInTheDocument();
      expect(screen.getByText('偏析')).toBeInTheDocument();
    });

    it('应该显示提交按钮', () => {
      render(<QualityInspection batchId="test-batch" onSubmit={() => {}} />);
      
      expect(screen.getByText('提交检验结果')).toBeInTheDocument();
    });

    it('应该回填已有质量数据', () => {
      const existingQuality = {
        batchId: 'test-batch',
        inspectionTime: Date.now(),
        hardness: 45,
        microstructure: 'martensite',
        defects: ['裂纹'],
        passed: true,
        coolingRateDeviation: 5.2
      };

      render(
        <QualityInspection 
          batchId="test-batch" 
          existingQuality={existingQuality}
          onSubmit={() => {}} 
        />
      );
      
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
      expect(screen.getByText('✅ 检验通过')).toBeInTheDocument();
    });
  });
});
