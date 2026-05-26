<script lang="ts">
  import { X } from 'lucide-svelte';

  let {
    open = $bindable(false),
    title = '',
    size = 'md' as 'sm' | 'md' | 'lg' | 'xl',
    children,
    footer
  }: {
    open?: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children?: any;
    footer?: any;
  } = $props();

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  function handleClose() {
    open = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div 
      class="absolute inset-0 backdrop-blur-sm"
      style="background: rgba(0, 0, 0, 0.6);"
      onclick={handleClose}
    />
    <div 
      class="relative z-10 w-full mx-4 glass-panel animate-in fade-in zoom-in-95 duration-200 {sizeClasses[size]}"
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-dark-600">
        <h3 class="font-display font-semibold text-white text-lg">{title}</h3>
        <button 
          onclick={handleClose}
          class="p-1 hover:bg-dark-600 rounded transition-colors"
        >
          <X class="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div class="p-6">
        {@render children?.()}
      </div>
      {#if footer}
        <div class="px-6 py-4 border-t border-dark-600 flex justify-end gap-3">
          {@render footer?.()}
        </div>
      {/if}
    </div>
  </div>
{/if}
