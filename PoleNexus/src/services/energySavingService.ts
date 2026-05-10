import type { PoleNode, EnergySavingRule, DimmingCommand, OperationLog } from '@/types'
import { generateId, delay, clamp } from '@/utils/helpers'
import { commandStore, poleStore, logStore } from './indexedDB'
import { useSyncService } from './syncService'

interface EnergySavingModelParams {
  baseBrightness: number
  trafficDensity?: number
  ambientLight?: number
  temperature?: number
  timeOfDay: number
}

class EnergySavingService {
  private rules: EnergySavingRule[] = []
  private modelInterval: number | null = null
  private isRunning = false

  private readonly defaultRules: EnergySavingRule[] = [
    {
      id: 'rule-morning',
      name: '早晨节能模式',
      enabled: true,
      startHour: 6,
      endHour: 8,
      brightness: 60,
      priority: 2,
    },
    {
      id: 'rule-day',
      name: '白天节能模式',
      enabled: true,
      startHour: 8,
      endHour: 18,
      brightness: 0,
      conditions: { minTemperature: 10 },
      priority: 1,
    },
    {
      id: 'rule-evening',
      name: '傍晚过渡模式',
      enabled: true,
      startHour: 18,
      endHour: 20,
      brightness: 70,
      priority: 3,
    },
    {
      id: 'rule-night',
      name: '深夜节能模式',
      enabled: true,
      startHour: 23,
      endHour: 6,
      brightness: 30,
      conditions: { trafficThreshold: 0.3 },
      priority: 4,
    },
  ]

  constructor() {
    this.rules = [...this.defaultRules]
  }

  getRules(): EnergySavingRule[] {
    return [...this.rules].sort((a, b) => b.priority - a.priority)
  }

  addRule(rule: Omit<EnergySavingRule, 'id'>): EnergySavingRule {
    const newRule: EnergySavingRule = {
      ...rule,
      id: generateId(),
    }
    this.rules.push(newRule)
    return newRule
  }

  updateRule(id: string, updates: Partial<EnergySavingRule>): EnergySavingRule | null {
    const index = this.rules.findIndex(r => r.id === id)
    if (index === -1) return null
    this.rules[index] = { ...this.rules[index], ...updates }
    return this.rules[index]
  }

  deleteRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id)
    if (index === -1) return false
    this.rules.splice(index, 1)
    return true
  }

  calculateBrightness(params: EnergySavingModelParams): number {
    const { timeOfDay, ambientLight = 50, trafficDensity = 0.5, temperature = 20 } = params
    
    const applicableRules = this.rules
      .filter(rule => rule.enabled && this.isRuleApplicable(rule, timeOfDay, temperature))
      .sort((a, b) => b.priority - a.priority)

    if (applicableRules.length === 0) {
      return params.baseBrightness
    }

    let brightness = applicableRules[0].brightness

    if (ambientLight > 70) {
      brightness *= 0.7
    } else if (ambientLight < 30) {
      brightness *= 1.2
    }

    if (trafficDensity > 0.8) {
      brightness = Math.min(brightness * 1.3, 100)
    } else if (trafficDensity < 0.2) {
      brightness *= 0.6
    }

    return clamp(Math.round(brightness), 0, 100)
  }

  private isRuleApplicable(rule: EnergySavingRule, hour: number, temperature: number): boolean {
    const isInTimeRange = rule.startHour < rule.endHour
      ? hour >= rule.startHour && hour < rule.endHour
      : hour >= rule.startHour || hour < rule.endHour

    if (!isInTimeRange) return false

    if (rule.conditions) {
      if (rule.conditions.minTemperature !== undefined && temperature < rule.conditions.minTemperature) {
        return false
      }
      if (rule.conditions.maxTemperature !== undefined && temperature > rule.conditions.maxTemperature) {
        return false
      }
    }

    return true
  }

  async createDimmingCommand(
    poleIds: string[],
    brightness: number,
    mode: DimmingCommand['mode'] = 'auto',
    reason?: string
  ): Promise<DimmingCommand> {
    const command: DimmingCommand = {
      id: generateId(),
      poleIds,
      brightness,
      mode,
      reason,
      status: 'pending',
      createdAt: Date.now(),
    }

    await commandStore.put(command)
    useSyncService().emitCommandSent(command)

    return command
  }

  async sendCommand(command: DimmingCommand): Promise<void> {
    await commandStore.updateStatus(command.id, 'sent', { sentAt: Date.now() })

    await delay(500 + Math.random() * 1000)

    const success = Math.random() > 0.1

    if (success) {
      await commandStore.updateStatus(command.id, 'executed', { executedAt: Date.now() })

      for (const poleId of command.poleIds) {
        const pole = await poleStore.getById(poleId)
        if (pole) {
          const updatedPole = {
            ...pole,
            brightness: command.brightness,
            isOn: command.brightness > 0,
            dimmingMode: command.mode,
            updatedAt: Date.now(),
          }
          await poleStore.put(updatedPole)
          useSyncService().emitStatusChange(updatedPole)

          const log: OperationLog = {
            id: generateId(),
            poleId,
            timestamp: Date.now(),
            level: 'info',
            type: 'dimming',
            message: `亮度调整为 ${command.brightness}%，模式: ${command.mode}`,
            details: { commandId: command.id, brightness: command.brightness, mode: command.mode },
            synced: true,
          }
          await logStore.put(log)
          useSyncService().emitLogCreated(log)
        }
      }
    } else {
      const errorMessage = '指令执行失败，请检查网络连接'
      await commandStore.updateStatus(command.id, 'failed', { errorMessage })
    }
  }

  async processPendingCommands(): Promise<void> {
    const pendingCommands = await commandStore.getByStatus('pending')
    for (const command of pendingCommands) {
      await this.sendCommand(command)
    }
  }

  startEnergySavingModel(intervalMs: number = 60000): void {
    if (this.isRunning) return

    this.isRunning = true
    console.log('[EnergySavingService] Model started')

    this.modelInterval = window.setInterval(async () => {
      await this.runEnergySavingCycle()
    }, intervalMs)
  }

  stopEnergySavingModel(): void {
    if (this.modelInterval) {
      clearInterval(this.modelInterval)
      this.modelInterval = null
    }
    this.isRunning = false
    console.log('[EnergySavingService] Model stopped')
  }

  private async runEnergySavingCycle(): Promise<void> {
    const now = new Date()
    const hour = now.getHours()
    const poles = await poleStore.getAll()
    const autoPoles = poles.filter(p => p.dimmingMode === 'energy_saving' && p.status === 'online')

    if (autoPoles.length === 0) return

    const poleGroups: Record<number, string[]> = {}
    for (const pole of autoPoles) {
      const brightness = this.calculateBrightness({
        baseBrightness: 100,
        timeOfDay: hour,
        ambientLight: 50 + Math.random() * 30,
        trafficDensity: 0.3 + Math.random() * 0.5,
        temperature: pole.temperature,
      })

      if (!poleGroups[brightness]) {
        poleGroups[brightness] = []
      }
      poleGroups[brightness].push(pole.id)
    }

    for (const [brightness, poleIds] of Object.entries(poleGroups)) {
      const command = await this.createDimmingCommand(
        poleIds,
        parseInt(brightness),
        'energy_saving',
        `自动节能模式 - ${hour}:00`
      )
      await this.sendCommand(command)
    }
  }

  estimateEnergySaving(
    originalBrightness: number,
    newBrightness: number,
    hours: number = 1
  ): number {
    const basePower = 100
    const originalPower = basePower * (originalBrightness / 100)
    const newPower = basePower * (newBrightness / 100)
    return ((originalPower - newPower) / 1000) * hours
  }
}

let instance: EnergySavingService | null = null

export function useEnergySavingService(): EnergySavingService {
  if (!instance) {
    instance = new EnergySavingService()
  }
  return instance
}