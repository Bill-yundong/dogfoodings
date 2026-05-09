import type { GridTopology, ExpansionDecision, ExpansionRecommendation, GridNode } from '../types';

export class ExpansionDecisionService {
  // 分析拓扑并生成扩容决策
  async analyzeTopology(topology: GridTopology): Promise<ExpansionDecision> {
    // 模拟异步分析过程
    await this.simulateAnalysisDelay();

    const recommendations: ExpansionRecommendation[] = [];

    // 分析节点负载
    topology.nodes.forEach(node => {
      const loadFactor = node.currentLoad / node.capacity;
      
      // 对于负载率超过80%的节点，建议扩容
      if (loadFactor > 0.8) {
        recommendations.push({
          nodeId: node.id,
          action: 'add_capacity',
          details: {
            currentCapacity: node.capacity,
            recommendedCapacity: node.capacity * 1.5,
            currentLoad: node.currentLoad,
            loadFactor: loadFactor
          },
          estimatedCost: this.calculateCost(node.type, 'add_capacity', node.capacity * 0.5),
          expectedBenefit: this.calculateBenefit(node.type, loadFactor),
          paybackPeriod: this.calculatePaybackPeriod(loadFactor)
        });
      }
    });

    // 分析边的负载
    topology.edges.forEach(edge => {
      const loadFactor = edge.currentFlow / edge.capacity;
      
      // 对于负载率超过85%的线路，建议升级
      if (loadFactor > 0.85) {
        recommendations.push({
          nodeId: edge.source, // 关联到源节点
          action: 'upgrade_line',
          details: {
            edgeId: edge.id,
            source: edge.source,
            target: edge.target,
            currentCapacity: edge.capacity,
            recommendedCapacity: edge.capacity * 1.4,
            currentFlow: edge.currentFlow,
            loadFactor: loadFactor
          },
          estimatedCost: this.calculateCost('line', 'upgrade_line', edge.capacity * 0.4),
          expectedBenefit: this.calculateBenefit('line', loadFactor),
          paybackPeriod: this.calculatePaybackPeriod(loadFactor)
        });
      }
    });

    // 生成决策理由
    const reasoning = this.generateReasoning(recommendations, topology);

    // 确定优先级
    const priority = this.calculatePriority(recommendations);

    return {
      id: `decision-${Date.now()}`,
      timestamp: new Date().toISOString(),
      recommendations,
      reasoning,
      priority
    };
  }

  // 模拟分析延迟
  private async simulateAnalysisDelay(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 1000); // 模拟1秒的分析时间
    });
  }

  // 计算扩容成本
  private calculateCost(type: string, _action: string, capacityIncrease: number): number {
    // 基础成本系数
    const costFactors: Record<string, number> = {
      substation: 10000,
      transformer: 5000,
      generator: 8000,
      load: 2000,
      line: 3000
    };

    const baseCost = costFactors[type] || 3000;
    return baseCost * Math.sqrt(capacityIncrease);
  }

  // 计算预期收益
  private calculateBenefit(type: string, loadFactor: number): number {
    // 收益系数
    const benefitFactors: Record<string, number> = {
      substation: 15000,
      transformer: 7000,
      generator: 12000,
      load: 3000,
      line: 4000
    };

    const baseBenefit = benefitFactors[type] || 4000;
    return baseBenefit * (loadFactor - 0.7); // 负载率越高，收益越大
  }

  // 计算投资回收期
  private calculatePaybackPeriod(loadFactor: number): number {
    // 负载率越高，回收期越短
    const basePeriod = 5;
    return basePeriod * (1 - (loadFactor - 0.7) / 0.3);
  }

  // 生成决策理由
  private generateReasoning(recommendations: ExpansionRecommendation[], topology: GridTopology): string {
    if (recommendations.length === 0) {
      return '电网当前负载水平在合理范围内，暂不需要扩容。';
    }

    let reasoning = `基于当前电网拓扑分析，发现 ${recommendations.length} 个需要扩容的元素：\n`;

    recommendations.forEach(rec => {
      const node = topology.nodes.find(n => n.id === rec.nodeId);
      const nodeName = node ? node.name : rec.nodeId;

      switch (rec.action) {
        case 'add_capacity':
          reasoning += `- ${nodeName} 负载率过高（${(rec.details.loadFactor * 100).toFixed(1)}%），建议增加容量从 ${rec.details.currentCapacity} 到 ${rec.details.recommendedCapacity}。\n`;
          break;
        case 'upgrade_line':
          reasoning += `- 线路 ${rec.details.source}->${rec.details.target} 负载率过高（${(rec.details.loadFactor * 100).toFixed(1)}%），建议升级容量从 ${rec.details.currentCapacity} 到 ${rec.details.recommendedCapacity}。\n`;
          break;
        case 'add_node':
          reasoning += `- 建议新增节点 ${nodeName} 以缓解周边负载压力。\n`;
          break;
      }
    });

    reasoning += '\n根据成本效益分析，这些扩容措施预计将在合理时间内收回投资。';
    return reasoning;
  }

  // 计算决策优先级
  private calculatePriority(recommendations: ExpansionRecommendation[]): 'low' | 'medium' | 'high' {
    if (recommendations.length === 0) {
      return 'low';
    }

    // 计算平均负载率
    const avgLoadFactor = recommendations.reduce((sum, rec) => {
      const loadFactor = rec.details.loadFactor || 0;
      return sum + loadFactor;
    }, 0) / recommendations.length;

    if (avgLoadFactor > 0.9) {
      return 'high';
    } else if (avgLoadFactor > 0.8) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // 预测未来负载
  async predictFutureLoads(topology: GridTopology, timeHorizon: number): Promise<GridNode[]> {
    // 模拟异步预测过程
    await this.simulateAnalysisDelay();

    // 基于当前负载和增长趋势预测未来负载
    return topology.nodes.map(node => {
      // 模拟年增长率 5-10%
      const growthRate = 0.05 + Math.random() * 0.05;
      const futureLoad = node.currentLoad * Math.pow(1 + growthRate, timeHorizon);

      return {
        ...node,
        currentLoad: futureLoad // 这里返回预测的负载
      };
    });
  }

  // 生成最优扩容计划
  async generateOptimalExpansionPlan(topology: GridTopology, budget: number): Promise<ExpansionDecision> {
    // 先分析当前拓扑
    const fullDecision = await this.analyzeTopology(topology);

    // 根据预算筛选建议
    const sortedRecommendations = [...fullDecision.recommendations]
      .sort((a, b) => a.paybackPeriod - b.paybackPeriod); // 按回收期排序

    let remainingBudget = budget;
    const selectedRecommendations: ExpansionRecommendation[] = [];

    for (const rec of sortedRecommendations) {
      if (rec.estimatedCost <= remainingBudget) {
        selectedRecommendations.push(rec);
        remainingBudget -= rec.estimatedCost;
      }
    }

    return {
      ...fullDecision,
      recommendations: selectedRecommendations,
      reasoning: `在预算 ${budget} 范围内，选择了 ${selectedRecommendations.length} 个最优扩容方案，剩余预算 ${remainingBudget.toFixed(2)}。\n${fullDecision.reasoning}`
    };
  }
}
