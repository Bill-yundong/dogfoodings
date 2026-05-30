import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import EfficiencyAtlas from '~/pages/EfficiencyAtlas'

describe('EfficiencyAtlas Page', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render without crashing', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getByText(/效能图谱/)).toBeInTheDocument()
  })

  it('should display page description', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getByText(/长周期效能分析与产能基线报告/)).toBeInTheDocument()
  })

  it('should display period selector buttons', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getByText('7天')).toBeInTheDocument()
    expect(screen.getByText('30天')).toBeInTheDocument()
    expect(screen.getByText('90天')).toBeInTheDocument()
  })

  it('should change period when button is clicked', () => {
    render(() => <EfficiencyAtlas />)
    const button30 = screen.getByText('30天')

    fireEvent.click(button30)

    expect(button30.className).toContain('bg-indigo-500')
  })

  it('should display trend chart section', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getByText(/效能趋势/)).toBeInTheDocument()
  })

  it('should display radar chart section', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getByText(/效能雷达/)).toBeInTheDocument()
  })

  it('should display heat calendar section', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getByText(/效能热力日历/)).toBeInTheDocument()
  })

  it('should display baseline report section', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getByText(/产能基线报告/)).toBeInTheDocument()
  })

  it('should display legend for heat map', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getByText('低')).toBeInTheDocument()
    expect(screen.getByText('高')).toBeInTheDocument()
  })

  it('should display improvement suggestions', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getByText(/改善建议/)).toBeInTheDocument()
  })

  it('should have SVG charts', () => {
    render(() => <EfficiencyAtlas />)
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(2)
  })

  it('should display key metrics in baseline report', () => {
    render(() => <EfficiencyAtlas />)
    expect(screen.getAllByText(/平均专注力/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/任务完成率/).length).toBeGreaterThan(0)
    expect(screen.getByText(/日均深度专注/)).toBeInTheDocument()
    expect(screen.getByText(/日均完成任务/)).toBeInTheDocument()
  })
})
