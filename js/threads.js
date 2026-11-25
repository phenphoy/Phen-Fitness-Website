/* Glowing red threads that drift behind a section (the FAQ). The thread nearest the pointer brightens and a click sends
   a pulse of light along them. WebGL2, off when reduced motion is on, paused when off screen, quiet where WebGL2 is
   missing. Add ?threads=0 to the address to turn it off in your browser, ?threads=1 to turn it back on. */
(function () {
  "use strict";
  try {
    var q = location.search.match(/[?&]threads=(\d)/);
    if (q) localStorage.setItem("pf-threads", q[1]);
    if (localStorage.getItem("pf-threads") === "0") return;
  } catch (e) { return; }
  var HOSTS = ["#faq"];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  var VS = "#version 300 es\nvoid main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.-1.,0.,1.); }";
  var FS = "#version 300 es\nprecision highp float; out vec4 o;" +
    "uniform vec2 uRes, uMouse; uniform float uT, uHover; uniform vec3 uClick;" +
    "const int N = 12; const float TAU = 6.28318;" +
    "float hash(float n){ return fract(sin(n*91.345)*47453.5453); }" +
    "float yAt(int i, float x){ float fi = float(i), h = hash(fi+1.);" +
    " float base = 0.14 + 0.72*(fi/float(N-1)) + 0.03*sin(fi*2.3);" +
    " float f = 0.9 + 1.7*h, sp = 0.035 + 0.05*hash(fi+7.), ph = TAU*hash(fi+3.), a = 0.05 + 0.1*hash(fi+5.);" +
    " float env = pow(max(sin(3.14159*x), 0.), 0.7);" +
    " return base + a*env*sin(x*f*TAU + uT*sp*TAU + ph) + 0.45*a*env*sin(x*f*2.6*TAU - uT*sp*TAU*1.7 + ph*2.); }" +
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float asp = uRes.x/uRes.y; vec3 col = vec3(0.);" +
    " vec3 red = vec3(0.83,0.02,0.07), hot = vec3(1.0,0.42,0.46);" +
    " float pulse = uClick.z * exp(-pow((abs(uv.x-uClick.x)*asp - uClick.y*0.85)*5., 2.)) * exp(-uClick.y*1.3);" +
    " for(int i=0;i<N;i++){ float y = yAt(i, uv.x); float d = abs(uv.y - y)*uRes.y;" +
    "  float line = exp(-d*d/3.2) + 0.32*exp(-d/16.) + 0.12*exp(-d/60.);" +
    "  float dm = abs(uMouse.y - yAt(i, uMouse.x))*uRes.y;" +
    "  float near = uHover * exp(-dm/55.) * (0.3 + 0.7*exp(-pow((uv.x-uMouse.x)*asp*1.6, 2.)));" +
    "  float k = 0.3 + near*1.5 + pulse*1.8;" +
    "  col += mix(red, hot, clamp(near*0.9 + pulse, 0., 1.)) * line * k; }" +
    " col = 1.0 - exp(-col*1.05); o = vec4(col, 1.); }";

  function attach(host) {
    var cv = document.createElement("canvas"); cv.className = "threads-canvas"; cv.setAttribute("aria-hidden", "true");
    var gl = cv.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return;
    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var U = {}; ["uRes", "uMouse", "uT", "uHover", "uClick"].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    host.classList.add("has-threads"); host.insertBefore(cv, host.firstChild);

    var W = 0, H = 0, visible = true, running = false, t0 = performance.now(), lastDraw = 0;
    var mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, hov = 0, hovT = 0, click = [0.5, 0, 0], clickAt = -1e9;
    function size() {
      var r = cv.getBoundingClientRect(), s = 0.75;
      W = Math.max(2, Math.round(r.width * s)); H = Math.max(2, Math.round(r.height * s));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      gl.viewport(0, 0, W, H);
    }
    function draw(now) {
      var t = reduce ? 14 : (now - t0) / 1000;
      mx += (tx - mx) * 0.12; my += (ty - my) * 0.12; hov += (hovT - hov) * 0.08;
      var ct = (now - clickAt) / 1000;
      gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uMouse, mx, my); gl.uniform1f(U.uT, t); gl.uniform1f(U.uHover, reduce ? 0 : hov);
      gl.uniform3f(U.uClick, click[0], ct, ct < 3.2 && !reduce ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      if (!running) return;
      requestAnimationFrame(loop);
      if (now - lastDraw < 33) return; lastDraw = now;       /* about 30 frames a second is plenty for slow threads */
      draw(now);
    }
    function start() { if (running || reduce || !visible || document.hidden) return; running = true; requestAnimationFrame(loop); }
    function stop() { running = false; }
    size(); draw(performance.now());
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(host);
    else start();
    if ("ResizeObserver" in window) new ResizeObserver(function () { size(); draw(performance.now()); }).observe(host);
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (visible) start(); });
    if (fine && !reduce) {
      window.addEventListener("pointermove", function (e) {
        var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
        var inside = x >= 0 && x <= 1 && y >= 0 && y <= 1; hovT = inside ? 1 : 0;
        if (inside) { tx = x; ty = y; }
      }, { passive: true });
      window.addEventListener("pointerdown", function (e) {
        if (e.target.closest && e.target.closest("a, button, summary, input, textarea, select")) return;
        var r = cv.getBoundingClientRect(); if (e.clientY < r.top || e.clientY > r.bottom) return;
        click = [(e.clientX - r.left) / r.width, 0, 1]; clickAt = performance.now();
      }, { passive: true });
    }
  }
  function boot() { HOSTS.forEach(function (s) { var h = document.querySelector(s); if (h) attach(h); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
