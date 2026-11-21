/* Gallery wall: the coaching photos hang on one curved wall. Drag, swipe, use the arrows or the keys to walk along it. */
(function () {
  "use strict";
  var stage = document.getElementById("gwStage");
  if (!stage) return;
  var ring = document.getElementById("gwRing");
  var countEl = document.getElementById("gwCount");
  var prevBtn = document.getElementById("gwPrev");
  var nextBtn = document.getElementById("gwNext");
  var listEl = document.getElementById("gwListEl");
  var grid = document.getElementById("gwGrid");
  var btnWall = document.getElementById("gwWall");
  var btnList = document.getElementById("gwList");
  var lb = document.getElementById("gwLb");
  var lbImg = document.getElementById("gwLbImg");
  var lbCount = document.getElementById("gwLbCount");

  var ALT = ["Resistance & form coaching", "1-on-1 deadlift mechanics", "Core stabilization & posture", "Upper body hypertrophy", "Dumbbell press technique", "Barbell squat calibration", "Functional core engagement", "Small-group team motivation", "Cable row biomechanics", "Focused athletic instruction", "Progressive overload tracking", "Joint mobility & warmup", "Core rotation & balance", "Strength calibration check", "Conditioning & stamina", "Precision movement coaching", "Power & muscular endurance", "Functional kinetic movement", "Posture & shoulder alignment", "Consistency & results", "Lat pulldown technique", "Barbell setup & stance", "Deadlift hip hinge", "Barbell hip thrust", "Squat rack coaching", "Hamstring curl form", "Glute bridge with dumbbells", "Deadlift pull position", "Lockout & standing posture", "Incline press machine"];
  var N = ALT.length;
  var RATIO = 577 / 908;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var src = function (i) { return "images/web/coaching-" + (i + 1) + ".webp"; };

  /* build the wall */
  var slots = [];
  var pos = 2, target = 2, dirty = true, moved = false, idle = null;
  for (var i = 0; i < N; i++) {
    var slot = document.createElement("div"); slot.className = "gw-slot";
    var panel = document.createElement("div"); panel.className = "gw-panel";
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "gw-photo";
    btn.setAttribute("aria-label", "Photo " + (i + 1) + " of " + N + ": " + ALT[i]);
    var img = new Image(); img.src = src(i); img.alt = ALT[i]; img.decoding = "async"; img.draggable = false;
    if (i > 8) img.loading = "lazy";
    btn.appendChild(img);
    var tick = document.createElement("div"); tick.className = "gw-tick"; tick.setAttribute("aria-hidden", "true"); tick.textContent = pad(i + 1);
    panel.appendChild(btn); panel.appendChild(tick); slot.appendChild(panel); ring.appendChild(slot);
    slots.push({ slot: slot, panel: panel, btn: btn, hidden: false });
    if (window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce) {
      btn.addEventListener("pointermove", function (e) {
        if (down) return;
        var r = this.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        this.style.setProperty("--ry", (px * 9).toFixed(2) + "deg"); this.style.setProperty("--rx", (-py * 9).toFixed(2) + "deg");
      });
      btn.addEventListener("pointerleave", function () { this.style.setProperty("--ry", "0deg"); this.style.setProperty("--rx", "0deg"); });
    }
    (function (k) {
      btn.addEventListener("click", function () {
        if (moved) return;
        if (Math.abs(k - pos) < 0.35) openLb(k); else goTo(k);
      });
    })(i);
  }

  /* list view */
  for (var j = 0; j < N; j++) {
    var b = document.createElement("button"); b.type = "button";
    b.setAttribute("aria-label", "Open photo " + (j + 1) + ": " + ALT[j]);
    b.innerHTML = '<img loading="lazy" decoding="async" src="' + src(j) + '" alt=""><span>' + pad(j + 1) + "</span>";
    (function (k) { b.addEventListener("click", function () { openLb(k); }); })(j);
    grid.appendChild(b);
  }

  /* geometry */
  var G = { R: 1000, step: 0.3, space: 300 };
  function measure() {
    var sw = stage.clientWidth, sh = stage.clientHeight;
    if (!sw || !sh) return;
    var narrow = sw < 640;
    var H = Math.max(230, Math.min(sh * (narrow ? 0.54 : 0.5), 520));
    var W = H * RATIO;
    if (narrow && W > sw * 0.62) { W = sw * 0.62; H = W / RATIO; }
    var space = W * (narrow ? 1.22 : 1.2);
    var R = Math.max(narrow ? 560 : 760, sw * (narrow ? 1.0 : 0.72));
    var persp = R * 0.9;
    G = { R: R, step: space / R, space: space };
    stage.style.setProperty("--gw-persp", persp + "px");
    stage.style.setProperty("--gw-ph", H + "px");
    slots.forEach(function (s) {
      s.panel.style.width = (space + 3) + "px";
      s.panel.style.height = (H * 1.95) + "px";
      s.btn.style.width = W + "px";
      s.btn.style.height = H + "px";
    });
    ring.style.transform = "translateZ(" + R + "px)";
    dirty = true;
  }

  function clamp(v) { return v < 0 ? 0 : v > N - 1 ? N - 1 : v; }
  function goTo(k) { target = clamp(k); dirty = true; }
  function settle() { clearTimeout(idle); idle = setTimeout(function () { target = clamp(Math.round(target)); dirty = true; }, 160); }

  function render() {
    var vis = Math.min(5, Math.ceil(Math.PI / 2.8 / G.step) + 1);
    for (var i = 0; i < N; i++) {
      var d = i - pos, s = slots[i];
      if (Math.abs(d) > vis) {
        if (!s.hidden) { s.slot.style.visibility = "hidden"; s.hidden = true; }
        continue;
      }
      if (s.hidden) { s.slot.style.visibility = "visible"; s.hidden = false; }
      var th = -d * G.step * 180 / Math.PI;
      s.slot.style.transform = "rotateY(" + th.toFixed(3) + "deg) translateZ(" + (-G.R) + "px)";
      var a = Math.min(1, Math.abs(d) / 3.4);
      s.panel.style.setProperty("--gw-shade", (a * a * 0.7).toFixed(3));
    }
    countEl.textContent = pad(Math.round(pos) + 1) + " / " + N;
    prevBtn.disabled = target <= 0;
    nextBtn.disabled = target >= N - 1;
  }

  var onScreen = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; if (onScreen) dirty = true; }).observe(stage);
  }
  function frame() {
    if (onScreen && !stage.hidden) {
      var diff = target - pos;
      if (Math.abs(diff) > 0.0004) { pos += reduce ? diff : diff * 0.11; dirty = true; }
      else if (pos !== target) { pos = target; dirty = true; }
      if (dirty) { render(); dirty = false; }
    }
    requestAnimationFrame(frame);
  }

  /* wheel: only sideways swipes walk the wall, so the page still scrolls normally */
  stage.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return;
    e.preventDefault();
    target = clamp(target + e.deltaX / G.space * 1.1); dirty = true; settle();
  }, { passive: false });

  /* drag / swipe */
  var down = false, sx = 0, sy = 0, lastX = 0, dragging = false;
  stage.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".gw-hud")) return;
    down = true; moved = false; dragging = false; sx = lastX = e.clientX; sy = e.clientY; clearTimeout(idle);
  });
  window.addEventListener("pointermove", function (e) {
    if (!down) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (!dragging) {
      if (Math.abs(dx) < 7) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.4 && e.pointerType === "touch") { down = false; return; }
      dragging = true; moved = true; stage.classList.add("is-drag");
    }
    var st = e.clientX - lastX; lastX = e.clientX;
    target = clamp(target - st / G.space * 1.25);
    pos = clamp(pos - st / G.space * 0.75);
    dirty = true;
  });
  function up() {
    if (!down) return;
    down = false; stage.classList.remove("is-drag");
    if (dragging) { settle(); setTimeout(function () { moved = false; }, 0); } else moved = false;
    dragging = false;
  }
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);

  /* keys and buttons (keys work while the wall has focus) */
  prevBtn.addEventListener("click", function () { goTo(Math.round(target) - 1); });
  nextBtn.addEventListener("click", function () { goTo(Math.round(target) + 1); });
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(Math.round(target) - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); goTo(Math.round(target) + 1); }
  });

  /* viewer */
  var cur = 0, lastFocus = null;
  function showLb(k) {
    cur = (k + N) % N;
    lbImg.src = src(cur); lbImg.alt = ALT[cur];
    lbCount.textContent = pad(cur + 1) + " / " + N;
  }
  function openLb(k) {
    lastFocus = document.activeElement; showLb(k); lb.hidden = false;
    document.getElementById("gwLbClose").focus();
  }
  function closeLb() {
    lb.hidden = true; goTo(cur);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  document.getElementById("gwLbClose").addEventListener("click", closeLb);
  document.getElementById("gwLbPrev").addEventListener("click", function () { showLb(cur - 1); });
  document.getElementById("gwLbNext").addEventListener("click", function () { showLb(cur + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  lb.addEventListener("wheel", function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowLeft") showLb(cur - 1);
    else if (e.key === "ArrowRight") showLb(cur + 1);
  });

  /* wall / list switch */
  function setView(wall) {
    stage.hidden = !wall; listEl.hidden = wall;
    btnWall.setAttribute("aria-pressed", wall); btnList.setAttribute("aria-pressed", !wall);
    if (wall) measure();
  }
  btnWall.addEventListener("click", function () { setView(true); });
  btnList.addEventListener("click", function () { setView(false); });

  if ("ResizeObserver" in window) new ResizeObserver(function () { if (!stage.hidden) measure(); }).observe(stage);
  else window.addEventListener("resize", function () { if (!stage.hidden) measure(); });
  measure(); render(); requestAnimationFrame(frame);
})();
