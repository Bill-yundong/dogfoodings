<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = '请填写邮箱和密码'
    return
  }

  if (!email.value.includes('@')) {
    error.value = '请输入有效的邮箱地址'
    return
  }

  isLoading.value = true
  error.value = ''

  setTimeout(() => {
    userStore.login(email.value, password.value)
    isLoading.value = false
    router.push('/')
  }, 1000)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="glass-card p-8 w-full max-w-md">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span class="text-white font-bold text-2xl">P</span>
        </div>
        <h1 class="text-2xl font-bold mb-2">欢迎回来</h1>
        <p class="text-gray-400">登录以继续你的训练之旅</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-sm font-medium mb-2">邮箱</label>
          <div class="relative">
            <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              v-model="email"
              type="email"
              placeholder="your@email.com"
              class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">密码</label>
          <div class="relative">
            <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              class="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <Eye v-if="!showPassword" class="w-5 h-5" />
              <EyeOff v-else class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div v-if="error" class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p class="text-sm text-red-400">{{ error }}</p>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full btn-primary flex items-center justify-center space-x-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading">登录中...</span>
          <template v-else>
            <span>登录</span>
            <ArrowRight class="w-5 h-5" />
          </template>
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-400">
          还没有账号？
          <button @click="handleLogin" class="text-primary-400 hover:text-primary-300 font-medium">
            立即注册
          </button>
        </p>
      </div>

      <div class="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
        <p class="text-sm text-primary-400">
          <strong>演示模式：</strong>输入任意邮箱和密码即可登录体验
        </p>
      </div>
    </div>
  </div>
</template>
