const FIRE_STAGES = {
  IGNITION: 'ignition',
  GROWTH: 'growth',
  FULL_DEVELOPMENT: 'full_development',
  DECAY: 'decay',
  EXTINGUISHED: 'extinguished'
};

const SMOKE_THRESHOLDS = {
  SAFE: 0.05,
  WARNING: 0.15,
  DANGER: 0.4,
  CRITICAL: 0.7
};

const createFireZone = (id, centerX, centerY) => ({
  id,
  centerX,
  centerY,
  intensity: 0,
  radius: 0,
  smokeDensity: 0,
  temperature: 25,
  stage: FIRE_STAGES.IGNITION,
  startTime: null,
  duration: 0
});

const createSmokePoint = (id, x, y) => ({
  id,
  x,
  y,
  density: 0,
  velocity: { x: 0, y: 0 },
  lastUpdated: Date.now()
});

export const initTunnelGrid = (width = 100, height = 30, resolution = 2) => {
  const smokePoints = [];
  const cols = Math.floor(width / resolution);
  const rows = Math.floor(height / resolution);
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      smokePoints.push(createSmokePoint(
        `P-${x}-${y}`,
        x * resolution,
        y * resolution
      ));
    }
  }
  
  return {
    width,
    height,
    resolution,
    cols,
    rows,
    smokePoints
  };
};

const calculateSmokeDiffusion = (fireZones, smokePoint, ventilationFlow, timeDelta) => {
  let totalDensity = 0;
  
  for (const fire of fireZones) {
    if (fire.stage === FIRE_STAGES.EXTINGUISHED) continue;
    
    const dx = smokePoint.x - fire.centerX;
    const dy = smokePoint.y - fire.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < fire.radius * 3) {
      const decay = Math.exp(-distance / (fire.radius + 1));
      const fireContribution = fire.smokeDensity * decay;
      totalDensity += fireContribution;
    }
  }
  
  const ventilationEffect = ventilationFlow.flowRate * 0.1;
  const ventilationX = ventilationFlow.direction.x * ventilationEffect * timeDelta;
  const ventilationY = ventilationFlow.direction.y * ventilationEffect * timeDelta;
  
  smokePoint.velocity.x += ventilationX * 0.1;
  smokePoint.velocity.y += ventilationY * 0.1;
  smokePoint.velocity.x *= 0.95;
  smokePoint.velocity.y *= 0.95;
  
  smokePoint.x += smokePoint.velocity.x * timeDelta;
  smokePoint.y += smokePoint.velocity.y * timeDelta;
  
  smokePoint.density = totalDensity * (1 - ventilationEffect * 0.5);
  smokePoint.density = Math.max(0, Math.min(1, smokePoint.density));
  smokePoint.lastUpdated = Date.now();
  
  return smokePoint;
};

const updateFireZone = (fire, timeDelta, suppressionLevel = 0) => {
  if (fire.stage === FIRE_STAGES.EXTINGUISHED) return fire;
  
  if (!fire.startTime) {
    fire.startTime = Date.now();
  }
  
  fire.duration += timeDelta;
  
  switch (fire.stage) {
    case FIRE_STAGES.IGNITION:
      fire.intensity += 0.02 * timeDelta;
      fire.smokeDensity += 0.015 * timeDelta;
      fire.temperature += 0.5 * timeDelta;
      fire.radius += 0.1 * timeDelta;
      
      if (fire.intensity > 0.3) {
        fire.stage = FIRE_STAGES.GROWTH;
      }
      break;
      
    case FIRE_STAGES.GROWTH:
      fire.intensity += 0.05 * timeDelta * (1 - suppressionLevel * 0.3);
      fire.smokeDensity += 0.03 * timeDelta * (1 - suppressionLevel * 0.4);
      fire.temperature += 1 * timeDelta * (1 - suppressionLevel * 0.5);
      fire.radius += 0.2 * timeDelta * (1 - suppressionLevel * 0.5);
      
      if (fire.intensity > 0.8) {
        fire.stage = FIRE_STAGES.FULL_DEVELOPMENT;
      }
      break;
      
    case FIRE_STAGES.FULL_DEVELOPMENT:
      fire.intensity = 0.8 + Math.random() * 0.15;
      fire.intensity *= (1 - suppressionLevel * 0.6);
      fire.smokeDensity = 0.7 + Math.random() * 0.2;
      fire.smokeDensity *= (1 - suppressionLevel * 0.7);
      fire.temperature = 800 + Math.random() * 200;
      fire.temperature = 25 + (fire.temperature - 25) * (1 - suppressionLevel * 0.8);
      fire.radius = Math.min(fire.radius + 0.05 * timeDelta, 20);
      
      if (suppressionLevel > 0.8) {
        fire.stage = FIRE_STAGES.DECAY;
      }
      break;
      
    case FIRE_STAGES.DECAY:
      fire.intensity *= 0.95;
      fire.smokeDensity *= 0.97;
      fire.temperature *= 0.98;
      fire.radius *= 0.99;
      
      if (fire.intensity < 0.05) {
        fire.stage = FIRE_STAGES.EXTINGUISHED;
        fire.intensity = 0;
        fire.smokeDensity = 0;
        fire.temperature = 25;
      }
      break;
  }
  
  fire.intensity = Math.max(0, Math.min(1, fire.intensity));
  fire.smokeDensity = Math.max(0, Math.min(1, fire.smokeDensity));
  fire.temperature = Math.max(25, fire.temperature);
  fire.radius = Math.max(0, fire.radius);
  
  return fire;
};

export const fireEvolutionModel = {
  FIRE_STAGES,
  SMOKE_THRESHOLDS,
  
  createFireZone,
  createSmokePoint,
  initTunnelGrid,
  
  async simulateStep(fireZones, grid, ventilationFlow, timeDelta = 0.1, suppressionLevel = 0) {
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const updatedFireZones = fireZones.map(fire => 
      updateFireZone({ ...fire }, timeDelta, suppressionLevel)
    );
    
    const updatedSmokePoints = grid.smokePoints.map(point =>
      calculateSmokeDiffusion(updatedFireZones, { ...point }, ventilationFlow, timeDelta)
    );
    
    const avgSmokeDensity = updatedSmokePoints.reduce((sum, p) => sum + p.density, 0) / 
      updatedSmokePoints.length;
    
    const zoneSmokeDensity = {};
    const zones = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'];
    const widthPerZone = grid.width / zones.length;
    
    zones.forEach(zone => {
      const zoneIndex = zones.indexOf(zone);
      const minX = zoneIndex * widthPerZone;
      const maxX = (zoneIndex + 1) * widthPerZone;
      
      const zonePoints = updatedSmokePoints.filter(p => p.x >= minX && p.x < maxX);
      const avgDensity = zonePoints.length > 0 
        ? zonePoints.reduce((sum, p) => sum + p.density, 0) / zonePoints.length
        : 0;
      zoneSmokeDensity[zone] = avgDensity;
    });
    
    const maxFire = updatedFireZones.reduce((max, f) => 
      f.intensity > (max?.intensity || 0) ? f : max
    , null);
    
    return {
      fireZones: updatedFireZones,
      grid: { ...grid, smokePoints: updatedSmokePoints },
      avgSmokeDensity,
      zoneSmokeDensity,
      dominantFire: maxFire,
      timestamp: Date.now()
    };
  },
  
  getSmokeStatus(density) {
    if (density >= SMOKE_THRESHOLDS.CRITICAL) return 'critical';
    if (density >= SMOKE_THRESHOLDS.DANGER) return 'danger';
    if (density >= SMOKE_THRESHOLDS.WARNING) return 'warning';
    return 'safe';
  },
  
  getVisibility(smokeDensity) {
    const baseVisibility = 100;
    return Math.max(0, baseVisibility * (1 - smokeDensity * 1.2));
  },
  
  validateLogic(fireZones, ventilationFlow, currentTime) {
    const issues = [];
    const warnings = [];
    
    for (const fire of fireZones) {
      if (fire.stage !== FIRE_STAGES.EXTINGUISHED) {
        if (fire.smokeDensity > SMOKE_THRESHOLDS.CRITICAL) {
          warnings.push({
            type: 'smoke_critical',
            zone: fire.id,
            message: `区域 ${fire.id} 烟雾浓度达到临界值`,
            value: fire.smokeDensity
          });
        }
        
        if (fire.temperature > 500) {
          warnings.push({
            type: 'temperature_critical',
            zone: fire.id,
            message: `区域 ${fire.id} 温度超过临界值: ${Math.round(fire.temperature)}°C`,
            value: fire.temperature
          });
        }
      }
    }
    
    const activeFires = fireZones.filter(f => f.stage !== FIRE_STAGES.EXTINGUISHED);
    const avgSmoke = activeFires.reduce((sum, f) => sum + f.smokeDensity, 0) / 
      (activeFires.length || 1);
    
    if (avgSmoke > SMOKE_THRESHOLDS.WARNING && ventilationFlow.flowRate < 50) {
      issues.push({
        type: 'ventilation_insufficient',
        message: '通风系统流量不足，建议增加通风功率',
        currentFlow: ventilationFlow.flowRate,
        recommendedFlow: 80
      });
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      timestamp: currentTime
    };
  }
};

export default fireEvolutionModel;
