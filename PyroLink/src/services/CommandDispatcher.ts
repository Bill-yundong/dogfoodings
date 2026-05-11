import { Command, RescueUnit } from '../types';

type CommandCallback = (command: Command) => void;
type UnitCallback = (units: RescueUnit[]) => void;

export class CommandDispatcher {
  private centers: Map<string, { callback: CommandCallback; units: RescueUnit[] }> = new Map();
  private pendingCommands: Command[] = [];
  private history: Command[] = [];
  private commandCallbacks: CommandCallback[] = [];
  private unitCallbacks: UnitCallback[] = [];

  registerCenter(centerId: string, callback: CommandCallback) {
    this.centers.set(centerId, { 
      callback, 
      units: this.generateDefaultUnits(centerId) 
    });
  }

  private generateDefaultUnits(centerId: string): RescueUnit[] {
    const unitTypes: RescueUnit['type'][] = ['firefighter', 'helicopter', 'truck', 'water_tanker'];
    const unitNames: Record<RescueUnit['type'], string> = {
      firefighter: '消防小队',
      helicopter: '灭火直升机',
      truck: '消防车',
      water_tanker: '供水车'
    };

    return unitTypes.map((type, index) => ({
      id: `${centerId}-${type}-${index}`,
      name: unitNames[type],
      type,
      position: {
        x: 200 + Math.random() * 600,
        y: 200 + Math.random() * 600
      },
      status: 'available',
      capacity: type === 'firefighter' ? 20 : type === 'helicopter' ? 5 : 10,
      lastUpdate: Date.now()
    }));
  }

  dispatch(command: Omit<Command, 'id' | 'timestamp' | 'status'>): Command {
    const fullCommand: Command = {
      ...command,
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.pendingCommands.push(fullCommand);
    this.history.push(fullCommand);

    const targetCenter = this.centers.get(command.toCenter);
    if (targetCenter) {
      setTimeout(() => {
        fullCommand.status = 'acknowledged';
        targetCenter.callback(fullCommand);
        this.notifyCommandCallbacks(fullCommand);
        
        this.executeCommand(fullCommand, targetCenter);
      }, Math.random() * 50 + 10);
    }

    this.notifyCommandCallbacks(fullCommand);
    return fullCommand;
  }

  private executeCommand(command: Command, center: { callback: CommandCallback; units: RescueUnit[] }) {
    const availableUnits = center.units.filter(u => u.status === 'available');
    
    if (availableUnits.length > 0) {
      const unit = availableUnits[0];
      unit.status = 'en_route';
      unit.lastUpdate = Date.now();

      setTimeout(() => {
        unit.status = 'deployed';
        unit.position = { ...command.target };
        unit.lastUpdate = Date.now();
        command.status = 'completed';
        this.notifyCommandCallbacks(command);
        this.notifyUnitCallbacks();
      }, 1000 + Math.random() * 2000);
    }

    this.notifyUnitCallbacks();
  }

  getUnits(centerId: string): RescueUnit[] {
    return this.centers.get(centerId)?.units || [];
  }

  getAllUnits(): RescueUnit[] {
    const units: RescueUnit[] = [];
    this.centers.forEach(center => {
      units.push(...center.units);
    });
    return units;
  }

  getPendingCommands(): Command[] {
    return [...this.pendingCommands.filter(c => c.status !== 'completed')];
  }

  getCommandHistory(): Command[] {
    return [...this.history];
  }

  onCommand(callback: CommandCallback) {
    this.commandCallbacks.push(callback);
    return () => {
      this.commandCallbacks = this.commandCallbacks.filter(cb => cb !== callback);
    };
  }

  onUnitsUpdate(callback: UnitCallback) {
    this.unitCallbacks.push(callback);
    return () => {
      this.unitCallbacks = this.unitCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyCommandCallbacks(command: Command) {
    this.commandCallbacks.forEach(cb => cb(command));
  }

  private notifyUnitCallbacks() {
    const allUnits = this.getAllUnits();
    this.unitCallbacks.forEach(cb => cb(allUnits));
  }

  unregisterCenter(centerId: string) {
    this.centers.delete(centerId);
  }
}
