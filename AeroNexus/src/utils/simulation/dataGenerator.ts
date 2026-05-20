import type { EquipmentState, DispatchCommand, FlightInfo, GateInfo, MapZone, Position } from '@/types';

const EQUIPMENT_TYPES = ['tug', 'baggage', 'fuel', 'catering', 'bus'] as const;
const EQUIPMENT_NAMES: Record<string, string[]> = {
  tug: ['TG-001', 'TG-002', 'TG-003', 'TG-004', 'TG-005', 'TG-006', 'TG-007', 'TG-008'],
  baggage: ['BG-001', 'BG-002', 'BG-003', 'BG-004', 'BG-005'],
  fuel: ['FL-001', 'FL-002', 'FL-003'],
  catering: ['CT-001', 'CT-002', 'CT-003', 'CT-004'],
  bus: ['BS-001', 'BS-002', 'BS-003'],
};

const GATE_POSITIONS: Position[] = [
  { x: 50, y: 100, heading: Math.PI / 2 },
  { x: 100, y: 100, heading: Math.PI / 2 },
  { x: 150, y: 100, heading: Math.PI / 2 },
  { x: 200, y: 100, heading: Math.PI / 2 },
  { x: 250, y: 100, heading: Math.PI / 2 },
  { x: 50, y: 200, heading: -Math.PI / 2 },
  { x: 100, y: 200, heading: -Math.PI / 2 },
  { x: 150, y: 200, heading: -Math.PI / 2 },
  { x: 200, y: 200, heading: -Math.PI / 2 },
  { x: 250, y: 200, heading: -Math.PI / 2 },
];

export class SimulationDataGenerator {
  private equipment: EquipmentState[] = [];
  private commands: DispatchCommand[] = [];
  private flights: FlightInfo[] = [];
  private gates: GateInfo[] = [];

  constructor() {
    this.generateInitialData();
  }

  private generateInitialData(): void {
    this.generateGates();
    this.generateEquipment();
    this.generateFlights();
  }

  private generateGates(): void {
    this.gates = GATE_POSITIONS.map((pos, index) => ({
      id: `gate_${index + 1}`,
      number: `G${index + 1}`,
      position: pos,
      status: index < 6 ? 'occupied' : 'available',
      arrivalTime: index < 6 ? Date.now() - 3600000 + index * 600000 : undefined,
      departureTime: index < 6 ? Date.now() + 1800000 + index * 600000 : undefined,
    }));
  }

  private generateEquipment(): void {
    let idCounter = 1;
    
    for (const type of EQUIPMENT_TYPES) {
      const names = EQUIPMENT_NAMES[type] || [];
      
      for (const name of names) {
        const statuses: EquipmentState['status'][] = ['idle', 'moving', 'working', 'charging'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const baseX = 50 + Math.random() * 250;
        const baseY = 50 + Math.random() * 300;
        
        const equipment: EquipmentState = {
          id: `${type}_${idCounter++}`,
          name,
          type,
          status,
          position: {
            x: baseX,
            y: baseY,
            heading: Math.random() * Math.PI * 2,
          },
          velocity: {
            linear: status === 'moving' ? 1 + Math.random() * 3 : 0,
            angular: status === 'moving' ? (Math.random() - 0.5) * 0.5 : 0,
          },
          battery: 20 + Math.random() * 80,
          currentTask: status !== 'idle' && status !== 'charging' ? `task_${Math.floor(Math.random() * 100)}` : null,
          timestamp: Date.now(),
          health: {
            temperature: 25 + Math.random() * 20,
            tirePressure: 80 + Math.random() * 20,
            brakeStatus: Math.random() > 0.1,
            motorStatus: Math.random() > 0.05,
          },
          dimensions: this.getDimensions(type),
          maxSpeed: this.getMaxSpeed(type),
          maxAcceleration: this.getMaxAcceleration(type),
          minTurnRadius: this.getMinTurnRadius(type),
        };
        
        this.equipment.push(equipment);
      }
    }
  }

  private generateFlights(): void {
    const airlines = ['CA', 'MU', 'CZ', 'HU', '3U', 'ZH'];
    const aircraftTypes = ['B737', 'B787', 'A320', 'A330', 'A350'];
    
    for (let i = 0; i < 15; i++) {
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      const flightNumber = `${airline}${Math.floor(Math.random() * 9000) + 1000}`;
      const gate = this.gates[i % this.gates.length];
      
      const flight: FlightInfo = {
        id: `flight_${i}`,
        flightNumber,
        aircraftType: aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)],
        gateId: gate.id,
        arrivalTime: Date.now() - 1800000 + i * 300000,
        departureTime: Date.now() + 1800000 + i * 300000,
        status: i < 8 ? 'arrived' : 'scheduled',
        requiredServices: this.getRequiredServices(),
      };
      
      this.flights.push(flight);
      
      if (gate) {
        gate.flightId = flight.id;
      }
    }
  }

  private getDimensions(type: string): EquipmentState['dimensions'] {
    const dimensions: Record<string, EquipmentState['dimensions']> = {
      tug: { length: 4.5, width: 2.2, height: 2.0 },
      baggage: { length: 6.0, width: 2.5, height: 2.5 },
      fuel: { length: 10.0, width: 3.0, height: 3.5 },
      catering: { length: 8.0, width: 2.8, height: 3.0 },
      bus: { length: 12.0, width: 3.2, height: 3.5 },
    };
    return dimensions[type] || dimensions.tug;
  }

  private getMaxSpeed(type: string): number {
    const speeds: Record<string, number> = {
      tug: 8.33,
      baggage: 6.94,
      fuel: 5.56,
      catering: 6.94,
      bus: 8.33,
    };
    return speeds[type] || 5;
  }

  private getMaxAcceleration(type: string): number {
    const accelerations: Record<string, number> = {
      tug: 1.5,
      baggage: 1.2,
      fuel: 0.8,
      catering: 1.0,
      bus: 1.0,
    };
    return accelerations[type] || 1;
  }

  private getMinTurnRadius(type: string): number {
    const radii: Record<string, number> = {
      tug: 5.0,
      baggage: 7.0,
      fuel: 12.0,
      catering: 9.0,
      bus: 10.0,
    };
    return radii[type] || 5;
  }

  private getRequiredServices(): EquipmentState['type'][] {
    const allTypes: EquipmentState['type'][] = ['tug', 'baggage', 'fuel', 'catering', 'bus'];
    const numServices = Math.floor(Math.random() * 3) + 2;
    const shuffled = [...allTypes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numServices);
  }

  getEquipment(): EquipmentState[] {
    return [...this.equipment];
  }

  getEquipmentById(id: string): EquipmentState | undefined {
    return this.equipment.find((e) => e.id === id);
  }

  updateEquipmentState(id: string, updates: Partial<EquipmentState>): void {
    const index = this.equipment.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.equipment[index] = { ...this.equipment[index], ...updates, timestamp: Date.now() };
    }
  }

  getCommands(): DispatchCommand[] {
    return [...this.commands];
  }

  addCommand(command: DispatchCommand): void {
    this.commands.push(command);
  }

  updateCommand(id: string, updates: Partial<DispatchCommand>): void {
    const index = this.commands.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.commands[index] = { ...this.commands[index], ...updates };
    }
  }

  getFlights(): FlightInfo[] {
    return [...this.flights];
  }

  getGates(): GateInfo[] {
    return [...this.gates];
  }

  getZones(): MapZone[] {
    const zones: MapZone[] = [];
    
    for (const gate of this.gates) {
      zones.push({
        id: gate.id,
        name: `Gate ${gate.number}`,
        type: 'gate',
        polygon: this.generateGatePolygon(gate.position),
        gateNumber: gate.number,
        flightId: gate.flightId,
      });
    }
    
    zones.push({
      id: 'taxiway_1',
      name: 'Main Taxiway',
      type: 'taxiway',
      polygon: [
        { x: 0, y: 150, heading: 0 },
        { x: 300, y: 150, heading: 0 },
        { x: 300, y: 170, heading: 0 },
        { x: 0, y: 170, heading: 0 },
      ],
    });
    
    zones.push({
      id: 'parking_1',
      name: 'Remote Parking',
      type: 'parking',
      polygon: [
        { x: 270, y: 50, heading: 0 },
        { x: 300, y: 50, heading: 0 },
        { x: 300, y: 300, heading: 0 },
        { x: 270, y: 300, heading: 0 },
      ],
    });
    
    zones.push({
      id: 'charging_1',
      name: 'Charging Station',
      type: 'charging',
      polygon: [
        { x: 0, y: 0, heading: 0 },
        { x: 30, y: 0, heading: 0 },
        { x: 30, y: 40, heading: 0 },
        { x: 0, y: 40, heading: 0 },
      ],
    });
    
    return zones;
  }

  private generateGatePolygon(center: Position): Position[] {
    const size = 20;
    return [
      { x: center.x - size, y: center.y - size, heading: 0 },
      { x: center.x + size, y: center.y - size, heading: 0 },
      { x: center.x + size, y: center.y + size, heading: 0 },
      { x: center.x - size, y: center.y + size, heading: 0 },
    ];
  }

  simulateStep(dt: number = 0.033): void {
    for (const equipment of this.equipment) {
      if (equipment.status === 'moving') {
        const newX = equipment.position.x + equipment.velocity.linear * Math.cos(equipment.position.heading) * dt;
        const newY = equipment.position.y + equipment.velocity.linear * Math.sin(equipment.position.heading) * dt;
        const newHeading = equipment.position.heading + equipment.velocity.angular * dt;
        
        equipment.position = {
          x: Math.max(5, Math.min(295, newX)),
          y: Math.max(5, Math.min(345, newY)),
          heading: newHeading,
        };
        
        if (Math.random() < 0.01) {
          equipment.velocity.angular = (Math.random() - 0.5) * 0.3;
        }
        
        equipment.timestamp = Date.now();
      }
      
      if (equipment.status === 'charging') {
        equipment.battery = Math.min(100, equipment.battery + dt * 0.1);
      } else if (equipment.status === 'moving' || equipment.status === 'working') {
        equipment.battery = Math.max(0, equipment.battery - dt * 0.005);
      }
      
      if (equipment.battery < 5 && equipment.status !== 'charging') {
        equipment.status = 'error';
      }
      
      if (Math.random() < 0.001) {
        equipment.health.temperature = Math.max(20, Math.min(80, equipment.health.temperature + (Math.random() - 0.5) * 5));
      }
    }
    
    for (const command of this.commands) {
      if (command.status === 'executing') {
        command.progress = Math.min(100, command.progress + dt * 5);
        if (command.progress >= 100) {
          command.status = 'completed';
          command.completedAt = Date.now();
          
          const equipment = this.equipment.find((e) => e.id === command.equipmentId);
          if (equipment) {
            equipment.status = 'idle';
            equipment.currentTask = null;
          }
        }
      }
    }
  }

  createCommand(
    equipmentId: string,
    targetPosition: Position,
    type: DispatchCommand['type'] = 'move',
    priority: DispatchCommand['priority'] = 'normal'
  ): DispatchCommand {
    const equipment = this.equipment.find((e) => e.id === equipmentId);
    if (!equipment) throw new Error('Equipment not found');
    
    const command: DispatchCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority,
      type,
      equipmentId,
      targetPosition,
      path: [
        { x: equipment.position.x, y: equipment.position.y, t: 0 },
        { x: targetPosition.x, y: targetPosition.y, t: 30 },
      ],
      expectedDuration: 30000,
      scheduledTime: Date.now(),
      deadline: Date.now() + 60000,
      status: 'pending',
      progress: 0,
      protocolVersion: '1.0.0',
      signature: '',
      createdAt: Date.now(),
    };
    
    return command;
  }
}

export const simulationDataGenerator = new SimulationDataGenerator();
