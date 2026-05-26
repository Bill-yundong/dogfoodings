import type { 
  Battery, BatterySnapshot, Flight, Aircraft, Runway, RunwayAllocation,
  GridSignal, ChargeSession, AirspaceSector, Trajectory4D, MDPState
} from '@/types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export const mockGenerators = {
  generateBatteries(count: number = 50): Battery[] {
    const batteries: Battery[] = [];
    const chemistries: Array<'lfp' | 'ncm' | 'other'> = ['lfp', 'ncm', 'ncm', 'lfp', 'other'];
    
    for (let i = 0; i < count; i++) {
      const cycleCount = Math.floor(randomInRange(100, 3000));
      const baseSOH = Math.max(0.7, 1 - cycleCount * 0.0001);
      
      batteries.push({
        id: generateId('bat'),
        serialNumber: `SN${2024}${String(i).padStart(6, '0')}`,
        nominalCapacity: randomInRange(80, 200),
        nominalVoltage: randomInRange(400, 800),
        manufactureDate: new Date(Date.now() - randomInRange(0, 2 * 365 * 24 * 60 * 60 * 1000)),
        aircraftId: generateId('ac'),
        cellCount: Math.floor(randomInRange(96, 192)),
        chemistry: chemistries[i % chemistries.length],
        currentCapacity: 80 + Math.random() * 120,
        cycleCount,
        status: baseSOH < 0.75 ? 'degrading' : baseSOH < 0.7 ? 'replace' : 'healthy'
      });
    }
    
    return batteries;
  },

  generateAircraft(batteries: Battery[], count: number = 30): Aircraft[] {
    const models = ['Ehang 216', 'Joby S4', 'Lilium Jet', 'Volocopter VoloCity', 'Archer Maker'];
    const operators = ['AirAsia', 'China Eastern', 'Spring Airlines', 'Juneyao Air', 'Hainan Airlines'];
    
    return batteries.slice(0, count).map((battery, i) => ({
      id: battery.aircraftId,
      registration: `B-${String(1000 + i)}`,
      model: models[i % models.length],
      capacity: Math.floor(randomInRange(2, 6)),
      batteryId: battery.id,
      maxRange: randomInRange(100, 300),
      cruiseSpeed: randomInRange(200, 350),
      operator: operators[i % operators.length],
      status: ['available', 'in-flight', 'charging', 'maintenance'][i % 4] as any,
      currentLocation: i % 3 === 0 ? 'Shanghai' : i % 3 === 1 ? 'Beijing' : 'Shenzhen'
    }));
  },

  generateBatterySnapshots(
    batteries: Battery[],
    flights: Flight[],
    count: number = 10000
  ): BatterySnapshot[] {
    const snapshots: BatterySnapshot[] = [];
    const phases = ['idle', 'takeoff', 'cruise', 'landing', 'charging', 'discharging'];
    
    for (let i = 0; i < count; i++) {
      const battery = batteries[Math.floor(Math.random() * batteries.length)];
      const flight = flights[Math.floor(Math.random() * flights.length)];
      const baseSOH = Math.max(0.7, 1 - (battery.cycleCount + i * 0.1) * 0.0001);
      const sohVariation = randomInRange(-0.02, 0.02);
      
      snapshots.push({
        id: generateId('snap'),
        batteryId: battery.id,
        flightId: flight?.id || generateId('flt'),
        timestamp: new Date(Date.now() - randomInRange(0, 30 * 24 * 60 * 60 * 1000)),
        soh: Math.max(0.6, Math.min(1, baseSOH + sohVariation)),
        soc: randomInRange(0.1, 0.95),
        temperature: randomInRange(20, 55),
        cycleCount: battery.cycleCount + Math.floor(i / 100),
        voltage: battery.nominalVoltage * randomInRange(0.9, 1.1),
        current: randomInRange(-200, 400),
        power: randomInRange(0, 500),
        energy: battery.nominalCapacity * randomInRange(0.1, 0.95),
        operationPhase: phases[Math.floor(Math.random() * phases.length)] as any,
        cellData: Array.from({ length: Math.min(12, battery.cellCount) }, (_, j) => ({
          cellIndex: j,
          voltage: randomInRange(3.2, 4.2),
          temperature: randomInRange(25, 45),
          soc: randomInRange(0.1, 0.95),
          resistance: randomInRange(0.001, 0.005)
        }))
      });
    }
    
    return snapshots;
  },

  generateFlights(aircraft: Aircraft[], count: number = 500): Flight[] {
    const flights: Flight[] = [];
    const cities = ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Hangzhou', 'Chengdu', 'Wuhan'];
    const statuses: Flight['status'][] = ['scheduled', 'boarding', 'ready', 'taxiing', 'takeoff', 'enroute', 'approach', 'landing', 'arrived', 'delayed', 'cancelled'];
    
    for (let i = 0; i < count; i++) {
      const ac = aircraft[i % aircraft.length];
      const scheduledDeparture = new Date(Date.now() + randomInRange(-24 * 60 * 60 * 1000, 48 * 60 * 60 * 1000));
      const durationMinutes = randomInRange(15, 90);
      
      flights.push({
        id: generateId('flt'),
        flightNumber: `VP${String(1000 + i)}`,
        aircraftId: ac.id,
        airline: ac.operator,
        scheduledDeparture,
        scheduledArrival: new Date(scheduledDeparture.getTime() + durationMinutes * 60 * 1000),
        actualDeparture: Math.random() > 0.5 ? new Date(scheduledDeparture.getTime() + randomInRange(-10, 30) * 60 * 1000) : undefined,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        passengers: Math.floor(randomInRange(1, ac.capacity)),
        origin: cities[Math.floor(Math.random() * cities.length)],
        destination: cities[Math.floor(Math.random() * cities.length)],
        priority: Math.floor(randomInRange(1, 10)),
        delayMinutes: Math.random() > 0.7 ? Math.floor(randomInRange(5, 60)) : undefined
      });
    }
    
    return flights.sort((a, b) => a.scheduledDeparture.getTime() - b.scheduledDeparture.getTime());
  },

  generateRunways(count: number = 8): Runway[] {
    const runways: Runway[] = [];
    const positions = [
      { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 300, y: 100 }, { x: 400, y: 100 },
      { x: 100, y: 300 }, { x: 200, y: 300 }, { x: 300, y: 300 }, { x: 400, y: 300 }
    ];
    
    for (let i = 0; i < count; i++) {
      runways.push({
        id: generateId('rwy'),
        name: `VP-${String(i + 1).padStart(2, '0')}`,
        type: i < 4 ? 'vertipad' : 'runway',
        length: i < 4 ? 50 : 500,
        status: ['available', 'available', 'available', 'occupied', 'maintenance'][i % 5] as any,
        position: positions[i] || { x: 100, y: 100 },
        heading: i % 2 === 0 ? 0 : 180
      });
    }
    
    return runways;
  },

  generateRunwayAllocations(
    runways: Runway[],
    flights: Flight[],
    count: number = 200
  ): RunwayAllocation[] {
    const allocations: RunwayAllocation[] = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const runway = runways[i % runways.length];
      const flight = flights[i % flights.length];
      const startTime = new Date(now + i * 5 * 60 * 1000);
      
      allocations.push({
        id: generateId('alloc'),
        runwayId: runway.id,
        flightId: flight.id,
        startTime,
        endTime: new Date(startTime.getTime() + 5 * 60 * 1000),
        operationType: i % 2 === 0 ? 'takeoff' : 'landing',
        status: ['pending', 'active', 'completed'][i % 3] as any,
        sequence: i
      });
    }
    
    return allocations;
  },

  generateGridSignals(count: number = 1000): GridSignal[] {
    const signals: GridSignal[] = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const hourOfDay = (new Date(now - i * 5 * 60 * 1000)).getHours();
      const isPeak = (hourOfDay >= 8 && hourOfDay <= 11) || (hourOfDay >= 18 && hourOfDay <= 21);
      const isValley = hourOfDay >= 0 && hourOfDay <= 6;
      
      signals.push({
        id: generateId('grid'),
        timestamp: new Date(now - i * 5 * 60 * 1000),
        gridLoad: randomInRange(isPeak ? 80 : isValley ? 40 : 60, isPeak ? 100 : isValley ? 60 : 80),
        gridCapacity: 100,
        electricityPrice: isPeak ? randomInRange(0.8, 1.2) : isValley ? randomInRange(0.3, 0.5) : randomInRange(0.5, 0.8),
        signalType: isPeak ? 'peak' : isValley ? 'valley' : 'normal',
        targetLoad: isPeak ? randomInRange(70, 80) : undefined,
        frequency: randomInRange(49.8, 50.2),
        renewableRatio: isValley ? randomInRange(0.5, 0.8) : isPeak ? randomInRange(0.2, 0.4) : randomInRange(0.3, 0.6)
      });
    }
    
    return signals.reverse();
  },

  generateChargeSessions(
    batteries: Battery[],
    gridSignals: GridSignal[],
    count: number = 500
  ): ChargeSession[] {
    const sessions: ChargeSession[] = [];
    
    for (let i = 0; i < count; i++) {
      const battery = batteries[i % batteries.length];
      const gridSignal = gridSignals[i % gridSignals.length];
      const durationMinutes = randomInRange(15, 120);
      const startTime = new Date(gridSignal.timestamp.getTime() - durationMinutes * 60 * 1000);
      const isV2G = Math.random() > 0.85;
      
      sessions.push({
        id: generateId('chg'),
        batteryId: battery.id,
        gridSignalId: isV2G ? gridSignal.id : undefined,
        startTime,
        endTime: gridSignal.timestamp,
        energyCharged: isV2G ? -randomInRange(10, 50) : randomInRange(20, 100),
        maxPower: randomInRange(100, 350),
        averagePower: randomInRange(50, 200),
        chargeType: isV2G ? 'v2g' : ['fast', 'normal', 'slow'][Math.floor(Math.random() * 3)] as any,
        status: 'completed',
        cost: randomInRange(10, 100),
        carbonFootprint: randomInRange(5, 50)
      });
    }
    
    return sessions;
  },

  generateAirspaceSectors(): AirspaceSector[] {
    return [
      {
        id: generateId('sec'),
        name: '上海中心区 A',
        geometry: [
          { lat: 31.23, lng: 121.47 },
          { lat: 31.33, lng: 121.47 },
          { lat: 31.33, lng: 121.57 },
          { lat: 31.23, lng: 121.57 }
        ],
        altitudeMin: 100,
        altitudeMax: 1000,
        capacity: 10,
        currentFlights: Math.floor(randomInRange(3, 8)),
        status: 'open'
      },
      {
        id: generateId('sec'),
        name: '上海中心区 B',
        geometry: [
          { lat: 31.23, lng: 121.57 },
          { lat: 31.33, lng: 121.57 },
          { lat: 31.33, lng: 121.67 },
          { lat: 31.23, lng: 121.67 }
        ],
        altitudeMin: 1000,
        altitudeMax: 2000,
        capacity: 15,
        currentFlights: Math.floor(randomInRange(5, 12)),
        status: 'open'
      },
      {
        id: generateId('sec'),
        name: '浦东进场走廊',
        geometry: [
          { lat: 31.15, lng: 121.80 },
          { lat: 31.30, lng: 121.80 },
          { lat: 31.30, lng: 122.00 },
          { lat: 31.15, lng: 122.00 }
        ],
        altitudeMin: 200,
        altitudeMax: 1500,
        capacity: 8,
        currentFlights: Math.floor(randomInRange(2, 6)),
        status: 'open'
      },
      {
        id: generateId('sec'),
        name: '虹桥进场走廊',
        geometry: [
          { lat: 31.10, lng: 121.30 },
          { lat: 31.25, lng: 121.30 },
          { lat: 31.25, lng: 121.45 },
          { lat: 31.10, lng: 121.45 }
        ],
        altitudeMin: 200,
        altitudeMax: 1500,
        capacity: 8,
        currentFlights: Math.floor(randomInRange(3, 7)),
        status: 'restricted',
        restrictions: ['No commercial traffic after 22:00']
      }
    ];
  },

  generateMDPState(
    runways: Runway[],
    flights: Flight[],
    batteries: Battery[],
    gridSignals: GridSignal[]
  ): MDPState {
    const activeFlights = flights.filter(f => f.status !== 'arrived' && f.status !== 'cancelled');
    const latestGrid = gridSignals[gridSignals.length - 1];
    
    return {
      id: generateId('state'),
      timestamp: new Date(),
      runwayUtilization: runways.map(r => r.status === 'occupied' ? 1 : randomInRange(0.3, 0.8)),
      flightQueueLength: activeFlights.filter(f => f.status === 'ready' || f.status === 'boarding').length,
      averageWaitTime: randomInRange(2, 15),
      batteryStates: batteries.slice(0, 10).map(b => ({
        batteryId: b.id,
        soc: randomInRange(0.2, 0.9),
        soh: Math.max(0.7, 1 - b.cycleCount * 0.0001),
        isCharging: b.status === 'maintenance'
      })),
      gridLoad: latestGrid ? latestGrid.gridLoad / 100 : randomInRange(0.5, 0.8),
      weatherScore: randomInRange(0.7, 0.95)
    };
  }
};
