import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import Dashboard from '~/pages/Dashboard'

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render without crashing', () => {
    render(() => <Dashboard />)
    expect(screen.getByText(/效能驾驶舱/)).toBeInTheDocument()
  })

  it('should display page description', () => {
    render(() => <Dashboard />)
    expect(screen.getByText(/实时效能数据与智能时间分配/)).toBeInTheDocument()
  })

  it('should display focus gauge section', () => {
    render(() => <Dashboard />)
    expect(screen.getByText(/当前专注力/)).toBeInTheDocument()
  })

  it('should display time allocation section', () => {
    render(() => <Dashboard />)
    expect(screen.getByText(/今日时间分配/)).toBeInTheDocument()
  })

  it('should display execution queue section', () => {
    render(() => <Dashboard />)
    expect(screen.getByText(/执行队列/)).toBeInTheDocument()
  })

  it('should display today statistics', () => {
    render(() => <Dashboard />)
    expect(screen.getByText(/今日统计/)).toBeInTheDocument()
  })

  it('should have card-based layout', () => {
    render(() => <Dashboard />)
    const cards = document.querySelectorAll('.card-base')
    expect(cards.length).toBeGreaterThanOrEqual(3)
  })

  it('should display proper typography hierarchy', () => {
    render(() => <Dashboard />)
    const heading = screen.getByText(/效能驾驶舱/)
    expect(heading.tagName.toLowerCase()).toBe('h1')
    expect(heading.className).toContain('text-2xl')
    expect(heading.className).toContain('font-bold')
  })
})
