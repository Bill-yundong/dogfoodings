import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Course, ActionTemplate } from '@/types/pose'
import { getAllCourses, getCourseById, saveCourse } from '@/utils/db'

function generateReferencePose(): any {
  const keypoints = []
  for (let i = 0; i < 33; i++) {
    keypoints.push({
      x: 0.5 + (Math.random() - 0.5) * 0.3,
      y: 0.5 + (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.2,
      visibility: 0.95,
      score: 0.9
    })
  }
  return {
    timestamp: 0,
    keypoints,
    score: 1.0
  }
}

function getMockCourses(): Course[] {
  const actions1: ActionTemplate[] = [
    {
      id: 'act_001',
      name: '站立山式',
      duration: 30,
      description: '双脚并拢站立，双手自然下垂，保持身体直立',
      referencePose: generateReferencePose(),
      keypointThresholds: { 11: 10, 12: 10, 23: 15, 24: 15, 25: 10, 26: 10 }
    },
    {
      id: 'act_002',
      name: '手臂上举',
      duration: 30,
      description: '吸气，双臂从体侧向上举过头顶',
      referencePose: generateReferencePose(),
      keypointThresholds: { 13: 15, 14: 15, 15: 20, 16: 20 }
    },
    {
      id: 'act_003',
      name: '前屈伸展',
      duration: 30,
      description: '呼气，从髋部向前折叠，双手触地',
      referencePose: generateReferencePose(),
      keypointThresholds: { 23: 20, 24: 20, 25: 15, 26: 15 }
    }
  ]

  const actions2: ActionTemplate[] = [
    {
      id: 'act_101',
      name: '俯卧撑准备',
      duration: 20,
      description: '双手撑地，身体成一条直线',
      referencePose: generateReferencePose(),
      keypointThresholds: { 11: 10, 12: 10, 23: 10, 24: 10 }
    },
    {
      id: 'act_102',
      name: '下蹲动作',
      duration: 40,
      description: '双脚与肩同宽，屈膝下蹲',
      referencePose: generateReferencePose(),
      keypointThresholds: { 25: 15, 26: 15, 27: 10, 28: 10 }
    },
    {
      id: 'act_103',
      name: '平板支撑',
      duration: 30,
      description: '前臂撑地，保持核心收紧',
      referencePose: generateReferencePose(),
      keypointThresholds: { 11: 10, 12: 10, 23: 15, 24: 15 }
    },
    {
      id: 'act_104',
      name: '高抬腿',
      duration: 40,
      description: '原地高抬腿，保持节奏',
      referencePose: generateReferencePose(),
      keypointThresholds: { 25: 20, 26: 20, 23: 15, 24: 15 }
    }
  ]

  const actions3: ActionTemplate[] = [
    {
      id: 'act_201',
      name: '战士一式',
      duration: 45,
      description: '一腿在前弯曲，一腿在后伸直，双臂上举',
      referencePose: generateReferencePose(),
      keypointThresholds: { 25: 15, 26: 15, 13: 20, 14: 20 }
    },
    {
      id: 'act_202',
      name: '战士二式',
      duration: 45,
      description: '双腿分开，一腿弯曲，双臂平举',
      referencePose: generateReferencePose(),
      keypointThresholds: { 25: 15, 26: 15, 11: 15, 12: 15 }
    },
    {
      id: 'act_203',
      name: '下犬式',
      duration: 40,
      description: '双手双脚撑地，臀部向上',
      referencePose: generateReferencePose(),
      keypointThresholds: { 11: 20, 12: 20, 23: 20, 24: 20 }
    },
    {
      id: 'act_204',
      name: '树式',
      duration: 30,
      description: '单腿站立，另一腿屈膝脚掌贴大腿',
      referencePose: generateReferencePose(),
      keypointThresholds: { 25: 25, 26: 25, 27: 20, 28: 20 }
    },
    {
      id: 'act_205',
      name: '婴儿式放松',
      duration: 30,
      description: '跪坐，身体前伏，双臂前伸',
      referencePose: generateReferencePose(),
      keypointThresholds: { 11: 20, 12: 20, 23: 20, 24: 20 }
    }
  ]

  return [
    {
      id: 'course_001',
      name: '入门瑜伽基础',
      description: '适合初学者的瑜伽入门课程，学习基本体式和呼吸方法',
      difficulty: 'beginner',
      duration: 15,
      category: '瑜伽',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=yoga%20class%20peaceful%20scene&image_size=landscape_16_9',
      actions: actions1
    },
    {
      id: 'course_002',
      name: '全身燃脂训练',
      description: '高强度间歇训练，快速燃烧脂肪，提升心肺功能',
      difficulty: 'intermediate',
      duration: 20,
      category: 'HIIT',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hiit%20workout%20fitness%20training&image_size=landscape_16_9',
      actions: actions2
    },
    {
      id: 'course_003',
      name: '进阶瑜伽流',
      description: '流畅的瑜伽动作序列，提升身体柔韧度和力量',
      difficulty: 'advanced',
      duration: 30,
      category: '瑜伽',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=advanced%20yoga%20pose%20flow&image_size=landscape_16_9',
      actions: actions3
    }
  ]
}

export const useCourseStore = defineStore('course', () => {
  const courses = ref<Course[]>([])
  const selectedCourse = ref<Course | null>(null)
  const isLoading = ref(false)

  const beginnerCourses = computed(() => 
    courses.value.filter(c => c.difficulty === 'beginner')
  )
  
  const intermediateCourses = computed(() => 
    courses.value.filter(c => c.difficulty === 'intermediate')
  )
  
  const advancedCourses = computed(() => 
    courses.value.filter(c => c.difficulty === 'advanced')
  )

  async function loadCourses() {
    isLoading.value = true
    try {
      const savedCourses = await getAllCourses()
      if (savedCourses.length > 0) {
        courses.value = savedCourses
      } else {
        const mockCourses = getMockCourses()
        for (const course of mockCourses) {
          await saveCourse(course)
        }
        courses.value = mockCourses
      }
    } catch (e) {
      console.error('Failed to load courses:', e)
      courses.value = getMockCourses()
    }
    isLoading.value = false
  }

  async function selectCourse(id: string) {
    const course = await getCourseById(id)
    selectedCourse.value = course || courses.value.find(c => c.id === id) || null
    return selectedCourse.value
  }

  function getActionTemplate(courseId: string, actionId: string): ActionTemplate | null {
    const course = courses.value.find(c => c.id === courseId)
    if (!course) return null
    return course.actions.find(a => a.id === actionId) || null
  }

  return {
    courses,
    selectedCourse,
    isLoading,
    beginnerCourses,
    intermediateCourses,
    advancedCourses,
    loadCourses,
    selectCourse,
    getActionTemplate
  }
})
