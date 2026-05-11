import * as d3 from 'd3';

export class SeaLevelAnalyzer {
  constructor() {
    this.historicalData = [];
    this.projectionData = [];
    this.thermalExpansionCoeff = 0.00021;
    this.iceSheetContribution = {
      greenland: 0.7,
      antarctica: 0.4
    };
  }

  generateHistoricalData(startYear = 1990, endYear = 2024) {
    const data = [];
    let seaLevel = 0;
    
    for (let year = startYear; year <= endYear; year++) {
      const yearFraction = (year - startYear) / (endYear - startYear);
      const acceleration = yearFraction * yearFraction * 10;
      const seasonal = Math.sin(year * Math.PI * 2) * 0.5;
      const noise = (Math.random() - 0.5) * 0.3;
      
      seaLevel = 3.2 * (year - startYear) + acceleration + seasonal + noise;
      
      data.push({
        year,
        level: seaLevel,
        uncertainty: 0.5 + yearFraction * 0.3,
        source: 'satellite'
      });
    }
    
    this.historicalData = data;
    return data;
  }

  projectSeaLevelRise(scenario = 'moderate', years = 100) {
    const lastHistorical = this.historicalData[this.historicalData.length - 1];
    const projections = [];
    
    let baseRate = 3.2;
    let acceleration = {
      low: 0.01,
      moderate: 0.025,
      high: 0.05
    }[scenario];
    
    let currentLevel = lastHistorical.level;
    
    for (let i = 1; i <= years; i++) {
      const year = lastHistorical.year + i;
      baseRate += acceleration;
      currentLevel += baseRate * 0.1;
      
      const thermalExpansion = currentLevel * 0.5;
      const greenlandContribution = this.iceSheetContribution.greenland * (i / 100);
      const antarcticaContribution = this.iceSheetContribution.antarctica * (i / 100) * (1 + i / 50);
      
      projections.push({
        year,
        level: currentLevel,
        thermalExpansion,
        greenland: greenlandContribution,
        antarctica: antarcticaContribution,
        glaciers: currentLevel * 0.3,
        uncertainty: i * 0.1,
        scenario
      });
    }
    
    this.projectionData = projections;
    return projections;
  }

  calculateTrendAnalysis() {
    if (this.historicalData.length < 2) return null;
    
    const n = this.historicalData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    this.historicalData.forEach(d => {
      sumX += d.year;
      sumY += d.level;
      sumXY += d.year * d.level;
      sumX2 += d.year * d.year;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const r2 = this.calculateR2(slope, intercept);
    
    return {
      rate: slope,
      intercept,
      r2,
      acceleration: this.calculateAcceleration()
    };
  }

  calculateR2(slope, intercept) {
    const meanY = this.historicalData.reduce((sum, d) => sum + d.level, 0) / this.historicalData.length;
    
    let ssTotal = 0, ssResidual = 0;
    
    this.historicalData.forEach(d => {
      const predicted = slope * d.year + intercept;
      ssTotal += Math.pow(d.level - meanY, 2);
      ssResidual += Math.pow(d.level - predicted, 2);
    });
    
    return 1 - ssResidual / ssTotal;
  }

  calculateAcceleration() {
    if (this.historicalData.length < 20) return 0;
    
    const firstDecade = this.historicalData.slice(0, 10);
    const lastDecade = this.historicalData.slice(-10);
    
    const firstRate = firstDecade[firstDecade.length - 1].level - firstDecade[0].level;
    const lastRate = lastDecade[lastDecade.length - 1].level - lastDecade[0].level;
    
    return (lastRate - firstRate) / 10;
  }

  getContributionBreakdown(year) {
    const projection = this.projectionData.find(p => p.year === year);
    
    if (!projection) return null;
    
    return {
      thermalExpansion: {
        value: projection.thermalExpansion,
        percentage: (projection.thermalExpansion / projection.level) * 100,
        label: '热膨胀'
      },
      greenland: {
        value: projection.greenland,
        percentage: (projection.greenland / projection.level) * 100,
        label: '格陵兰冰盖'
      },
      antarctica: {
        value: projection.antarctica,
        percentage: (projection.antarctica / projection.level) * 100,
        label: '南极冰盖'
      },
      glaciers: {
        value: projection.glaciers,
        percentage: (projection.glaciers / projection.level) * 100,
        label: '山地冰川'
      }
    };
  }

  generateConfidenceInterval(year, confidence = 0.95) {
    const projection = this.projectionData.find(p => p.year === year);
    if (!projection) return null;
    
    const zScore = confidence === 0.95 ? 1.96 : 1.645;
    const margin = projection.uncertainty * zScore;
    
    return {
      lower: projection.level - margin,
      upper: projection.level + margin,
      best: projection.level
    };
  }
}

export function createSeaLevelChart(container, data) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 20, right: 30, bottom: 30, left: 50 };
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
    
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([margin.left, width - margin.right]);
  
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.level + d.uncertainty)])
    .nice()
    .range([height - margin.bottom, margin.top]);
  
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')));
  
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));
  
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.level));
  
  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#4da6ff')
    .attr('stroke-width', 2)
    .attr('d', line);
  
  svg.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.year))
    .attr('cy', d => y(d.level))
    .attr('r', 3)
    .attr('fill', '#4da6ff');
  
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0)
    .attr('x', -height / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .style('fill', '#a0a8c0')
    .text('海平面上升 (mm)');
  
  return svg;
}
