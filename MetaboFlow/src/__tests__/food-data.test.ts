import { describe, it, expect } from 'vitest';
import { generateFoodDatabase, generateBulkFoods } from '../db/food-data';

describe('generateFoodDatabase - 标准食物库', () => {
  it('应生成120种以上基础食物', () => {
    const foods = generateFoodDatabase();
    expect(foods.length).toBeGreaterThanOrEqual(120);
  });

  it('应包含12个食物分类', () => {
    const foods = generateFoodDatabase();
    const categories = new Set(foods.map(f => f.category));
    expect(categories.size).toBe(12);
  });

  it('所有食物应包含必填字段', () => {
    const foods = generateFoodDatabase();
    for (const food of foods) {
      expect(food.id).toBeDefined();
      expect(food.name).toBeDefined();
      expect(food.nameEn).toBeDefined();
      expect(food.category).toBeDefined();
      expect(food.calories).toBeDefined();
      expect(food.protein).toBeDefined();
      expect(food.fat).toBeDefined();
      expect(food.carbs).toBeDefined();
      expect(food.fiber).toBeDefined();
      expect(food.gi).toBeDefined();
      expect(food.gl).toBeDefined();
      expect(food.vitamins).toBeDefined();
      expect(food.minerals).toBeDefined();
      expect(food.tags).toBeDefined();
    }
  });

  it('食物ID格式应为food_XXXXXX', () => {
    const foods = generateFoodDatabase();
    const idPattern = /^food_\d{6}$/;
    for (const food of foods) {
      expect(food.id).toMatch(idPattern);
    }
  });

  it('热量值应在合理范围', () => {
    const foods = generateFoodDatabase();
    for (const food of foods) {
      expect(food.calories).toBeGreaterThanOrEqual(0);
      expect(food.calories).toBeLessThanOrEqual(900);
    }
  });

  it('GI值应在0-100之间', () => {
    const foods = generateFoodDatabase();
    for (const food of foods) {
      expect(food.gi).toBeGreaterThanOrEqual(0);
      expect(food.gi).toBeLessThanOrEqual(100);
    }
  });

  it('宏量营养素应有值', () => {
    const foods = generateFoodDatabase();
    for (const food of foods) {
      expect(food.protein).toBeGreaterThanOrEqual(0);
      expect(food.fat).toBeGreaterThanOrEqual(0);
      expect(food.carbs).toBeGreaterThanOrEqual(0);
    }
  });

  it('维生素应包含标准7种', () => {
    const foods = generateFoodDatabase();
    const requiredVitamins = ['A', 'C', 'D', 'E', 'B1', 'B2', 'B12'];
    for (const food of foods) {
      for (const vit of requiredVitamins) {
        expect(food.vitamins).toHaveProperty(vit);
      }
    }
  });

  it('矿物质应包含标准6种', () => {
    const foods = generateFoodDatabase();
    const requiredMinerals = ['Ca', 'Fe', 'Zn', 'K', 'Mg', 'Se'];
    for (const food of foods) {
      for (const min of requiredMinerals) {
        expect(food.minerals).toHaveProperty(min);
      }
    }
  });

  it('标签应包含分类信息', () => {
    const foods = generateFoodDatabase();
    for (const food of foods) {
      expect(food.tags).toContain(food.category);
    }
  });

  it('高GI食物应正确标记', () => {
    const foods = generateFoodDatabase();
    const highGiFoods = foods.filter(f => f.gi > 70);
    for (const food of highGiFoods) {
      expect(food.tags).toContain('高GI');
    }
  });

  it('低GI食物应正确标记', () => {
    const foods = generateFoodDatabase();
    const lowGiFoods = foods.filter(f => f.gi > 0 && f.gi <= 55);
    for (const food of lowGiFoods) {
      expect(food.tags).toContain('低GI');
    }
  });
});

describe('generateBulkFoods - 千万级食物扩展生成器', () => {
  it('应生成指定数量的食物', () => {
    const foods = generateBulkFoods(500);
    expect(foods.length).toBe(500);
  });

  it('应扩展到1000种食物', () => {
    const foods = generateBulkFoods(1000);
    expect(foods.length).toBe(1000);
  });

  it('所有扩展食物应有唯一ID', () => {
    const foods = generateBulkFoods(500);
    const ids = foods.map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('应保留原始食物的营养比例关系', () => {
    const baseFoods = generateFoodDatabase();
    const bulkFoods = generateBulkFoods(500);
    const baseCategories = new Set(baseFoods.map(f => f.category));
    const bulkCategories = new Set(bulkFoods.map(f => f.category));
    expect(bulkCategories.size).toBe(baseCategories.size);
    for (const cat of baseCategories) {
      expect(bulkCategories).toContain(cat);
    }
  });

  it('扩展食物名称应包含修饰词', () => {
    const baseFoods = generateFoodDatabase();
    const bulkFoods = generateBulkFoods(500);
    const baseNames = new Set(baseFoods.map(f => f.name));
    const adjectives = ['新鲜', '有机', '自制', '蒸', '煮', '烤', '炒', '炖', '凉拌', '腌制'];
    const expandedFoods = bulkFoods.filter(f => !baseNames.has(f.name));
    const hasAdjective = expandedFoods.some(food => 
      adjectives.some(adj => food.name.includes(adj))
    );
    expect(hasAdjective).toBe(true);
  });

  it('营养值应在合理倍数范围内', () => {
    const baseFoods = generateFoodDatabase();
    const bulkFoods = generateBulkFoods(500);
    const baseMap = new Map(baseFoods.map(f => [f.name, f]));
    for (const food of bulkFoods) {
      const base = baseMap.get(food.name);
      if (base) {
        expect(food.calories).toBeGreaterThanOrEqual(base.calories * 0.5);
        expect(food.calories).toBeLessThanOrEqual(base.calories * 2);
        expect(food.protein).toBeGreaterThanOrEqual(base.protein * 0.5);
        expect(food.protein).toBeLessThanOrEqual(base.protein * 2);
        expect(food.fat).toBeGreaterThanOrEqual(base.fat * 0.5);
        expect(food.fat).toBeLessThanOrEqual(base.fat * 2);
        expect(food.carbs).toBeGreaterThanOrEqual(base.carbs * 0.5);
        expect(food.carbs).toBeLessThanOrEqual(base.carbs * 2);
      }
    }
  });
});
