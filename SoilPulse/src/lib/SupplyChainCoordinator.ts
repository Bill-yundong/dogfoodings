import { SupplyChainItem, FertilizationPlan } from '@/types';

export interface Supplier {
  id: string;
  name: string;
  location: string;
  contact: string;
  products: Product[];
  rating: number;
  deliveryDays: number;
  minimumOrder: number;
}

export interface Product {
  id: string;
  name: string;
  type: 'nitrogen' | 'phosphorus' | 'potassium' | 'organic' | 'micronutrient';
  pricePerUnit: number;
  unit: string;
  availableQuantity: number;
  nutrientContent: number;
}

export interface OrderOptimizationResult {
  recommendedOrders: RecommendedOrder[];
  totalCost: number;
  totalQuantity: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organic: number;
  };
  deliveryTimeline: Date;
  potentialSavings: number;
}

export interface RecommendedOrder {
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  productType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: Date;
}

export interface InventoryLevel {
  farmId: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organic: number;
  micronutrients: Record<string, number>;
  lastUpdated: Date;
}

class SupplyChainCoordinator {
  private static SUPPLIERS: Supplier[] = [
    {
      id: 'supplier_001',
      name: '北方化肥集团',
      location: '河北省石家庄市',
      contact: '13800138001',
      rating: 4.8,
      deliveryDays: 5,
      minimumOrder: 1000,
      products: [
        { id: 'prod_001', name: '尿素 (46% N)', type: 'nitrogen', pricePerUnit: 2200, unit: 'ton', availableQuantity: 5000, nutrientContent: 0.46 },
        { id: 'prod_002', name: '磷酸二铵', type: 'phosphorus', pricePerUnit: 3500, unit: 'ton', availableQuantity: 3000, nutrientContent: 0.46 },
        { id: 'prod_003', name: '氯化钾', type: 'potassium', pricePerUnit: 2800, unit: 'ton', availableQuantity: 4000, nutrientContent: 0.60 },
      ],
    },
    {
      id: 'supplier_002',
      name: '华东农资有限公司',
      location: '江苏省南京市',
      contact: '13800138002',
      rating: 4.6,
      deliveryDays: 3,
      minimumOrder: 500,
      products: [
        { id: 'prod_004', name: '复合肥 (15-15-15)', type: 'nitrogen', pricePerUnit: 2800, unit: 'ton', availableQuantity: 8000, nutrientContent: 0.15 },
        { id: 'prod_005', name: '有机肥', type: 'organic', pricePerUnit: 1200, unit: 'ton', availableQuantity: 10000, nutrientContent: 0.30 },
        { id: 'prod_006', name: '微量元素肥', type: 'micronutrient', pricePerUnit: 8000, unit: 'ton', availableQuantity: 500, nutrientContent: 0.10 },
      ],
    },
    {
      id: 'supplier_003',
      name: '西南生态农业科技',
      location: '四川省成都市',
      contact: '13800138003',
      rating: 4.9,
      deliveryDays: 7,
      minimumOrder: 800,
      products: [
        { id: 'prod_007', name: '生物有机肥', type: 'organic', pricePerUnit: 1500, unit: 'ton', availableQuantity: 6000, nutrientContent: 0.25 },
        { id: 'prod_008', name: '腐殖酸钾', type: 'potassium', pricePerUnit: 3200, unit: 'ton', availableQuantity: 2000, nutrientContent: 0.12 },
      ],
    },
  ];

  private static TRANSPORT_COST_PER_KM = 2.5;

  static getSuppliers(): Supplier[] {
    return [...this.SUPPLIERS];
  }

  static getSupplierById(id: string): Supplier | null {
    return this.SUPPLIERS.find(s => s.id === id) || null;
  }

  static getProductsByType(type: Product['type']): Product[] {
    return this.SUPPLIERS.flatMap(s => s.products.filter(p => p.type === type));
  }

  static calculateRequiredQuantity(
    fertilizationPlan: FertilizationPlan,
    currentInventory: InventoryLevel
  ): {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organic: number;
  } {
    return {
      nitrogen: Math.max(0, fertilizationPlan.recommendations.nitrogen - currentInventory.nitrogen),
      phosphorus: Math.max(0, fertilizationPlan.recommendations.phosphorus - currentInventory.phosphorus),
      potassium: Math.max(0, fertilizationPlan.recommendations.potassium - currentInventory.potassium),
      organic: Math.max(0, fertilizationPlan.recommendations.organicFertilizer - currentInventory.organic),
    };
  }

  static optimizeOrder(
    requiredQuantity: ReturnType<typeof this.calculateRequiredQuantity>,
    farmLocation: { lat: number; lng: number },
    targetDeliveryDate: Date
  ): OrderOptimizationResult {
    const recommendedOrders: RecommendedOrder[] = [];
    let totalCost = 0;
    let potentialSavings = 0;

    const nutrientTypes: ('nitrogen' | 'phosphorus' | 'potassium' | 'organic')[] = [
      'nitrogen', 'phosphorus', 'potassium', 'organic'
    ];

    for (const nutrientType of nutrientTypes) {
      const required = requiredQuantity[nutrientType];
      if (required <= 0) continue;

      const products = this.getProductsByType(nutrientType);
      if (products.length === 0) continue;

      const scoredProducts = products.map(product => {
        const supplier = this.SUPPLIERS.find(s => 
          s.products.some(p => p.id === product.id)
        )!;
        
        const effectivePrice = product.pricePerUnit / product.nutrientContent;
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + supplier.deliveryDays);
        const canDeliverOnTime = deliveryDate <= targetDeliveryDate;
        
        const score = (1 / effectivePrice) * supplier.rating * (canDeliverOnTime ? 1.5 : 0.5);

        return { product, supplier, score, effectivePrice, deliveryDate };
      });

      scoredProducts.sort((a, b) => b.score - a.score);

      let remainingQuantity = required;
      for (const { product, supplier, effectivePrice, deliveryDate } of scoredProducts) {
        if (remainingQuantity <= 0) break;

        const availableQuantity = Math.min(
          product.availableQuantity,
          remainingQuantity
        );

        if (availableQuantity < supplier.minimumOrder / 1000 && 
            availableQuantity !== remainingQuantity) {
          continue;
        }

        const orderQuantity = Math.min(availableQuantity, remainingQuantity);
        const transportCost = this.calculateTransportCost(supplier, farmLocation);
        const totalProductCost = orderQuantity * product.pricePerUnit + transportCost;

        recommendedOrders.push({
          supplierId: supplier.id,
          supplierName: supplier.name,
          productId: product.id,
          productName: product.name,
          productType: nutrientType,
          quantity: Math.round(orderQuantity * 1000) / 1000,
          unit: product.unit,
          unitPrice: product.pricePerUnit,
          totalPrice: Math.round(totalProductCost * 100) / 100,
          deliveryDate,
        });

        totalCost += totalProductCost;
        remainingQuantity -= orderQuantity;

        if (scoredProducts.length > 1) {
          const secondBest = scoredProducts[1];
          const savings = (secondBest.effectivePrice - effectivePrice) * orderQuantity;
          potentialSavings += savings;
        }
      }
    }

    const earliestDelivery = recommendedOrders.length > 0
      ? new Date(Math.min(...recommendedOrders.map(o => o.deliveryDate.getTime())))
      : new Date();

    return {
      recommendedOrders,
      totalCost: Math.round(totalCost * 100) / 100,
      totalQuantity: requiredQuantity,
      deliveryTimeline: earliestDelivery,
      potentialSavings: Math.round(potentialSavings * 100) / 100,
    };
  }

  private static calculateTransportCost(
    supplier: Supplier,
    farmLocation: { lat: number; lng: number }
  ): number {
    const supplierLocations: Record<string, { lat: number; lng: number }> = {
      '河北省石家庄市': { lat: 38.04, lng: 114.51 },
      '江苏省南京市': { lat: 32.06, lng: 118.79 },
      '四川省成都市': { lat: 30.57, lng: 104.06 },
    };

    const supplierLoc = supplierLocations[supplier.location] || { lat: 35, lng: 110 };
    
    const distance = this.haversineDistance(
      farmLocation.lat, farmLocation.lng,
      supplierLoc.lat, supplierLoc.lng
    );

    return distance * this.TRANSPORT_COST_PER_KM;
  }

  private static haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static consolidateOrders(
    orders: OrderOptimizationResult[],
    consolidationWindow: number = 7
  ): OrderOptimizationResult {
    const allRecommendedOrders: RecommendedOrder[] = [];
    let totalCost = 0;
    let totalQuantity = { nitrogen: 0, phosphorus: 0, potassium: 0, organic: 0 };
    let potentialSavings = 0;

    for (const order of orders) {
      allRecommendedOrders.push(...order.recommendedOrders);
      totalCost += order.totalCost;
      totalQuantity.nitrogen += order.totalQuantity.nitrogen;
      totalQuantity.phosphorus += order.totalQuantity.phosphorus;
      totalQuantity.potassium += order.totalQuantity.potassium;
      totalQuantity.organic += order.totalQuantity.organic;
      potentialSavings += order.potentialSavings;
    }

    const supplierGroups = new Map<string, RecommendedOrder[]>();
    for (const order of allRecommendedOrders) {
      const key = `${order.supplierId}-${order.productId}`;
      if (!supplierGroups.has(key)) {
        supplierGroups.set(key, []);
      }
      supplierGroups.get(key)!.push(order);
    }

    const consolidatedOrders: RecommendedOrder[] = [];
    for (const group of supplierGroups.values()) {
      const first = group[0];
      const totalQuantityForProduct = group.reduce((sum, o) => sum + o.quantity, 0);
      
      const bulkDiscount = totalQuantityForProduct > 10 ? 0.95 : 
                           totalQuantityForProduct > 5 ? 0.98 : 1.0;
      
      consolidatedOrders.push({
        ...first,
        quantity: Math.round(totalQuantityForProduct * 1000) / 1000,
        totalPrice: Math.round(totalQuantityForProduct * first.unitPrice * bulkDiscount * 100) / 100,
      });
    }

    const earliestDelivery = consolidatedOrders.length > 0
      ? new Date(Math.min(...consolidatedOrders.map(o => o.deliveryDate.getTime())))
      : new Date();

    return {
      recommendedOrders: consolidatedOrders,
      totalCost: Math.round(totalCost * 0.95 * 100) / 100,
      totalQuantity,
      deliveryTimeline: earliestDelivery,
      potentialSavings: Math.round((potentialSavings + totalCost * 0.05) * 100) / 100,
    };
  }

  static trackDeliveryStatus(orderId: string): {
    status: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'delivered';
    currentLocation?: { lat: number; lng: number };
    estimatedArrival: Date;
    progress: number;
  } {
    const statuses: Array<'pending' | 'processing' | 'shipped' | 'in_transit' | 'delivered'> = 
      ['pending', 'processing', 'shipped', 'in_transit', 'delivered'];
    
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const progress = (statuses.indexOf(randomStatus) + 1) / statuses.length * 100;
    
    const estimatedArrival = new Date();
    estimatedArrival.setDate(estimatedArrival.getDate() + Math.floor(Math.random() * 7));

    return {
      status: randomStatus,
      estimatedArrival,
      progress,
      currentLocation: randomStatus === 'in_transit' ? {
        lat: 35 + Math.random() * 5,
        lng: 110 + Math.random() * 10,
      } : undefined,
    };
  }

  static generatePurchaseOrders(
    optimizedOrders: OrderOptimizationResult,
    farmId: string
  ): SupplyChainItem[] {
    return optimizedOrders.recommendedOrders.map((order, index) => ({
      id: `po_${farmId}_${Date.now()}_${index}`,
      fertilizerType: order.productType,
      quantity: order.quantity,
      unit: order.unit,
      supplier: order.supplierName,
      expectedDelivery: order.deliveryDate.toISOString().split('T')[0],
      status: 'ordered' as const,
      farmId,
      pricePerUnit: order.unitPrice,
      totalCost: order.totalPrice,
    }));
  }

  static calculateInventoryTurnover(
    currentInventory: InventoryLevel,
    monthlyConsumption: { nitrogen: number; phosphorus: number; potassium: number; organic: number }
  ): {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organic: number;
    overall: number;
  } {
    const calculateTurnover = (current: number, consumption: number) => 
      consumption > 0 ? current / consumption : Infinity;

    const nitrogen = calculateTurnover(currentInventory.nitrogen, monthlyConsumption.nitrogen);
    const phosphorus = calculateTurnover(currentInventory.phosphorus, monthlyConsumption.phosphorus);
    const potassium = calculateTurnover(currentInventory.potassium, monthlyConsumption.potassium);
    const organic = calculateTurnover(currentInventory.organic, monthlyConsumption.organic);
    const overall = (nitrogen + phosphorus + potassium + organic) / 4;

    return {
      nitrogen: Math.round(nitrogen * 10) / 10,
      phosphorus: Math.round(phosphorus * 10) / 10,
      potassium: Math.round(potassium * 10) / 10,
      organic: Math.round(organic * 10) / 10,
      overall: Math.round(overall * 10) / 10,
    };
  }

  static suggestReorderPoint(
    monthlyConsumption: { nitrogen: number; phosphorus: number; potassium: number; organic: number },
    leadTimeDays: number = 7
  ): {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organic: number;
  } {
    const safetyStockFactor = 1.5;
    const leadTimeMonths = leadTimeDays / 30;

    return {
      nitrogen: Math.round(monthlyConsumption.nitrogen * leadTimeMonths * safetyStockFactor * 100) / 100,
      phosphorus: Math.round(monthlyConsumption.phosphorus * leadTimeMonths * safetyStockFactor * 100) / 100,
      potassium: Math.round(monthlyConsumption.potassium * leadTimeMonths * safetyStockFactor * 100) / 100,
      organic: Math.round(monthlyConsumption.organic * leadTimeMonths * safetyStockFactor * 100) / 100,
    };
  }
}

export default SupplyChainCoordinator;
