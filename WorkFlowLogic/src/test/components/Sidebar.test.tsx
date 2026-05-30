import { describe, it, expect } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import { Router } from '@solidjs/router'
import Sidebar from '~/components/Sidebar'

describe('Sidebar Component', () => {
  const renderWithRouter = (component: () => JSX.Element) => {
    return render(() => (
      <Router>
        {component()}
      </Router>
    ))
  }

  it('should render without crashing', () => {
    renderWithRouter(() => <Sidebar />)
    const sidebar = document.querySelector('aside')
    expect(sidebar).toBeInTheDocument()
  })

  it('should display brand logo and name', () => {
    renderWithRouter(() => <Sidebar />)
    expect(screen.getByText('FocusFlow')).toBeInTheDocument()
  })

  it('should display navigation items', () => {
    renderWithRouter(() => <Sidebar />)
    expect(screen.getByText(/效能驾驶舱/)).toBeInTheDocument()
    expect(screen.getByText(/专注力动能/)).toBeInTheDocument()
    expect(screen.getByText(/任务映射矩阵/)).toBeInTheDocument()
    expect(screen.getByText(/效能图谱/)).toBeInTheDocument()
  })

  it('should display navigation descriptions', () => {
    renderWithRouter(() => <Sidebar />)
    expect(screen.getByText(/实时数据总览/)).toBeInTheDocument()
    expect(screen.getByText(/专注追踪与反馈/)).toBeInTheDocument()
    expect(screen.getByText(/优先级与跨系统映射/)).toBeInTheDocument()
    expect(screen.getByText(/长周期效能分析/)).toBeInTheDocument()
  })

  it('should display focus status card', () => {
    renderWithRouter(() => <Sidebar />)
    expect(screen.getByText(/当前状态/)).toBeInTheDocument()
  })

  it('should have correct number of navigation links', () => {
    renderWithRouter(() => <Sidebar />)
    const navLinks = document.querySelectorAll('a')
    expect(navLinks.length).toBe(4)
  })
})
