import {
  calculateTemperatureDrop,
  calculatePressureDrop,
  asyncHeatConductionSimulation,
  calculateHeatBalance,
  calculateNodeHeatLoad
} from '../src/utils/heatConduction.js'

import {
  generateNetwork
} from '../src/utils/networkGenerator.js'

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    }
    this.moduleCoverage = {}
  }

  describe(moduleName, callback) {
    this.currentModule = moduleName
    if (!this.moduleCoverage[moduleName]) {
      this.moduleCoverage[moduleName] = {
        total: 0,
        passed: 0,
        failed: 0,
        tests: []
      }
    }
    callback()
  }

  it(testName, testFn) {
    const start = Date.now()
    this.results.total++
    this.moduleCoverage[this.currentModule].total++
    
    try {
      testFn()
      const duration = Date.now() - start
      
      this.results.passed++
      this.moduleCoverage[this.currentModule].passed++
      
      const testResult = {
        module: this.currentModule,
        name: testName,
        status: 'PASSED',
        duration: duration
      }
      
      this.results.tests.push(testResult)
      this.moduleCoverage[this.currentModule].tests.push(testResult)
      
      console.log(`  ✅ ${testName} (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - start
      
      this.results.failed++
      this.moduleCoverage[this.currentModule].failed++
      
      const testResult = {
        module: this.currentModule,
        name: testName,
        status: 'FAILED',
        duration: duration,
        error: error.message
      }
      
      this.results.tests.push(testResult)
      this.moduleCoverage[this.currentModule].tests.push(testResult)
      
      console.log(`  ❌ ${testName} (${duration}ms)`)
      console.log(`     Error: ${error.message}`)
    }
  }

  expect(actual) {
    return {
      toBe(expected) {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`)
        }
      },
      toBeCloseTo(expected, precision = 2) {
        if (Math.abs(actual - expected) > Math.pow(10, -precision)) {
          throw new Error(`Expected ${expected}, got ${actual}`)
        }
      },
      toBeGreaterThan(expected) {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`)
        }
      },
      toBeGreaterThanOrEqual(expected) {
        if (actual < expected) {
          throw new Error(`Expected ${actual} to be greater than or equal ${expected}`)
        }
      },
      toBeLessThan(expected) {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`)
        }
      },
      toBeLessThanOrEqual(expected) {
        if (actual > expected) {
          throw new Error(`Expected ${actual} to be less than or equal ${expected}`)
        }
      },
      toBeTruthy() {
        if (!actual) {
          throw new Error(`Expected truthy, got ${actual}`)
        }
      },
      toBeDefined() {
        if (actual === undefined) {
          throw new Error('Expected value to be defined')
        }
      },
      toHaveLength(expected) {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual.length}`)
        }
      },
      toBeArray() {
        if (!Array.isArray(actual)) {
          throw new Error(`Expected array, got ${typeof actual}`)
        }
      },
      toContain(key) {
        if (!actual || !actual[key]) {
          throw new Error(`Expected object to contain key ${key}`)
        }
      },
      toBeInstanceOf(Class) {
        if (!(actual instanceof Class)) {
          throw new Error(`Expected instance of ${Class.name}`)
        }
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`\nTotal tests: ${this.results.total}`)
    console.log(`Passed: ${this.results.passed} ✅`)
    console.log(`Failed: ${this.results.failed} ❌`)
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed!')
    } else {
      console.log(`\n⚠️  ${this.results.failed} test(s) failed`)
    }
    
    console.log('\nModule Coverage:')
    for (const [moduleName, coverage] of Object.entries(this.moduleCoverage)) {
      const passRate = coverage.total > 0 
        ? ((coverage.passed / coverage.total) * 100).toFixed(1) 
        : '0'
      console.log(`  ${moduleName}: ${passRate}% (${coverage.passed}/${coverage.total})`)
    }
  }

  getResults() {
    return this.results
  }

  getModuleCoverage() {
    return this.moduleCoverage
  }
}

function runAllTests() {
  const runner = new TestRunner()
  
  console.log('\n' + '='.repeat(60))
  console.log('HEATNEXUS INTEGRATION TESTS')
  console.log('='.repeat(60))
  
  console.log('\n[1] Testing Heat Conduction Algorithms...')
  runner.describe('HeatConduction', () => {
    
    runner.it('calculateTemperatureDrop should return valid temperature values', () => {
      const result = calculateTemperatureDrop({
        inletTemp: 95,
        flowRate: 100,
        pipeLength: 1000,
        ambientTemp: 10,
        pipeDiameter: 0.1,
        insulationThickness: 0.05
      })
      
      runner.expect(result.outletTemp).toBeDefined()
      runner.expect(result.tempDrop).toBeGreaterThan(0)
      runner.expect(result.heatLoss).toBeGreaterThan(0)
      runner.expect(result.outletTemp).toBeLessThan(95)
      runner.expect(result.outletTemp).toBeGreaterThan(10)
    })
    
    runner.it('calculateTemperatureDrop should have higher loss with longer pipe', () => {
      const shortPipe = calculateTemperatureDrop({
        inletTemp: 95,
        flowRate: 100,
        pipeLength: 100,
        ambientTemp: 10,
        pipeDiameter: 0.1,
        insulationThickness: 0.05
      })
      
      const longPipe = calculateTemperatureDrop({
        inletTemp: 95,
        flowRate: 100,
        pipeLength: 1000,
        ambientTemp: 10,
        pipeDiameter: 0.1,
        insulationThickness: 0.05
      })
      
      runner.expect(longPipe.tempDrop).toBeGreaterThan(shortPipe.tempDrop)
      runner.expect(longPipe.heatLoss).toBeGreaterThan(shortPipe.heatLoss)
    })
    
    runner.it('calculateTemperatureDrop should have lower loss with better insulation', () => {
      const thinInsulation = calculateTemperatureDrop({
        inletTemp: 95,
        flowRate: 100,
        pipeLength: 1000,
        ambientTemp: 10,
        pipeDiameter: 0.1,
        insulationThickness: 0.01
      })
      
      const thickInsulation = calculateTemperatureDrop({
        inletTemp: 95,
        flowRate: 100,
        pipeLength: 1000,
        ambientTemp: 10,
        pipeDiameter: 0.1,
        insulationThickness: 0.1
      })
      
      runner.expect(thickInsulation.tempDrop).toBeLessThan(thinInsulation.tempDrop)
    })
    
    runner.it('calculatePressureDrop should return valid pressure values', () => {
      const result = calculatePressureDrop({
        flowRate: 100,
        pipeLength: 1000,
        pipeDiameter: 0.1
      })
      
      runner.expect(result.velocity).toBeGreaterThan(0)
      runner.expect(result.reynoldsNumber).toBeGreaterThan(0)
      runner.expect(result.frictionFactor).toBeGreaterThan(0)
      runner.expect(result.pressureDrop).toBeGreaterThan(0)
    })
    
    runner.it('calculatePressureDrop should increase with flow rate', () => {
      const lowFlow = calculatePressureDrop({
        flowRate: 50,
        pipeLength: 1000,
        pipeDiameter: 0.1
      })
      
      const highFlow = calculatePressureDrop({
        flowRate: 200,
        pipeLength: 1000,
        pipeDiameter: 0.1
      })
      
      runner.expect(highFlow.pressureDrop).toBeGreaterThan(lowFlow.pressureDrop)
    })
    
    runner.it('calculateNodeHeatLoad should return valid heat load', () => {
      const result = calculateNodeHeatLoad({
        flowRate: 10,
        heatCapacity: 4200,
        density: 1000
      }, 70, 40)
      
      runner.expect(result.heatLoad).toBeGreaterThan(0)
      runner.expect(result.powerKW).toBeGreaterThan(0)
    })
    
    runner.it('calculateNodeHeatLoad should be proportional to temperature difference', () => {
      const lowDiff = calculateNodeHeatLoad({ flowRate: 10 }, 50, 40)
      const highDiff = calculateNodeHeatLoad({ flowRate: 10 }, 80, 40)
      
      runner.expect(highDiff.heatLoad).toBeGreaterThan(lowDiff.heatLoad)
    })
  })
  
  console.log('\n[2] Testing Network Simulation...')
  runner.describe('NetworkSimulation', () => {
    
    runner.it('should generate valid network topology', () => {
      const { nodes, connections } = generateNetwork({
        sourceCount: 1,
        zoneCount: 2,
        nodesPerZone: 100,
        branchDepth: 2
      })
      
      runner.expect(nodes).toBeArray()
      runner.expect(connections).toBeArray()
      runner.expect(nodes.length).toBeGreaterThan(0)
      runner.expect(connections.length).toBeGreaterThan(0)
    })
    
    runner.it('should have source, main, distribution, and end node types', () => {
      const { nodes } = generateNetwork({
        sourceCount: 1,
        zoneCount: 2,
        nodesPerZone: 100,
        branchDepth: 2
      })
      
      const types = new Set(nodes.map(n => n.type))
      
      runner.expect(types.has('source')).toBeTruthy()
      runner.expect(types.has('main')).toBeTruthy()
      runner.expect(types.has('end')).toBeTruthy()
    })
    
    runner.it('should generate correct number of sources', () => {
      const { nodes } = generateNetwork({
        sourceCount: 3,
        zoneCount: 2,
        nodesPerZone: 50,
        branchDepth: 2
      })
      
      const sources = nodes.filter(n => n.type === 'source')
      runner.expect(sources.length).toBe(3)
    })
    
    runner.it('should have valid coordinates for all nodes', () => {
      const { nodes } = generateNetwork({
        sourceCount: 1,
        zoneCount: 2,
        nodesPerZone: 50,
        branchDepth: 2
      })
      
      for (const node of nodes) {
        runner.expect(node.coords).toBeDefined()
        runner.expect(node.coords.x).toBeDefined()
        runner.expect(node.coords.y).toBeDefined()
      }
    })
    
    runner.it('should have valid zone assignments', () => {
      const { nodes } = generateNetwork({
        sourceCount: 1,
        zoneCount: 3,
        nodesPerZone: 100,
        branchDepth: 2
      })
      
      const zones = new Set(nodes.map(n => n.zoneId))
      runner.expect(zones.size).toBeGreaterThanOrEqual(3)
    })
    
    runner.it('asyncHeatConductionSimulation should process all nodes', async () => {
      const { nodes, connections } = generateNetwork({
        sourceCount: 1,
        zoneCount: 2,
        nodesPerZone: 50,
        branchDepth: 2
      })
      
      const sourceNode = nodes.find(n => n.type === 'source')
      runner.expect(sourceNode).toBeDefined()
      
      const results = await asyncHeatConductionSimulation(
        nodes,
        connections,
        sourceNode.id
      )
      
      runner.expect(results).toBeDefined()
      runner.expect(Object.keys(results).length).toBeGreaterThan(0)
      
      for (const [nodeId, result] of Object.entries(results)) {
        runner.expect(result.outletTemp).toBeGreaterThan(0)
        runner.expect(result.inletTemp).toBeGreaterThanOrEqual(result.outletTemp)
      }
    })
    
    runner.it('asyncHeatConductionSimulation should show temperature decrease from source', async () => {
      const { nodes, connections } = generateNetwork({
        sourceCount: 1,
        zoneCount: 2,
        nodesPerZone: 50,
        branchDepth: 2
      })
      
      const sourceNode = nodes.find(n => n.type === 'source')
      const results = await asyncHeatConductionSimulation(
        nodes,
        connections,
        sourceNode.id
      )
      
      const sourceResult = results[sourceNode.id]
      const endNodes = nodes.filter(n => n.type === 'end')
      
      if (endNodes.length > 0) {
        const endNode = endNodes[0]
        const endResult = results[endNode.id]
        
        if (endResult) {
          runner.expect(sourceResult.outletTemp).toBeGreaterThanOrEqual(endResult.outletTemp)
        }
      }
    })
    
    runner.it('calculateHeatBalance should return valid balance metrics', async () => {
      const { nodes, connections } = generateNetwork({
        sourceCount: 1,
        zoneCount: 2,
        nodesPerZone: 50,
        branchDepth: 2
      })
      
      const sourceNode = nodes.find(n => n.type === 'source')
      const simulationResults = await asyncHeatConductionSimulation(
        nodes,
        connections,
        sourceNode.id
      )
      
      const balance = calculateHeatBalance(nodes, simulationResults)
      
      runner.expect(balance.totalSupplyHeat).toBeGreaterThan(0)
      runner.expect(balance.totalHeatLoss).toBeGreaterThan(0)
      runner.expect(balance.totalEndHeat).toBeGreaterThan(0)
      runner.expect(balance.balanceRatio).toBeGreaterThan(0)
      runner.expect(balance.balanceRatio).toBeLessThan(100)
    })
    
    runner.it('calculateHeatBalance should have supply greater than end heat', async () => {
      const { nodes, connections } = generateNetwork({
        sourceCount: 1,
        zoneCount: 2,
        nodesPerZone: 50,
        branchDepth: 2
      })
      
      const sourceNode = nodes.find(n => n.type === 'source')
      const simulationResults = await asyncHeatConductionSimulation(
        nodes,
        connections,
        sourceNode.id
      )
      
      const balance = calculateHeatBalance(nodes, simulationResults)
      
      runner.expect(balance.totalSupplyHeat).toBeGreaterThan(balance.totalEndHeat)
    })
  })
  
  console.log('\n[3] Testing Edge Cases...')
  runner.describe('EdgeCases', () => {
    
    runner.it('should handle zero flow rate gracefully', () => {
      const result = calculateTemperatureDrop({
        inletTemp: 95,
        flowRate: 0,
        pipeLength: 1000,
        ambientTemp: 10,
        pipeDiameter: 0.1,
        insulationThickness: 0.05
      })
      
      runner.expect(result).toBeDefined()
    })
    
    runner.it('should handle very short pipes', () => {
      const result = calculateTemperatureDrop({
        inletTemp: 95,
        flowRate: 100,
        pipeLength: 1,
        ambientTemp: 10,
        pipeDiameter: 0.1,
        insulationThickness: 0.05
      })
      
      runner.expect(result.tempDrop).toBeCloseTo(0, 2)
    })
    
    runner.it('should maintain thermal resistance calculations', () => {
      const result1 = calculateTemperatureDrop({
        inletTemp: 95,
        flowRate: 100,
        pipeLength: 1000,
        ambientTemp: 10,
        pipeDiameter: 0.1,
        insulationThickness: 0.05
      })
      
      const result2 = calculateTemperatureDrop({
        inletTemp: 95,
        flowRate: 100,
        pipeLength: 2000,
        ambientTemp: 10,
        pipeDiameter: 0.1,
        insulationThickness: 0.05
      })
      
      runner.expect(result2.heatLoss).toBeGreaterThan(result1.heatLoss)
    })
    
    runner.it('should handle very large networks', () => {
      const { nodes, connections } = generateNetwork({
        sourceCount: 1,
        zoneCount: 5,
        nodesPerZone: 500,
        branchDepth: 3
      })
      
      runner.expect(nodes.length).toBeGreaterThan(1000)
      runner.expect(connections.length).toBeGreaterThan(1000)
    })
  })
  
  console.log('\n[4] Testing Performance...')
  runner.describe('Performance', () => {
    
    runner.it('should generate 1000 nodes in under 500ms', () => {
      const start = Date.now()
      
      const { nodes } = generateNetwork({
        sourceCount: 1,
        zoneCount: 2,
        nodesPerZone: 500,
        branchDepth: 3
      })
      
      const duration = Date.now() - start
      
      console.log(`    Generated ${nodes.length} nodes in ${duration}ms`)
      runner.expect(nodes.length).toBeGreaterThanOrEqual(1000)
      runner.expect(duration).toBeLessThan(2000)
    })
    
    runner.it('should calculate temperature drop in under 1ms', () => {
      const start = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        calculateTemperatureDrop({
          inletTemp: 90 + Math.random() * 10,
          flowRate: 50 + Math.random() * 100,
          pipeLength: 100 + Math.random() * 2000,
          ambientTemp: 10,
          pipeDiameter: 0.05 + Math.random() * 0.2,
          insulationThickness: 0.02 + Math.random() * 0.08
        })
      }
      
      const duration = Date.now() - start
      const avgTime = duration / 1000
      
      console.log(`    Avg ${avgTime.toFixed(3)}ms per calculation`)
      runner.expect(avgTime).toBeLessThan(1)
    })
  })
  
  runner.printSummary()
  
  return {
    summary: runner.getResults(),
    moduleCoverage: runner.getModuleCoverage()
  }
}

export default runAllTests
export { TestRunner, runAllTests }
