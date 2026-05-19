import type { SKU, AssociationResult } from '@/types';

export interface OrderHistoryItem {
  orderId: string;
  skuIds: string[];
  timestamp: Date;
}

export interface AssociationConfig {
  minSupport: number;
  minConfidence: number;
  maxItemsPerItemset: number;
}

const defaultConfig: AssociationConfig = {
  minSupport: 0.01,
  minConfidence: 0.3,
  maxItemsPerItemset: 3,
};

export function generateFrequentItemsets(
  orders: OrderHistoryItem[],
  skus: SKU[],
  config: AssociationConfig = defaultConfig
): Map<string, number> {
  const frequentItemsets = new Map<string, number>();
  const totalOrders = orders.length;

  const singleItemCounts = new Map<string, number>();
  for (const order of orders) {
    for (const skuId of order.skuIds) {
      singleItemCounts.set(skuId, (singleItemCounts.get(skuId) || 0) + 1);
    }
  }

  for (const [skuId, count] of singleItemCounts) {
    const support = count / totalOrders;
    if (support >= config.minSupport) {
      frequentItemsets.set(skuId, count);
    }
  }

  const skuList = Array.from(singleItemCounts.keys()).filter(
    (skuId) => (singleItemCounts.get(skuId) || 0) / totalOrders >= config.minSupport
  );

  for (let i = 0; i < skuList.length; i++) {
    for (let j = i + 1; j < skuList.length; j++) {
      const itemset = [skuList[i], skuList[j]].sort().join(',');
      let count = 0;
      for (const order of orders) {
        if (
          order.skuIds.includes(skuList[i]) &&
          order.skuIds.includes(skuList[j])
        ) {
          count++;
        }
      }
      const support = count / totalOrders;
      if (support >= config.minSupport) {
        frequentItemsets.set(itemset, count);
      }
    }
  }

  return frequentItemsets;
}

export function generateAssociationRules(
  frequentItemsets: Map<string, number>,
  orders: OrderHistoryItem[],
  config: AssociationConfig = defaultConfig
): AssociationResult[] {
  const rules: AssociationResult[] = [];
  const totalOrders = orders.length;

  const singleItemSupport = new Map<string, number>();
  for (const [itemset, count] of frequentItemsets) {
    if (!itemset.includes(',')) {
      singleItemSupport.set(itemset, count);
    }
  }

  for (const [itemset, count] of frequentItemsets) {
    const items = itemset.split(',');
    if (items.length === 2) {
      const support = count / totalOrders;

      const confidence12 =
        count / (singleItemSupport.get(items[0]) || 1);
      const confidence21 =
        count / (singleItemSupport.get(items[1]) || 1);

      const support1 = (singleItemSupport.get(items[0]) || 0) / totalOrders;
      const support2 = (singleItemSupport.get(items[1]) || 0) / totalOrders;

      const lift12 = confidence12 / (support2 || 1);
      const lift21 = confidence21 / (support1 || 1);

      if (confidence12 >= config.minConfidence) {
        rules.push({
          skuId1: items[0],
          skuId2: items[1],
          confidence: confidence12,
          support,
          lift: lift12,
          orderCount: count,
        });
      }

      if (confidence21 >= config.minConfidence) {
        rules.push({
          skuId1: items[1],
          skuId2: items[0],
          confidence: confidence21,
          support,
          lift: lift21,
          orderCount: count,
        });
      }
    }
  }

  return rules.sort((a, b) => b.confidence * b.support - a.confidence * a.support);
}

export function getAssociatedSkus(
  skuId: string,
  rules: AssociationResult[],
  limit: number = 10
): Array<{ skuId: string; confidence: number; lift: number }> {
  return rules
    .filter((r) => r.skuId1 === skuId)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
    .map((r) => ({
      skuId: r.skuId2,
      confidence: r.confidence,
      lift: r.lift,
    }));
}

export function calculateCategoryAssociation(
  rules: AssociationResult[],
  skus: SKU[]
): Map<string, Map<string, number>> {
  const skuMap = new Map(skus.map((s) => [s.id, s]));
  const categoryAssociations = new Map<string, Map<string, number>>();

  for (const rule of rules) {
    const sku1 = skuMap.get(rule.skuId1);
    const sku2 = skuMap.get(rule.skuId2);
    if (!sku1 || !sku2) continue;

    if (!categoryAssociations.has(sku1.category)) {
      categoryAssociations.set(sku1.category, new Map());
    }
    const catMap = categoryAssociations.get(sku1.category)!;
    const current = catMap.get(sku2.category) || 0;
    catMap.set(sku2.category, Math.max(current, rule.confidence));
  }

  return categoryAssociations;
}

export function generateMockOrderHistory(
  skus: SKU[],
  orderCount: number = 1000
): OrderHistoryItem[] {
  const categories = [...new Set(skus.map((s) => s.category))];
  const categorySkus = new Map(
    categories.map((c) => [c, skus.filter((s) => s.category === c)])
  );

  const orders: OrderHistoryItem[] = [];

  for (let i = 0; i < orderCount; i++) {
    const primaryCategory =
      categories[Math.floor(Math.random() * categories.length)];
    const categorySkuList = categorySkus.get(primaryCategory) || [];

    const itemCount = Math.floor(Math.random() * 5) + 1;
    const skuIds: string[] = [];

    for (let j = 0; j < itemCount; j++) {
      if (Math.random() < 0.7 && categorySkuList.length > 0) {
        const sku =
          categorySkuList[Math.floor(Math.random() * categorySkuList.length)];
        if (!skuIds.includes(sku.id)) {
          skuIds.push(sku.id);
        }
      } else {
        const sku = skus[Math.floor(Math.random() * skus.length)];
        if (!skuIds.includes(sku.id)) {
          skuIds.push(sku.id);
        }
      }
    }

    const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

    orders.push({
      orderId: `ORD-${String(i + 1).padStart(8, '0')}`,
      skuIds,
      timestamp,
    });
  }

  return orders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
