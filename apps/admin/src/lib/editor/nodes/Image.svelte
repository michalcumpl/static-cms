<script lang="ts">
import { CustomProperty, type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getEditor } from "../state.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const image = $derived(svedit.session.get(path));
// Styled like the published image of its block (see the site stylesheet).
const CLASS_BY_OWNER: Record<string, string> = {
  hero: "hero-image",
  person: "portrait",
  project: "project-cover",
};
const ownerType = $derived((svedit.session.get(path.slice(0, -2)) as { type?: string })?.type);
</script>

<!-- Selecting the image opens the Image panel: alt text, and replacing or removing it. -->
<Node {path} class="image-node">
  <CustomProperty path={[...path, "src"]}>
    <div contenteditable="false">
      <img
        class={CLASS_BY_OWNER[ownerType ?? ""]}
        src={editor.paths.image(image.src, image.width)}
        alt={image.decorative ? "" : image.alt}
        width={image.width || undefined}
        height={image.height || undefined}
      />
    </div>
  </CustomProperty>
</Node>
