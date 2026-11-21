/* Free dropdown in the desktop nav: opens on hover, click or keyboard; closes on Esc, outside click or leaving. */
(function () {
  var btn = document.getElementById("navFreeBtn"), menu = document.getElementById("navFreeMenu");
  if (!btn || !menu) return;
  var items = Array.prototype.slice.call(menu.querySelectorAll("a"));
  var timer = 0;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function open() { clearTimeout(timer); btn.setAttribute("aria-expanded", "true"); menu.classList.add("open"); }
  function close(focusBtn) { clearTimeout(timer); btn.setAttribute("aria-expanded", "false"); menu.classList.remove("open"); if (focusBtn) btn.focus(); }
  function later() { clearTimeout(timer); timer = setTimeout(function () { close(false); }, 180); }
  btn.addEventListener("click", function () { if (fine) { open(); return; } btn.getAttribute("aria-expanded") === "true" ? close(false) : open(); }); /* with a mouse the hover has already opened it, so a click keeps it open */
  if (fine) {
    [btn, menu].forEach(function (el) { el.addEventListener("mouseenter", open); el.addEventListener("mouseleave", later); });
  }
  btn.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { if (e.key === "ArrowDown") { e.preventDefault(); open(); items[0].focus(); } }
    if (e.key === "Escape") close(false);
  });
  menu.addEventListener("keydown", function (e) {
    var i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); close(true); }
    else if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); items[(i + items.length - 1) % items.length].focus(); }
  });
  document.addEventListener("click", function (e) { if (!menu.contains(e.target) && !btn.contains(e.target)) close(false); });
  document.addEventListener("focusin", function (e) { if (menu.classList.contains("open") && !menu.contains(e.target) && !btn.contains(e.target)) close(false); });
  window.addEventListener("scroll", function () { if (menu.classList.contains("open") && fine === false) close(false); }, { passive: true });
  menu.addEventListener("click", function () { close(false); });
})();
