<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useCourseStore } from '@/stores/course'
import AppLayout from '@/components/layout/AppLayout.vue'

const userStore = useUserStore()
const courseStore = useCourseStore()

onMounted(() => {
  userStore.restoreSession()
  courseStore.loadCourses()
})
</script>

<template>
  <AppLayout />
</template>
