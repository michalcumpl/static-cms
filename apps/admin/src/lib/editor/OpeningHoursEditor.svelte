<script lang="ts">
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
let { editor }: { editor: EditorState } = $props();

const DAY_NAMES: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
const week = $derived(WEEK.map((day) => ({ day, ranges: rangesOf(editor.session.doc, day) })));
</script>

<fieldset class="hours" aria-describedby="hours-hint">
  <legend>Opening hours</legend>
  <p class="hint" id="hours-hint">A day without times is closed. Add a second range for a break.</p>
  {#each week as { day, ranges }, dayIndex (day)}
    <div class="day" role="group" aria-label={DAY_NAMES[day]}>
      <span class="day-name">{DAY_NAMES[day]}</span>
      <div class="ranges">
        {#each ranges as range, index (range.id)}
          <div class="range">
            <input
              type="time"
              id={index === 0 ? businessFieldElementId(`hours_${day}`) : undefined}
              aria-label="{DAY_NAMES[day]} opens{ranges.length > 1 ? ` (${index + 1})` : ''}"
              value={range.opens}
              onchange={(e) => setRangeTime(editor.session, range.id, "opens", e.currentTarget.value)}
            />
            <span aria-hidden="true">–</span>
            <input
              type="time"
              aria-label="{DAY_NAMES[day]} closes{ranges.length > 1 ? ` (${index + 1})` : ''}"
              value={range.closes === "24:00" ? "00:00" : range.closes}
              onchange={(e) => setRangeTime(editor.session, range.id, "closes", e.currentTarget.value)}
            />
            <button
              type="button"
              aria-label="Remove {DAY_NAMES[day]}'s range {index + 1}"
              onclick={() => removeRange(editor.session, day, index)}>×</button
            >
          </div>
        {:else}
          <span class="closed">Closed</span>
        {/each}
        <div class="day-actions">
          <button
            type="button"
            id={ranges.length === 0 ? businessFieldElementId(`hours_${day}`) : undefined}
            onclick={() => addRange(editor.session, day)}
          >
            {ranges.length === 0 ? `Open on ${DAY_NAMES[day]}` : "Add range"}
          </button>
          {#if dayIndex === 0 && ranges.length > 0}
            <button type="button" onclick={() => copyMondayToWeekdays(editor.session)}>
              Copy to Tue–Fri
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
    border: 1px solid #ddd;
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
    color: #555;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: #555;
  }
</style>
