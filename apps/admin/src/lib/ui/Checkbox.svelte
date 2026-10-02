<script lang="ts">
import type { HTMLInputAttributes } from "svelte/elements";

// A checkbox with its label, or a switch (`role="switch"`) when `switch` is set.
let {
  label,
  checked = $bindable(false),
  hint,
  switch: isSwitch = false,
  id,
  ...rest
}: {
  label: string;
  checked?: boolean;
  hint?: string;
  switch?: boolean;
  id?: string;
} & Omit<HTMLInputAttributes, "checked" | "type"> = $props();

const hintId = $derived(hint && id ? `${id}-hint` : undefined);
</script>

<div class="ui-check">
  <label>
    <input
      type="checkbox"
      {id}
      role={isSwitch ? "switch" : undefined}
      class:switch={isSwitch}
      bind:checked
      aria-describedby={hintId}
      {...rest}
    />
    <span>{label}</span>
  </label>
  {#if hint}<p class="hint" id={hintId}>{hint}</p>{/if}
</div>

<style>
  label {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-2);
    min-height: var(--ui-control-sm);
    cursor: pointer;
  }

  input {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0;
    accent-color: var(--ui-link);
  }

  input.switch {
    appearance: none;
    position: relative;
    width: 2.25rem;
    height: 1.25rem;
    border-radius: var(--ui-radius-pill);
    background: var(--ui-border-strong);
    transition: background-color 0.15s;
    cursor: pointer;
  }

  input.switch::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: calc(1.25rem - 4px);
    height: calc(1.25rem - 4px);
    border-radius: 50%;
    background: var(--ui-surface);
    transition: translate 0.15s;
  }

  input.switch:checked {
    background: var(--ui-link);
  }

  input.switch:checked::after {
    translate: 1rem 0;
  }

  input:disabled,
  input:disabled + span {
    opacity: 0.55;
    cursor: default;
  }

  .hint {
    margin: 0 0 0 calc(1.125rem + var(--ui-space-2));
    font-size: var(--ui-text-sm);
    color: var(--ui-muted);
  }
</style>
