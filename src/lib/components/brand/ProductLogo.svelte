<script lang="ts">
  type ProductLogoSize = 'sm' | 'md';

  interface ProductLogoProps {
    label?: string;
    showText?: boolean;
    decorative?: boolean;
    size?: ProductLogoSize;
    class?: string;
    imageClass?: string;
    textClass?: string;
  }

  let {
    label = 'O que o parlamentar fez',
    showText = true,
    decorative = false,
    size = 'md',
    class: className = '',
    imageClass = '',
    textClass = ''
  }: ProductLogoProps = $props();

  const logoSizeClasses: Record<ProductLogoSize, string> = {
    sm: 'h-7 w-7',
    md: 'h-10 w-10 sm:h-11 sm:w-11'
  };

  let imageIsHidden = $derived(decorative || showText);
</script>

<div class={`inline-flex min-w-0 items-center gap-3 ${className}`}>
  <img
    src="/brand/legislative-activity-explorer-logo.svg"
    width="1254"
    height="1254"
    alt={imageIsHidden ? '' : label}
    aria-hidden={imageIsHidden ? 'true' : undefined}
    decoding="async"
    class={`block shrink-0 rounded-full object-contain [clip-path:circle(50%_at_50%_50%)] ${logoSizeClasses[size]} ${imageClass}`}
  />

  {#if showText}
    <span class={`min-w-0 text-sm font-bold leading-tight text-ink ${textClass}`}>
      {label}
    </span>
  {/if}
</div>
