// `assets/menu.js` (menu-groups design decision 2): closes an open menu group on Escape (focus
// back on its summary), on a click outside it, and when focus leaves it. The groups open and
// close without it; it holds no document content.
export const MENU_SCRIPT = `(function () {
  var groups = document.querySelectorAll(".site-nav details");
  function close(group, focus) {
    if (!group.open) return;
    group.open = false;
    if (focus) group.querySelector("summary").focus();
  }
  Array.prototype.forEach.call(groups, function (group) {
    group.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close(group, true);
    });
    group.addEventListener("focusout", function (event) {
      if (event.relatedTarget && !group.contains(event.relatedTarget)) close(group, false);
    });
  });
  document.addEventListener("click", function (event) {
    Array.prototype.forEach.call(groups, function (group) {
      if (!group.contains(event.target)) close(group, false);
    });
  });
})();
`;
