import { SKU, AssociationRule } from '../types';

interface FPNode {
  item: string;
  count: number;
  parent: FPNode | null;
  children: Map<string, FPNode>;
  nodeLink: FPNode | null;
}

interface FPTree {
  root: FPNode;
  headerTable: Map<string, { count: number; head: FPNode | null }>;
}

export class AssociationEngine {
  private minSupport: number;
  private minConfidence: number;

  constructor(minSupport: number = 0.1, minConfidence: number = 0.5) {
    this.minSupport = minSupport;
    this.minConfidence = minConfidence;
  }

  public analyzeTransactions(transactions: string[][]): AssociationRule[] {
    if (transactions.length === 0) return [];

    const itemCounts = new Map<string, number>();
    for (const transaction of transactions) {
      for (const item of transaction) {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
      }
    }

    const minSupportCount = this.minSupport * transactions.length;
    const frequentItems = new Map<string, number>();
    for (const [item, count] of itemCounts) {
      if (count >= minSupportCount) {
        frequentItems.set(item, count);
      }
    }

    if (frequentItems.size === 0) return [];

    const sortedTransactions = transactions.map(t => 
      t.filter(item => frequentItems.has(item))
       .sort((a, b) => (frequentItems.get(b) || 0) - (frequentItems.get(a) || 0))
    );

    const tree = this.buildFPTree(sortedTransactions, frequentItems);
    const frequentItemsets = this.mineFPTree(tree, minSupportCount);

    return this.generateRules(frequentItemsets, transactions.length);
  }

  private buildFPTree(transactions: string[][], frequentItems: Map<string, number>): FPTree {
    const root: FPNode = {
      item: '',
      count: 0,
      parent: null,
      children: new Map(),
      nodeLink: null
    };

    const headerTable = new Map<string, { count: number; head: FPNode | null }>();
    for (const [item, count] of frequentItems) {
      headerTable.set(item, { count, head: null });
    }

    for (const transaction of transactions) {
      this.insertTransaction(transaction, root, headerTable);
    }

    return { root, headerTable };
  }

  private insertTransaction(
    items: string[],
    root: FPNode,
    headerTable: Map<string, { count: number; head: FPNode | null }>
  ): void {
    let current = root;

    for (const item of items) {
      let child = current.children.get(item);
      if (!child) {
        child = {
          item,
          count: 0,
          parent: current,
          children: new Map(),
          nodeLink: null
        };
        current.children.set(item, child);

        const header = headerTable.get(item);
        if (header) {
          if (!header.head) {
            header.head = child;
          } else {
            let link = header.head;
            while (link.nodeLink) {
              link = link.nodeLink;
            }
            link.nodeLink = child;
          }
        }
      }
      child.count++;
      current = child;
    }
  }

  private mineFPTree(tree: FPTree, minSupportCount: number): Map<string[], number> {
    const frequentItemsets = new Map<string[], number>();

    const mine = (
      headerTable: Map<string, { count: number; head: FPNode | null }>,
      prefix: string[]
    ): void => {
      const items = Array.from(headerTable.entries())
        .sort((a, b) => a[1].count - b[1].count);

      for (const [item, header] of items) {
        const newPrefix = [...prefix, item];
        frequentItemsets.set(newPrefix, header.count);

        const conditionalPatternBase: { pattern: string[]; count: number }[] = [];
        let node = header.head;

        while (node) {
          const pattern: string[] = [];
          let parent = node.parent;
          while (parent && parent.item) {
            pattern.push(parent.item);
            parent = parent.parent;
          }
          if (pattern.length > 0) {
            conditionalPatternBase.push({ pattern, count: node.count });
          }
          node = node.nodeLink;
        }

        const conditionalTree = this.buildConditionalTree(conditionalPatternBase, minSupportCount);
        if (conditionalTree && conditionalTree.headerTable.size > 0) {
          mine(conditionalTree.headerTable, newPrefix);
        }
      }
    };

    mine(tree.headerTable, []);
    return frequentItemsets;
  }

  private buildConditionalTree(
    patterns: { pattern: string[]; count: number }[],
    minSupportCount: number
  ): FPTree | null {
    const itemCounts = new Map<string, number>();
    for (const { pattern, count } of patterns) {
      for (const item of pattern) {
        itemCounts.set(item, (itemCounts.get(item) || 0) + count);
      }
    }

    const frequentItems = new Map<string, number>();
    for (const [item, count] of itemCounts) {
      if (count >= minSupportCount) {
        frequentItems.set(item, count);
      }
    }

    if (frequentItems.size === 0) return null;

    const root: FPNode = {
      item: '',
      count: 0,
      parent: null,
      children: new Map(),
      nodeLink: null
    };

    const headerTable = new Map<string, { count: number; head: FPNode | null }>();
    for (const [item, count] of frequentItems) {
      headerTable.set(item, { count, head: null });
    }

    for (const { pattern, count } of patterns) {
      const sortedPattern = pattern
        .filter(item => frequentItems.has(item))
        .sort((a, b) => (frequentItems.get(b) || 0) - (frequentItems.get(a) || 0));

      let current = root;
      for (const item of sortedPattern) {
        let child = current.children.get(item);
        if (!child) {
          child = {
            item,
            count: 0,
            parent: current,
            children: new Map(),
            nodeLink: null
          };
          current.children.set(item, child);

          const header = headerTable.get(item);
          if (header) {
            if (!header.head) {
              header.head = child;
            } else {
              let link = header.head;
              while (link.nodeLink) {
                link = link.nodeLink;
              }
              link.nodeLink = child;
            }
          }
        }
        child.count += count;
        current = child;
      }
    }

    return { root, headerTable };
  }

  private generateRules(
    frequentItemsets: Map<string[], number>,
    totalTransactions: number
  ): AssociationRule[] {
    const rules: AssociationRule[] = [];
    const itemsetsArray = Array.from(frequentItemsets.entries());

    for (const [itemset, supportCount] of itemsetsArray) {
      if (itemset.length < 2) continue;

      const support = supportCount / totalTransactions;
      const nonEmptySubsets = this.getNonEmptySubsets(itemset);

      for (const antecedent of nonEmptySubsets) {
        const consequent = itemset.filter(item => !antecedent.includes(item));
        if (consequent.length === 0) continue;

        const antecedentCount = this.getItemsetSupport(antecedent, itemsetsArray);
        if (antecedentCount === 0) continue;

        const confidence = supportCount / antecedentCount;
        if (confidence >= this.minConfidence) {
          const consequentSupport = this.getItemsetSupport(consequent, itemsetsArray) / totalTransactions;
          const lift = confidence / (consequentSupport || 1);

          rules.push({
            antecedent,
            consequent,
            support,
            confidence,
            lift
          });
        }
      }
    }

    return rules.sort((a, b) => b.lift - a.lift);
  }

  private getNonEmptySubsets<T>(array: T[]): T[][] {
    const subsets: T[][] = [];
    const n = array.length;

    for (let i = 1; i < (1 << n) - 1; i++) {
      const subset: T[] = [];
      for (let j = 0; j < n; j++) {
        if (i & (1 << j)) {
          subset.push(array[j]);
        }
      }
      subsets.push(subset);
    }

    return subsets;
  }

  private getItemsetSupport(itemset: string[], itemsets: [string[], number][]): number {
    const sortedItemset = [...itemset].sort();
    for (const [pattern, count] of itemsets) {
      if (pattern.length === itemset.length && 
          [...pattern].sort().every((item, idx) => item === sortedItemset[idx])) {
        return count;
      }
    }
    return 0;
  }

  public getAssociatedSKUs(skuId: string, rules: AssociationRule[], topN: number = 5): string[] {
    const associated = new Map<string, number>();

    for (const rule of rules) {
      if (rule.antecedent.includes(skuId)) {
        for (const item of rule.consequent) {
          if (item !== skuId) {
            const score = rule.lift * rule.confidence;
            associated.set(item, (associated.get(item) || 0) + score);
          }
        }
      }
      if (rule.consequent.includes(skuId)) {
        for (const item of rule.antecedent) {
          if (item !== skuId) {
            const score = rule.lift * rule.confidence * 0.5;
            associated.set(item, (associated.get(item) || 0) + score);
          }
        }
      }
    }

    return Array.from(associated.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([skuId]) => skuId);
  }

  public generateTransactionsFromSKUs(skus: SKU[], count: number = 1000): string[][] {
    const transactions: string[][] = [];
    const categoryGroups = new Map<string, string[]>();

    for (const sku of skus) {
      if (!categoryGroups.has(sku.category)) {
        categoryGroups.set(sku.category, []);
      }
      categoryGroups.get(sku.category)!.push(sku.id);
    }

    for (let i = 0; i < count; i++) {
      const categories = Array.from(categoryGroups.keys());
      const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
      const categorySKUs = categoryGroups.get(selectedCategory)!;
      
      const transactionSize = Math.floor(Math.random() * 5) + 2;
      const transaction: string[] = [];
      
      for (let j = 0; j < Math.min(transactionSize, categorySKUs.length); j++) {
        const randomSKU = categorySKUs[Math.floor(Math.random() * categorySKUs.length)];
        if (!transaction.includes(randomSKU)) {
          transaction.push(randomSKU);
        }
      }
      
      if (transaction.length >= 2) {
        transactions.push(transaction);
      }
    }

    return transactions;
  }
}

export const associationEngine = new AssociationEngine();
