<script lang="ts">
import { getI18n } from "$lib/i18n";
import {
  addRange,
  copyMondayToWeekdays,
  rangesOf,
  removeRange,
  setRangeTime,
  WEEK,
  type Weekday,
} from "./business";
import { businessFieldElementId } from "./locate";
import type { EditorState } from "./state.svelte";

// The week: each day's ranges as pairs of time fields (business-info design.md decision 7).
let { editor, disabled = false }: { editor: EditorState; disabled?: boolean } = $props();
const i18n = getI18n();

const dayName = (day: Weekday) => i18n.t(`editor.hours.days.${day}`);
const numbered = (text: string, count: number, index: number) =>
  count > 1 ? `${text} (${index + 1})` : text;
const week = $derived(WEEK.map((day) => ({ day, ranges: rangesOf(editor.session.doc, day) })));
</script>

<fieldset class="hours" aria-describedby="hours-hint" {disabled}>
  <legend>{i18n.t("editor.hours.title")}</legend>
  <p class="hint" id="hours-hint">{i18n.t("editor.hours.hint")}</p>
  {#each week as { day, ranges }, dayIndex (day)}
    <div class="day" role="group" aria-label={dayName(day)}>
      <span class="day-name">{dayName(day)}</span>
      <div class="ranges">
        {#each ranges as range, index (range.id)}
          <div class="range">
            <input
              type="time"
              id={index === 0 ? businessFieldElementId(`hours_${day}`) : undefined}
              aria-label={numbered(i18n.t("editor.hours.opens", { day: dayName(day) }), ranges.length, index)}
              value={range.opens}
              onchange={(e) => setRangeTime(editor.session, range.id, "opens", e.currentTarget.value)}
            />
            <span aria-hidden="true">–</span>
            <input
              type="time"
              aria-label={numbered(i18n.t("editor.hours.closes", { day: dayName(day) }), ranges.length, index)}
              value={range.closes === "24:00" ? "00:00" : range.closes}
              onchange={(e) => setRangeTime(editor.session, range.id, "closes", e.currentTarget.value)}
            />
            <button
              type="button"
              aria-label={i18n.t("editor.hours.remove", { day: dayName(day), number: index + 1 })}
              onclick={() => removeRange(editor.session, day, index)}>×</button
            >
          </div>
        {:else}
          <span class="closed">{i18n.t("editor.hours.closed")}</span>
        {/each}
        <div class="day-actions">
          <button
            type="button"
            id={ranges.length === 0 ? businessFieldElementId(`hours_${day}`) : undefined}
            onclick={() => addRange(editor.session, day)}
          >
            {ranges.length === 0
              ? i18n.t("editor.hours.openOn", { day: dayName(day) })
              : i18n.t("editor.hours.addRange")}
          </button>
          {#if dayIndex === 0 && ranges.length > 0}
            <button type="button" onclick={() => copyMondayToWeekdays(editor.session)}>
              {i18n.t("editor.hours.copyWeekdays")}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/each}
</fieldset>

<style>
  .hours {
    margin: 0.75rem 0 0;
    padding: 0.5rem 0.75rem 0.75rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.3rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  legend {
    font-size: 0.9rem;
  }

  .day {
    display: grid;
    grid-template-columns: 5.5rem 1fr;
    gap: 0.5rem;
    align-items: start;
  }

  .day-name {
    font-size: 0.9rem;
    padding-top: 0.2rem;
  }

  .ranges,
  .day-actions {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .day-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .range {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .range input {
    font: inherit;
    width: 6.5rem;
  }

  .closed {
    font-size: 0.9rem;
    color: var(--ui-muted);
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ui-muted);
  }
</style>
