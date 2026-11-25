/* The two desktop dropdowns (About, Free): open on hover, click or keyboard; close on Esc, outside click or leaving. */
(function () {
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var set = [];
  function setup(btnId, menuId) {
    var btn = document.getElementById(btnId), menu = document.getElementById(menuId);
    if (!btn || !menu) return;
    var items = Array.prototype.slice.call(menu.querySelectorAll("a")), timer = 0;
    var api = { btn: btn, menu: menu };
    function place() { /* small menus sit under their own button */
      if (!menu.classList.contains("sm")) return;
      var host = menu.offsetParent || document.body, hr = host.getBoundingClientRect(), br = btn.getBoundingClientRect(), half = menu.offsetWidth / 2;
      menu.style.left = Math.max(half + 12, Math.min(hr.width - half - 12, br.left + br.width / 2 - hr.left)) + "px";
    }
    function open() { set.forEach(function (o) { if (o !== api) o.close(false); }); clearTimeout(timer); place(); btn.setAttribute("aria-expanded", "true"); menu.classList.add("open"); }
    function close(focusBtn) { clearTimeout(timer); btn.setAttribute("aria-expanded", "false"); menu.classList.remove("open"); if (focusBtn) btn.focus(); }
    function later() { clearTimeout(timer); timer = setTimeout(function () { close(false); }, 180); }
    api.close = close; set.push(api);
    btn.addEventListener("click", function () { if (fine) { open(); return; } btn.getAttribute("aria-expanded") === "true" ? close(false) : open(); }); /* with a mouse the hover has already opened it, so a click keeps it open */
    if (fine) [btn, menu].forEach(function (el) { el.addEventListener("mouseenter", open); el.addEventListener("mouseleave", later); });
    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); open(); items[0].focus(); }
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
    window.addEventListener("resize", function () { if (menu.classList.contains("open")) place(); });
    menu.addEventListener("click", function () { close(false); });
  }
  setup("navAboutBtn", "navAboutMenu");
  setup("navFreeBtn", "navFreeMenu");
})();
