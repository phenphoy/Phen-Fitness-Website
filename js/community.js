/* Watch feed, monthly challenge and share-your-story form. No third-party code loads until a visitor taps a video. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var WA = "https://wa.me/85577413470", TG = "https://t.me/phenphoy";
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- WATCH ---------- */
  function parseVideo(v) {
    var u = v.url || "", m;
    if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/))) return { p: "youtube", id: m[1] };
    if ((m = u.match(/tiktok\.com\/.*\/video\/(\d+)/))) return { p: "tiktok", id: m[1] };
    return null;
  }
  function renderWatch() {
    var grid = $("#vGrid"), chips = $("#vChips"); if (!grid) return;
    var list = (window.PHEN_VIDEOS || []).map(function (v) { var p = parseVideo(v); return p && { p: p.p, id: p.id, url: v.url, title: v.title || "Watch", tag: v.tag || "Videos" }; }).filter(Boolean);
    if (!list.length) { $("#watch").classList.add("is-empty"); grid.hidden = true; return; }
    var tags = ["All"]; list.forEach(function (v) { if (tags.indexOf(v.tag) < 0) tags.push(v.tag); });
    var playing = null; /* only one embed at a time: TikTok refuses several at once ("overload-protect") */
    var LIMIT = 8, expanded = false, curTag = "All", more = document.createElement("button");
    more.type = "button"; more.className = "btn vmore"; more.hidden = true; grid.after(more);
    more.addEventListener("click", function () { expanded = true; draw(curTag); });
    function draw(tag) {
      curTag = tag; grid.innerHTML = ""; playing = null;
      var shown = list.filter(function (v) { return tag === "All" || v.tag === tag; });
      var cut = !expanded && shown.length > LIMIT;
      more.hidden = !cut; if (cut) more.textContent = "Show all " + shown.length + " tips";
      (cut ? shown.slice(0, LIMIT) : shown).forEach(function (v) {
        var b = document.createElement("button"); b.type = "button"; b.className = "vcard vcard-" + v.p;
        b.setAttribute("aria-label", "Play: " + v.title);
        var thumb = v.p === "youtube" ? '<img src="https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg" alt="" loading="lazy">' : '<img src="images/tiktok/' + v.id + '.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="vt-tk" aria-hidden="true">TikTok</span>';
        b.innerHTML = '<span class="vthumb">' + thumb + '<span class="vplay" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></span><span class="vmeta"><small>' + (v.p === "youtube" ? "YouTube" : "TikTok") + " · " + v.tag + "</small><b></b></span>";
        b.querySelector("b").textContent = v.title;
        b.addEventListener("click", function () {
          var f = document.createElement("iframe"); f.className = "vframe"; f.title = v.title; f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true;
          f.src = v.p === "youtube" ? "https://www.youtube-nocookie.com/embed/" + v.id + "?autoplay=1&rel=0" : "https://www.tiktok.com/player/v1/" + v.id + "?autoplay=1&loop=0&music_info=0&description=0";
          if (playing) { playing.box.replaceWith(playing.card); playing = null; }
          var box = document.createElement("div"); box.className = "vcard vplaying"; b.replaceWith(box); box.appendChild(f);
          if (v.p === "tiktok") { var a = document.createElement("a"); a.className = "vopen"; a.href = v.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Not playing? Open on TikTok ↗"; box.appendChild(a); }
          playing = { box: box, card: b };
        });
        grid.appendChild(b);
      });
    }
    chips.hidden = tags.length < 3;
    chips.innerHTML = tags.map(function (t, i) { return '<button type="button" class="chip' + (i ? "" : " on") + '" aria-pressed="' + (i ? "false" : "true") + '">' + t + "</button>"; }).join("");
    chips.addEventListener("click", function (e) {
      var c = e.target.closest(".chip"); if (!c) return;
      chips.querySelectorAll(".chip").forEach(function (x) { var on = x === c; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
      draw(c.textContent);
    });
    draw("All");
  }

  /* ---------- CHALLENGE ---------- */
  var WEEKS = [
    { t: "Foundation", ex: ["Glute bridge: 3 × 15", "Bodyweight squat: 3 × 12", "Reverse lunge: 2 × 10 each leg", "Dead bug: 3 × 8 each side", "Plank: 3 × 30 sec"] },
    { t: "Control", ex: ["Glute bridge with a 2-sec pause: 3 × 15", "Slow squat (3 sec down): 3 × 12", "Reverse lunge: 3 × 10 each leg", "Bird dog: 3 × 10 each side", "Side plank: 3 × 20 sec each side"] },
    { t: "Single-leg strength", ex: ["Single-leg glute bridge: 3 × 10 each leg", "Split squat, back foot on a chair: 3 × 8 each leg", "Curtsy lunge: 3 × 10 each leg", "Hollow hold: 3 × 20 sec", "Plank shoulder taps: 3 × 16"] },
    { t: "Push your limit", ex: ["Single-leg glute bridge: 4 × 10 each leg", "Split squat, back foot on a chair: 4 × 8 each leg", "Curtsy lunge: 3 × 12 each leg", "Hollow hold: 3 × 30 sec", "Plank: 3 × 45 sec"] }
  ];
  var REST = { t: "Active rest", ex: ["20-minute easy walk", "5 minutes of hip and hamstring stretching", "Drink water and sleep well"] };
  var TEST = { t: "Test day", ex: ["Warm up well", "Max glute bridges in 1 minute: write it down", "Longest plank you can hold: write it down", "Compare with Day 1 and send me your numbers"] };
  var LAST = { t: "Finish line", ex: ["Take your after photo and measurements", "Repeat Week 1's session, now with better control", "Message me your result"] };
  function session(d) {
    if (d === 29) return { t: TEST.t, ex: TEST.ex, w: 4 };
    if (d === 30) return { t: LAST.t, ex: LAST.ex, w: 4 };
    if (d % 7 === 0) return { t: REST.t, ex: REST.ex, w: Math.ceil(d / 7) };
    var w = Math.ceil(d / 7); return { t: WEEKS[w - 1].t, ex: WEEKS[w - 1].ex, w: w };
  }
  function dayDiff(a, b) { return Math.round((a - b) / 86400000); }
  function renderChallenge() {
    var C = window.PHEN_CHALLENGE, days = $("#chDays"); if (!C || !days) return;
    $("#chName").textContent = C.name;
    var key = "phen-ch-" + C.id, done = store.get(key) || {}, sel = 1;
    var p = C.start.split("-"), start = new Date(+p[0], p[1] - 1, +p[2]), now = new Date(); now.setHours(0, 0, 0, 0);
    var delta = dayDiff(now, start), today = delta + 1; /* day number today */
    var nice = start.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    var st = $("#chStatus");
    if (today < 1) st.innerHTML = "<b>Starts " + nice + "</b> · in " + (1 - today) + " day" + (1 - today === 1 ? "" : "s");
    else if (today <= C.days) { st.innerHTML = "<b>Live now</b> · today is day " + today + " of " + C.days; sel = today; }
    else st.innerHTML = "<b>This challenge has finished</b> · the next theme starts soon";
    var msg = encodeURIComponent("Hi Phen, I'd like to join the " + C.name + " challenge (starts " + nice + "). My name is ");
    $("#chJoin").href = TG; $("#chJoinWa").href = WA + "?text=" + msg;
    days.innerHTML = "";
    for (var d = 1; d <= C.days; d++) {
      var li = document.createElement("li"), b = document.createElement("button"); b.type = "button"; b.dataset.d = d; b.textContent = d;
      li.appendChild(b); days.appendChild(li);
    }
    function paint() {
      var n = 0;
      days.querySelectorAll("button").forEach(function (b) {
        var d = +b.dataset.d, isDone = !!done[d]; if (isDone) n++;
        b.classList.toggle("done", isDone); b.classList.toggle("sel", d === sel); b.classList.toggle("today", d === today);
        b.setAttribute("aria-pressed", d === sel);
        b.setAttribute("aria-label", "Day " + d + (isDone ? ", done" : "") + (d === today ? ", today" : ""));
      });
      $("#chBar").style.setProperty("--p", Math.round(n / C.days * 100) + "%");
      $("#chCount").textContent = n + " of " + C.days + " days done";
      var s = session(sel);
      $("#chDayK").textContent = "Day " + sel + " · Week " + s.w;
      $("#chDayT").textContent = s.t;
      $("#chEx").innerHTML = s.ex.map(function (x) { return "<li>" + x + "</li>"; }).join("");
      var btn = $("#chDone"); btn.textContent = done[sel] ? "Done ✓ (tap to undo)" : "Mark day done"; btn.classList.toggle("is-done", !!done[sel]);
      $("#chShare").hidden = n === 0; $("#chShare").dataset.n = n;
    }
    days.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; sel = +b.dataset.d; paint(); });
    $("#chDone").addEventListener("click", function () { if (done[sel]) delete done[sel]; else { done[sel] = 1; if (sel < C.days) sel++; } store.set(key, done); paint(); });
    $("#chShare").addEventListener("click", function () {
      var n = $("#chShare").dataset.n, text = "I've done " + n + " of " + C.days + " days of the " + C.name + " challenge with Phen Fitness.", url = location.origin + "/#challenge";
      if (navigator.share) navigator.share({ title: C.name, text: text, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text + " " + url).then(function () { var b = $("#chShare"); b.textContent = "Copied ✓"; setTimeout(function () { b.textContent = "Share my progress"; }, 1800); });
    });
    paint();
  }

  /* ---------- SHARE YOUR STORY ---------- */
  function initStory() {
    var f = $("#ssForm"); if (!f) return;
    var name = $("#ssName"), goal = $("#ssGoal"), text = $("#ssText"), ok = $("#ssOk"), wa = $("#ssWa");
    function upd() {
      var ready = text.value.trim().length > 10 && ok.checked;
      wa.setAttribute("aria-disabled", ready ? "false" : "true"); wa.classList.toggle("is-off", !ready);
      var m = "Hi Phen, here is my story.\nName: " + (name.value.trim() || "(first name)") + "\nGoal: " + goal.value + "\n\n" + text.value.trim() + "\n\nI'm happy for you to share my words and first name.";
      wa.href = WA + "?text=" + encodeURIComponent(m);
    }
    f.addEventListener("input", upd); f.addEventListener("change", upd);
    wa.addEventListener("click", function (e) { if (wa.getAttribute("aria-disabled") === "true") { e.preventDefault(); (text.value.trim().length <= 10 ? text : ok).focus(); } });
    upd();
  }

  renderWatch(); renderChallenge(); initStory();
})();
