import type { FloorMap } from '@/types'

function generateFloor1(): FloorMap {
  const nodes = [
    { id: 'F1-001', floor: 1, position: { x: 50, y: 50 }, type: 'exit' as const, name: '1号正门', connections: ['F1-002', 'F1-006'] },
    { id: 'F1-002', floor: 1, position: { x: 150, y: 50 }, type: 'corridor' as const, connections: ['F1-001', 'F1-003', 'F1-007'] },
    { id: 'F1-003', floor: 1, position: { x: 250, y: 50 }, type: 'junction' as const, connections: ['F1-002', 'F1-004', 'F1-008', 'F1-012'] },
    { id: 'F1-004', floor: 1, position: { x: 350, y: 50 }, type: 'corridor' as const, connections: ['F1-003', 'F1-005'] },
    { id: 'F1-005', floor: 1, position: { x: 450, y: 50 }, type: 'exit' as const, name: '2号侧门', connections: ['F1-004'] },
    { id: 'F1-006', floor: 1, position: { x: 50, y: 150 }, type: 'corridor' as const, connections: ['F1-001', 'F1-011'] },
    { id: 'F1-007', floor: 1, position: { x: 150, y: 150 }, type: 'stair' as const, name: 'A楼梯间', connections: ['F1-002', 'F1-012', 'F2-001'] },
    { id: 'F1-008', floor: 1, position: { x: 250, y: 150 }, type: 'junction' as const, connections: ['F1-003', 'F1-009', 'F1-013'] },
    { id: 'F1-009', floor: 1, position: { x: 350, y: 150 }, type: 'elevator' as const, name: '1号电梯', connections: ['F1-004', 'F1-008', 'F2-002'] },
    { id: 'F1-010', floor: 1, position: { x: 450, y: 150 }, type: 'room' as const, name: '服务中心', connections: ['F1-005'] },
    { id: 'F1-011', floor: 1, position: { x: 50, y: 250 }, type: 'room' as const, name: '商铺A101', connections: ['F1-006'] },
    { id: 'F1-012', floor: 1, position: { x: 150, y: 250 }, type: 'corridor' as const, connections: ['F1-007', 'F1-003', 'F1-013'] },
    { id: 'F1-013', floor: 1, position: { x: 250, y: 250 }, type: 'junction' as const, connections: ['F1-012', 'F1-008', 'F1-014', 'F1-017'] },
    { id: 'F1-014', floor: 1, position: { x: 350, y: 250 }, type: 'corridor' as const, connections: ['F1-013', 'F1-015'] },
    { id: 'F1-015', floor: 1, position: { x: 450, y: 250 }, type: 'room' as const, name: '商铺A102', connections: ['F1-014'] },
    { id: 'F1-016', floor: 1, position: { x: 50, y: 350 }, type: 'exit' as const, name: '3号后门', connections: ['F1-011'] },
    { id: 'F1-017', floor: 1, position: { x: 250, y: 350 }, type: 'stair' as const, name: 'B楼梯间', connections: ['F1-013', 'F2-003'] },
    { id: 'F1-018', floor: 1, position: { x: 450, y: 350 }, type: 'room' as const, name: '仓库A', connections: ['F1-015'] }
  ]

  const edges = nodes.flatMap(node =>
    node.connections
      .filter(targetId => targetId.startsWith('F1-') && targetId > node.id)
      .map(targetId => {
        const target = nodes.find(n => n.id === targetId)!
        const distance = Math.sqrt(
          Math.pow(node.position.x - target.position.x, 2) +
          Math.pow(node.position.y - target.position.y, 2)
        )
        return {
          id: `${node.id}-${targetId}`,
          from: node.id,
          to: targetId,
          distance: Math.round(distance),
          width: 3,
          isAccessible: true
        }
      })
  )

  const rooms = [
    { id: 'R101', name: '商铺A101', floor: 1, polygon: [{ x: 20, y: 200 }, { x: 100, y: 200 }, { x: 100, y: 300 }, { x: 20, y: 300 }], capacity: 30, exitPoints: ['F1-011'] },
    { id: 'R102', name: '商铺A102', floor: 1, polygon: [{ x: 400, y: 200 }, { x: 480, y: 200 }, { x: 480, y: 300 }, { x: 400, y: 300 }], capacity: 25, exitPoints: ['F1-015'] },
    { id: 'R103', name: '服务中心', floor: 1, polygon: [{ x: 400, y: 100 }, { x: 480, y: 100 }, { x: 480, y: 180 }, { x: 400, y: 180 }], capacity: 15, exitPoints: ['F1-010'] },
    { id: 'R104', name: '仓库A', floor: 1, polygon: [{ x: 400, y: 300 }, { x: 480, y: 300 }, { x: 480, y: 380 }, { x: 400, y: 380 }], capacity: 5, exitPoints: ['F1-018'] }
  ]

  const walls = [
    { id: 'W101', floor: 1, start: { x: 0, y: 0 }, end: { x: 500, y: 0 }, thickness: 5 },
    { id: 'W102', floor: 1, start: { x: 500, y: 0 }, end: { x: 500, y: 400 }, thickness: 5 },
    { id: 'W103', floor: 1, start: { x: 500, y: 400 }, end: { x: 0, y: 400 }, thickness: 5 },
    { id: 'W104', floor: 1, start: { x: 0, y: 400 }, end: { x: 0, y: 0 }, thickness: 5 },
    { id: 'W105', floor: 1, start: { x: 100, y: 100 }, end: { x: 100, y: 180 }, thickness: 3 },
    { id: 'W106', floor: 1, start: { x: 200, y: 200 }, end: { x: 300, y: 200 }, thickness: 3 }
  ]

  return {
    floor: 1,
    name: '1层 - 主入口层',
    bounds: { min: { x: 0, y: 0 }, max: { x: 500, y: 400 } },
    nodes,
    edges,
    rooms,
    walls
  }
}

function generateFloor2(): FloorMap {
  const nodes = [
    { id: 'F2-001', floor: 2, position: { x: 150, y: 150 }, type: 'stair' as const, name: 'A楼梯间', connections: ['F2-002', 'F2-006', 'F1-007'] },
    { id: 'F2-002', floor: 2, position: { x: 350, y: 150 }, type: 'elevator' as const, name: '1号电梯', connections: ['F2-001', 'F2-003', 'F1-009'] },
    { id: 'F2-003', floor: 2, position: { x: 250, y: 150 }, type: 'junction' as const, connections: ['F2-001', 'F2-002', 'F2-004', 'F2-007'] },
    { id: 'F2-004', floor: 2, position: { x: 250, y: 50 }, type: 'corridor' as const, connections: ['F2-003', 'F2-005'] },
    { id: 'F2-005', floor: 2, position: { x: 450, y: 50 }, type: 'exit' as const, name: '天台出口', connections: ['F2-004'] },
    { id: 'F2-006', floor: 2, position: { x: 150, y: 250 }, type: 'corridor' as const, connections: ['F2-001', 'F2-008'] },
    { id: 'F2-007', floor: 2, position: { x: 350, y: 250 }, type: 'corridor' as const, connections: ['F2-003', 'F2-009'] },
    { id: 'F2-008', floor: 2, position: { x: 50, y: 250 }, type: 'room' as const, name: '餐饮区B201', connections: ['F2-006'] },
    { id: 'F2-009', floor: 2, position: { x: 450, y: 250 }, type: 'room' as const, name: '商铺B202', connections: ['F2-007'] },
    { id: 'F2-010', floor: 2, position: { x: 250, y: 350 }, type: 'stair' as const, name: 'B楼梯间', connections: ['F2-006', 'F2-007', 'F1-017'] },
    { id: 'F2-011', floor: 2, position: { x: 50, y: 150 }, type: 'room' as const, name: '商铺B203', connections: ['F2-006', 'F2-001'] },
    { id: 'F2-012', floor: 2, position: { x: 450, y: 150 }, type: 'room' as const, name: '商铺B204', connections: ['F2-002', 'F2-007'] }
  ]

  const edges = nodes.flatMap(node =>
    node.connections
      .filter(targetId => targetId.startsWith('F2-') && targetId > node.id)
      .map(targetId => {
        const target = nodes.find(n => n.id === targetId)!
        const distance = Math.sqrt(
          Math.pow(node.position.x - target.position.x, 2) +
          Math.pow(node.position.y - target.position.y, 2)
        )
        return {
          id: `${node.id}-${targetId}`,
          from: node.id,
          to: targetId,
          distance: Math.round(distance),
          width: 3,
          isAccessible: true
        }
      })
  )

  const rooms = [
    { id: 'R201', name: '餐饮区B201', floor: 2, polygon: [{ x: 20, y: 200 }, { x: 100, y: 200 }, { x: 100, y: 300 }, { x: 20, y: 300 }], capacity: 50, exitPoints: ['F2-008'] },
    { id: 'R202', name: '商铺B202', floor: 2, polygon: [{ x: 400, y: 200 }, { x: 480, y: 200 }, { x: 480, y: 300 }, { x: 400, y: 300 }], capacity: 20, exitPoints: ['F2-009'] },
    { id: 'R203', name: '商铺B203', floor: 2, polygon: [{ x: 20, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 200 }, { x: 20, y: 200 }], capacity: 15, exitPoints: ['F2-011'] },
    { id: 'R204', name: '商铺B204', floor: 2, polygon: [{ x: 400, y: 100 }, { x: 480, y: 100 }, { x: 480, y: 200 }, { x: 400, y: 200 }], capacity: 18, exitPoints: ['F2-012'] }
  ]

  const walls = [
    { id: 'W201', floor: 2, start: { x: 0, y: 0 }, end: { x: 500, y: 0 }, thickness: 5 },
    { id: 'W202', floor: 2, start: { x: 500, y: 0 }, end: { x: 500, y: 400 }, thickness: 5 },
    { id: 'W203', floor: 2, start: { x: 500, y: 400 }, end: { x: 0, y: 400 }, thickness: 5 },
    { id: 'W204', floor: 2, start: { x: 0, y: 400 }, end: { x: 0, y: 0 }, thickness: 5 },
    { id: 'W205', floor: 2, start: { x: 200, y: 100 }, end: { x: 300, y: 100 }, thickness: 3 }
  ]

  return {
    floor: 2,
    name: '2层 - 餐饮购物层',
    bounds: { min: { x: 0, y: 0 }, max: { x: 500, y: 400 } },
    nodes,
    edges,
    rooms,
    walls
  }
}

function generateFloor3(): FloorMap {
  const nodes = [
    { id: 'F3-001', floor: 3, position: { x: 150, y: 150 }, type: 'stair' as const, name: 'A楼梯间', connections: ['F3-002', 'F3-006'] },
    { id: 'F3-002', floor: 3, position: { x: 350, y: 150 }, type: 'elevator' as const, name: '1号电梯', connections: ['F3-001', 'F3-003'] },
    { id: 'F3-003', floor: 3, position: { x: 250, y: 150 }, type: 'junction' as const, connections: ['F3-001', 'F3-002', 'F3-004', 'F3-007'] },
    { id: 'F3-004', floor: 3, position: { x: 250, y: 50 }, type: 'corridor' as const, connections: ['F3-003', 'F3-005'] },
    { id: 'F3-005', floor: 3, position: { x: 250, y: 0 }, type: 'exit' as const, name: '直升机坪入口', connections: ['F3-004'] },
    { id: 'F3-006', floor: 3, position: { x: 150, y: 250 }, type: 'corridor' as const, connections: ['F3-001', 'F3-008', 'F3-010'] },
    { id: 'F3-007', floor: 3, position: { x: 350, y: 250 }, type: 'corridor' as const, connections: ['F3-003', 'F3-009', 'F3-010'] },
    { id: 'F3-008', floor: 3, position: { x: 50, y: 250 }, type: 'room' as const, name: '影院C301', connections: ['F3-006'] },
    { id: 'F3-009', floor: 3, position: { x: 450, y: 250 }, type: 'room' as const, name: 'KTVC302', connections: ['F3-007'] },
    { id: 'F3-010', floor: 3, position: { x: 250, y: 350 }, type: 'stair' as const, name: 'B楼梯间', connections: ['F3-006', 'F3-007'] },
    { id: 'F3-011', floor: 3, position: { x: 50, y: 150 }, type: 'room' as const, name: '游乐区C303', connections: ['F3-006', 'F3-001'] },
    { id: 'F3-012', floor: 3, position: { x: 450, y: 150 }, type: 'room' as const, name: '餐饮区C304', connections: ['F3-002', 'F3-007'] }
  ]

  const edges = nodes.flatMap(node =>
    node.connections
      .filter(targetId => targetId.startsWith('F3-') && targetId > node.id)
      .map(targetId => {
        const target = nodes.find(n => n.id === targetId)!
        const distance = Math.sqrt(
          Math.pow(node.position.x - target.position.x, 2) +
          Math.pow(node.position.y - target.position.y, 2)
        )
        return {
          id: `${node.id}-${targetId}`,
          from: node.id,
          to: targetId,
          distance: Math.round(distance),
          width: 3,
          isAccessible: true
        }
      })
  )

  const rooms = [
    { id: 'R301', name: '影院C301', floor: 3, polygon: [{ x: 20, y: 200 }, { x: 100, y: 200 }, { x: 100, y: 300 }, { x: 20, y: 300 }], capacity: 100, exitPoints: ['F3-008'] },
    { id: 'R302', name: 'KTVC302', floor: 3, polygon: [{ x: 400, y: 200 }, { x: 480, y: 200 }, { x: 480, y: 300 }, { x: 400, y: 300 }], capacity: 40, exitPoints: ['F3-009'] },
    { id: 'R303', name: '游乐区C303', floor: 3, polygon: [{ x: 20, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 200 }, { x: 20, y: 200 }], capacity: 30, exitPoints: ['F3-011'] },
    { id: 'R304', name: '餐饮区C304', floor: 3, polygon: [{ x: 400, y: 100 }, { x: 480, y: 100 }, { x: 480, y: 200 }, { x: 400, y: 200 }], capacity: 60, exitPoints: ['F3-012'] }
  ]

  const walls = [
    { id: 'W301', floor: 3, start: { x: 0, y: 0 }, end: { x: 500, y: 0 }, thickness: 5 },
    { id: 'W302', floor: 3, start: { x: 500, y: 0 }, end: { x: 500, y: 400 }, thickness: 5 },
    { id: 'W303', floor: 3, start: { x: 500, y: 400 }, end: { x: 0, y: 400 }, thickness: 5 },
    { id: 'W304', floor: 3, start: { x: 0, y: 400 }, end: { x: 0, y: 0 }, thickness: 5 }
  ]

  return {
    floor: 3,
    name: '3层 - 休闲娱乐层',
    bounds: { min: { x: 0, y: 0 }, max: { x: 500, y: 400 } },
    nodes,
    edges,
    rooms,
    walls
  }
}

export const buildingFloors: FloorMap[] = [generateFloor1(), generateFloor2(), generateFloor3()]

export const getFloorMap = (floor: number): FloorMap | undefined => {
  return buildingFloors.find(f => f.floor === floor)
}

export const getAllNodes = () => buildingFloors.flatMap(f => f.nodes)

export const getAllEdges = () => buildingFloors.flatMap(f => f.edges)
