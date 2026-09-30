/* ============================================================
   PHEN FITNESS — AVAILABILITY SETTINGS
   Edit this block to change your hours, notice time or services.
   Times are 24-hour Siem Reap time ("06:00", "19:30").
   Use null for a day you don't work.
   The weekly hours list, the "Open now" badge, the booking times
   and the hours in the contact section all read from here.
   ============================================================ */
const AVAILABILITY = {
  hours: {
    mon: ["06:00", "20:00"],
    tue: ["06:00", "20:00"],
    wed: ["06:00", "20:00"],
    thu: ["06:00", "20:00"],
    fri: ["06:00", "19:00"],
    sat: ["08:00", "14:00"],
    sun: null
  },
  minNoticeHours: 3,   // earliest a client can book from now
  daysAhead: 14,       // how far ahead clients can book
  whatsapp: "85577413470",
  telegram: "phenphoy",
  services: [
    { name: "Free Consultation", minutes: 30 },
    { name: "Fitness Assessment", minutes: 60 },
    { name: "1-on-1 Training", minutes: 60 },
    { name: "Small-Group Training", minutes: 60 },
    { name: "Online Coaching call", minutes: 30 }
  ]
};

(function () {
  const A = AVAILABILITY;
  const KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const NAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const OFFSET = 7 * 60; // Cambodia is UTC+7 all year

  // "Siem Reap wall clock": a Date whose UTC fields read as local Cambodia time
  const nowSR = () => new Date(Date.now() + OFFSET * 60000);
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmt = min => {
    const h = Math.floor(min / 60), m = min % 60, h12 = ((h + 11) % 12) + 1;
    return h12 + ":" + String(m).padStart(2, "0") + " " + (h < 12 ? "AM" : "PM");
  };
  const dayKey = d => KEYS[d.getUTCDay()];

  /* Weekly hours + open badge */
  function renderHours() {
    const now = nowSR(), today = dayKey(now), mins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    document.getElementById("hoursList").innerHTML = order.map(k => {
      const h = A.hours[k];
      const cls = [h ? "" : "closed", k === today ? "today" : ""].join(" ").trim();
      return '<li class="' + cls + '"><b>' + NAMES[k] + "</b><span>" + (h ? fmt(toMin(h[0])) + " – " + fmt(toMin(h[1])) : "Unavailable") + "</span></li>";
    }).join("");
    const t = A.hours[today], badge = document.getElementById("openStatus");
    const open = t && mins >= toMin(t[0]) && mins < toMin(t[1]);
    badge.classList.toggle("open", !!open);
    if (open) badge.textContent = "Open now · until " + fmt(toMin(t[1]));
    else {
      for (let i = 0; i < 8; i++) {
        const d = new Date(now.getTime() + i * 86400000), h = A.hours[dayKey(d)];
        if (h && (i > 0 || mins < toMin(h[0]))) {
          badge.textContent = "Closed · opens " + (i === 0 ? "today" : i === 1 ? "tomorrow" : SHORT[d.getUTCDay()]) + " " + fmt(toMin(h[0]));
          return;
        }
      }
      badge.textContent = "Closed";
    }
  }

  /* Booking picker */
  const state = { svc: 0, day: null, slot: null };
  const svcChips = document.getElementById("svcChips"), dayStrip = document.getElementById("dayStrip"), slotGrid = document.getElementById("slotGrid");
  const nameInput = document.getElementById("bookName"), preview = document.getElementById("msgPreview");
  const waBtn = document.getElementById("sendWa"), tgBtn = document.getElementById("sendTg"), note = document.getElementById("sendNote");

  function slotsFor(dayOffset) {
    const now = nowSR();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset));
    const h = A.hours[dayKey(d)];
    if (!h) return [];
    const dur = A.services[state.svc].minutes, step = dur <= 30 ? 30 : 60;
    const earliest = dayOffset === 0 ? now.getUTCHours() * 60 + now.getUTCMinutes() + A.minNoticeHours * 60 : -1;
    const out = [];
    for (let m = toMin(h[0]); m + dur <= toMin(h[1]); m += step) if (m >= earliest) out.push(m);
    return out;
  }
  const dateFor = off => { const n = nowSR(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + off)); };

  function renderServices() {
    svcChips.innerHTML = A.services.map((s, i) =>
      '<button type="button" class="chip" data-i="' + i + '" aria-pressed="' + (i === state.svc) + '">' + s.name + "<small>" + s.minutes + " min</small></button>").join("");
  }
  function renderDays() {
    let html = "";
    for (let i = 0; i < A.daysAhead; i++) {
      const d = dateFor(i), none = slotsFor(i).length === 0;
      const label = i === 0 ? "Today" : SHORT[d.getUTCDay()];
      html += '<button type="button" class="day" data-i="' + i + '" aria-pressed="' + (i === state.day) + '"' + (none ? " disabled" : "") +
        ' aria-label="' + NAMES[dayKey(d)] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + (none ? ", no times left" : "") + '"><small>' + label + "</small><b>" + d.getUTCDate() + "</b><small>" + MONTHS[d.getUTCMonth()] + "</small></button>";
    }
    dayStrip.innerHTML = html;
  }
  function renderSlots() {
    const list = state.day === null ? [] : slotsFor(state.day);
    slotGrid.innerHTML = list.length
      ? list.map(m => '<button type="button" class="slot" data-m="' + m + '" aria-pressed="' + (m === state.slot) + '">' + fmt(m) + "</button>").join("")
      : '<p class="slots-empty">No times left on this day. Pick another day.</p>';
    if (window.gsap && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(slotGrid.querySelectorAll(".slot"), { y: 10, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.02, ease: "power2.out", overwrite: true });
    }
  }
  function message() {
    if (state.slot === null) return "";
    const s = A.services[state.svc], d = dateFor(state.day), name = nameInput.value.trim();
    return "Hi Phen" + (name ? ", this is " + name : "") + ". I'd like to book a " + s.name + " (" + s.minutes + " min) on " +
      NAMES[dayKey(d)] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " at " + fmt(state.slot) + ". Is that time available?";
  }
  function renderMessage() {
    const msg = message();
    preview.textContent = msg || "Pick a start time to see your message.";
    preview.classList.toggle("muted", !msg);
    waBtn.setAttribute("aria-disabled", String(!msg));
    tgBtn.setAttribute("aria-disabled", String(!msg));
    waBtn.href = "https://wa.me/" + A.whatsapp + (msg ? "?text=" + encodeURIComponent(msg) : "");
    note.textContent = "";
  }
  function firstOpenDay() { for (let i = 0; i < A.daysAhead; i++) if (slotsFor(i).length) return i; return null; }
  function refreshAll() {
    if (state.day === null || !slotsFor(state.day).length) state.day = firstOpenDay();
    if (state.slot !== null && !(state.day !== null && slotsFor(state.day).includes(state.slot))) state.slot = null;
    renderServices(); renderDays(); renderSlots(); renderMessage();
  }

  svcChips.addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; state.svc = +b.dataset.i; refreshAll(); });
  dayStrip.addEventListener("click", e => { const b = e.target.closest(".day"); if (!b || b.disabled) return; state.day = +b.dataset.i; state.slot = null; renderDays(); renderSlots(); renderMessage(); });
  slotGrid.addEventListener("click", e => {
    const b = e.target.closest(".slot"); if (!b) return;
    state.slot = +b.dataset.m;
    slotGrid.querySelectorAll(".slot").forEach(s => s.setAttribute("aria-pressed", String(s === b)));
    renderMessage();
  });
  nameInput.addEventListener("input", renderMessage);
  document.getElementById("bookForm").addEventListener("submit", e => e.preventDefault());
  tgBtn.addEventListener("click", () => {
    const msg = message(); if (!msg) return;
    const opened = () => { note.innerHTML = 'Message copied. Paste it into your chat with <a href="https://t.me/' + A.telegram + '" target="_blank" rel="noopener">@' + A.telegram + "</a>."; };
    const fallback = () => {
      const r = document.createRange(); r.selectNodeContents(preview);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      note.innerHTML = 'Your message is selected. Copy it, then open <a href="https://t.me/' + A.telegram + '" target="_blank" rel="noopener">@' + A.telegram + "</a> on Telegram.";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(opened, fallback); else fallback();
  });

  /* Short hours summary for the contact section, e.g. "Mon–Thu 6:00 AM – 8:00 PM" */
  function hoursSummary() {
    const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], ab = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
    const groups = [];
    order.forEach(k => {
      const h = A.hours[k], key = h ? h.join("-") : null, last = groups[groups.length - 1];
      if (last && last.key === key) last.to = k; else groups.push({ key, from: k, to: k, h });
    });
    return groups.filter(g => g.h).map(g => (g.from === g.to ? ab[g.from] : ab[g.from] + "–" + ab[g.to]) + " " + fmt(toMin(g.h[0])) + " – " + fmt(toMin(g.h[1]))).join(" · ");
  }
  const coachHours = document.getElementById("coachHours");
  if (coachHours) coachHours.textContent = hoursSummary();

  /* Lets the service buttons elsewhere on the page pre-select a service */
  window.PhenBooking = {
    selectService(i) {
      if (!A.services[i]) return;
      state.svc = i;
      refreshAll();
    }
  };

  renderHours(); refreshAll();
  setInterval(() => { renderHours(); refreshAll(); }, 60000);
})();
