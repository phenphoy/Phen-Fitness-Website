/* Phen Fitness — page behaviour and motion.
   Everything on the page works without this file's animations: if the
   animation libraries fail to load, or the visitor has "reduce motion"
   turned on, the page stays fully visible and usable. */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduce;
  if (!motion) document.body.classList.add("no-motion");

  let lenis = null;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Gallery ---------- */
  const captions = ["Resistance & form coaching", "1-on-1 deadlift mechanics", "Core stabilization & posture", "Upper body hypertrophy", "Dumbbell press technique", "Barbell squat calibration", "Functional core engagement", "Small-group team motivation", "Cable row biomechanics", "Focused athletic instruction", "Progressive overload tracking", "Joint mobility & warmup", "Core rotation & balance", "Strength calibration check", "Conditioning & stamina", "Precision movement coaching", "Power & muscular endurance", "Functional kinetic movement", "Posture & shoulder alignment", "Consistency & results"];
  function fillRow(el, ids) {
    const make = (i, dup) => {
      const f = document.createElement("figure");
      f.className = "g-item";
      f.style.margin = "0";
      if (dup) f.setAttribute("aria-hidden", "true");
      f.innerHTML = '<img decoding="async" src="images/web/coaching-' + i + '.webp" alt="' + (dup ? "" : captions[i - 1]) + '"><figcaption>' + captions[i - 1] + "</figcaption>";
      return f;
    };
    ids.forEach(i => el.appendChild(make(i, false)));
    ids.forEach(i => el.appendChild(make(i, true)));
  }
  const row1 = $("#gRow1"), row2 = $("#gRow2");
  fillRow(row1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  fillRow(row2, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

  /* ---------- Testimonial words ---------- */
  const quote = $("#quote");
  quote.innerHTML = quote.textContent.trim().split(/\s+/).map(w => '<span class="w">' + w + "</span>").join(" ");

  /* ---------- Before / after slider ---------- */
  const ba = $("#ba"), baRange = $("#baRange");
  const setPos = v => ba.style.setProperty("--pos", v + "%");
  baRange.addEventListener("input", () => setPos(baRange.value));

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const onScrollNav = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- Phone menu ---------- */
  const menuBtn = $("#menuBtn"), mobileMenu = $("#mobileMenu");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  mobileMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false); });

  /* ---------- Service buttons pre-select the booking form ---------- */
  $$("[data-book]").forEach(a => a.addEventListener("click", () => {
    if (window.PhenBooking) window.PhenBooking.selectService(+a.dataset.book);
    closeAssess();
  }));

  /* ---------- Card glow + tilt ---------- */
  function tilt(el, max) {
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", x * 100 + "%");
      el.style.setProperty("--my", y * 100 + "%");
      el.style.setProperty("--hx", (100 - x * 100) + "%");
      el.style.setProperty("--hy", (100 - y * 100) + "%");
      if (!reduce && fine) el.style.transform = "perspective(900px) rotateX(" + ((0.5 - y) * max) + "deg) rotateY(" + ((x - 0.5) * max * 1.2) + "deg)";
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  }
  $$(".tilt").forEach(c => tilt(c, 8));
  const certs = $$(".cert");
  certs.forEach(c => tilt(c, 10));

  /* ---------- Dialog helpers (focus stays inside while open) ---------- */
  function trapTab(e, box) {
    if (e.key !== "Tab") return;
    const f = Array.from(box.querySelectorAll("a[href], button:not([disabled])"));
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Assessment details ---------- */
  const assess = $("#assessModal");
  let assessReturn = null;
  function openAssess() {
    assessReturn = document.activeElement;
    assess.hidden = false;
    if (lenis) lenis.stop();
    $("#assessClose").focus();
    if (motion) gsap.fromTo(assess.querySelector(".modal-box"), { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" });
  }
  function closeAssess() {
    if (assess.hidden) return;
    assess.hidden = true;
    if (lenis) lenis.start();
    if (assessReturn) assessReturn.focus();
  }
  $("#assessBtn").addEventListener("click", openAssess);
  $("#assessClose").addEventListener("click", closeAssess);
  assess.addEventListener("click", e => { if (e.target === assess) closeAssess(); });
  assess.addEventListener("keydown", e => { if (e.key === "Escape") closeAssess(); trapTab(e, assess); });

  /* ---------- Certificate viewer ---------- */
  const lb = $("#lb"), lbImg = $("#lbImg");
  let cur = 0, lbReturn = null;
  function fillCert(i) {
    cur = (i + certs.length) % certs.length;
    const c = certs[cur], img = c.querySelector("img");
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    $("#lbTitle").textContent = c.querySelector("b").textContent;
    $("#lbIssuer").textContent = c.querySelector("small").textContent;
    $("#lbCount").textContent = (cur + 1) + " / " + certs.length;
  }
  function openCert(i) {
    lbReturn = document.activeElement;
    fillCert(i);
    lb.hidden = false;
    if (lenis) lenis.stop();
    $("#lbClose").focus();
    if (!motion) return;
    const from = certs[cur].querySelector("img").getBoundingClientRect();
    const run = () => {
      const to = lbImg.getBoundingClientRect();
      if (!to.width) return;
      gsap.fromTo(lbImg,
        { x: from.left + from.width / 2 - (to.left + to.width / 2), y: from.top + from.height / 2 - (to.top + to.height / 2), scale: from.width / to.width, rotate: -4 },
        { x: 0, y: 0, scale: 1, rotate: 0, duration: 0.75, ease: "expo.out" });
    };
    gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    lbImg.complete ? run() : lbImg.addEventListener("load", run, { once: true });
  }
  function closeCert() {
    const done = () => { lb.hidden = true; if (lenis) lenis.start(); if (lbReturn) lbReturn.focus(); };
    if (motion) gsap.to(lb, { opacity: 0, duration: 0.25, onComplete: done }); else done();
  }
  function stepCert(d) {
    if (!motion) return fillCert(cur + d);
    gsap.to(lbImg, { x: -40 * d, opacity: 0, duration: 0.18, ease: "power2.in", onComplete: () => {
      fillCert(cur + d);
      gsap.fromTo(lbImg, { x: 40 * d, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
    } });
  }
  certs.forEach((c, i) => c.addEventListener("click", () => openCert(i)));
  $("#lbClose").addEventListener("click", closeCert);
  $("#lbPrev").addEventListener("click", () => stepCert(-1));
  $("#lbNext").addEventListener("click", () => stepCert(1));
  lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb-stage")) closeCert(); });
  lb.addEventListener("keydown", e => {
    if (e.key === "Escape") closeCert();
    if (e.key === "ArrowRight") stepCert(1);
    if (e.key === "ArrowLeft") stepCert(-1);
    trapTab(e, lb);
  });
  let touchX = null;
  lb.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) stepCert(dx < 0 ? 1 : -1);
    touchX = null;
  });

  if (!motion) {
    $$(".quote .w").forEach(w => w.style.opacity = 1);
    return;
  }

  /* =========================================================
     MOTION (only runs with the animation libraries loaded)
     ========================================================= */
  gsap.registerPlugin(ScrollTrigger);

  /* Smooth scrolling */
  let velocity = 0;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", e => { velocity = e.velocity; ScrollTrigger.update(); onScrollNav(); });
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    let last = window.scrollY;
    window.addEventListener("scroll", () => { velocity = window.scrollY - last; last = window.scrollY; }, { passive: true });
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    const target = id === "#top" ? 0 : document.querySelector(id);
    if (target === null || !lenis) return;
    e.preventDefault();
    // wait a frame so a closing menu or dialog has released the scroll lock
    requestAnimationFrame(() => lenis.scrollTo(target, { offset: -70, duration: 1.4 }));
  }));

  /* ---------- Opening: full sequence on a first visit, quick one after ---------- */
  const heroLines = $$(".hero .line > span");
  const firstVisit = !storage.get("pf-visited");
  storage.set("pf-visited", "1");
  const loader = $("#loader");
  const tl = gsap.timeline();
  gsap.set("#nav .brand-icon", { scale: 0, rotate: -180 });
  gsap.set("#nav .wm-l", { yPercent: 100, opacity: 0 });
  gsap.set("#heroSeal", { opacity: 0, y: 30, scale: 0.8 });
  let t0 = 0.1;
  if (firstVisit) {
    gsap.set(heroLines, { yPercent: 110 });
    gsap.set(".hero-fade", { opacity: 0, y: 24 });
    gsap.set("#heroMedia", { clipPath: "inset(100% 0 0 0)" });
    gsap.set("#heroImg", { scale: 1.25 });
    const ecg = $("#ecgPath"), len = ecg.getTotalLength(), counter = { v: 0 };
    gsap.set("#ldIcon", { scale: 0, rotate: -140 });
    gsap.set(ecg, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(".wm-loader .wm-l", { yPercent: 120, opacity: 0 });
    // badge spins in, heartbeat line draws, badge pulses on the spike, letters rise
    tl.to("#ldIcon", { scale: 1, rotate: 0, duration: 0.8, ease: "back.out(1.6)" })
      .to(counter, { v: 100, duration: 1.7, ease: "power1.inOut", onUpdate: () => {
          $("#loaderNum").textContent = Math.round(counter.v);
          $("#loaderBar").style.transform = "scaleX(" + counter.v / 100 + ")";
        } }, 0)
      .to(ecg, { strokeDashoffset: 0, duration: 1, ease: "power1.inOut" }, 0.45)
      .to("#ldIcon", { keyframes: [
          { scale: 1.14, boxShadow: "0 0 0 14px rgba(255,22,22,.25)", duration: 0.12 },
          { scale: 1, boxShadow: "0 0 0 24px rgba(255,22,22,0)", duration: 0.2 },
          { scale: 1.08, duration: 0.1 },
          { scale: 1, duration: 0.25 }
        ] }, 0.9)
      .to(".wm-loader .wm-l", { yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.04 }, 0.95)
      .to(loader, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, 1.9)
      .set(loader, { display: "none" });
    t0 = 2.35;
    tl.to(heroLines, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.09 }, t0 + 0.1)
      .to("#heroMedia", { clipPath: "inset(0% 0 0 0)", duration: 1.3, ease: "expo.inOut" }, t0 + 0.1)
      .to("#heroImg", { scale: 1, duration: 1.8, ease: "expo.out" }, t0 + 0.1)
      .to(".hero-fade", { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }, t0 + 0.55);
  } else {
    // returning visitor: skip the loader, keep the hero as it is, just bring in the logo and seal
    loader.style.display = "none";
    t0 = 0.05;
  }
  tl.to("#nav .brand-icon", { scale: 1, rotate: 0, duration: 0.9, ease: "back.out(1.7)" }, t0)
    .to("#nav .wm-l", { yPercent: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.035 }, t0 + 0.1)
    // EREPS coin drops in and flips
    .to("#heroSeal", { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.8)" }, firstVisit ? t0 + 0.85 : t0 + 0.2)
    .fromTo("#heroSeal .seal-coin", { rotateY: -720, scale: 0.4 }, { rotateY: 0, scale: 1, duration: 1.4, ease: "expo.out", clearProps: "transform" }, "<0.1")
    .fromTo("#heroSeal .seal-shock", { opacity: 0.9, scale: 0.9 }, { opacity: 0, scale: 1.9, duration: 0.9, ease: "power2.out" }, "<0.8")
    .set("#nav .wm-l, #nav .brand-icon", { clearProps: "transform,opacity" });

  /* ---------- Parallax ---------- */
  gsap.to("#heroImg", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.fromTo("#storyImg", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: "#story", start: "top bottom", end: "bottom top", scrub: true } });

  /* ---------- Reveals ---------- */
  $$(".split").forEach(h => {
    if (h.closest(".hero")) return;
    gsap.from(h.querySelectorAll(".line > span"), { yPercent: 110, duration: 1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: h, start: "top 85%" } });
  });
  ScrollTrigger.batch(".reveal", {
    start: "top 88%",
    once: true,
    onEnter: els => gsap.from(els, { opacity: 0, y: 40, duration: 0.9, ease: "power3.out", stagger: 0.08 })
  });
  $$(".reveal-img").forEach(el => {
    gsap.from(el, { clipPath: "inset(0 0 100% 0)", duration: 1.3, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 80%" } });
  });

  /* ---------- Count-up numbers ---------- */
  $$(".count").forEach(c => {
    const to = +c.dataset.to, from = c.dataset.from ? +c.dataset.from : 0, o = { v: from };
    if (to === 0) return;
    gsap.fromTo(o, { v: from }, { v: to, duration: 1.8, ease: "power3.out", scrollTrigger: { trigger: c, start: "top 90%" }, onUpdate: () => { c.textContent = Math.round(o.v); } });
  });

  /* ---------- Ticker + gallery rows react to scroll speed ---------- */
  const loops = [
    { el: $("#ticker"), speed: 0.6, dir: -1, x: 0, pausable: false },
    { el: row1, speed: 0.5, dir: -1, x: 0, pausable: true },
    { el: row2, speed: 0.5, dir: 1, x: 0, pausable: true }
  ];
  const gSkew = $("#gSkew");
  let skew = 0, hoverPause = 1;
  [row1, row2].forEach(r => {
    r.addEventListener("pointerenter", () => { hoverPause = 0.15; });
    r.addEventListener("pointerleave", () => { hoverPause = 1; });
  });
  gsap.ticker.add(() => {
    const boost = Math.min(Math.abs(velocity) * 0.6, 14);
    velocity *= 0.92;
    loops.forEach(l => {
      const half = l.el.scrollWidth / 2;
      if (!half) return;
      l.x += l.dir * (l.speed + boost) * (l.pausable ? hoverPause : 1);
      if (l.x <= -half) l.x += half;
      if (l.x > 0) l.x -= half;
      l.el.style.transform = "translate3d(" + l.x + "px,0,0)";
    });
    skew += (gsap.utils.clamp(-6, 6, velocity * -0.25) - skew) * 0.1;
    gSkew.style.transform = "skewY(" + skew.toFixed(2) + "deg)";
  });

  /* ---------- Services: pinned sideways scroll on wide screens ---------- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    const track = $("#hTrack");
    const dist = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: "#hPin", start: "center center", end: () => "+=" + dist(), pin: "#services", scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: s => { $("#hProgress").style.transform = "scaleX(" + s.progress + ")"; }
      }
    });
    gsap.from(".card", { y: 80, opacity: 0, rotate: 3, duration: 1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: "#hPin", start: "top 85%" } });
    return () => tween.kill();
  });

  /* ---------- Before / after hint sweep ---------- */
  ScrollTrigger.create({ trigger: ba, start: "top 60%", once: true, onEnter: () => {
    const o = { v: 50 }, upd = () => { setPos(o.v); baRange.value = o.v; };
    gsap.timeline()
      .to(o, { v: 80, duration: 0.8, ease: "power2.inOut", onUpdate: upd }, 1)
      .to(o, { v: 22, duration: 1, ease: "power2.inOut", onUpdate: upd })
      .to(o, { v: 50, duration: 0.8, ease: "power2.inOut", onUpdate: upd });
  } });

  /* ---------- EREPS seal stamps down ---------- */
  gsap.timeline({ scrollTrigger: { trigger: "#qSeal", start: "top 80%" } })
    .fromTo("#qSeal .seal-coin", { scale: 2.4, rotate: -35, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.55, ease: "power4.in" })
    .fromTo("#qSeal .seal-shock", { opacity: 1, scale: 1 }, { opacity: 0, scale: 2.2, duration: 0.9, ease: "power2.out" })
    .fromTo("#qSeal .seal", { scale: 0.94 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" }, "<")
    .fromTo("#qSeal .seal-ring", { opacity: 0 }, { opacity: 1, duration: 0.6 }, "<");
  gsap.from(".q-summary li", { x: -24, opacity: 0, stagger: 0.08, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: ".q-summary", start: "top 85%" } });

  /* ---------- Certificates deal out from a stack ---------- */
  const grid = $("#certGrid");
  ScrollTrigger.create({ trigger: grid, start: "top 75%", once: true, onEnter: () => {
    const g = grid.getBoundingClientRect(), cx = g.left + g.width / 2, cy = g.top + Math.min(g.height, 360) / 2;
    certs.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      gsap.fromTo(c,
        { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2), rotate: (i % 2 ? 1 : -1) * (6 + i * 2), scale: 0.7, opacity: 0 },
        { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: 1.1, ease: "expo.out", delay: 0.1 + i * 0.07, clearProps: "transform,opacity" });
    });
  } });

  /* ---------- How it works: line fills as you scroll ---------- */
  const vertical = window.matchMedia("(max-width: 900px)").matches;
  gsap.fromTo("#stepsLine", { [vertical ? "scaleY" : "scaleX"]: 0 }, { [vertical ? "scaleY" : "scaleX"]: 1, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 80%", end: "bottom 60%", scrub: true } });

  /* ---------- Testimonial words light up ---------- */
  gsap.to(".quote .w", { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: quote, start: "top 80%", end: "bottom 45%", scrub: true } });

  /* ---------- Magnetic button ---------- */
  const mWrap = $("#magnetWrap"), magnet = $("#magnet"), mLabel = magnet.querySelector("span");
  if (fine) {
    mWrap.addEventListener("pointermove", e => {
      const r = mWrap.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      gsap.to(magnet, { x: dx * 0.35, y: dy * 0.35, duration: 0.5, ease: "power3.out" });
      gsap.to(mLabel, { x: dx * 0.15, y: dy * 0.15, duration: 0.5, ease: "power3.out" });
    });
    mWrap.addEventListener("pointerleave", () => gsap.to([magnet, mLabel], { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" }));
  }

  /* ---------- Custom cursor (mouse only) ---------- */
  if (fine) {
    document.body.classList.add("has-cursor");
    const dot = $("#cursor"), ring = $("#cursorRing"), label = $("#cursorLabel");
    const xD = gsap.quickTo(dot, "x", { duration: 0.1 }), yD = gsap.quickTo(dot, "y", { duration: 0.1 });
    const xR = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" }), yR = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
    window.addEventListener("pointermove", e => { document.body.classList.add("cursor-on"); xD(e.clientX); yD(e.clientY); xR(e.clientX); yR(e.clientY); });
    document.addEventListener("pointerleave", () => document.body.classList.remove("cursor-on"));
    $$("[data-cursor]").forEach(el => {
      el.addEventListener("pointerenter", () => { ring.classList.add("big"); label.textContent = el.dataset.cursor; });
      el.addEventListener("pointerleave", () => { ring.classList.remove("big"); label.textContent = ""; });
    });
    document.addEventListener("pointerover", e => { if (e.target.closest("a, button")) gsap.to(ring, { scale: 1.5, duration: 0.3 }); });
    document.addEventListener("pointerout", e => { if (e.target.closest("a, button")) gsap.to(ring, { scale: 1, duration: 0.3 }); });
  }

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
