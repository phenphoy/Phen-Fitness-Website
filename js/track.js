/* Counts which contact buttons people tap. Anonymous: no cookies, no personal data. Works with GoatCounter. */
(function () {
  "use strict";
  var EVENTS = [
    [/^https:\/\/t\.me\//, "click-telegram"],
    [/^https:\/\/wa\.me\//, "click-whatsapp"],
    [/^tel:/, "click-call"],
    [/^mailto:/, "click-email"],
    [/g\.page\/r\/.*\/review/, "click-google-review"],
    [/tiktok\.com/, "click-tiktok"],
    [/youtube\.com/, "click-youtube"],
    [/instagram\.com/, "click-instagram"],
    [/(^|\/)#book$/, "click-book-consult"]
  ];
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || !window.goatcounter || !window.goatcounter.count) return;
    var href = a.getAttribute("href") || "";
    for (var i = 0; i < EVENTS.length; i++) {
      if (EVENTS[i][0].test(href)) { window.goatcounter.count({ path: EVENTS[i][1], title: a.textContent.trim().slice(0, 60), event: true }); return; }
    }
  }, true);
})();
