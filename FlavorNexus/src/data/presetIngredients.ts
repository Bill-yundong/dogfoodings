import type { Ingredient } from '@/types'

export const presetIngredients: Ingredient[] = [
  {
    id: 'ing-001',
    name: '牛肉',
    category: 'protein',
    taste: { sweet: 15, sour: 5, bitter: 10, salty: 25, umami: 85 },
    maillard: {
      optimalTemp: 180,
      optimalTime: 12,
      browningRate: 0.75,
      aromaIntensity: 90,
      flavorCompounds: ['谷氨酸', '肌苷酸', '硫化物', '吡嗪']
    },
    flavorCompounds: ['谷氨酸', '肌苷酸', '半胱氨酸', '甘氨酸'],
    imageUrl: '🥩',
    description: '富含鲜味氨基酸，美拉德反应产生浓郁肉香'
  },
  {
    id: 'ing-002',
    name: '鸡胸肉',
    category: 'protein',
    taste: { sweet: 10, sour: 3, bitter: 5, salty: 15, umami: 60 },
    maillard: {
      optimalTemp: 165,
      optimalTime: 10,
      browningRate: 0.55,
      aromaIntensity: 65,
      flavorCompounds: ['肌苷酸', '羰基化合物', '硫化物']
    },
    flavorCompounds: ['肌苷酸', '肌肽', '牛磺酸'],
    imageUrl: '🍗',
    description: '低脂肪高蛋白，适合低温慢煮保留嫩度'
  },
  {
    id: 'ing-003',
    name: '三文鱼',
    category: 'protein',
    taste: { sweet: 20, sour: 8, bitter: 12, salty: 20, umami: 75 },
    maillard: {
      optimalTemp: 150,
      optimalTime: 6,
      browningRate: 0.65,
      aromaIntensity: 80,
      flavorCompounds: ['Omega-3氧化物', '吡嗪', '呋喃']
    },
    flavorCompounds: ['EPA', 'DHA', '组氨酸', '牛磺酸'],
    imageUrl: '🐟',
    description: '富含Omega-3，适度加热释放鲜美'
  },
  {
    id: 'ing-004',
    name: '虾',
    category: 'protein',
    taste: { sweet: 35, sour: 5, bitter: 8, salty: 30, umami: 80 },
    maillard: {
      optimalTemp: 170,
      optimalTime: 4,
      browningRate: 0.7,
      aromaIntensity: 85,
      flavorCompounds: ['三甲胺氧化物', '吡嗪', '噻唑']
    },
    flavorCompounds: ['甘氨酸', '丙氨酸', '甜菜碱', '核苷酸'],
    imageUrl: '🦐',
    description: '高甜度与鲜味，快速烹饪最佳'
  },
  {
    id: 'ing-005',
    name: '蘑菇',
    category: 'vegetable',
    taste: { sweet: 15, sour: 5, bitter: 15, salty: 8, umami: 70 },
    maillard: {
      optimalTemp: 160,
      optimalTime: 8,
      browningRate: 0.6,
      aromaIntensity: 70,
      flavorCompounds: ['鸟苷酸', '蘑菇醇', '吡嗪']
    },
    flavorCompounds: ['鸟苷酸', '蘑菇精', '香菇嘌呤'],
    imageUrl: '🍄',
    description: '植物性鲜味来源，与肉类鲜味协同'
  },
  {
    id: 'ing-006',
    name: '番茄',
    category: 'vegetable',
    taste: { sweet: 35, sour: 55, bitter: 10, salty: 8, umami: 40 },
    maillard: {
      optimalTemp: 140,
      optimalTime: 15,
      browningRate: 0.4,
      aromaIntensity: 55,
      flavorCompounds: ['番茄红素', '呋喃酮', '乙酸']
    },
    flavorCompounds: ['谷氨酸', '番茄红素', '柠檬酸', '苹果酸'],
    imageUrl: '🍅',
    description: '酸甜平衡，慢煮释放鲜味和色泽'
  },
  {
    id: 'ing-007',
    name: '洋葱',
    category: 'vegetable',
    taste: { sweet: 45, sour: 15, bitter: 20, salty: 5, umami: 25 },
    maillard: {
      optimalTemp: 135,
      optimalTime: 20,
      browningRate: 0.85,
      aromaIntensity: 95,
      flavorCompounds: ['丙基丙二醛', '硫化物', '美拉德色素']
    },
    flavorCompounds: ['硫化物', '槲皮素', '果糖'],
    imageUrl: '🧅',
    description: '慢炒焦糖化产生丰富香气和甜味'
  },
  {
    id: 'ing-008',
    name: '大蒜',
    category: 'spice',
    taste: { sweet: 8, sour: 5, bitter: 35, salty: 8, umami: 30 },
    maillard: {
      optimalTemp: 120,
      optimalTime: 8,
      browningRate: 0.5,
      aromaIntensity: 100,
      flavorCompounds: ['大蒜素', '硫化丙烯', 'ajoene']
    },
    flavorCompounds: ['大蒜素', '蒜氨酸', '硫化物'],
    imageUrl: '🧄',
    description: '香气物质丰富，注意避免高温变苦'
  },
  {
    id: 'ing-009',
    name: '姜',
    category: 'spice',
    taste: { sweet: 12, sour: 8, bitter: 40, salty: 3, umami: 15 },
    maillard: {
      optimalTemp: 110,
      optimalTime: 5,
      browningRate: 0.35,
      aromaIntensity: 85,
      flavorCompounds: ['姜辣素', '姜烯', '倍半萜']
    },
    flavorCompounds: ['姜辣素', '姜酮', '姜醇'],
    imageUrl: '🫚',
    description: '辛辣温热，去腥提香效果显著'
  },
  {
    id: 'ing-010',
    name: '酱油',
    category: 'spice',
    taste: { sweet: 35, sour: 15, bitter: 25, salty: 85, umami: 90 },
    maillard: {
      optimalTemp: 150,
      optimalTime: 3,
      browningRate: 0.9,
      aromaIntensity: 92,
      flavorCompounds: ['美拉德产物', '氨基酸', '有机酸']
    },
    flavorCompounds: ['谷氨酸', '天冬氨酸', '肌苷酸', '鸟苷酸'],
    imageUrl: '🫗',
    description: '发酵产生的复合鲜味，美拉德反应增强风味'
  },
  {
    id: 'ing-011',
    name: '蜂蜜',
    category: 'spice',
    taste: { sweet: 95, sour: 10, bitter: 5, salty: 2, umami: 10 },
    maillard: {
      optimalTemp: 140,
      optimalTime: 5,
      browningRate: 0.95,
      aromaIntensity: 88,
      flavorCompounds: ['果糖', '葡萄糖', '羟甲基糠醛']
    },
    flavorCompounds: ['果糖', '葡萄糖', '淀粉酶', '抗氧化物质'],
    imageUrl: '🍯',
    description: '高糖分促进美拉德反应，增加色泽和香气'
  },
  {
    id: 'ing-012',
    name: '大米',
    category: 'carb',
    taste: { sweet: 25, sour: 3, bitter: 5, salty: 2, umami: 15 },
    maillard: {
      optimalTemp: 200,
      optimalTime: 25,
      browningRate: 0.65,
      aromaIntensity: 60,
      flavorCompounds: ['2-乙酰基-1-吡咯啉', '麦芽酚']
    },
    flavorCompounds: ['淀粉', '蛋白质', '维生素B族'],
    imageUrl: '🍚',
    description: '高淀粉含量，锅巴产生独特香气'
  },
  {
    id: 'ing-013',
    name: '黄油',
    category: 'dairy',
    taste: { sweet: 20, sour: 8, bitter: 5, salty: 15, umami: 20 },
    maillard: {
      optimalTemp: 175,
      optimalTime: 3,
      browningRate: 0.8,
      aromaIntensity: 92,
      flavorCompounds: ['丁二酮', '内酯', '脂肪酸']
    },
    flavorCompounds: ['乳脂', '酪蛋白', '乳糖', '维生素A'],
    imageUrl: '🧈',
    description: '乳糖参与美拉德反应，产生坚果香气'
  },
  {
    id: 'ing-014',
    name: '奶酪',
    category: 'dairy',
    taste: { sweet: 15, sour: 25, bitter: 30, salty: 45, umami: 65 },
    maillard: {
      optimalTemp: 180,
      optimalTime: 8,
      browningRate: 0.75,
      aromaIntensity: 85,
      flavorCompounds: ['氨基酸', '脂肪酸', '吡嗪']
    },
    flavorCompounds: ['酪蛋白', '钙', '谷氨酸', '脂肪酸'],
    imageUrl: '🧀',
    description: '发酵产生的氨基酸和乳糖完美参与美拉德'
  },
  {
    id: 'ing-015',
    name: '柠檬',
    category: 'fruit',
    taste: { sweet: 25, sour: 85, bitter: 20, salty: 2, umami: 5 },
    maillard: {
      optimalTemp: 100,
      optimalTime: 2,
      browningRate: 0.2,
      aromaIntensity: 70,
      flavorCompounds: ['柠檬烯', '柠檬酸', '柠檬醛']
    },
    flavorCompounds: ['柠檬酸', '维生素C', '柠檬烯', '黄酮类'],
    imageUrl: '🍋',
    description: '酸度调节平衡整体风味，增添清新感'
  },
  {
    id: 'ing-016',
    name: '辣椒',
    category: 'spice',
    taste: { sweet: 10, sour: 8, bitter: 25, salty: 12, umami: 20 },
    maillard: {
      optimalTemp: 140,
      optimalTime: 6,
      browningRate: 0.55,
      aromaIntensity: 88,
      flavorCompounds: ['辣椒素', '类胡萝卜素', '吡嗪']
    },
    flavorCompounds: ['辣椒素', 'Capsaicin', '胡萝卜素', '维生素C'],
    imageUrl: '🌶️',
    description: '热感物质，刺激食欲，增加层次感'
  },
  {
    id: 'ing-017',
    name: '胡萝卜',
    category: 'vegetable',
    taste: { sweet: 55, sour: 8, bitter: 12, salty: 3, umami: 10 },
    maillard: {
      optimalTemp: 160,
      optimalTime: 12,
      browningRate: 0.5,
      aromaIntensity: 65,
      flavorCompounds: ['胡萝卜素', '糖分解产物', '萜烯']
    },
    flavorCompounds: ['β-胡萝卜素', '糖分', '纤维'],
    imageUrl: '🥕',
    description: '高天然糖分，焦糖化后甜度和香气增强'
  },
  {
    id: 'ing-018',
    name: '土豆',
    category: 'vegetable',
    taste: { sweet: 20, sour: 3, bitter: 8, salty: 5, umami: 10 },
    maillard: {
      optimalTemp: 180,
      optimalTime: 18,
      browningRate: 0.7,
      aromaIntensity: 75,
      flavorCompounds: ['天冬酰胺', '还原糖', '美拉德产物']
    },
    flavorCompounds: ['淀粉', '天冬酰胺', '维生素C', '钾'],
    imageUrl: '🥔',
    description: '高淀粉，金黄酥脆的表皮来自美拉德反应'
  }
]
