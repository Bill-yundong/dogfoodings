import { createStore } from 'solid-js/store'
import type { TaskItem, TimeSlot } from '~/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface TaskState {
  tasks: TaskItem[]
}

const initialTasks: TaskItem[] = [
  {
    id: generateId(),
    title: "完成季度数据报告",
    urgency: 0.9,
    importance: 0.95,
    focusNeed: 0.85,
    deadline: Date.now() + 86400000,
    estimatedMinutes: 120,
    source: "work",
    status: "pending",
    recommendedSlot: null,
    createdAt: Date.now() - 172800000,
    completedAt: null,
  },
  {
    id: generateId(),
    title: "代码审查 - 支付模块",
    urgency: 0.7,
    importance: 0.8,
    focusNeed: 0.7,
    deadline: Date.now() + 43200000,
    estimatedMinutes: 60,
    source: "work",
    status: "pending",
    recommendedSlot: null,
    createdAt: Date.now() - 86400000,
    completedAt: null,
  },
  {
    id: generateId(),
    title: "阅读技术架构文档",
    urgency: 0.4,
    importance: 0.6,
    focusNeed: 0.5,
    deadline: Date.now() + 259200000,
    estimatedMinutes: 45,
    source: "work",
    status: "pending",
    recommendedSlot: null,
    createdAt: Date.now() - 259200000,
    completedAt: null,
  },
  {
    id: generateId(),
    title: "团队站会准备",
    urgency: 0.8,
    importance: 0.5,
    focusNeed: 0.3,
    deadline: Date.now() + 14400000,
    estimatedMinutes: 15,
    source: "work",
    status: "pending",
    recommendedSlot: null,
    createdAt: Date.now() - 43200000,
    completedAt: null,
  },
  {
    id: generateId(),
    title: "学习 Rust 异步编程",
    urgency: 0.3,
    importance: 0.7,
    focusNeed: 0.9,
    deadline: null,
    estimatedMinutes: 90,
    source: "personal",
    status: "pending",
    recommendedSlot: null,
    createdAt: Date.now() - 345600000,
    completedAt: null,
  },
  {
    id: generateId(),
    title: "健身计划 - 力量训练",
    urgency: 0.5,
    importance: 0.6,
    focusNeed: 0.2,
    deadline: Date.now() + 7200000,
    estimatedMinutes: 60,
    source: "personal",
    status: "pending",
    recommendedSlot: null,
    createdAt: Date.now() - 86400000,
    completedAt: null,
  },
  {
    id: generateId(),
    title: "回复客户邮件",
    urgency: 0.95,
    importance: 0.6,
    focusNeed: 0.3,
    deadline: Date.now() + 3600000,
    estimatedMinutes: 20,
    source: "work",
    status: "active",
    recommendedSlot: null,
    createdAt: Date.now() - 7200000,
    completedAt: null,
  },
  {
    id: generateId(),
    title: "撰写博客文章 - 系统设计",
    urgency: 0.2,
    importance: 0.8,
    focusNeed: 0.75,
    deadline: Date.now() + 604800000,
    estimatedMinutes: 150,
    source: "personal",
    status: "pending",
    recommendedSlot: null,
    createdAt: Date.now() - 432000000,
    completedAt: null,
  },
]

const [taskState, setTaskState] = createStore<TaskState>({
  tasks: initialTasks,
})

export function addTask(task: Omit<TaskItem, "id" | "createdAt" | "completedAt" | "recommendedSlot">) {
  const newTask: TaskItem = {
    ...task,
    id: generateId(),
    recommendedSlot: null,
    createdAt: Date.now(),
    completedAt: null,
  }
  setTaskState("tasks", (prev) => [...prev, newTask])
}

export function updateTask(id: string, updates: Partial<TaskItem>) {
  setTaskState(
    "tasks",
    (t) => t.id === id,
    updates
  )
}

export function completeTask(id: string) {
  setTaskState(
    "tasks",
    (t) => t.id === id,
    { status: "completed", completedAt: Date.now() }
  )
}

export function setTaskRecommendation(id: string, slot: TimeSlot | null) {
  setTaskState(
    "tasks",
    (t) => t.id === id,
    { recommendedSlot: slot }
  )
}

export function getPendingTasks(): TaskItem[] {
  return taskState.tasks.filter((t) => t.status === "pending" || t.status === "active")
}

export function getWorkTasks(): TaskItem[] {
  return taskState.tasks.filter((t) => t.source === "work")
}

export function getPersonalTasks(): TaskItem[] {
  return taskState.tasks.filter((t) => t.source === "personal")
}

export { taskState }
