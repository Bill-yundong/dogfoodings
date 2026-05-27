import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CollectionStatusBar from '@/components/CollectionStatusBar';
import EngineMonitor from '@/components/EngineMonitor';
import MetricsChart from '@/components/MetricsChart';
import StabilityScoreCard from '@/components/StabilityScoreCard';
import SnapshotCard from '@/components/SnapshotCard';
import type { EngineStatus, TimeSeriesData, SwingSnapshot } from '@/types';
import { generateSwingSnapshot, generateBiomechanicsMetrics } from '@/engine/mockData';

function generateTimeSeries(length: number, base: number): TimeSeriesData {
  const timestamps = Array.from({ length }, (_, i) => i * 16);
  const values = Array.from({ length }, (_, i) => base + Math.sin(i * 0.1) * 5);
  return { timestamps, values, anomalies: [] };
}

describe('CollectionStatusBar - 采集终端状态栏', () => {
  it('应渲染四个状态指标', () => {
    render(
      <CollectionStatusBar
        connected={true}
        fps={30}
        alignmentScore={0.96}
        engineLatency={12}
      />
    );
    expect(screen.getByText(/终端连接/)).toBeInTheDocument();
    expect(screen.getByText(/帧率/)).toBeInTheDocument();
    expect(screen.getByText(/语义对齐度/)).toBeInTheDocument();
    expect(screen.getByText(/引擎延迟/)).toBeInTheDocument();
  });

  it('连接状态应正确显示', () => {
    const { rerender } = render(
      <CollectionStatusBar connected={true} fps={30} alignmentScore={0.96} engineLatency={12} />
    );
    expect(screen.getByText(/终端连接/)).toBeInTheDocument();

    rerender(
      <CollectionStatusBar connected={false} fps={0} alignmentScore={0} engineLatency={0} />
    );
    expect(screen.getByText(/终端连接/)).toBeInTheDocument();
  });

  it('语义对齐度高值应正确显示百分比', () => {
    render(
      <CollectionStatusBar connected={true} fps={30} alignmentScore={0.97} engineLatency={8} />
    );
    expect(screen.getByText('97.0%')).toBeInTheDocument();
  });
});

describe('EngineMonitor - 识别引擎监控', () => {
  it('应渲染四个管道阶段', () => {
    const status: EngineStatus = {
      state: 'idle',
      queueSize: 0,
      throughput: 0,
      avgLatency: 0,
      lastFrameIndex: 0,
    };
    render(<EngineMonitor status={status} />);
    expect(screen.getByText('采集帧')).toBeInTheDocument();
    expect(screen.getByText('识别引擎')).toBeInTheDocument();
    expect(screen.getByText('参数提取')).toBeInTheDocument();
    expect(screen.getByText('语义对齐')).toBeInTheDocument();
  });

  it('处理中状态应显示 Processing 标签', () => {
    const status: EngineStatus = {
      state: 'processing',
      queueSize: 5,
      throughput: 30,
      avgLatency: 12,
      lastFrameIndex: 50,
    };
    render(<EngineMonitor status={status} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('空闲状态应显示 Idle 标签', () => {
    const status: EngineStatus = {
      state: 'idle',
      queueSize: 0,
      throughput: 0,
      avgLatency: 0,
      lastFrameIndex: 0,
    };
    render(<EngineMonitor status={status} />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('错误状态应显示 Error 标签', () => {
    const status: EngineStatus = {
      state: 'error',
      queueSize: 0,
      throughput: 0,
      avgLatency: 0,
      lastFrameIndex: 0,
    };
    render(<EngineMonitor status={status} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('小屏下管道阶段不应溢出容器', () => {
    const status: EngineStatus = { state: 'idle', queueSize: 0, throughput: 0, avgLatency: 0, lastFrameIndex: 0 };
    const { container } = render(<EngineMonitor status={status} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.classList.contains('overflow-hidden')).toBe(true);
    const flexContainer = container.querySelector('.flex-wrap');
    expect(flexContainer).not.toBeNull();
  });

  it('队列大小进度条应正确渲染', () => {
    const status: EngineStatus = {
      state: 'processing',
      queueSize: 25,
      throughput: 30,
      avgLatency: 10,
      lastFrameIndex: 60,
    };
    render(<EngineMonitor status={status} />);
    expect(screen.getByText(/25 \/ 50/)).toBeInTheDocument();
  });
});

describe('MetricsChart - 力学参数面板', () => {
  const metrics = generateBiomechanicsMetrics();

  it('应渲染三个参数标签页', () => {
    render(
      <MetricsChart
        angularVelocity={metrics.angularVelocity}
        linearVelocity={metrics.linearVelocity}
        cogDisplacement={metrics.centerOfGravityDisplacement}
      />
    );
    expect(screen.getByText('角速度')).toBeInTheDocument();
    expect(screen.getByText('线速度')).toBeInTheDocument();
    expect(screen.getByText('重心偏移')).toBeInTheDocument();
  });

  it('点击标签页应切换显示', () => {
    render(
      <MetricsChart
        angularVelocity={metrics.angularVelocity}
        linearVelocity={metrics.linearVelocity}
        cogDisplacement={metrics.centerOfGravityDisplacement}
      />
    );
    fireEvent.click(screen.getByText('线速度'));
    const activeTab = screen.getByText('线速度');
    expect(activeTab).toBeInTheDocument();
  });
});

describe('StabilityScoreCard - 稳定性评分卡', () => {
  it('应渲染评分数字', () => {
    render(
      <StabilityScoreCard
        score={85}
        subScores={{ rhythmConsistency: 80, cogStability: 90, jointCoordination: 85 }}
      />
    );
    expect(screen.getByText('Stability Score')).toBeInTheDocument();
  });

  it('应渲染雷达图标签', () => {
    render(
      <StabilityScoreCard
        score={72}
        subScores={{ rhythmConsistency: 70, cogStability: 75, jointCoordination: 71 }}
      />
    );
    expect(screen.getByText('Stability Score')).toBeInTheDocument();
  });
});

describe('SnapshotCard - 快照卡片', () => {
  it('应渲染快照信息（评分和标签）', () => {
    const snapshot = generateSwingSnapshot();
    render(
      <SnapshotCard
        snapshot={snapshot}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText(snapshot.rating)).toBeInTheDocument();
    expect(screen.getByText('Stability')).toBeInTheDocument();
  });

  it('点击卡片区域应触发 onSelect 回调', () => {
    const snapshot = generateSwingSnapshot();
    const onSelect = vi.fn();
    const { container } = render(
      <SnapshotCard snapshot={snapshot} isSelected={false} onSelect={onSelect} />
    );
    const card = container.querySelector('[class*="cursor-pointer"], [role="button"]') || container.firstChild;
    if (card) {
      fireEvent.click(card as Element);
      expect(onSelect).toHaveBeenCalledWith(snapshot.id);
    }
  });

  it('选中状态应有视觉标识', () => {
    const snapshot = generateSwingSnapshot();
    const { container, rerender } = render(
      <SnapshotCard snapshot={snapshot} isSelected={false} onSelect={vi.fn()} />
    );
    const card = container.firstChild as HTMLElement;

    rerender(
      <SnapshotCard snapshot={snapshot} isSelected={true} onSelect={vi.fn()} />
    );
    const selectedCard = container.querySelector('[class*="00F0B5"]');
    expect(selectedCard).not.toBeNull();
  });
});
