<script lang="ts">
  import { currentRoute, navigate } from './index';

  interface Props {
    to: string;
    class?: string;
    children: import('svelte').Snippet;
  }

  let { to, class: className = '', children }: Props = $props();

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    navigate(to);
  }
</script>

<a
  href={to}
  class={className}
  data-active={$currentRoute === to ? 'true' : 'false'}
  onclick={handleClick}
>
  {@render children()}
</a>
