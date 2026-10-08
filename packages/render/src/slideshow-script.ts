// `assets/slideshow.js` (hero-slideshow design decision 3): turns a row of slides into a
// slideshow that advances every six seconds, with pause, previous, next and per-slide buttons.
// It stops on hover and focus, and never moves by itself under reduced motion. It holds no
// document content; its words come from the region's `data-labels`.
export const SLIDESHOW_SCRIPT = `(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var shows = document.querySelectorAll(".slideshow");
  Array.prototype.forEach.call(shows, function (show) {
    var list = show.querySelector(".slides");
    if (!list) return;
    var slides = Array.prototype.slice.call(list.children);
    if (slides.length < 2) return;
    var labels = {};
    try { labels = JSON.parse(show.getAttribute("data-labels") || "{}"); } catch (e) {}
    var current = 0;
    var paused = reduce;
    // Clips only for visitors who want motion and haven't asked to save data.
    var saveData = navigator.connection && navigator.connection.saveData;
    var clipsOn = !reduce && !saveData;
    function clipOf(slide) {
      var clip = slide.querySelector("video.slide-clip");
      return clipsOn && clip && !clip.getAttribute("data-failed") ? clip : null;
    }
    function canMove() {
      return !paused && !hovering && !focused && !document.hidden;
    }
    slides.forEach(function (slide) {
      var clip = slide.querySelector("video.slide-clip");
      if (!clip) return;
      clip.addEventListener("playing", function () { clip.classList.add("playing"); });
      clip.addEventListener("ended", function () {
        if (slides[current] !== slide) return;
        if (canMove()) go(current + 1);
        else if (!paused) clip.play();
      });
      clip.addEventListener("error", function () {
        clip.setAttribute("data-failed", "true");
        clip.classList.remove("playing");
        if (slides[current] === slide) schedule();
      });
    });
    var hovering = false;
    var focused = false;
    var controls = document.createElement("div");
    controls.className = "slideshow-controls";
    function button(className, label, symbol, onClick) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = className;
      b.setAttribute("aria-label", label || "");
      var span = document.createElement("span");
      span.setAttribute("aria-hidden", "true");
      span.textContent = symbol;
      b.appendChild(span);
      b.addEventListener("click", onClick);
      controls.appendChild(b);
      return b;
    }
    var toggle = button("slideshow-toggle", "", "", function () {
      paused = !paused;
      update();
    });
    button("slideshow-previous", labels.previous, "\\u2039", function () { go(current - 1); });
    var dots = slides.map(function (_, i) {
      return button("slideshow-dot", (labels.show || "{n}").replace("{n}", String(i + 1)), "", function () { go(i); });
    });
    button("slideshow-next", labels.next, "\\u203a", function () { go(current + 1); });
    show.insertBefore(controls, show.firstChild);
    show.classList.add("slideshow-ready");
    function update() {
      slides.forEach(function (slide, i) {
        slide.inert = i !== current;
        dots[i].setAttribute("aria-current", i === current ? "true" : "false");
      });
      toggle.setAttribute("aria-label", (paused ? labels.play : labels.pause) || "");
      toggle.firstChild.textContent = paused ? "\\u25b6" : "\\u275a\\u275a";
      slides.forEach(function (slide, i) {
        var clip = clipOf(slide);
        if (!clip) return;
        if (i === current && !paused) {
          if (!clip.getAttribute("src")) clip.setAttribute("src", clip.getAttribute("data-src") || "");
          var playing = clip.play();
          if (playing && playing.catch) playing.catch(function () {});
        } else {
          clip.pause();
        }
      });
      schedule();
    }
    // Slides without a clip move on after six seconds; a clip moves on when it ends.
    var timer = null;
    function schedule() {
      clearTimeout(timer);
      if (clipOf(slides[current])) return;
      timer = setTimeout(function () {
        if (canMove()) go(current + 1);
        else schedule();
      }, 6000);
    }
    // While the script scrolls to a slide, the scroll events it causes don't change the slide.
    var heading = -1;
    function go(i) {
      current = (i + slides.length) % slides.length;
      heading = current;
      list.scrollTo({ left: current * list.clientWidth, behavior: reduce ? "auto" : "smooth" });
      update();
    }
    var settle = null;
    list.addEventListener("scroll", function () {
      clearTimeout(settle);
      settle = setTimeout(function () {
        var shown = Math.round(list.scrollLeft / Math.max(list.clientWidth, 1));
        if (heading !== -1) {
          if (shown === heading) heading = -1;
          return;
        }
        if (shown !== current && shown >= 0 && shown < slides.length) {
          current = shown;
          update();
        }
      }, 120);
    });
    // A visitor's own scrolling always wins over the script's.
    ["pointerdown", "wheel", "touchstart"].forEach(function (type) {
      list.addEventListener(type, function () { heading = -1; }, { passive: true });
    });
    show.addEventListener("pointerenter", function () { hovering = true; });
    show.addEventListener("pointerleave", function () { hovering = false; });
    show.addEventListener("focusin", function () { focused = true; });
    show.addEventListener("focusout", function (event) {
      if (!show.contains(event.relatedTarget)) focused = false;
    });
    update();
  });
})();
`;
