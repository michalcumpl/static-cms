// The site's one script, `assets/video.js` (video design decision 3): pressing a video's play
// link swaps it for the provider's player. It holds no document content; the player's address
// and title come from the figure's data attributes, which the renderer writes from `videoEmbed`.
export const VIDEO_SCRIPT = `document.addEventListener("click", function (event) {
  var target = event.target;
  var link = target && target.closest ? target.closest(".video-play") : null;
  var figure = link ? link.closest("figure[data-embed]") : null;
  if (!figure) return;
  var src = figure.getAttribute("data-embed") || "";
  if (!/^https:\\/\\/(www\\.youtube-nocookie\\.com\\/embed\\/|player\\.vimeo\\.com\\/video\\/)/.test(src)) return;
  event.preventDefault();
  var frame = document.createElement("iframe");
  frame.className = "video-frame";
  frame.src = src;
  frame.title = figure.getAttribute("data-title") || "";
  frame.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  link.replaceWith(frame);
  frame.focus();
});
`;
