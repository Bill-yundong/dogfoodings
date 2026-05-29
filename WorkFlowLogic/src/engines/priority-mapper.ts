import type { TaskItem } from '~/types'

export interface PriorityMapping {
  taskId: string
  quadrant: "urgent-important" | "not-urgent-important" | "urgent-not-important" | "not-urgent-not-important"
  quadrantIndex: number
  priorityRank: number
}

export function mapTaskPriority(task: TaskItem): PriorityMapping["quadrant"] {
  const uThreshold = 0.6
  const iThreshold = 0.6

  if (task.urgency >= uThreshold && task.importance >= iThreshold) return "urgent-important"
  if (task.urgency < uThreshold && task.importance >= iThreshold) return "not-urgent-important"
  if (task.urgency >= uThreshold && task.importance < iThreshold) return "urgent-not-important"
  return "not-urgent-not-important"
}

export function computePriorityMatrix(tasks: TaskItem[]): PriorityMapping[] {
  const pending = tasks.filter((t) => t.status === "pending" || t.status === "active")

  const withQuadrant = pending.map((task) => ({
    task,
    quadrant: mapTaskPriority(task),
    compositeScore: task.urgency * 0.5 + task.importance * 0.5,
  }))

  withQuadrant.sort((a, b) => b.compositeScore - a.compositeScore)

  return withQuadrant.map((item, index) => ({
    taskId: item.task.id,
    quadrant: item.quadrant,
    quadrantIndex: getQuadrantIndex(item.quadrant),
    priorityRank: index + 1,
  }))
}

function getQuadrantIndex(quadrant: PriorityMapping["quadrant"]): number {
  switch (quadrant) {
    case "urgent-important": return 0
    case "not-urgent-important": return 1
    case "urgent-not-important": return 2
    case "not-urgent-not-important": return 3
  }
}

export interface SystemMapping {
  workTasks: TaskItem[]
  personalTasks: TaskItem[]
  crossReferences: Array<{ workId: string; personalId: string; relationType: string }>
}

export function computeSystemMapping(tasks: TaskItem[]): SystemMapping {
  const work = tasks.filter((t) => t.source === "work" && (t.status === "pending" || t.status === "active"))
  const personal = tasks.filter((t) => t.source === "personal" && (t.status === "pending" || t.status === "active"))

  const crossRefs: SystemMapping["crossReferences"] = []

  for (const w of work) {
    for (const p of personal) {
      if (Math.abs(w.focusNeed - p.focusNeed) < 0.2 && Math.abs(w.importance - p.importance) < 0.2) {
        crossRefs.push({
          workId: w.id,
          personalId: p.id,
          relationType: "focus-aligned",
        })
      }
    }
  }

  return {
    workTasks: work,
    personalTasks: personal,
    crossReferences: crossRefs,
  }
}
