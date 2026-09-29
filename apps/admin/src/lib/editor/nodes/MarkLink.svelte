<script lang="ts">
// For `link` and `internal_link` marks. A span, not <a>: links must not navigate while editing.
let { content }: { content: string } = $props();
</script>

<span class="link">{content}</span>
