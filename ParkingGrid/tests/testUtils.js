export class TestRunner {
  constructor() {
    this.results = []
    this.startTime = 0
  }

  async runTest(testName, testFn) {
    const result = {
      name: testName,
      status: 'pending',
      startTime: Date.now(),
      error: null,
      assertions: []
    }

    try {
      await testFn(this.createAssert(result))
      result.status = 'passed'
    } catch (error) {
      result.status = 'failed'
      result.error = error.message || String(error)
      console.error(`Test failed: ${testName}`, error)
    }

    result.endTime = Date.now()
    result.duration = result.endTime - result.startTime
    this.results.push(result)

    return result
  }

  createAssert(result) {
    return {
      equal: (actual, expected, message = '') => {
        const passed = JSON.stringify(actual) === JSON.stringify(expected)
        result.assertions.push({
          type: 'equal',
          passed,
          message,
          actual,
          expected
        })
        if (!passed) {
          throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`)
        }
      },
      notEqual: (actual, expected, message = '') => {
        const passed = JSON.stringify(actual) !== JSON.stringify(expected)
        result.assertions.push({
          type: 'notEqual',
          passed,
          message,
          actual,
          expected
        })
        if (!passed) {
          throw new Error(`${message}\nExpected not to equal: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`)
        }
      },
      truthy: (actual, message = '') => {
        const passed = !!actual
        result.assertions.push({
          type: 'truthy',
          passed,
          message,
          actual
        })
        if (!passed) {
          throw new Error(`${message}\nExpected truthy value, got: ${JSON.stringify(actual)}`)
        }
      },
      falsy: (actual, message = '') => {
        const passed = !actual
        result.assertions.push({
          type: 'falsy',
          passed,
          message,
          actual
        })
        if (!passed) {
          throw new Error(`${message}\nExpected falsy value, got: ${JSON.stringify(actual)}`)
        }
      },
      greater: (actual, expected, message = '') => {
        const passed = actual > expected
        result.assertions.push({
          type: 'greater',
          passed,
          message,
          actual,
          expected
        })
        if (!passed) {
          throw new Error(`${message}\nExpected: ${actual} > ${expected}`)
        }
      },
      less: (actual, expected, message = '') => {
        const passed = actual < expected
        result.assertions.push({
          type: 'less',
          passed,
          message,
          actual,
          expected
        })
        if (!passed) {
          throw new Error(`${message}\nExpected: ${actual} < ${expected}`)
        }
      },
      throws: async (fn, message = '') => {
        let threw = false
        try {
          await fn()
        } catch (e) {
          threw = true
        }
        result.assertions.push({
          type: 'throws',
          passed: threw,
          message
        })
        if (!threw) {
          throw new Error(`${message}\nExpected function to throw`)
        }
      }
    }
  }

  getSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length
    const failed = this.results.filter(r => r.status === 'failed').length
    const total = this.results.length
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)

    return {
      passed,
      failed,
      total,
      totalDuration,
      passRate: total > 0 ? (passed / total) * 100 : 0
    }
  }

  getResults() {
    return this.results
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  printSummary() {
    const summary = this.getSummary()
    console.log('\n' + '='.repeat(60))
    console.log('TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total:      ${summary.total} tests`)
    console.log(`Passed:     ${summary.passed} ✓`)
    console.log(`Failed:     ${summary.failed} ✗`)
    console.log(`Pass Rate:  ${summary.passRate.toFixed(1)}%`)
    console.log(`Duration:   ${this.formatDuration(summary.totalDuration)}`)
    console.log('='.repeat(60) + '\n')

    if (summary.failed > 0) {
      console.log('\nFAILED TESTS:')
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`\n  ✗ ${r.name}`)
          console.log(`    Error: ${r.error}`)
        })
    }
  }
}

export function generateMockData() {
  const zones = [
    { id: 'test-zone-1', name: '测试区域A', description: '测试商业区', capacity: 100, lat: 39.9042, lng: 116.4074 },
    { id: 'test-zone-2', name: '测试区域B', description: '测试住宅区', capacity: 200, lat: 39.9148, lng: 116.4106 }
  ]

  const parkingSpaces = [
    { id: 'test-space-1', zoneId: 'test-zone-1', name: '测试泊位1', totalSpaces: 50, occupiedSpaces: 30, status: 'busy', pricePerHour: 15, type: 'indoor' },
    { id: 'test-space-2', zoneId: 'test-zone-1', name: '测试泊位2', totalSpaces: 50, occupiedSpaces: 20, status: 'available', pricePerHour: 12, type: 'outdoor' },
    { id: 'test-space-3', zoneId: 'test-zone-2', name: '测试泊位3', totalSpaces: 100, occupiedSpaces: 80, status: 'full', pricePerHour: 10, type: 'indoor' }
  ]

  const occupancyHistory = []
  const now = Date.now()
  for (let i = 0; i < 200; i++) {
    const timestamp = now - (200 - i) * 60 * 60 * 1000
    occupancyHistory.push({
      spaceId: 'test-space-1',
      zoneId: 'test-zone-1',
      occupancyRate: 0.3 + Math.random() * 0.5,
      occupiedSpaces: 15 + Math.floor(Math.random() * 25),
      totalSpaces: 50,
      status: Math.random() > 0.5 ? 'busy' : 'available',
      timestamp
    })
  }

  const predictions = []
  for (let i = 0; i < 24; i++) {
    predictions.push({
      zoneId: 'test-zone-1',
      predictionTime: now + i * 60 * 60 * 1000,
      predictedOccupancy: 0.4 + Math.random() * 0.4,
      predictedTurnover: 0.2 + Math.random() * 0.4,
      createdAt: now
    })
  }

  return { zones, parkingSpaces, occupancyHistory, predictions }
}

export function generateTrainingData(sampleCount = 100) {
  const X = []
  const y = []
  
  for (let i = 0; i < sampleCount; i++) {
    const hour = i % 24
    const dayOfWeek = Math.floor(i / 24) % 7
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0
    const peakHour = ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) ? 1 : 0
    
    let baseRate = 0.5
    if (isWeekend) {
      baseRate = hour >= 10 && hour <= 20 ? 0.8 : 0.4
    } else {
      if (peakHour) baseRate = 0.9
      else if (hour >= 9 && hour <= 17) baseRate = 0.6
      else baseRate = 0.2
    }
    
    const noise = (Math.random() - 0.5) * 0.2
    const occupancy = Math.max(0, Math.min(1, baseRate + noise))
    
    X.push([
      hour / 23,
      dayOfWeek / 6,
      isWeekend,
      baseRate,
      0,
      peakHour,
      hour >= 22 || hour <= 6 ? 1 : 0,
      baseRate
    ])
    
    y.push(occupancy)
  }
  
  return { X, y }
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function formatTimestamp(ts) {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19)
}
