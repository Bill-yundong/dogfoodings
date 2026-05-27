import type { FoodItem } from '../types';

const CATEGORIES = [
  '谷物', '蔬菜', '水果', '肉类', '水产', '乳制品',
  '豆类', '坚果', '饮品', '调味品', '糕点', '速食',
];

const GRAIN_FOODS = [
  { name: '白米饭', nameEn: 'White Rice', gi: 73, gl: 29, cal: 130, p: 2.7, f: 0.3, c: 28.2, fb: 0.4 },
  { name: '糙米饭', nameEn: 'Brown Rice', gi: 68, gl: 16, cal: 111, p: 2.6, f: 0.9, c: 23.0, fb: 1.8 },
  { name: '全麦面包', nameEn: 'Whole Wheat Bread', gi: 52, gl: 7, cal: 69, p: 3.6, f: 1.0, c: 11.6, fb: 1.9 },
  { name: '白面包', nameEn: 'White Bread', gi: 75, gl: 10, cal: 66, p: 2.0, f: 0.8, c: 12.4, fb: 0.6 },
  { name: '燕麦粥', nameEn: 'Oatmeal', gi: 55, gl: 13, cal: 68, p: 2.4, f: 1.4, c: 12.0, fb: 1.7 },
  { name: '荞麦面', nameEn: 'Soba Noodles', gi: 59, gl: 16, cal: 99, p: 5.1, f: 0.1, c: 21.4, fb: 0.5 },
  { name: '玉米', nameEn: 'Sweet Corn', gi: 52, gl: 11, cal: 86, p: 3.2, f: 1.2, c: 18.7, fb: 2.0 },
  { name: '红薯', nameEn: 'Sweet Potato', gi: 54, gl: 14, cal: 86, p: 1.6, f: 0.1, c: 20.1, fb: 3.0 },
  { name: '小米粥', nameEn: 'Millet Porridge', gi: 62, gl: 12, cal: 46, p: 1.4, f: 0.7, c: 8.4, fb: 0.2 },
  { name: '藜麦', nameEn: 'Quinoa', gi: 53, gl: 13, cal: 120, p: 4.4, f: 1.9, c: 21.3, fb: 2.8 },
];

const VEG_FOODS = [
  { name: '西兰花', nameEn: 'Broccoli', gi: 10, gl: 1, cal: 34, p: 2.8, f: 0.4, c: 6.6, fb: 2.6 },
  { name: '菠菜', nameEn: 'Spinach', gi: 15, gl: 1, cal: 23, p: 2.9, f: 0.4, c: 3.6, fb: 2.2 },
  { name: '番茄', nameEn: 'Tomato', gi: 15, gl: 1, cal: 18, p: 0.9, f: 0.2, c: 3.9, fb: 1.2 },
  { name: '胡萝卜', nameEn: 'Carrot', gi: 35, gl: 2, cal: 41, p: 0.9, f: 0.2, c: 9.6, fb: 2.8 },
  { name: '黄瓜', nameEn: 'Cucumber', gi: 15, gl: 0, cal: 15, p: 0.7, f: 0.1, c: 3.6, fb: 0.5 },
  { name: '生菜', nameEn: 'Lettuce', gi: 10, gl: 0, cal: 14, p: 1.4, f: 0.2, c: 2.9, fb: 1.3 },
  { name: '芹菜', nameEn: 'Celery', gi: 15, gl: 1, cal: 16, p: 0.7, f: 0.2, c: 3.0, fb: 1.6 },
  { name: '茄子', nameEn: 'Eggplant', gi: 20, gl: 1, cal: 25, p: 1.0, f: 0.2, c: 5.9, fb: 3.0 },
  { name: '南瓜', nameEn: 'Pumpkin', gi: 65, gl: 3, cal: 20, p: 0.7, f: 0.1, c: 4.9, fb: 0.5 },
  { name: '土豆', nameEn: 'Potato', gi: 78, gl: 15, cal: 77, p: 2.0, f: 0.1, c: 17.5, fb: 1.3 },
];

const FRUIT_FOODS = [
  { name: '苹果', nameEn: 'Apple', gi: 36, gl: 5, cal: 52, p: 0.3, f: 0.2, c: 13.8, fb: 2.4 },
  { name: '香蕉', nameEn: 'Banana', gi: 51, gl: 11, cal: 89, p: 1.1, f: 0.3, c: 22.8, fb: 2.6 },
  { name: '橙子', nameEn: 'Orange', gi: 40, gl: 5, cal: 47, p: 0.9, f: 0.1, c: 11.8, fb: 2.4 },
  { name: '葡萄', nameEn: 'Grapes', gi: 59, gl: 11, cal: 69, p: 0.7, f: 0.2, c: 18.1, fb: 0.9 },
  { name: '西瓜', nameEn: 'Watermelon', gi: 76, gl: 5, cal: 30, p: 0.6, f: 0.2, c: 7.6, fb: 0.4 },
  { name: '草莓', nameEn: 'Strawberry', gi: 25, gl: 1, cal: 32, p: 0.7, f: 0.3, c: 7.7, fb: 2.0 },
  { name: '猕猴桃', nameEn: 'Kiwi', gi: 39, gl: 5, cal: 61, p: 1.1, f: 0.5, c: 14.7, fb: 3.0 },
  { name: '芒果', nameEn: 'Mango', gi: 51, gl: 8, cal: 60, p: 0.8, f: 0.4, c: 15.0, fb: 1.6 },
  { name: '樱桃', nameEn: 'Cherry', gi: 22, gl: 3, cal: 50, p: 1.0, f: 0.3, c: 12.2, fb: 2.1 },
  { name: '梨', nameEn: 'Pear', gi: 38, gl: 4, cal: 57, p: 0.4, f: 0.1, c: 15.2, fb: 3.1 },
];

const MEAT_FOODS = [
  { name: '鸡胸肉', nameEn: 'Chicken Breast', gi: 0, gl: 0, cal: 165, p: 31.0, f: 3.6, c: 0, fb: 0 },
  { name: '牛里脊', nameEn: 'Beef Tenderloin', gi: 0, gl: 0, cal: 135, p: 26.0, f: 3.5, c: 0, fb: 0 },
  { name: '猪五花', nameEn: 'Pork Belly', gi: 0, gl: 0, cal: 342, p: 14.0, f: 30.0, c: 0, fb: 0 },
  { name: '羊腿肉', nameEn: 'Lamb Leg', gi: 0, gl: 0, cal: 170, p: 25.0, f: 7.0, c: 0, fb: 0 },
  { name: '鸭胸肉', nameEn: 'Duck Breast', gi: 0, gl: 0, cal: 123, p: 19.0, f: 4.3, c: 0, fb: 0 },
  { name: '鸡肝', nameEn: 'Chicken Liver', gi: 0, gl: 0, cal: 119, p: 17.0, f: 4.8, c: 0.6, fb: 0 },
  { name: '牛腱子', nameEn: 'Beef Shank', gi: 0, gl: 0, cal: 106, p: 20.0, f: 2.3, c: 0, fb: 0 },
  { name: '猪里脊', nameEn: 'Pork Tenderloin', gi: 0, gl: 0, cal: 143, p: 21.0, f: 5.5, c: 0, fb: 0 },
  { name: '火鸡胸', nameEn: 'Turkey Breast', gi: 0, gl: 0, cal: 104, p: 22.0, f: 1.0, c: 0, fb: 0 },
  { name: '鸡翅', nameEn: 'Chicken Wing', gi: 0, gl: 0, cal: 203, p: 17.0, f: 14.6, c: 0, fb: 0 },
];

const SEAFOOD_FOODS = [
  { name: '三文鱼', nameEn: 'Salmon', gi: 0, gl: 0, cal: 208, p: 20.0, f: 13.0, c: 0, fb: 0 },
  { name: '大虾', nameEn: 'Shrimp', gi: 0, gl: 0, cal: 99, p: 24.0, f: 0.3, c: 0.2, fb: 0 },
  { name: '鳕鱼', nameEn: 'Cod', gi: 0, gl: 0, cal: 82, p: 18.0, f: 0.7, c: 0, fb: 0 },
  { name: '金枪鱼', nameEn: 'Tuna', gi: 0, gl: 0, cal: 130, p: 29.0, f: 0.6, c: 0, fb: 0 },
  { name: '鲈鱼', nameEn: 'Sea Bass', gi: 0, gl: 0, cal: 97, p: 19.0, f: 1.7, c: 0, fb: 0 },
  { name: '扇贝', nameEn: 'Scallop', gi: 0, gl: 0, cal: 94, p: 17.0, f: 1.2, c: 3.4, fb: 0 },
  { name: '鱿鱼', nameEn: 'Squid', gi: 0, gl: 0, cal: 92, p: 15.0, f: 1.4, c: 3.1, fb: 0 },
  { name: '螃蟹', nameEn: 'Crab', gi: 0, gl: 0, cal: 87, p: 18.0, f: 1.1, c: 0, fb: 0 },
  { name: '生蚝', nameEn: 'Oyster', gi: 0, gl: 0, cal: 59, p: 9.0, f: 2.0, c: 4.9, fb: 0 },
  { name: '蛤蜊', nameEn: 'Clam', gi: 0, gl: 0, cal: 62, p: 11.0, f: 0.9, c: 2.2, fb: 0 },
];

const DAIRY_FOODS = [
  { name: '全脂牛奶', nameEn: 'Whole Milk', gi: 31, gl: 4, cal: 61, p: 3.2, f: 3.3, c: 4.8, fb: 0 },
  { name: '脱脂牛奶', nameEn: 'Skim Milk', gi: 32, gl: 4, cal: 34, p: 3.4, f: 0.1, c: 5.0, fb: 0 },
  { name: '酸奶', nameEn: 'Yogurt', gi: 36, gl: 3, cal: 59, p: 3.5, f: 3.3, c: 3.6, fb: 0 },
  { name: '希腊酸奶', nameEn: 'Greek Yogurt', gi: 12, gl: 1, cal: 97, p: 9.0, f: 5.0, c: 3.6, fb: 0 },
  { name: '切达奶酪', nameEn: 'Cheddar Cheese', gi: 0, gl: 0, cal: 402, p: 25.0, f: 33.0, c: 1.3, fb: 0 },
  { name: '奶油奶酪', nameEn: 'Cream Cheese', gi: 0, gl: 0, cal: 342, p: 6.0, f: 34.0, c: 4.1, fb: 0 },
  { name: '帕尔马干酪', nameEn: 'Parmesan', gi: 0, gl: 0, cal: 420, p: 38.0, f: 29.0, c: 4.1, fb: 0 },
  { name: '莫扎瑞拉', nameEn: 'Mozzarella', gi: 0, gl: 0, cal: 280, p: 22.0, f: 17.0, c: 2.2, fb: 0 },
  { name: '豆浆', nameEn: 'Soy Milk', gi: 34, gl: 3, cal: 33, p: 2.8, f: 1.6, c: 2.0, fb: 0.4 },
  { name: '燕麦奶', nameEn: 'Oat Milk', gi: 69, gl: 5, cal: 46, p: 1.0, f: 1.5, c: 7.5, fb: 0.5 },
];

const BEAN_FOODS = [
  { name: '豆腐', nameEn: 'Tofu', gi: 15, gl: 1, cal: 76, p: 8.0, f: 4.8, c: 1.9, fb: 0.3 },
  { name: '黄豆', nameEn: 'Soybean', gi: 16, gl: 1, cal: 364, p: 36.0, f: 20.0, c: 30.0, fb: 9.3 },
  { name: '黑豆', nameEn: 'Black Bean', gi: 30, gl: 7, cal: 132, p: 8.9, f: 0.5, c: 23.7, fb: 8.7 },
  { name: '红豆', nameEn: 'Red Bean', gi: 35, gl: 7, cal: 127, p: 8.7, f: 0.5, c: 22.9, fb: 7.3 },
  { name: '绿豆', nameEn: 'Mung Bean', gi: 31, gl: 5, cal: 105, p: 7.0, f: 0.4, c: 19.2, fb: 7.6 },
  { name: '鹰嘴豆', nameEn: 'Chickpea', gi: 28, gl: 8, cal: 164, p: 8.9, f: 2.6, c: 27.4, fb: 7.6 },
  { name: '扁豆', nameEn: 'Lentil', gi: 29, gl: 5, cal: 116, p: 9.0, f: 0.4, c: 20.1, fb: 7.9 },
  { name: '毛豆', nameEn: 'Edamame', gi: 18, gl: 2, cal: 121, p: 11.9, f: 5.2, c: 8.9, fb: 5.2 },
  { name: '豌豆', nameEn: 'Pea', gi: 39, gl: 4, cal: 81, p: 5.4, f: 0.4, c: 14.5, fb: 5.7 },
  { name: '四季豆', nameEn: 'Green Bean', gi: 15, gl: 1, cal: 31, p: 1.8, f: 0.2, c: 7.0, fb: 2.7 },
];

const NUT_FOODS = [
  { name: '核桃', nameEn: 'Walnut', gi: 15, gl: 1, cal: 654, p: 15.0, f: 65.0, c: 14.0, fb: 6.7 },
  { name: '杏仁', nameEn: 'Almond', gi: 15, gl: 0, cal: 579, p: 21.0, f: 50.0, c: 22.0, fb: 12.5 },
  { name: '花生', nameEn: 'Peanut', gi: 14, gl: 1, cal: 567, p: 26.0, f: 49.0, c: 16.0, fb: 8.5 },
  { name: '腰果', nameEn: 'Cashew', gi: 22, gl: 3, cal: 553, p: 18.0, f: 44.0, c: 30.0, fb: 3.3 },
  { name: '开心果', nameEn: 'Pistachio', gi: 18, gl: 2, cal: 560, p: 20.0, f: 45.0, c: 28.0, fb: 10.6 },
  { name: '芝麻', nameEn: 'Sesame Seed', gi: 35, gl: 2, cal: 573, p: 18.0, f: 50.0, c: 23.0, fb: 11.8 },
  { name: '亚麻籽', nameEn: 'Flaxseed', gi: 35, gl: 1, cal: 534, p: 18.0, f: 42.0, c: 29.0, fb: 27.3 },
  { name: '南瓜子', nameEn: 'Pumpkin Seed', gi: 25, gl: 3, cal: 559, p: 30.0, f: 49.0, c: 11.0, fb: 6.0 },
  { name: '葵花籽', nameEn: 'Sunflower Seed', gi: 35, gl: 2, cal: 584, p: 21.0, f: 51.0, c: 20.0, fb: 8.6 },
  { name: '松子', nameEn: 'Pine Nut', gi: 15, gl: 1, cal: 673, p: 14.0, f: 68.0, c: 13.0, fb: 3.7 },
];

const DRINK_FOODS = [
  { name: '绿茶', nameEn: 'Green Tea', gi: 0, gl: 0, cal: 1, p: 0.2, f: 0, c: 0, fb: 0 },
  { name: '黑咖啡', nameEn: 'Black Coffee', gi: 0, gl: 0, cal: 2, p: 0.3, f: 0, c: 0, fb: 0 },
  { name: '橙汁', nameEn: 'Orange Juice', gi: 50, gl: 10, cal: 45, p: 0.7, f: 0.2, c: 10.4, fb: 0.2 },
  { name: '苹果汁', nameEn: 'Apple Juice', gi: 41, gl: 11, cal: 46, p: 0.1, f: 0.1, c: 11.3, fb: 0.2 },
  { name: '可乐', nameEn: 'Cola', gi: 63, gl: 16, cal: 42, p: 0, f: 0, c: 10.6, fb: 0 },
  { name: '啤酒', nameEn: 'Beer', gi: 66, gl: 7, cal: 43, p: 0.5, f: 0, c: 3.6, fb: 0 },
  { name: '红酒', nameEn: 'Red Wine', gi: 0, gl: 0, cal: 85, p: 0.1, f: 0, c: 2.6, fb: 0 },
  { name: '蜂蜜水', nameEn: 'Honey Water', gi: 55, gl: 8, cal: 32, p: 0.1, f: 0, c: 8.3, fb: 0 },
  { name: '椰子水', nameEn: 'Coconut Water', gi: 3, gl: 1, cal: 19, p: 0.7, f: 0.2, c: 3.7, fb: 1.1 },
  { name: '柠檬水', nameEn: 'Lemon Water', gi: 0, gl: 0, cal: 6, p: 0.1, f: 0, c: 1.6, fb: 0.1 },
];

const CONDIMENT_FOODS = [
  { name: '蜂蜜', nameEn: 'Honey', gi: 61, gl: 12, cal: 304, p: 0.3, f: 0, c: 82.4, fb: 0.2 },
  { name: '酱油', nameEn: 'Soy Sauce', gi: 0, gl: 0, cal: 53, p: 8.1, f: 0, c: 4.9, fb: 0.8 },
  { name: '橄榄油', nameEn: 'Olive Oil', gi: 0, gl: 0, cal: 884, p: 0, f: 100.0, c: 0, fb: 0 },
  { name: '白砂糖', nameEn: 'White Sugar', gi: 65, gl: 12, cal: 387, p: 0, f: 0, c: 100.0, fb: 0 },
  { name: '黑巧克力', nameEn: 'Dark Chocolate', gi: 23, gl: 2, cal: 546, p: 5.0, f: 31.0, c: 60.0, fb: 7.0 },
  { name: '花生酱', nameEn: 'Peanut Butter', gi: 14, gl: 3, cal: 588, p: 25.0, f: 50.0, c: 20.0, fb: 6.0 },
  { name: '沙拉酱', nameEn: 'Salad Dressing', gi: 35, gl: 2, cal: 452, p: 1.0, f: 48.0, c: 7.0, fb: 0 },
  { name: '芝麻酱', nameEn: 'Tahini', gi: 40, gl: 3, cal: 595, p: 17.0, f: 54.0, c: 21.0, fb: 4.0 },
  { name: '番茄酱', nameEn: 'Ketchup', gi: 55, gl: 4, cal: 112, p: 1.7, f: 0.1, c: 26.0, fb: 0.4 },
  { name: '芥末酱', nameEn: 'Mustard', gi: 55, gl: 1, cal: 66, p: 4.0, f: 3.3, c: 5.8, fb: 3.3 },
];

const CAKE_FOODS = [
  { name: '巧克力蛋糕', nameEn: 'Chocolate Cake', gi: 48, gl: 18, cal: 371, p: 5.0, f: 17.0, c: 50.0, fb: 1.4 },
  { name: '海绵蛋糕', nameEn: 'Sponge Cake', gi: 46, gl: 17, cal: 297, p: 7.0, f: 6.0, c: 54.0, fb: 0.5 },
  { name: '曲奇饼干', nameEn: 'Cookie', gi: 64, gl: 15, cal: 488, p: 5.7, f: 22.0, c: 67.0, fb: 1.8 },
  { name: '冰淇淋', nameEn: 'Ice Cream', gi: 57, gl: 9, cal: 207, p: 3.5, f: 11.0, c: 24.0, fb: 0 },
  { name: '奶油泡芙', nameEn: 'Cream Puff', gi: 55, gl: 12, cal: 285, p: 5.0, f: 17.0, c: 28.0, fb: 0.4 },
  { name: '马卡龙', nameEn: 'Macaron', gi: 63, gl: 14, cal: 400, p: 7.0, f: 18.0, c: 53.0, fb: 1.0 },
  { name: '蛋挞', nameEn: 'Egg Tart', gi: 52, gl: 11, cal: 290, p: 5.0, f: 14.0, c: 35.0, fb: 0.5 },
  { name: '月饼', nameEn: 'Mooncake', gi: 65, gl: 20, cal: 421, p: 8.0, f: 19.0, c: 54.0, fb: 1.5 },
  { name: '麻薯', nameEn: 'Mochi', gi: 78, gl: 18, cal: 202, p: 3.0, f: 0.5, c: 44.0, fb: 0.8 },
  { name: '华夫饼', nameEn: 'Waffle', gi: 65, gl: 14, cal: 291, p: 7.8, f: 10.0, c: 43.0, fb: 1.0 },
];

const FAST_FOODS = [
  { name: '汉堡', nameEn: 'Hamburger', gi: 55, gl: 12, cal: 295, p: 17.0, f: 14.0, c: 24.0, fb: 1.3 },
  { name: '炸鸡', nameEn: 'Fried Chicken', gi: 48, gl: 8, cal: 320, p: 19.0, f: 19.0, c: 17.0, fb: 0.5 },
  { name: '披萨', nameEn: 'Pizza', gi: 60, gl: 15, cal: 266, p: 11.0, f: 10.0, c: 33.0, fb: 2.3 },
  { name: '薯条', nameEn: 'French Fries', gi: 75, gl: 22, cal: 312, p: 3.4, f: 15.0, c: 41.0, fb: 3.8 },
  { name: '热狗', nameEn: 'Hot Dog', gi: 58, gl: 10, cal: 290, p: 10.0, f: 17.0, c: 24.0, fb: 0.8 },
  { name: '炸鱼排', nameEn: 'Fish Fillet', gi: 48, gl: 8, cal: 244, p: 13.0, f: 12.0, c: 22.0, fb: 0.8 },
  { name: '三明治', nameEn: 'Sandwich', gi: 53, gl: 11, cal: 250, p: 12.0, f: 8.0, c: 33.0, fb: 1.5 },
  { name: '拉面', nameEn: 'Ramen', gi: 62, gl: 18, cal: 436, p: 15.0, f: 18.0, c: 53.0, fb: 2.0 },
  { name: '炒饭', nameEn: 'Fried Rice', gi: 72, gl: 22, cal: 238, p: 6.0, f: 8.0, c: 36.0, fb: 1.2 },
  { name: '饺子', nameEn: 'Dumpling', gi: 55, gl: 14, cal: 222, p: 9.0, f: 7.0, c: 30.0, fb: 1.0 },
];

const ALL_FOOD_DATA: Record<string, Array<{ name: string; nameEn: string; gi: number; gl: number; cal: number; p: number; f: number; c: number; fb: number }>> = {
  '谷物': GRAIN_FOODS,
  '蔬菜': VEG_FOODS,
  '水果': FRUIT_FOODS,
  '肉类': MEAT_FOODS,
  '水产': SEAFOOD_FOODS,
  '乳制品': DAIRY_FOODS,
  '豆类': BEAN_FOODS,
  '坚果': NUT_FOODS,
  '饮品': DRINK_FOODS,
  '调味品': CONDIMENT_FOODS,
  '糕点': CAKE_FOODS,
  '速食': FAST_FOODS,
};

function generateVitamins(category: string): Record<string, number> {
  const base: Record<string, number> = {};
  const vitA = ['蔬菜', '水果', '乳制品', '水产'].includes(category) ? Math.random() * 200 + 50 : Math.random() * 30;
  const vitC = ['水果', '蔬菜'].includes(category) ? Math.random() * 80 + 10 : Math.random() * 5;
  const vitD = ['水产', '乳制品'].includes(category) ? Math.random() * 5 + 1 : Math.random() * 0.5;
  const vitE = ['坚果', '谷物'].includes(category) ? Math.random() * 10 + 2 : Math.random() * 2;
  const vitB1 = Math.random() * 0.5 + 0.05;
  const vitB2 = Math.random() * 0.4 + 0.03;
  const vitB12 = ['肉类', '水产', '乳制品'].includes(category) ? Math.random() * 2 + 0.5 : 0;
  base['A'] = Math.round(vitA * 100) / 100;
  base['C'] = Math.round(vitC * 100) / 100;
  base['D'] = Math.round(vitD * 100) / 100;
  base['E'] = Math.round(vitE * 100) / 100;
  base['B1'] = Math.round(vitB1 * 100) / 100;
  base['B2'] = Math.round(vitB2 * 100) / 100;
  base['B12'] = Math.round(vitB12 * 100) / 100;
  return base;
}

function generateMinerals(category: string): Record<string, number> {
  const base: Record<string, number> = {};
  const calcium = ['乳制品', '豆类'].includes(category) ? Math.random() * 200 + 50 : Math.random() * 30;
  const iron = ['肉类', '豆类', '坚果'].includes(category) ? Math.random() * 4 + 1 : Math.random() * 1;
  const zinc = ['肉类', '水产', '坚果'].includes(category) ? Math.random() * 5 + 1 : Math.random() * 1;
  const potassium = ['水果', '蔬菜'].includes(category) ? Math.random() * 400 + 100 : Math.random() * 100;
  const magnesium = ['坚果', '谷物'].includes(category) ? Math.random() * 80 + 20 : Math.random() * 20;
  const selenium = ['水产', '肉类'].includes(category) ? Math.random() * 30 + 5 : Math.random() * 5;
  base['Ca'] = Math.round(calcium * 100) / 100;
  base['Fe'] = Math.round(iron * 100) / 100;
  base['Zn'] = Math.round(zinc * 100) / 100;
  base['K'] = Math.round(potassium * 100) / 100;
  base['Mg'] = Math.round(magnesium * 100) / 100;
  base['Se'] = Math.round(selenium * 100) / 100;
  return base;
}

function generateTags(name: string, category: string, gi: number): string[] {
  const tags = [category];
  if (gi > 70) tags.push('高GI');
  else if (gi > 55) tags.push('中GI');
  else if (gi > 0) tags.push('低GI');
  if (category === '肉类' || category === '水产') tags.push('高蛋白');
  if (category === '坚果') tags.push('高脂肪');
  if (category === '蔬菜' || category === '水果') tags.push('高纤维');
  if (name.includes('有机')) tags.push('有机');
  return tags;
}

export function generateFoodDatabase(): FoodItem[] {
  const foods: FoodItem[] = [];
  let id = 1;

  for (const [category, items] of Object.entries(ALL_FOOD_DATA)) {
    for (const item of items) {
      const name = item.name;
      foods.push({
        id: `food_${id.toString().padStart(6, '0')}`,
        name,
        nameEn: item.nameEn,
        category,
        calories: item.cal,
        protein: item.p,
        fat: item.f,
        carbs: item.c,
        fiber: item.fb,
        gi: item.gi,
        gl: item.gl,
        vitamins: generateVitamins(category),
        minerals: generateMinerals(category),
        tags: generateTags(name, category, item.gi),
      });
      id++;
    }
  }

  return foods;
}

export function generateBulkFoods(count: number): FoodItem[] {
  const baseFoods = generateFoodDatabase();
  const foods: FoodItem[] = [...baseFoods];
  const adjectives = ['新鲜', '有机', '自制', '蒸', '煮', '烤', '炒', '炖', '凉拌', '腌制'];
  const suffixes = ['(大份)', '(小份)', '(加量)', '(标准)', '(迷你)'];
  let id = baseFoods.length + 1;

  while (foods.length < count) {
    const base = baseFoods[Math.floor(Math.random() * baseFoods.length)];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const factor = 0.5 + Math.random() * 1.5;
    foods.push({
      id: `food_${id.toString().padStart(6, '0')}`,
      name: `${adj}${base.name}${suffix}`,
      nameEn: `${adj} ${base.nameEn} ${suffix}`,
      category: base.category,
      calories: Math.round(base.calories * factor),
      protein: Math.round(base.protein * factor * 10) / 10,
      fat: Math.round(base.fat * factor * 10) / 10,
      carbs: Math.round(base.carbs * factor * 10) / 10,
      fiber: Math.round(base.fiber * factor * 10) / 10,
      gi: Math.min(100, Math.max(0, Math.round(base.gi + (Math.random() - 0.5) * 10))),
      gl: Math.max(0, Math.round(base.gl * factor * 10) / 10),
      vitamins: generateVitamins(base.category),
      minerals: generateMinerals(base.category),
      tags: [...base.tags, adj],
    });
    id++;
  }

  return foods.slice(0, count);
}
