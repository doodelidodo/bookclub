/* Book Club – merging two copies of the progress (phone and laptop, browser and server).
 *
 * Rules:
 *   - cards: the copy answered last wins (field t, milliseconds), ties go to the one seen more often
 *   - day statistics: per field the larger number (two devices on one day undercount, never double)
 *   - settings: the copy whose settings changed last (settingsAt)
 *   - "reset everything" (resetAt) and removing an own repertoire (removed[id]) win over
 *     anything answered before them, so a second device cannot bring old cards back
 * Pure functions, shared by the app, the server and the tests.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.BookClubSync = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SETTINGS = ["lang", "newPerDay", "autoPlay", "off"];

  function num(x) { return typeof x === "number" && isFinite(x) ? x : 0; }

  function newerCard(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (num(a.t) !== num(b.t)) return num(a.t) > num(b.t) ? a : b;
    return num(a.seen) >= num(b.seen) ? a : b;
  }

  function merge(a, b) {
    a = a || {};
    b = b || {};
    var out = {};
    // Settings from the side changed last.
    var sa = num(a.settingsAt), sb = num(b.settingsAt);
    var settingsFrom = sb > sa ? b : a;
    Object.keys(a).concat(Object.keys(b)).forEach(function (k) { if (out[k] === undefined) out[k] = a[k] !== undefined ? a[k] : b[k]; });
    SETTINGS.forEach(function (k) {
      if (settingsFrom[k] !== undefined) out[k] = settingsFrom[k];
      else if ((settingsFrom === a ? b : a)[k] !== undefined) out[k] = (settingsFrom === a ? b : a)[k];
    });
    out.settingsAt = Math.max(sa, sb);
    out.v = 1;

    var resetAt = Math.max(num(a.resetAt), num(b.resetAt));
    out.resetAt = resetAt;

    var removed = {};
    [a.removed || {}, b.removed || {}].forEach(function (r) {
      Object.keys(r).forEach(function (id) { removed[id] = Math.max(num(removed[id]), num(r[id])); });
    });
    out.removed = removed;

    // Own repertoires: union by id, newer import wins, removed ones stay removed.
    var packs = {};
    (a.custom || []).concat(b.custom || []).forEach(function (p) {
      if (!p || !p.id) return;
      var at = num(p.addedAt);
      if (removed[p.id] && removed[p.id] >= at) return;
      if (!packs[p.id] || num(packs[p.id].addedAt) < at) packs[p.id] = p;
    });
    out.custom = Object.keys(packs).map(function (id) { return packs[id]; });

    // Passed level tests: union, earliest time; a reset clears them like the cards.
    var path = {};
    [a.path || {}, b.path || {}].forEach(function (src) {
      Object.keys(src).forEach(function (packId) {
        var passed = (src[packId] && src[packId].passed) || {};
        Object.keys(passed).forEach(function (n) {
          var ts = num(passed[n]);
          if (resetAt && ts <= resetAt) return;
          if (removed[packId] && ts <= removed[packId]) return;
          path[packId] = path[packId] || { passed: {} };
          var cur = path[packId].passed[n];
          path[packId].passed[n] = cur ? Math.min(cur, ts) : ts;
        });
      });
    });
    out.path = path;

    // Guides read: union, latest time.
    var guides = {};
    [a.guides || {}, b.guides || {}].forEach(function (src) {
      Object.keys(src).forEach(function (id) { guides[id] = Math.max(num(guides[id]), num(src[id])); });
    });
    out.guides = guides;

    var cards = {};
    var ca = a.cards || {}, cb = b.cards || {};
    Object.keys(ca).concat(Object.keys(cb)).forEach(function (id) {
      if (cards[id]) return;
      var c = newerCard(ca[id], cb[id]);
      if (!c) return;
      if (resetAt && num(c.t) <= resetAt) return;
      var packId = id.split("|")[0];
      if (removed[packId] && num(c.t) <= removed[packId]) return;
      cards[id] = c;
    });
    out.cards = cards;

    var days = {};
    var da = a.days || {}, db = b.days || {};
    Object.keys(da).concat(Object.keys(db)).forEach(function (d) {
      if (days[d]) return;
      var x = da[d] || {}, y = db[d] || {}, z = {};
      Object.keys(x).concat(Object.keys(y)).forEach(function (f) { z[f] = Math.max(num(x[f]), num(y[f])); });
      days[d] = z;
    });
    if (resetAt) {
      // Days before the reset belong to the old progress.
      var resetDay = new Date(resetAt);
      var rd = resetDay.getFullYear() + "-" + String(resetDay.getMonth() + 1).padStart(2, "0") + "-" + String(resetDay.getDate()).padStart(2, "0");
      Object.keys(days).forEach(function (d) { if (d < rd) delete days[d]; });
    }
    out.days = days;
    return out;
  }

  /** True when merging b into a would change a (so a needs saving). */
  function differs(a, b) {
    return JSON.stringify(canonical(a)) !== JSON.stringify(canonical(b));
  }
  function canonical(s) {
    if (!s || typeof s !== "object") return s;
    if (Array.isArray(s)) return s.map(canonical);
    var o = {};
    Object.keys(s).sort().forEach(function (k) { o[k] = canonical(s[k]); });
    return o;
  }

  function isState(s) {
    return !!s && typeof s === "object" && s.v === 1 && typeof s.cards === "object";
  }

  return { merge: merge, differs: differs, isState: isState };
});
