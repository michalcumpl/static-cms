<script lang="ts">
import { ICONS, type IconName } from "./icons";

// A decorative icon; the control around it carries the name.
let { name, size = 18 }: { name: IconName; size?: number } = $props();
</script>

<svg
  class="ui-icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {@html ICONS[name]}
</svg>

<style>
  .ui-icon {
    flex-shrink: 0;
  }
</style>
