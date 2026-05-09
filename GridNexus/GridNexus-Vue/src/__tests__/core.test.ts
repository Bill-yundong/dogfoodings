import { GridTopologyModel } from '../core/models/GridTopologyModel';
import { SemanticMappingService } from '../core/services/SemanticMappingService';
import type { GridNode, GridEdge, SemanticMapping } from '../core/types';

// 测试 GridTopologyModel
describe('GridTopologyModel', () => {
  let topologyModel: GridTopologyModel;

  beforeEach(() => {
    topologyModel = new GridTopologyModel();
  });

  test('should add nodes and edges', () => {
    const node: GridNode = {
      id: 'test-node',
      name: 'Test Node',
      type: 'substation',
      capacity: 1000,
      currentLoad: 500,
      voltageLevel: 110,
      coordinates: { x: 100, y: 100 }
    };

    const edge: GridEdge = {
      id: 'test-edge',
      source: 'test-node',
      target: 'test-node-2',
      capacity: 500,
      currentFlow: 250,
      impedance: 0.1
    };

    topologyModel.addNode(node);
    topologyModel.addEdge(edge);

    const topology = topologyModel.getTopology();
    expect(topology.nodes).toHaveLength(1);
    expect(topology.edges).toHaveLength(1);
    expect(topology.nodes[0].id).toBe('test-node');
    expect(topology.edges[0].id).toBe('test-edge');
  });

  test('should calculate node load factor', () => {
    const node: GridNode = {
      id: 'test-node',
      name: 'Test Node',
      type: 'substation',
      capacity: 1000,
      currentLoad: 750,
      voltageLevel: 110,
      coordinates: { x: 100, y: 100 }
    };

    topologyModel.addNode(node);
    const loadFactor = topologyModel.calculateNodeLoadFactor('test-node');
    expect(loadFactor).toBe(0.75);
  });

  test('should generate state snapshot', () => {
    const node: GridNode = {
      id: 'test-node',
      name: 'Test Node',
      type: 'load',
      capacity: 1000,
      currentLoad: 750,
      voltageLevel: 110,
      coordinates: { x: 100, y: 100 }
    };

    topologyModel.addNode(node);
    const snapshot = topologyModel.generateStateSnapshot();

    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('topology');
    expect(snapshot).toHaveProperty('keyMetrics');
    expect(snapshot).toHaveProperty('alerts');
    expect(snapshot.keyMetrics.totalLoad).toBe(750);
  });
});

// 测试 SemanticMappingService
describe('SemanticMappingService', () => {
  let mappingService: SemanticMappingService;

  beforeEach(() => {
    mappingService = new SemanticMappingService();
  });

  test('should create and get mapping', () => {
    const mapping = mappingService.generateDefaultMapping('Source', 'Target');
    mappingService.createMapping(mapping);

    const retrievedMapping = mappingService.getMapping(mapping.id);
    expect(retrievedMapping).toBeDefined();
    expect(retrievedMapping?.id).toBe(mapping.id);
  });

  test('should execute mapping', () => {
    const mapping = mappingService.generateDefaultMapping('Source', 'Target');
    mappingService.createMapping(mapping);

    const sourceData = {
      id: '1',
      name: 'Test',
      capacity: 1000,
      currentLoad: 500,
      voltageLevel: 110
    };

    const result = mappingService.executeMapping(sourceData, mapping);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('capacity');
    expect(result).toHaveProperty('currentLoad');
    expect(result).toHaveProperty('voltageLevel');
    expect(result).toHaveProperty('load'); // 转换后的字段
    expect(result.load).toBe(500000); // 转换为千瓦
  });

  test('should send data to substation', () => {
    const mapping = mappingService.generateDefaultMapping('Control Center', 'Substation');
    mappingService.createMapping(mapping);

    const sourceData = {
      id: '1',
      name: 'Test',
      capacity: 1000,
      currentLoad: 500,
      voltageLevel: 110
    };

    const result = mappingService.sendDataToSubstation(sourceData, mapping.id);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('load');
    expect(result.load).toBe(500000);
  });

  test('should receive data from substation', () => {
    const mapping = mappingService.generateDefaultMapping('Substation', 'Control Center');
    mappingService.createMapping(mapping);

    const sourceData = {
      id: '1',
      name: 'Test',
      capacity: 1000,
      currentLoad: 500,
      voltageLevel: 110,
      load: 500000
    };

    const result = mappingService.receiveDataFromSubstation(sourceData, mapping.id);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
  });
});
