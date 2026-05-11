import type { EngineeringProject, SemanticSyncState, SyncConflict } from '../types'

export class SemanticSynchronizer {
  private state: SemanticSyncState = {
    lastSync: null,
    forestryBureauVersion: '0.0.0',
    contractorVersion: '0.0.0',
    conflicts: []
  }

  private readonly semanticMappings = {
    '工程进度': { forestryBureau: 'completionRate', contractor: 'progressPercentage' },
    '植被覆盖度': { forestryBureau: 'coverageRate', contractor: 'vegetationDensity' },
    '沙丘移动距离': { forestryBureau: 'migrationDistance', contractor: 'duneDisplacement' },
    '固沙效果': { forestryBureau: 'stabilizationEffect', contractor: 'sandRetention' }
  }

  sync(
    forestryBureauData: EngineeringProject,
    contractorData: EngineeringProject
  ): { synchronized: EngineeringProject; conflicts: SyncConflict[] } {
    const conflicts: SyncConflict[] = []
    const synchronized = { ...forestryBureauData }

    for (const [standardName, mappings] of Object.entries(this.semanticMappings)) {
      const fbValue = (forestryBureauData as Record<string, unknown>)[mappings.forestryBureau]
      const cValue = (contractorData as Record<string, unknown>)[mappings.contractor]

      if (!this.valuesMatch(fbValue, cValue)) {
        conflicts.push({
          id: `conflict-${Date.now()}-${Math.random()}`,
          field: standardName,
          forestryBureauValue: fbValue,
          contractorValue: cValue,
          resolved: false
        })
      }
    }

    this.state = {
      lastSync: new Date(),
      forestryBureauVersion: this.incrementVersion(this.state.forestryBureauVersion),
      contractorVersion: this.incrementVersion(this.state.contractorVersion),
      conflicts
    }

    return { synchronized, conflicts }
  }

  private valuesMatch(a: unknown, b: unknown, tolerance = 0.01): boolean {
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < tolerance
    }
    return JSON.stringify(a) === JSON.stringify(b)
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number)
    parts[2]++
    if (parts[2] >= 10) {
      parts[2] = 0
      parts[1]++
    }
    return parts.join('.')
  }

  resolveConflict(conflictId: string, resolution: 'forestry' | 'contractor' | 'average'): void {
    const conflict = this.state.conflicts.find(c => c.id === conflictId)
    if (conflict) {
      conflict.resolved = true
    }
  }

  getSyncState(): SemanticSyncState {
    return { ...this.state }
  }
}