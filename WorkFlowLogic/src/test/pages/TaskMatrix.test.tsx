import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import TaskMatrix from '~/pages/TaskMatrix'

describe('TaskMatrix Page', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render without crashing', () => {
    render(() => <TaskMatrix />)
    expect(screen.getByText(/任务映射矩阵/)).toBeInTheDocument()
  })

  it('should display page description', () => {
    render(() => <TaskMatrix />)
    expect(screen.getByText(/任务优先级与跨系统映射/)).toBeInTheDocument()
  })

  it('should display add task button', () => {
    render(() => <TaskMatrix />)
    const addButton = screen.getByText(/添加任务/)
    expect(addButton).toBeInTheDocument()
  })

  it('should show task form when add button is clicked', () => {
    render(() => <TaskMatrix />)
    const addButton = screen.getByText(/添加任务/)

    fireEvent.click(addButton)

    expect(screen.getByText(/新建任务/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/任务标题/)).toBeInTheDocument()
  })

  it('should display priority matrix section', () => {
    render(() => <TaskMatrix />)
    expect(screen.getByText(/优先级矩阵/)).toBeInTheDocument()
  })

  it('should display all four quadrants', () => {
    render(() => <TaskMatrix />)
    expect(screen.getByText(/紧急且重要/)).toBeInTheDocument()
    expect(screen.getByText(/重要不紧急/)).toBeInTheDocument()
    expect(screen.getByText(/紧急不重要/)).toBeInTheDocument()
    expect(screen.getByText(/低优先级/)).toBeInTheDocument()
  })

  it('should display system mapping section', () => {
    render(() => <TaskMatrix />)
    const headings = screen.getAllByText(/系统映射/)
    expect(headings.length).toBeGreaterThan(0)
  })

  it('should display weight adjustment section', () => {
    render(() => <TaskMatrix />)
    expect(screen.getByText(/权重调节/)).toBeInTheDocument()
  })

  it('should display timing recommendations section', () => {
    render(() => <TaskMatrix />)
    expect(screen.getByText(/执行时机推荐/)).toBeInTheDocument()
  })

  it('should have proper layout with grid', () => {
    render(() => <TaskMatrix />)
    const containers = document.querySelectorAll('.grid')
    expect(containers.length).toBeGreaterThanOrEqual(2)
  })
})
