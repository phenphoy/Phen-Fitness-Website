/* Red ink that follows the cursor: a small real-time fluid simulation on the graphics chip (WebGL2).
   Used on the home hero and the footer. Mouse and trackpad only, off for reduced motion, and it quietly
   does nothing where WebGL2 is missing (the hero then keeps its halftone effect).
   Switched off by default: open the site with ?fluid=1 to try it, ?fluid=0 to turn it off again. */
(function () {
  "use strict";
  try {
    var q = location.search.match(/[?&]fluid=(\d)/);
    if (q) localStorage.setItem("pf-fluid", q[1]);
    if (localStorage.getItem("pf-fluid") !== "1") return;
  } catch (e) { return; }
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches)) return;

  var CFG = { SIM: 96, DYE: 512, DENS_DISS: 1.5, VEL_DISS: 1.1, PRESSURE: 0.8, ITER: 16, CURL: 26, RADIUS: 0.2, FORCE: 5200, INK: 0.26, IDLE: 4200 };
  var PAL = [[0.9, 0.02, 0.06], [1.0, 0.26, 0.3], [1.0, 0.4, 0.18], [0.75, 0.0, 0.12]];

  function makeSim(host, opts) {
    var cv = document.createElement("canvas");
    cv.className = "fluid-canvas"; cv.setAttribute("aria-hidden", "true");
    var gl = cv.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) return null;
    if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) return null;

    var VS = "attribute vec2 aPosition; varying vec2 vUv, vL, vR, vT, vB; uniform vec2 texelSize;" +
      "void main(){ vUv = aPosition*0.5+0.5; vL = vUv - vec2(texelSize.x,0.); vR = vUv + vec2(texelSize.x,0.); vT = vUv + vec2(0.,texelSize.y); vB = vUv - vec2(0.,texelSize.y); gl_Position = vec4(aPosition,0.,1.); }";
    var H = "precision highp float; precision highp sampler2D; varying vec2 vUv, vL, vR, vT, vB; ";
    var FS = {
      clear: H + "uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value * texture2D(uTexture, vUv); }",
      splat: H + "uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;" +
        "void main(){ vec2 p = vUv - point; p.x *= aspectRatio; vec3 s = exp(-dot(p,p)/radius) * color; gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.); }",
      advect: H + "uniform sampler2D uVelocity, uSource; uniform vec2 texelSize; uniform float dt, dissipation;" +
        "void main(){ vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize; vec4 r = texture2D(uSource, coord); gl_FragColor = r / (1. + dissipation * dt); }",
      diverge: H + "uniform sampler2D uVelocity; void main(){ float L = texture2D(uVelocity,vL).x, R = texture2D(uVelocity,vR).x, T = texture2D(uVelocity,vT).y, B = texture2D(uVelocity,vB).y;" +
        "vec2 C = texture2D(uVelocity,vUv).xy; if(vL.x<0.) L=-C.x; if(vR.x>1.) R=-C.x; if(vT.y>1.) T=-C.y; if(vB.y<0.) B=-C.y; gl_FragColor = vec4(0.5*(R-L+T-B),0.,0.,1.); }",
      curl: H + "uniform sampler2D uVelocity; void main(){ float L = texture2D(uVelocity,vL).y, R = texture2D(uVelocity,vR).y, T = texture2D(uVelocity,vT).x, B = texture2D(uVelocity,vB).x; gl_FragColor = vec4(0.5*(R-L-T+B),0.,0.,1.); }",
      vort: H + "uniform sampler2D uVelocity, uCurl; uniform float curl, dt; void main(){ float L = texture2D(uCurl,vL).x, R = texture2D(uCurl,vR).x, T = texture2D(uCurl,vT).x, B = texture2D(uCurl,vB).x, C = texture2D(uCurl,vUv).x;" +
        "vec2 f = 0.5*vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f)+0.0001; f *= curl*C; f.y *= -1.; vec2 v = texture2D(uVelocity,vUv).xy + f*dt; gl_FragColor = vec4(clamp(v,-1000.,1000.),0.,1.); }",
      pressure: H + "uniform sampler2D uPressure, uDivergence; void main(){ float L = texture2D(uPressure,vL).x, R = texture2D(uPressure,vR).x, T = texture2D(uPressure,vT).x, B = texture2D(uPressure,vB).x; float d = texture2D(uDivergence,vUv).x; gl_FragColor = vec4((L+R+B+T-d)*0.25,0.,0.,1.); }",
      grad: H + "uniform sampler2D uPressure, uVelocity; void main(){ float L = texture2D(uPressure,vL).x, R = texture2D(uPressure,vR).x, T = texture2D(uPressure,vT).x, B = texture2D(uPressure,vB).x; vec2 v = texture2D(uVelocity,vUv).xy - vec2(R-L,T-B); gl_FragColor = vec4(v,0.,1.); }",
      show: H + "uniform sampler2D uTexture; void main(){ vec3 c = texture2D(uTexture,vUv).rgb; c = 1.0 - exp(-c * 1.25); gl_FragColor = vec4(c,1.); }"
    };
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var vs = sh(gl.VERTEX_SHADER, VS); if (!vs) return null;
    var P = {};
    for (var k in FS) {
      var fs = sh(gl.FRAGMENT_SHADER, FS[k]); if (!fs) return null;
      var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.bindAttribLocation(pr, 0, "aPosition"); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
      var u = {}, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(pr, i).name; u[nm] = gl.getUniformLocation(pr, nm); }
      P[k] = { p: pr, u: u };
    }
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    function fbo(w, h, filt) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return { t: t, f: f, w: w, h: h, tx: 1 / w, ty: 1 / h };
    }
    function dbl(w, h, filt) {
      var a = fbo(w, h, filt), b = fbo(w, h, filt);
      return { w: w, h: h, tx: a.tx, ty: a.ty, get read() { return a; }, get write() { return b; }, swap: function () { var x = a; a = b; b = x; } };
    }
    function res(r, aspect) { if (aspect < 1) aspect = 1 / aspect; var lo = Math.round(r), hi = Math.round(r * aspect); return aspect >= 1 && cv.width >= cv.height ? [hi, lo] : [lo, hi]; }

    var vel, dye, prs, div, crl, aspect = 1;
    function resize() {
      var r = host.getBoundingClientRect(), w = Math.max(2, Math.round(r.width * 0.6)), h = Math.max(2, Math.round(r.height * 0.6));
      if (cv.width === w && cv.height === h && vel) return;
      cv.width = w; cv.height = h; aspect = w / h;
      var s = res(CFG.SIM, aspect), d = res(CFG.DYE, aspect);
      vel = dbl(s[0], s[1], gl.LINEAR); dye = dbl(d[0], d[1], gl.LINEAR);
      prs = dbl(s[0], s[1], gl.NEAREST); div = fbo(s[0], s[1], gl.NEAREST); crl = fbo(s[0], s[1], gl.NEAREST);
    }
    function use(name) { gl.useProgram(P[name].p); return P[name].u; }
    function tex(u, unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u, unit); }
    function draw(target) {
      if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); }
      else { gl.viewport(0, 0, cv.width, cv.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function ts(u, o) { gl.uniform2f(u.texelSize, o.tx, o.ty); }

    var splats = [];
    function splat(x, y, dx, dy, c) { splats.push([x, y, dx, dy, c]); }
    function applySplat(s) {
      var u = use("splat"), rad = CFG.RADIUS / 100; if (aspect > 1) rad *= aspect;
      ts(u, vel); tex(u.uTarget, 0, vel.read.t); gl.uniform1f(u.aspectRatio, aspect); gl.uniform2f(u.point, s[0], s[1]);
      gl.uniform3f(u.color, s[2], s[3], 0); gl.uniform1f(u.radius, rad); draw(vel.write); vel.swap();
      tex(u.uTarget, 0, dye.read.t); gl.uniform3f(u.color, s[4][0], s[4][1], s[4][2]); draw(dye.write); dye.swap();
    }

    function step(dt) {
      var u;
      for (var i = 0; i < splats.length; i++) applySplat(splats[i]); splats.length = 0;
      u = use("curl"); ts(u, vel); tex(u.uVelocity, 0, vel.read.t); draw(crl);
      u = use("vort"); ts(u, vel); tex(u.uVelocity, 0, vel.read.t); tex(u.uCurl, 1, crl.t); gl.uniform1f(u.curl, CFG.CURL); gl.uniform1f(u.dt, dt); draw(vel.write); vel.swap();
      u = use("diverge"); ts(u, vel); tex(u.uVelocity, 0, vel.read.t); draw(div);
      u = use("clear"); ts(u, vel); tex(u.uTexture, 0, prs.read.t); gl.uniform1f(u.value, CFG.PRESSURE); draw(prs.write); prs.swap();
      u = use("pressure"); ts(u, vel); tex(u.uDivergence, 1, div.t);
      for (var j = 0; j < CFG.ITER; j++) { tex(u.uPressure, 0, prs.read.t); draw(prs.write); prs.swap(); }
      u = use("grad"); ts(u, vel); tex(u.uPressure, 0, prs.read.t); tex(u.uVelocity, 1, vel.read.t); draw(vel.write); vel.swap();
      u = use("advect"); ts(u, vel); tex(u.uVelocity, 0, vel.read.t); tex(u.uSource, 1, vel.read.t); gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, CFG.VEL_DISS); draw(vel.write); vel.swap();
      tex(u.uVelocity, 0, vel.read.t); tex(u.uSource, 1, dye.read.t); gl.uniform1f(u.dissipation, CFG.DENS_DISS); draw(dye.write); dye.swap();
      u = use("show"); ts(u, dye); tex(u.uTexture, 0, dye.read.t); draw(null);
    }

    host.insertBefore(cv, opts.first ? host.firstChild : opts.before || null);
    resize();
    return { cv: cv, step: step, splat: splat, resize: resize, aspect: function () { return aspect; } };
  }

  function attach(host, opts) {
    if (!host) return;
    var sim = makeSim(host, opts);
    if (!sim) return false;
    var running = false, visible = true, last = 0, lastAct = 0, px = null, py = null, lastMove = 0;
    var color = function (k) { var c = PAL[(Math.random() * PAL.length) | 0]; return [c[0] * k, c[1] * k, c[2] * k]; };
    function loop(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000, 0.033) || 0.016; last = now;
      sim.step(dt);
      if (now - lastAct > CFG.IDLE || !visible || document.hidden) { running = false; return; }
      requestAnimationFrame(loop);
    }
    function wake() { lastAct = performance.now(); if (running || !visible) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
    function local(e) { var r = host.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height, ok: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }; }
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var p = local(e);
      if (!p.ok) { px = null; return; }
      if (px !== null) {
        var a = sim.aspect(), dx = (p.x - px) * (a < 1 ? a : 1), dy = (p.y - py) * (a > 1 ? 1 / a : 1);
        if (dx || dy) { sim.splat(p.x, p.y, dx * CFG.FORCE, dy * CFG.FORCE, color(CFG.INK)); wake(); }
      }
      px = p.x; py = p.y;
    }, { passive: true });
    window.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      var p = local(e); if (!p.ok) return;
      for (var i = 0; i < 7; i++) {
        var an = Math.random() * 6.283, f = 900 + Math.random() * 1300;
        sim.splat(p.x + Math.cos(an) * 0.01, p.y + Math.sin(an) * 0.01, Math.cos(an) * f, Math.sin(an) * f, color(CFG.INK * 1.3));
      }
      wake();
    }, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(function () { sim.resize(); wake(); }).observe(host);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host);
    document.addEventListener("visibilitychange", function () { if (!document.hidden && visible) wake(); });
    return true;
  }

  function boot() {
    var hero = document.querySelector(".hero"), footer = document.querySelector(".site-footer");
    if (hero && document.getElementById("heroMedia")) {
      var dust = hero.querySelector(".hero-dust");
      var ok = attach(hero, { before: dust ? dust.nextSibling : hero.firstChild });
      if (ok) { window.__fluidHero = true; hero.classList.add("has-fluid"); }
    }
    if (footer) { footer.classList.add("has-dust"); attach(footer, { first: true }); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
