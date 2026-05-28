<script setup lang="ts">
import { onMounted } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import ParticleBackground from '@/components/effects/ParticleBackground.vue'
import { useIndexedDB } from '@/composables/useIndexedDB'
import { useIngredientStore } from '@/stores/ingredientStore'

const { isInitialized, isLoading } = useIndexedDB()
const ingredientStore = useIngredientStore()

onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  if (isInitialized.value) {
    await ingredientStore.loadIngredients()
    await ingredientStore.loadRecipes()
  }
})
</script>

<template>
  <div class="app min-h-screen bg-charcoal-900 particle-bg">
    <ParticleBackground />
    
    <div v-if="isLoading && !isInitialized" class="loading-screen">
      <div class="text-center">
        <div class="text-6xl mb-4 animate-bounce">🍳</div>
        <h1 class="font-display text-3xl font-bold text-gradient mb-2">FlavorNexus</h1>
        <p class="text-charcoal-400 text-sm">正在初始化风味数据库...</p>
        <div class="mt-6 w-48 h-1 bg-charcoal-800 rounded-full mx-auto overflow-hidden">
          <div class="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full animate-pulse" style="width: 70%" />
        </div>
      </div>
    </div>

    <div v-else class="flex h-screen">
      <div class="w-64 flex-shrink-0">
        <AppSidebar />
      </div>
      
      <main class="flex-1 overflow-auto p-6 relative z-10">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  position: relative;
}

.loading-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(26, 26, 26, 0.98) 0%, rgba(15, 15, 15, 0.99) 100%);
  z-index: 100;
}
</style>
