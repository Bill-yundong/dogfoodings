<script lang="ts">
  import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-svelte';
  import { notifications, removeNotification } from '@/stores';
  import type { NotificationType } from '@/types';

  const icons: Record<NotificationType, typeof CheckCircle> = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
    info: Info
  };

  const styles: Record<NotificationType, string> = {
    success: 'background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.5); color: #22c55e;',
    warning: 'background: rgba(249, 115, 22, 0.2); border-color: rgba(249, 115, 22, 0.5); color: #f97316;',
    error: 'background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5); color: #ef4444;',
    info: 'background: rgba(10, 37, 64, 0.2); border-color: rgba(10, 37, 64, 0.5); color: #0a2540;'
  };
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
  {#each $notifications as notification (notification.id)}
    <div 
      class="flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md pointer-events-auto animate-in slide-in-from-right duration-300"
      style={styles[notification.type]}
    >
      <svelte:component this={icons[notification.type]} class="w-5 h-5 flex-shrink-0" />
      <span class="text-sm flex-1">{notification.message}</span>
      <button 
        onclick={() => removeNotification(notification.id)}
        class="p-0.5 hover:bg-white/10 rounded transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/each}
</div>
