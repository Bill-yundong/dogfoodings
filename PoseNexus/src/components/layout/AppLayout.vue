<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './NavBar.vue'

const route = useRoute()

const isTrainingPage = computed(() => route.name === 'training')
</script>

<template>
  <div class="min-h-screen">
    <NavBar v-if="!isTrainingPage" />
    <main :class="{ 'pt-16': !isTrainingPage }">
      <router-view />
    </main>
  </div>
</template>
