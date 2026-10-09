<script lang="ts">
// A progress bar: filled to `value` (0 to 1), or sliding while how long is unknown. Screen
// readers hear its label and, when known, the percentage.
let { value, label }: { value?: number; label: string } = $props();
const percent = $derived(
  value === undefined ? undefined : Math.round(Math.min(1, Math.max(0, value)) * 100),
);
</script>

<div
  class="ui-progress"
  class:indeterminate={percent === undefined}
  role="progressbar"
  aria-label={label}
  aria-valuemin={percent === undefined ? undefined : 0}
  aria-valuemax={percent === undefined ? undefined : 100}
  aria-valuenow={percent}
>
  <div class="bar" style:width={percent === undefined ? undefined : `${percent}%`}></div>
</div>

<style>
  .ui-progress {
    position: relative;
    height: 0.5rem;
    overflow: hidden;
    border-radius: 999px;
    background: var(--ui-soft);
    box-shadow: inset 0 0 0 1px var(--ui-border);
  }

  .bar {
    height: 100%;
    border-radius: inherit;
    background: var(--ui-link);
    transition: width 0.3s ease;
  }

  .indeterminate .bar {
    position: absolute;
    width: 35%;
    animation: slide 1.4s ease-in-out infinite;
  }

  @keyframes slide {
    from {
      left: -35%;
    }
    to {
      left: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .indeterminate .bar {
      left: 0;
      width: 100%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      50% {
        opacity: 0.4;
      }
    }
  }
</style>
