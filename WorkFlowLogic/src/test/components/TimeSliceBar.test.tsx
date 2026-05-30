import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import TimeSliceBar from '~/components/TimeSliceBar'
import type { TimeSliceAllocation } from '~/types'
import { taskState, addTask } from '~/stores/tasks'

describe('TimeSliceBar Component', () => {
  beforeEach(() => {
    while (taskState.tasks.length > 0) {
      taskState.tasks.pop()
    }
    vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0))
  })

  it('should render without crashing', () => {
    render(() => <TimeSliceBar allocations={[]} tasks={[]} />)
    const container = document.querySelector('.w-full')
    expect(container).toBeInTheDocument()
  })

  it('should display time slots from 8:00 to 22:00', () => {
    addTask({
      title: 'Test Task',
      urgency: 0.7,
      importance: 0.8,
      focusNeed: 0.6,
      deadline: null,
      estimatedMinutes: 60,
      source: 'work',
      status: 'pending',
    })

    const task = taskState.tasks[0]
    const now = new Date(2024, 0, 1, 10, 0, 0)
    const allocations: TimeSliceAllocation[] = [
      {
        taskId: task.id,
        slot: {
          start: new Date(2024, 0, 1, 8, 0, 0).getTime(),
          end: new Date(2024, 0, 1, 9, 0, 0).getTime(),
          quality: 'peak',
        },
        score: 0.75,
        factors: {
          urgency: 0.21,
          importance: 0.24,
          focusMatch: 0.15,
          deadline: 0,
        },
      },
    ]

    render(() => <TimeSliceBar allocations={allocations} tasks={taskState.tasks} />)
    expect(screen.getByText('08:00')).toBeInTheDocument()
    expect(screen.getByText('22:00')).toBeInTheDocument()
  })

  it('should display no allocations message when empty', () => {
    render(() => <TimeSliceBar allocations={[]} tasks={[]} />)
    expect(screen.getByText(/尚无分配方案/)).toBeInTheDocument()
  })

  it('should render allocations', () => {
    addTask({
      title: 'Test Task',
      urgency: 0.7,
      importance: 0.8,
      focusNeed: 0.6,
      deadline: null,
      estimatedMinutes: 60,
      source: 'work',
      status: 'pending',
    })

    const task = taskState.tasks[0]
    const now = new Date(2024, 0, 1, 10, 0, 0)
    const allocations: TimeSliceAllocation[] = [
      {
        taskId: task.id,
        slot: {
          start: now.getTime(),
          end: now.getTime() + 3600000,
          quality: 'peak',
        },
        score: 0.75,
        factors: {
          urgency: 0.21,
          importance: 0.24,
          focusMatch: 0.15,
          deadline: 0,
        },
      },
    ]

    render(() => <TimeSliceBar allocations={allocations} tasks={taskState.tasks} />)
    const allocationElements = document.querySelectorAll('[class*="rounded"]')
    expect(allocationElements.length).toBeGreaterThan(0)
  })
})
