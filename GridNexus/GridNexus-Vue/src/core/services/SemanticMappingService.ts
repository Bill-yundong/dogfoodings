import type { SemanticMapping, MappingItem } from '../types';

export class SemanticMappingService {
  private mappings: Map<string, SemanticMapping> = new Map();
  private messageQueue: any[] = [];

  // 创建语义映射
  createMapping(mapping: SemanticMapping): void {
    this.mappings.set(mapping.id, mapping);
  }

  // 获取语义映射
  getMapping(id: string): SemanticMapping | undefined {
    return this.mappings.get(id);
  }

  // 获取所有语义映射
  getAllMappings(): SemanticMapping[] {
    return Array.from(this.mappings.values());
  }

  // 更新语义映射
  updateMapping(id: string, updates: Partial<SemanticMapping>): void {
    const mapping = this.mappings.get(id);
    if (mapping) {
      this.mappings.set(id, {
        ...mapping,
        ...updates,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  // 删除语义映射
  deleteMapping(id: string): void {
    this.mappings.delete(id);
  }

  // 执行数据映射转换
  executeMapping(sourceData: any, mapping: SemanticMapping): any {
    const targetData: any = {};

    mapping.mappings.forEach(item => {
      if (sourceData.hasOwnProperty(item.sourceField)) {
        let value = sourceData[item.sourceField];

        // 执行转换（如果有）
        if (item.transformation) {
          try {
            // 简单的转换逻辑，实际应用中可能需要更复杂的解析
            value = this.executeTransformation(value, item.transformation);
          } catch (error) {
            console.error(`转换失败: ${item.transformation}`, error);
          }
        }

        // 执行验证（如果有）
        if (item.validation) {
          try {
            const isValid = this.executeValidation(value, item.validation);
            if (!isValid) {
              console.warn(`验证失败: ${item.validation} for field ${item.targetField}`);
            }
          } catch (error) {
            console.error(`验证失败: ${item.validation}`, error);
          }
        }

        targetData[item.targetField] = value;
      }
    });

    return targetData;
  }

  // 执行转换逻辑
  private executeTransformation(value: any, transformation: string): any {
    // 简单的转换实现，实际应用中可能需要更复杂的解析
    switch (transformation) {
      case 'toNumber':
        return Number(value);
      case 'toBoolean':
        return Boolean(value);
      case 'toUpperCase':
        return String(value).toUpperCase();
      case 'toLowerCase':
        return String(value).toLowerCase();
      case 'toKilowatts':
        return value * 1000;
      case 'toMegawatts':
        return value / 1000;
      case 'round':
        return Math.round(value);
      case 'floor':
        return Math.floor(value);
      case 'ceil':
        return Math.ceil(value);
      default:
        // 尝试执行简单的表达式
        try {
          return eval(`(${transformation})(${JSON.stringify(value)})`);
        } catch {
          return value;
        }
    }
  }

  // 执行验证逻辑
  private executeValidation(value: any, validation: string): boolean {
    // 简单的验证实现，实际应用中可能需要更复杂的解析
    switch (validation) {
      case 'isNumber':
        return typeof value === 'number';
      case 'isPositive':
        return typeof value === 'number' && value > 0;
      case 'isNonEmpty':
        return value !== null && value !== undefined && value !== '';
      case 'isWithinCapacity':
        return typeof value === 'number' && value <= 1000;
      default:
        // 尝试执行简单的表达式
        try {
          return eval(`(${validation})(${JSON.stringify(value)})`);
        } catch {
          return true;
        }
    }
  }

  // 批量执行映射
  batchExecuteMapping(sourceDataArray: any[], mapping: SemanticMapping): any[] {
    return sourceDataArray.map(data => this.executeMapping(data, mapping));
  }

  // 生成默认映射模板
  generateDefaultMapping(sourceSystem: string, targetSystem: string): SemanticMapping {
    const defaultMappings: MappingItem[] = [
      { sourceField: 'id', targetField: 'id' },
      { sourceField: 'name', targetField: 'name' },
      { sourceField: 'capacity', targetField: 'capacity' },
      { sourceField: 'currentLoad', targetField: 'currentLoad' },
      { sourceField: 'voltageLevel', targetField: 'voltageLevel' },
      { sourceField: 'currentLoad', targetField: 'load', transformation: 'toKilowatts' },
      { sourceField: 'capacity', targetField: 'maxCapacity', transformation: 'toKilowatts' }
    ];

    return {
      id: `mapping-${Date.now()}`,
      sourceSystem,
      targetSystem,
      mappings: defaultMappings,
      lastUpdated: new Date().toISOString()
    };
  }

  // 从调度中心发送数据到变电站
  sendDataToSubstation(sourceData: any, mappingId: string): any {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) {
      throw new Error(`映射不存在: ${mappingId}`);
    }

    const mappedData = this.executeMapping(sourceData, mapping);
    
    // 模拟数据传输
    this.messageQueue.push({
      type: 'from-control-center',
      data: mappedData,
      timestamp: new Date().toISOString()
    });

    console.log(`数据已发送到变电站:`, mappedData);
    return mappedData;
  }

  // 从变电站接收数据到调度中心
  receiveDataFromSubstation(sourceData: any, mappingId: string): any {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) {
      throw new Error(`映射不存在: ${mappingId}`);
    }

    const mappedData = this.executeMapping(sourceData, mapping);
    
    // 模拟数据传输
    this.messageQueue.push({
      type: 'from-substation',
      data: mappedData,
      timestamp: new Date().toISOString()
    });

    console.log(`从变电站接收数据:`, mappedData);
    return mappedData;
  }

  // 获取消息队列
  getMessageQueue(): any[] {
    return this.messageQueue;
  }

  // 清空消息队列
  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  // 验证映射的有效性
  validateMapping(mapping: SemanticMapping): boolean {
    try {
      // 检查必要字段
      if (!mapping.sourceSystem || !mapping.targetSystem || !mapping.mappings) {
        return false;
      }

      // 检查映射项的有效性
      for (const item of mapping.mappings) {
        if (!item.sourceField || !item.targetField) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  // 导出映射为 JSON
  exportMapping(id: string): string {
    const mapping = this.mappings.get(id);
    if (!mapping) {
      throw new Error(`映射不存在: ${id}`);
    }

    return JSON.stringify(mapping, null, 2);
  }

  // 导入映射从 JSON
  importMapping(json: string): SemanticMapping {
    try {
      const mapping = JSON.parse(json) as SemanticMapping;
      
      // 验证映射
      if (!this.validateMapping(mapping)) {
        throw new Error('无效的映射数据');
      }

      // 生成新的 ID 和时间戳
      const newMapping = {
        ...mapping,
        id: `mapping-${Date.now()}`,
        lastUpdated: new Date().toISOString()
      };

      this.createMapping(newMapping);
      return newMapping;
    } catch (error) {
      throw new Error(`导入映射失败: ${error}`);
    }
  }
}
