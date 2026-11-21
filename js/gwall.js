/* Gallery: photos pinned to a sagging line. Drag, swipe, use the arrows or the keys to run the line; the photos swing as it moves. */
(function () {
  "use strict";
  var stage = document.getElementById("gwStage");
  if (!stage) return;
  var cord = document.getElementById("gwCord");
  var titleEl = document.getElementById("gwTitle");
  var subEl = document.getElementById("gwSub");
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
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var src = function (i) { return "images/web/coaching-" + (i + 1) + ".webp"; };
  var seed = function (i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  var canHover = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  var pos = 2, target = 2, moved = false, idle = null, vel = 0, lastPos = pos, t0 = performance.now();
  var down = false, sx = 0, sy = 0, lastX = 0, dragging = false;

  /* the pinned photos */
  var pins = [];
  for (var i = 0; i < N; i++) {
    var el = document.createElement("div"); el.className = "gw-pin";
    var clip = document.createElement("span"); clip.className = "gw-clip"; clip.setAttribute("aria-hidden", "true");
    var btn = document.createElement("button"); btn.type = "button";
    btn.setAttribute("aria-label", "Photo " + (i + 1) + " of " + N + ": " + ALT[i]);
    var img = new Image(); img.src = src(i); img.alt = ALT[i]; img.decoding = "async"; img.draggable = false;
    if (i > 8) img.loading = "lazy";
    btn.appendChild(img); el.appendChild(clip); el.appendChild(btn); stage.appendChild(el);
    pins.push({ el: el, btn: btn, sw: 0, sv: 0, off: false, tilt: (seed(i) - 0.5) * 5, lift: (seed(i + 9) - 0.5) * 14 });
    (function (k) {
      btn.addEventListener("click", function () {
        if (moved) return;
        if (Math.abs(k - pos) < 0.4) openLb(k); else goTo(k);
      });
      el.addEventListener("pointerenter", function (e) { /* a hover nudges the photo into a swing */
        if (reduce || down || e.pointerType === "touch") return;
        pins[k].sv += (Math.random() < 0.5 ? -1 : 1) * (2.6 + Math.random() * 1.4);
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
  var G = { W: 300, H: 400, space: 380, sw: 1200, sh: 700, y0: 150, sag: 90 };
  function lineY(x) { var u = (x - G.sw / 2) / (G.sw / 2); return G.y0 + G.sag * (1 - u * u); }
  function lineAng(x) { var u = (x - G.sw / 2) / (G.sw / 2); return Math.atan(-2 * G.sag * u / (G.sw / 2)) * 180 / Math.PI; }
  function measure() {
    var sw = stage.clientWidth, sh = stage.clientHeight;
    if (!sw || !sh) return;
    var narrow = sw < 640;
    var H = Math.max(220, Math.min(sh * (narrow ? 0.5 : 0.52), 470)), W = H * 0.74;
    if (narrow && W > sw * 0.66) { W = sw * 0.66; H = W / 0.74; }
    G = { W: W, H: H, space: W * (narrow ? 1.18 : 1.22), sw: sw, sh: sh, y0: sh * (narrow ? 0.1 : 0.13), sag: Math.min(110, sh * 0.12) };
    var d = "M-40," + lineY(0).toFixed(1);
    for (var x = -40; x <= sw + 40; x += 24) d += " L" + x + "," + lineY(Math.max(0, Math.min(sw, x))).toFixed(1);
    cord.setAttribute("d", d);
    pins.forEach(function (p) { p.btn.style.width = W + "px"; p.btn.style.height = H + "px"; p.el.style.width = W + "px"; });
  }

  function clamp(v) { return v < 0 ? 0 : v > N - 1 ? N - 1 : v; }
  function goTo(k) { target = clamp(k); }
  function settle() { clearTimeout(idle); idle = setTimeout(function () { target = clamp(Math.round(target)); }, 160); }

  var lastNear = -1;
  function render(now) {
    var t = (now - t0) / 1000;
    vel += ((pos - lastPos) - vel) * 0.25; lastPos = pos;
    var near = Math.round(pos);
    for (var i = 0; i < N; i++) {
      var p = pins[i], d = i - pos, x = G.sw / 2 + d * G.space;
      if (x < -G.W || x > G.sw + G.W) { if (!p.off) { p.el.style.visibility = "hidden"; p.off = true; } continue; }
      if (p.off) { p.el.style.visibility = "visible"; p.off = false; }
      var drive = reduce ? 0 : -vel * G.space * 0.045;                 /* swing follows how fast you drag */
      var tgt = Math.max(-16, Math.min(16, drive)) + (reduce ? 0 : Math.sin(t * 0.9 + i * 1.7) * 0.7);
      p.sv += (tgt - p.sw) * 0.07; p.sv *= 0.9; p.sw += p.sv;
      var ang = lineAng(x) + p.tilt + p.sw, y = lineY(x) + p.lift * 0.4, s = i === near ? 1.06 : 1;
      p.el.style.transform = "translate(" + (x - G.W / 2).toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + ang.toFixed(2) + "deg) scale(" + s + ")";
      p.el.style.zIndex = i === near ? 3 : 1;
      p.el.classList.toggle("is-dim", Math.abs(d) > 1.6);
    }
    if (near !== lastNear) {
      lastNear = near;
      titleEl.textContent = ALT[near];
      subEl.textContent = N + " photos \u00b7 tap to open";
      countEl.textContent = pad(near + 1) + " / " + N;
      prevBtn.disabled = near <= 0; nextBtn.disabled = near >= N - 1;
    }
  }

  var onScreen = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; }).observe(stage);
  function frame(now) {
    var diff = target - pos;
    if (Math.abs(diff) > 0.0004) pos += reduce ? diff : diff * 0.1; else pos = target;
    if (onScreen && !stage.hidden) render(now);
    requestAnimationFrame(frame);
  }

  /* wheel: only sideways swipes run the line, so the page still scrolls normally */
  stage.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return;
    e.preventDefault();
    target = clamp(target + e.deltaX / G.space * 1.1); settle();
  }, { passive: false });

  /* drag / swipe */
  stage.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".gw-cap")) return;
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
    target = clamp(target - st / G.space * 1.3); pos = clamp(pos - st / G.space * 0.8);
  });
  function up() {
    if (!down) return;
    down = false; stage.classList.remove("is-drag");
    if (dragging) { settle(); setTimeout(function () { moved = false; }, 0); } else moved = false;
    dragging = false;
  }
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);

  /* keys and buttons (keys work while the line has focus) */
  prevBtn.addEventListener("click", function () { goTo(Math.round(target) - 1); });
  nextBtn.addEventListener("click", function () { goTo(Math.round(target) + 1); });
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(Math.round(target) - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); goTo(Math.round(target) + 1); }
  });

  /* viewer */
  var cur = 0, lastFocus = null;
  function showLb(k) { cur = (k + N) % N; lbImg.src = src(cur); lbImg.alt = ALT[cur]; lbCount.textContent = pad(cur + 1) + " / " + N; }
  function openLb(k) { lastFocus = document.activeElement; showLb(k); lb.hidden = false; document.getElementById("gwLbClose").focus(); }
  function closeLb() { lb.hidden = true; goTo(cur); if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} } }
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

  /* gallery / list switch */
  function setView(gal) {
    stage.hidden = !gal; listEl.hidden = gal;
    btnWall.setAttribute("aria-pressed", gal); btnList.setAttribute("aria-pressed", !gal);
    if (gal) measure();
  }
  btnWall.addEventListener("click", function () { setView(true); });
  btnList.addEventListener("click", function () { setView(false); });

  if ("ResizeObserver" in window) new ResizeObserver(function () { if (!stage.hidden) measure(); }).observe(stage);
  else window.addEventListener("resize", function () { if (!stage.hidden) measure(); });
  measure(); requestAnimationFrame(frame);
})();
