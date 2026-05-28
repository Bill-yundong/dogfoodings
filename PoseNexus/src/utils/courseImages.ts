const categoryImageMap: Record<string, string> = {
  '瑜伽': 'yoga%20meditation%20peaceful%20stretching',
  'HIIT': 'hiit%20workout%20intense%20training%20fitness',
  '力量训练': 'strength%20training%20weightlifting%20gym',
  '拉伸': 'stretching%20flexibility%20warm%20up',
  '普拉提': 'pilates%20core%20workout%20balance',
  '有氧': 'cardio%20aerobic%20exercise%20running',
  '舞蹈': 'dance%20choreography%20rhythm',
  '拳击': 'boxing%20mma%20combat%20training',
  '跑步': 'running%20jogging%20outdoor%20fitness',
  '骑行': 'cycling%20spinning%20indoor%20bike'
}

export function getDefaultImageByCategory(category: string): string {
  const prompt = categoryImageMap[category] || 'fitness%20workout%20exercise%20training'
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=landscape_16_9`
}

export function getCourseThumbnail(thumbnail: string | undefined, category: string): string {
  if (thumbnail && thumbnail.trim() !== '') {
    return thumbnail
  }
  return getDefaultImageByCategory(category)
}
