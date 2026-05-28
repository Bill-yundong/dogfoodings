<script lang="ts">
  import { CheckCircle, XCircle, Info } from 'lucide-svelte'
  import { notification } from '../stores/appStore'

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info
  }

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-primary-500'
  }
</script>

{#if $notification}
  <div class="fixed top-4 right-4 z-50 animate-pulse">
    <div class="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-xl border border-gray-100">
      <div class="p-2 rounded-lg {colors[$notification.type]}">
        <svelte:component this={icons[$notification.type]} class="w-5 h-5 text-white" />
      </div>
      <p class="text-gray-700 font-medium">{$notification.message}</p>
    </div>
  </div>
{/if}
