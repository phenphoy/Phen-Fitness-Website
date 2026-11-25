/* Hero photo: the picture turns into a glowing halftone where the pointer passes, then cools back to the photo.
   Dot size follows the photo's own light and shade, the hottest dots burn white and cool to red, and embers
   break off the cursor. A click or tap sends a ring of heat and a burst of embers. Touch screens get a slow
   scanner that drifts over the photo on its own. Does nothing when reduced motion is on. */
(function () {
  "use strict";
  var frame = document.getElementById("heroMedia"), img = document.getElementById("heroImg");
  if (!frame || !img || !window.HTMLCanvasElement) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  var cv = document.createElement("canvas");
  cv.className = "hero-fx"; cv.setAttribute("aria-hidden", "true");
  var seal = document.getElementById("heroSeal");
  frame.insertBefore(cv, seal || null);
  var ctx = cv.getContext("2d");
  if (!ctx) return;

  var W = 0, H = 0, dpr = 1, cell = 8, cols = 0, rows = 0, heat = null, lum = null, ready = false;
  var embers = [], running = false, visible = true, live = false, lastT = 0;
  var px = -1e4, py = -1e4, hasPtr = false, scan = null, nextScan = 0;
  var EMBER = ["255,77,87", "255,106,76", "255,138,92", "255,196,160", "225,6,19"];

  function sample() {
    /* read the photo's light and shade onto the grid, mapped the same way object-fit: cover places it */
    lum = new Float32Array(cols * rows).fill(0.7);
    var nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return;
    try {
      var bx = img.offsetLeft, by = img.offsetTop, bw = img.offsetWidth, bh = img.offsetHeight;
      var op = (getComputedStyle(img).objectPosition || "50% 50%").split(" ");
      var ox = parseFloat(op[0]) / 100, oy = parseFloat(op[1] || "50") / 100;
      if (isNaN(ox)) ox = 0.5; if (isNaN(oy)) oy = 0.5;
      var s = Math.max(bw / nw, bh / nh), dw = nw * s, dh = nh * s;
      var dx = bx + (bw - dw) * ox, dy = by + (bh - dh) * oy;
      var oc = document.createElement("canvas"); oc.width = cols; oc.height = rows;
      var o = oc.getContext("2d", { willReadFrequently: true });
      o.fillStyle = "#000"; o.fillRect(0, 0, cols, rows);
      o.save(); o.beginPath(); o.rect(bx / cell, by / cell, bw / cell, bh / cell); o.clip();
      o.drawImage(img, dx / cell, dy / cell, dw / cell, dh / cell);
      o.restore();
      var d = o.getImageData(0, 0, cols, rows).data;
      for (var i = 0; i < cols * rows; i++) {
        var l = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
        lum[i] = 0.3 + 0.7 * Math.pow(l, 0.75);
      }
    } catch (e) { /* the photo could not be read: keep an even dot size */ }
  }

  function build() {
    var r = { w: frame.offsetWidth, h: frame.offsetHeight };
    if (!r.w || !r.h) return;
    W = r.w; H = r.h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = W > 700 ? 9 : 7;
    cols = Math.ceil(W / cell); rows = Math.ceil(H / cell);
    heat = new Float32Array(cols * rows);
    sample(); ready = true;
  }

  function stamp(x, y, R, k) {
    var c0 = Math.max(0, Math.floor((x - R) / cell)), c1 = Math.min(cols - 1, Math.ceil((x + R) / cell));
    var r0 = Math.max(0, Math.floor((y - R) / cell)), r1 = Math.min(rows - 1, Math.ceil((y + R) / cell));
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        var ddx = (c + 0.5) * cell - x, ddy = (r + 0.5) * cell - y, d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d > R) continue;
        var h = Math.pow(1 - d / R, 0.9) * k, i = r * cols + c;
        if (h > heat[i]) heat[i] = h;
      }
    }
  }
  function ring(x, y, R, k) {
    var band = cell * 3.2, c0 = Math.max(0, Math.floor((x - R - band) / cell)), c1 = Math.min(cols - 1, Math.ceil((x + R + band) / cell));
    var r0 = Math.max(0, Math.floor((y - R - band) / cell)), r1 = Math.min(rows - 1, Math.ceil((y + R + band) / cell));
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        var ddx = (c + 0.5) * cell - x, ddy = (r + 0.5) * cell - y, d = Math.abs(Math.sqrt(ddx * ddx + ddy * ddy) - R);
        if (d > band) continue;
        var h = (1 - d / band) * k, i = r * cols + c;
        if (h > heat[i]) heat[i] = h;
      }
    }
  }
  function shed(x, y, vx, vy, n) {
    for (var i = 0; i < n && embers.length < 280; i++) {
      var a = Math.random() * 6.283, sp = 0.3 + Math.random() * 1.1;
      embers.push({ x: x + (Math.random() - 0.5) * 18, y: y + (Math.random() - 0.5) * 18,
        vx: -vx * 0.04 + Math.cos(a) * sp, vy: -vy * 0.04 + Math.sin(a) * sp - 0.25,
        life: 0, max: 0.9 + Math.random() * 1.1, s: Math.random() < 0.2 ? 2.4 : 1 + Math.random() * 1.2,
        c: EMBER[(Math.random() * EMBER.length) | 0] });
    }
  }

  function trail(x0, y0, x1, y1, R, k) {
    var dx = x1 - x0, dy = y1 - y0, dist = Math.sqrt(dx * dx + dy * dy), steps = Math.max(1, Math.ceil(dist / (cell * 2)));
    for (var s = 1; s <= steps; s++) stamp(x0 + dx * s / steps, y0 + dy * s / steps, R, k);
  }

  function frameDraw(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    ctx.clearRect(0, 0, W, H);
    var decay = Math.pow(0.962, dt * 60), any = false;

    /* touch screens: a slow scanner drifts over the photo now and then */
    if (!fine && live && visible) {
      if (!scan && now > nextScan) scan = { t: 0, ph: Math.random() * 6.28 };
      if (scan) {
        scan.t += dt;
        var u = scan.t / 3.4;
        if (u >= 1) { scan = null; nextScan = now + 6500 + Math.random() * 3500; }
        else {
          var sx = W * (0.15 + 0.7 * u), sy = H * (0.34 + 0.2 * Math.sin(u * 5 + scan.ph));
          stamp(sx, sy, 62, 0.8 * Math.sin(u * Math.PI)); if (Math.random() < 0.5) shed(sx, sy, 0, 0, 1);
        }
      }
    }

    var half = cell * 0.5;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var i = r * cols + c, h = heat[i];
        if (h < 0.02) { heat[i] = 0; continue; }
        any = true;
        var x = c * cell, y = r * cell;
        /* the photo dims under the halftone so the dots read on bright areas too */
        ctx.fillStyle = "rgba(8,8,10," + (Math.min(1, h * 1.4) * 0.55).toFixed(3) + ")";
        ctx.fillRect(x, y, cell, cell);
        var rad = Math.min(half * 1.0, half * (0.5 + 0.75 * lum[i]) * Math.min(1, h * 1.5) + 0.3);
        var hot = Math.max(0, (h - 0.55) / 0.45);               /* hottest dots burn white, the rest cool to red */
        var gr = (77 + 160 * hot) | 0, bl = (87 + 150 * hot) | 0;
        ctx.fillStyle = "rgba(255," + gr + "," + bl + "," + Math.min(1, h * 1.25).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(x + half, y + half, rad, 0, 6.2832); ctx.fill();
        heat[i] = h * decay;
      }
    }

    for (var e = embers.length - 1; e >= 0; e--) {
      var p = embers[e]; p.life += dt;
      if (p.life >= p.max) { embers.splice(e, 1); continue; }
      any = true;
      p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.vy = p.vy * 0.985 - 0.004;
      var a = (1 - p.life / p.max); a *= a;
      ctx.fillStyle = "rgba(" + p.c + "," + a.toFixed(3) + ")";
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }

    if ((any || scan) && visible && !document.hidden) requestAnimationFrame(frameDraw);
    else { running = false; if (!fine && live) setTimeout(wake, Math.max(300, nextScan - performance.now())); }
  }
  function wake() { if (running || !ready) return; running = true; lastT = performance.now(); requestAnimationFrame(frameDraw); }

  /* pointer: the effect follows the cursor across the photo, even under the headline */
  var R = function () { return W > 700 ? 120 : 84; };
  window.addEventListener("pointermove", function (e) {
    if (!live || !ready || e.pointerType === "touch" || (fine && window.__fluidHero)) return;
    var b = frame.getBoundingClientRect(), sc = b.width / (W || 1) || 1;
    var x = (e.clientX - b.left) / sc, y = (e.clientY - b.top) / sc;
    var inside = x >= 0 && y >= 0 && x <= W && y <= H;
    if (!inside) { hasPtr = false; return; }
    var dx = hasPtr ? x - px : 0, dy = hasPtr ? y - py : 0, sp = Math.sqrt(dx * dx + dy * dy);
    if (hasPtr) trail(px, py, x, y, R(), Math.min(1, 0.8 + sp * 0.02)); else stamp(x, y, R(), 0.8);
    if (sp > 4) shed(x, y, dx, dy, Math.min(4, 1 + (sp / 9) | 0));
    px = x; py = y; hasPtr = true; wake();
  }, { passive: true });
  frame.addEventListener("pointerleave", function () { hasPtr = false; });

  /* click or tap: a ring of heat spreads out and embers burst */
  frame.addEventListener("pointerdown", function (e) {
    if (!live || !ready || e.target.closest("a") || (fine && window.__fluidHero)) return;
    var b = frame.getBoundingClientRect(), sc = b.width / (W || 1) || 1;
    var x = (e.clientX - b.left) / sc, y = (e.clientY - b.top) / sc;
    stamp(x, y, R() * 0.8, 1); shed(x, y, 0, 0, 36);
    var t0 = performance.now(), maxR = R() * 2.6;
    (function pulse(now) {
      var u = (now - t0) / 700; if (u >= 1) return;
      ring(x, y, maxR * (1 - Math.pow(1 - u, 2)), 0.9 * (1 - u)); wake(); requestAnimationFrame(pulse);
    })(t0);
    wake();
  });

  /* start once the picture has loaded and the intro has played; stay idle while the hero is off screen */
  function boot() { build(); setTimeout(function () { live = true; nextScan = performance.now() + 2500; wake(); }, 2600); }
  if (img.complete && img.naturalWidth) boot(); else img.addEventListener("load", boot, { once: true });
  if ("ResizeObserver" in window) {
    var rz; new ResizeObserver(function () { clearTimeout(rz); rz = setTimeout(function () { if (ready) { build(); } }, 150); }).observe(frame);
  }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && live) wake(); }).observe(frame);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && visible && live) wake(); });
})();
