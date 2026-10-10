<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import { businessView } from "./business-view";

// A contact form on the canvas (contact-form spec, "Contact form in the editor"): the heading
// and text edited in place, the fields as the website shows them but not usable. The kind,
// button and address are set in the Contact form panel.
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(
  svedit.session.get(path) as { form_kind: string; button: { content: string } },
);
const strings = $derived(businessView(svedit.session.doc).strings.form);
const fields = $derived(
  block.form_kind === "callback"
    ? [
        { label: strings.name, kind: "input" },
        { label: strings.phone, kind: "input" },
        { label: strings.when, kind: "select", value: strings.whenAny },
        { label: strings.note, kind: "textarea" },
      ]
    : [
        { label: strings.name, kind: "input" },
        { label: strings.email, kind: "input" },
        { label: strings.phone, kind: "input" },
        { label: strings.message, kind: "textarea" },
      ],
);
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block contact-form">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <TextProperty
      tag="p"
      class="form-text"
      path={[...path, "text"]}
      placeholder={i18n.t("editor.canvas.formTextOptional")}
    />
    <div class="canvas-form" contenteditable="false" inert>
      {#each fields as field (field.label)}
        <div class="form-field">
          <span class="canvas-form-label">{field.label}</span>
          {#if field.kind === "textarea"}
            <textarea rows="3" tabindex="-1"></textarea>
          {:else if field.kind === "select"}
            <select tabindex="-1"><option>{field.value}</option></select>
          {:else}
            <input type="text" tabindex="-1" />
          {/if}
        </div>
      {/each}
      <p class="form-privacy">{strings.privacy}</p>
      <span class="button">{block.button.content}</span>
    </div>
  </div>
</Node>

<style>
  .canvas-form {
    pointer-events: none;
  }

  .canvas-form-label {
    display: block;
  }
</style>
