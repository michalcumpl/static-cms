<script lang="ts">
import { CustomProperty, type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getEditor } from "../state.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const image = $derived(svedit.session.get(path));
</script>

<!-- Selecting the image opens its alt text panel; the file itself can't be changed in M2. -->
<Node {path} class="image-node">
  <CustomProperty path={[...path, "src"]}>
    <div contenteditable="false">
      <img
        class="hero-image"
        src={editor.paths.media(image.src)}
        alt={image.decorative ? "" : image.alt}
        width={image.width || undefined}
        height={image.height || undefined}
      />
    </div>
  </CustomProperty>
</Node>
