<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  Home,
  Video,
  User,
  LogIn,
  LogOut
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const mobileMenuOpen = ref(false)

const navItems = [
  { name: '首页', path: '/', icon: Home },
  { name: '课程', path: '/courses', icon: Video },
  { name: '我的', path: '/profile', icon: User }
]

function handleLogout() {
  userStore.logout()
  router.push('/')
}
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-50 bg-dark-600/80 backdrop-blur-xl border-b border-white/10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-2 cursor-pointer" @click="router.push('/')">
          <div class="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
            <span class="text-white font-bold text-lg">P</span>
          </div>
          <span class="text-xl font-bold text-gradient">PoseNexus</span>
        </div>

        <div class="hidden md:flex items-center space-x-1">
          <button
            v-for="item in navItems"
            :key="item.path"
            @click="router.push(item.path)"
            :class="[
              'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200',
              route.path === item.path
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5" />
            <span>{{ item.name }}</span>
          </button>
        </div>

        <div class="hidden md:flex items-center space-x-4">
          <template v-if="userStore.isLoggedIn">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span class="text-white text-sm font-medium">
                  {{ userStore.currentUser?.name?.[0]?.toUpperCase() }}
                </span>
              </div>
              <span class="text-sm text-gray-300">{{ userStore.currentUser?.name }}</span>
            </div>
            <button
              @click="handleLogout"
              class="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut class="w-5 h-5" />
            </button>
          </template>
          <button
            v-else
            @click="router.push('/login')"
            class="btn-primary flex items-center space-x-2 py-2"
          >
            <LogIn class="w-4 h-4" />
            <span>登录</span>
          </button>
        </div>

        <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="md:hidden p-2 rounded-lg hover:bg-white/10"
        >
          <div class="w-6 h-6 flex flex-col justify-center space-y-1.5">
            <span
              :class="[
                'block h-0.5 bg-white transition-all duration-300',
                mobileMenuOpen && 'rotate-45 translate-y-2'
              ]"
            ></span>
            <span
              :class="[
                'block h-0.5 bg-white transition-all duration-300',
                mobileMenuOpen && 'opacity-0'
              ]"
            ></span>
            <span
              :class="[
                'block h-0.5 bg-white transition-all duration-300',
                mobileMenuOpen && '-rotate-45 -translate-y-2'
              ]"
            ></span>
          </div>
        </button>
      </div>
    </div>

    <div
      v-if="mobileMenuOpen"
      class="md:hidden border-t border-white/10 bg-dark-600/95 backdrop-blur-xl"
    >
      <div class="px-4 py-3 space-y-1">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="router.push(item.path); mobileMenuOpen = false"
          :class="[
            'flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-all',
            route.path === item.path
              ? 'bg-primary-500/20 text-primary-400'
              : 'text-gray-400'
          ]"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span>{{ item.name }}</span>
        </button>
      </div>
    </div>
  </nav>
</template>
