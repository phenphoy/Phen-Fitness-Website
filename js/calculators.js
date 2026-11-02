/* Phen Fitness — health calculators.
   One shared form feeds every result, so people enter their numbers once.
   Everything is calculated in the browser; nothing is sent anywhere.
   Formulas: BMI (WHO bands), Mifflin-St Jeor (BMR), activity multipliers (TDEE),
   U.S. Navy tape method (body fat), Devine / Robinson / Miller / Hamwi (ideal weight). */
(function () {
  const $ = s => document.querySelector(s);
  const form = $("#calcForm");
  if (!form) return;

  const KEY = "pf-calc-v1";
  const el = {
    age: $("#cAge"), cm: $("#cCm"), ft: $("#cFt"), inch: $("#cIn"), wt: $("#cWt"), act: $("#cAct"),
    waist: $("#cWaist"), neck: $("#cNeck"), hip: $("#cHip"), more: $("#cMore")
  };
  const radio = n => (form.querySelector('input[name="' + n + '"]:checked') || {}).value;
  const setRadio = (n, v) => { const r = form.querySelector('input[name="' + n + '"][value="' + v + '"]'); if (r) r.checked = true; };
  const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : NaN; };
  const round = (n, d = 0) => { const p = Math.pow(10, d); return Math.round(n * p) / p; };
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const LB = 2.2046226, IN = 2.54;

  /* ---------- reading the form (always returns metric) ---------- */
  function read() {
    const us = radio("units") === "us";
    const h = us ? (num(el.ft.value) * 12 + (num(el.inch.value) || 0)) * IN : num(el.cm.value);
    const w = us ? num(el.wt.value) / LB : num(el.wt.value);
    const len = v => us ? num(v) * IN : num(v);
    return {
      us, sex: radio("sex"), goal: radio("goal"), act: num(el.act.value),
      age: num(el.age.value), h, w,
      waist: len(el.waist.value), neck: len(el.neck.value), hip: len(el.hip.value)
    };
  }

  /* ---------- calculations ---------- */
  function bmiBand(b) {
    if (b < 18.5) return { t: "Below healthy range", c: "#6aa8ff" };
    if (b < 25) return { t: "Healthy range", c: "#a3e635" };
    if (b < 30) return { t: "Above healthy range", c: "#ffc247" };
    return { t: "Well above healthy range", c: "#ff7a59" };
  }
  function idealRange(h, sex) {
    const m = h / 100, lo = 18.5 * m * m, hi = 24.9 * m * m;
    const inches = h / IN, over = Math.max(0, inches - 60);
    const f = sex === "male"
      ? [50 + 2.3 * over, 52 + 1.9 * over, 56.2 + 1.41 * over, 48 + 2.7 * over]
      : [45.5 + 2.3 * over, 49 + 1.7 * over, 53.1 + 1.36 * over, 45.4 + 2.2 * over];
    return { lo, hi, fLo: Math.min.apply(null, f), fHi: Math.max.apply(null, f), useFormulas: inches >= 60 };
  }
  function navyFat(p) {
    const { sex, h, waist, neck, hip } = p;
    if (!(waist > 0 && neck > 0 && h > 0)) return null;
    let bf;
    if (sex === "male") {
      if (waist <= neck) return null;
      bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450;
    } else {
      if (!(hip > 0) || waist + hip <= neck) return null;
      bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(h)) - 450;
    }
    return bf > 2 && bf < 60 ? bf : null;
  }
  function fatBand(bf, sex) {
    const m = [[6, "Essential fat"], [14, "Athletic"], [18, "Fit"], [25, "Average"], [101, "Above average"]];
    const f = [[14, "Essential fat"], [21, "Athletic"], [25, "Fit"], [32, "Average"], [101, "Above average"]];
    const t = sex === "male" ? m : f;
    for (let i = 0; i < t.length; i++) if (bf < t[i][0]) return t[i][1];
    return "";
  }

  /* ---------- output ---------- */
  const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
  function render() {
    const p = read();
    const ok = p.age >= 18 && p.age <= 99 && p.h >= 120 && p.h <= 230 && p.w >= 30 && p.w <= 300;
    const empty = $("#cEmpty"), cards = $("#cCards"), disc = $("#cDisc"), share = $("#cShare");
    if (!ok) {
      cards.hidden = disc.hidden = share.hidden = true; empty.hidden = false;
      const started = [el.age, el.cm, el.ft, el.wt].some(i => i.value.trim());
      empty.textContent = p.age < 18 && p.age > 0 ? "These calculators are for adults (18+). Message me and I can help with a plan for younger athletes."
        : started ? "Check your age, height and weight. They look outside the usual range." : "Add your age, height and weight to see your results.";
      return;
    }
    empty.hidden = true; cards.hidden = disc.hidden = share.hidden = false;
    const us = p.us;
    const wShow = kg => us ? fmt(kg * LB) + " lb" : fmt(kg) + " kg";

    // BMI
    const bmi = p.w / Math.pow(p.h / 100, 2), band = bmiBand(bmi);
    set("oBmi", round(bmi, 1).toFixed(1)); set("oBmiTag", band.t);
    $("#oBmiTag").style.color = band.c;
    const pos = Math.max(0, Math.min(1, (bmi - 15) / 25));
    $("#oBmiDot").style.left = (pos * 100) + "%";
    set("oBmiNote", "BMI is a quick screen. It cannot tell muscle from fat, so use it with the body fat estimate.");

    // BMR / TDEE / goal
    const bmr = 10 * p.w + 6.25 * p.h - 5 * p.age + (p.sex === "male" ? 5 : -161);
    const tdee = bmr * p.act;
    let target = tdee, tag = "To stay where you are";
    if (p.goal === "lose") { target = Math.max(tdee * 0.8, bmr); tag = "About 20% below maintenance. Steady fat loss."; }
    if (p.goal === "gain") { target = tdee * 1.1; tag = "About 10% above maintenance. Lean muscle gain."; }
    set("oTarget", fmt(target) + " kcal"); set("oGoalTag", tag);
    set("oTdee", "Maintenance: " + fmt(tdee) + " kcal a day.");
    set("oBmr", fmt(bmr) + " kcal");

    // Protein
    const pr = { lose: [1.8, 2.2], maintain: [1.4, 1.8], gain: [1.6, 2.2] }[p.goal];
    set("oProt", fmt(p.w * pr[0]) + "–" + fmt(p.w * pr[1]) + " g");
    set("oProtNote", pr[0] + "–" + pr[1] + " g per kg of body weight. Spread over 3–5 meals.");

    // Healthy / ideal weight
    const r = idealRange(p.h, p.sex);
    set("oIdeal", wShow(r.lo).replace(/ (kg|lb)$/, "") + "–" + wShow(r.hi));
    set("oIdealNote", "BMI 18.5–24.9 for your height." + (r.useFormulas ? " Classic formulas suggest " + wShow(r.fLo).replace(/ (kg|lb)$/, "") + "–" + wShow(r.fHi) + "." : ""));

    // Body fat (optional)
    const bf = navyFat(p);
    if (bf) {
      set("oFat", round(bf, 1).toFixed(1) + "%"); set("oFatTag", fatBand(bf, p.sex));
      set("oFatNote", "Lean mass about " + wShow(p.w * (1 - bf / 100)) + ". U.S. Navy tape method, accurate to a few percent.");
    } else {
      set("oFat", "–"); set("oFatTag", ""); set("oFatNote", "Add waist and neck measurements" + (p.sex === "female" ? " and hips" : "") + " to estimate this.");
    }
    // a ready-written message, so a result can turn into a conversation
    const goalTxt = { lose: "lose fat", maintain: "maintain my weight", gain: "build muscle" }[p.goal];
    const body = us ? (Math.floor(Math.round(p.h / IN) / 12) + " ft " + (Math.round(p.h / IN) % 12) + " in, " + fmt(p.w * LB) + " lb") : (fmt(p.h) + " cm, " + fmt(p.w) + " kg");
    const msg = "Hi Phen, I used the calculator on your website.\n" +
      "Age " + fmt(p.age) + ", " + body + ". Goal: " + goalTxt + ".\n" +
      "BMI " + round(bmi, 1).toFixed(1) + " · about " + fmt(target) + " kcal a day · protein " + fmt(p.w * pr[0]) + "–" + fmt(p.w * pr[1]) + " g a day" +
      (bf ? " · body fat " + round(bf, 1).toFixed(1) + "%" : "") + ".\n" +
      "I would like to book a free consultation.";
    $("#sTg").href = "https://t.me/phenphoy?text=" + encodeURIComponent(msg);
    $("#sWa").href = "https://wa.me/85577413470?text=" + encodeURIComponent(msg);
    save();
  }

  /* ---------- units, sex and persistence ---------- */
  function syncLayout() {
    const us = radio("units") === "us", female = radio("sex") === "female";
    $("#hMetric").hidden = us; $("#hUs").hidden = !us;
    $("#wUnit").textContent = us ? "lb" : "kg";
    document.querySelectorAll(".lenU").forEach(n => n.textContent = us ? "in" : "cm");
    $("#hipWrap").hidden = !female;
    $("#hipNote").textContent = female ? ", and your hips at the widest point" : "";
    el.wt.placeholder = us ? "154" : "70";
    el.waist.placeholder = us ? "33" : "85"; el.neck.placeholder = us ? "15" : "38"; el.hip.placeholder = us ? "39" : "98";
  }
  // switching units converts what is already typed, so nothing has to be re-entered
  let lastUnits = "metric";
  function convertUnits() {
    const to = radio("units");
    if (to === lastUnits) return;
    if (to === "us") {
      const cm = num(el.cm.value);
      if (cm > 0) { const t = cm / IN; el.ft.value = Math.floor(t / 12); el.inch.value = round(t % 12, 1); }
      const kg = num(el.wt.value); if (kg > 0) el.wt.value = round(kg * LB, 1);
      [el.waist, el.neck, el.hip].forEach(i => { const v = num(i.value); if (v > 0) i.value = round(v / IN, 1); });
    } else {
      const ft = num(el.ft.value), inch = num(el.inch.value) || 0;
      if (ft > 0) el.cm.value = round((ft * 12 + inch) * IN, 1);
      const lb = num(el.wt.value); if (lb > 0) el.wt.value = round(lb / LB, 1);
      [el.waist, el.neck, el.hip].forEach(i => { const v = num(i.value); if (v > 0) i.value = round(v * IN, 1); });
    }
    lastUnits = to;
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        units: radio("units"), sex: radio("sex"), goal: radio("goal"), act: el.act.value,
        age: el.age.value, cm: el.cm.value, ft: el.ft.value, inch: el.inch.value, wt: el.wt.value,
        waist: el.waist.value, neck: el.neck.value, hip: el.hip.value
      }));
    } catch (e) { /* private mode: the calculator still works */ }
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (!s) return;
      setRadio("units", s.units); setRadio("sex", s.sex); setRadio("goal", s.goal);
      ["age", "cm", "ft", "inch", "wt", "waist", "neck", "hip"].forEach(k => { if (s[k] != null) el[k].value = s[k]; });
      if (s.act) el.act.value = s.act;
      lastUnits = radio("units");
      if (s.waist || s.neck || s.hip) el.more.open = true;
    } catch (e) { /* ignore */ }
  }

  form.addEventListener("input", e => {
    if (e.target.matches('input[type="text"]')) e.target.value = e.target.value.replace(/[^0-9.,]/g, "");
    render();
  });
  form.addEventListener("change", e => {
    if (e.target.name === "units") convertUnits();
    syncLayout(); render();
  });
  form.addEventListener("submit", e => e.preventDefault());
  $("#cReset").addEventListener("click", () => {
    form.reset(); lastUnits = "metric"; syncLayout();
    try { localStorage.removeItem(KEY); } catch (e) {}
    render();
  });

  load(); syncLayout(); render();
})();
