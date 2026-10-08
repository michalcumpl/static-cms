<script lang="ts">
import { type DocumentPath, NodeArrayProperty, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import { addFact, addPhotos, setProjectCategory } from "../item-pages";
import { getEditor } from "../state.svelte";
import FormBody from "./FormBody.svelte";
import FormField from "./FormField.svelte";
import FormImage from "./FormImage.svelte";
import FormItem from "./FormItem.svelte";
import FormItemPage from "./FormItemPage.svelte";
import FormString from "./FormString.svelte";
import { getFormLists, listFieldId } from "./lists";

// A project in What you offer (collection-pages, project-page delta): every field of it.
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const form = getFormLists();
const project = $derived(
  svedit.session.get(path) as {
    id: string;
    category_id: string;
    facts: { nodes: string[] };
    photos: { nodes: string[] };
  },
);
const categories = $derived(
  (svedit.session.get([editor.siteId, "project_categories"]) as { nodes: string[] }).nodes.map(
    (id) => ({ id, name: (svedit.session.get(id) as { name: { content: string } }).name.content }),
  ),
);
const categoryId = $derived(listFieldId(form.section, project.id, "category_id"));
const locked = $derived(editor.sharedReadOnly);

async function choosePhotos() {
  addPhotos(svedit.session, project.id, await editor.openLibraryMany());
}
</script>

<FormItem {path} nameProperty="name">
  <FormImage ownerId={project.id} label={i18n.t("panel.lists.fields.cover")} />
  <FormField path={[...path, "name"]} label={i18n.t("panel.lists.fields.name")} />
  <div class="field" contenteditable="false">
    <label class="label" for={categoryId}>{i18n.t("panel.lists.fields.category")}</label>
    <select
      id={categoryId}
      value={project.category_id}
      disabled={locked}
      onchange={(event) => setProjectCategory(svedit.session, project.id, event.currentTarget.value)}
    >
      <option value="">{i18n.t("panel.lists.fields.noCategory")}</option>
      {#each categories as category (category.id)}
        <option value={category.id}>{category.name}</option>
      {/each}
    </select>
  </div>
  <FormField path={[...path, "summary"]} label={i18n.t("panel.lists.fields.summary")} />
  <FormBody {path} label={i18n.t("panel.lists.fields.body")} />
  <div class="group" role="group" aria-labelledby="{project.id}-facts">
    <span class="label" id="{project.id}-facts" contenteditable="false">{i18n.t("panel.lists.fields.facts")}</span>
    {#if project.facts.nodes.length > 0}
      <NodeArrayProperty path={[...path, "facts"]} class="rows" />
    {/if}
    <div contenteditable="false">
      <Button size="sm" icon="plus" disabled={locked} onclick={() => {
        addFact(svedit.session, project.id, path as (string | number)[]);
        svedit.focus_canvas();
      }}>{i18n.t("panel.lists.fields.addFact")}</Button>
    </div>
  </div>
  <div class="group" role="group" aria-labelledby="{project.id}-photos">
    <span class="label" id="{project.id}-photos" contenteditable="false">{i18n.t("panel.lists.fields.photos")}</span>
    {#if project.photos.nodes.length > 0}
      <NodeArrayProperty path={[...path, "photos"]} class="rows" />
    {/if}
    <div contenteditable="false">
      <Button size="sm" icon="plus" disabled={locked} onclick={choosePhotos}>{i18n.t("panel.lists.fields.addPhotos")}</Button>
    </div>
  </div>
  <FormString nodeId={project.id} property="video_url" type="url" label={i18n.t("panel.lists.fields.video")} />
  <FormItemPage itemId={project.id} collection="projects" />
</FormItem>

<style>
  .field,
  .group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  .label {
    font-size: var(--ui-text-sm);
    font-weight: 600;
    user-select: none;
  }

  select {
    min-height: var(--ui-control);
    max-width: 20rem;
  }

  .group :global(.rows) {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }
</style>
