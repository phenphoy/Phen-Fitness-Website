/* Phen Fitness: premium motion layer (runs after main.js).
   Restrained, purposeful motion: a scroll progress line, rows that draw in,
   a light section that opens up, and calm page intros.
   Skipped entirely with "reduce motion" or if the animation library is missing. */
(function () {
  if (!(window.gsap && window.ScrollTrigger)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.registerPlugin(ScrollTrigger);
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const EASE = "expo.out";

  /* 1. Thin red scroll-progress line under the nav */
  const bar = document.createElement("div");
  bar.className = "scroll-progress"; bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.3 } });

  /* 2. Credentials bar: items settle in one after another */
  if ($(".cred-in")) gsap.from(".cred-in span", { opacity: 0, y: 12, duration: 0.8, ease: EASE, stagger: 0.08, delay: $("#loader") ? 3.9 : 0.6 });

  /* 3. Services price list: each row's divider draws across, then the content rises */
  $$(".svc").forEach(row => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: "top 88%", once: true } });
    tl.fromTo(row, { "--draw": 0 }, { "--draw": 1, duration: 1.1, ease: "expo.inOut" })
      .from(row.querySelectorAll(".svc-n, .svc-main, .svc-price, .btn"), { y: 18, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.06, clearProps: "transform,opacity" }, 0.25);
  });

  /* 4. Client results: the light panel opens from a framed card to full width */
  const light = $("#testimonials.light");
  if (light) gsap.fromTo(light, { clipPath: "inset(6% 4% 6% 4% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: light, start: "top 95%", end: "top 35%", scrub: 0.6 } });

  /* 5. Secondary pages: the heading block lands in sequence */
  if ($(".page-hero")) gsap.from(".page-hero > *", { y: 26, opacity: 0, duration: 1, ease: EASE, stagger: 0.08, delay: 0.1, clearProps: "transform,opacity" });

  /* 6. Credentials row and free cards: a gentle lift as they arrive */
  $$(".cred-row, .page-cta-in").forEach(el => gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: EASE, clearProps: "transform,opacity", scrollTrigger: { trigger: el, start: "top 88%", once: true } }));

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
