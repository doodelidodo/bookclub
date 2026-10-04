/* Book Club – the app: start page, training, random test, repertoire browser, settings.
 * No build step, no server. Progress lives in localStorage and can be exported as a file.
 */
(function () {
  "use strict";
  var R = window.Repertoire;
  var FAST = /[?&]fast\b/.test(location.search);       // tests: no pauses, no animation
  function later(fn, ms) { return setTimeout(fn, FAST ? 0 : ms); }
  var Chess = window.ChessJS.Chess;

  // ------------------------------------------------------------------ texts
  var T = {
    de: {
      tagline: "Dein Eröffnungsrepertoire, geübt, bis es sitzt.",
      heroTitle: "Kenne deine Eröffnung <em>auswendig</em>.",
      heroLead: "Du spielst deine Züge, Book Club spielt die Antworten, die Gegner auf deinem Niveau wirklich wählen. Jede Stellung kommt wieder, bis sie sitzt: morgen, in drei Tagen, in einer Woche.",
      due: "fällig", fresh: "neu heute", streak: "Tage in Folge",
      start: "Training starten", nothingToday: "Für heute alles erledigt", moreNew: "Mehr neue Züge",
      exam: "Zufallsstellungen", examText: "Mitten aus deinem Repertoire, ohne Anlauf. Erst wenn du Stellungen schon ein paar Mal richtig hattest.",
      examNeed: "Ab 5 gefestigten Stellungen", examGo: "10 Stellungen prüfen",
      ownTitle: "Eigenes Repertoire", ownText: "Eine PGN mit Varianten genügt. Deine Züge sind das Repertoire, die des Gegners die Antworten, die du kennen willst.",
      ownGo: "PGN importieren",
      packsTitle: "Deine Eröffnungen",
      white: "Weiss", black: "Schwarz",
      learned: "sitzt", learning: "im Lernen", unseen: "neu",
      dueTag: "{n} fällig", train: "Üben", browse: "Repertoire", active: "im Training",
      noStats: "Ohne Häufigkeiten aus der Datenbank. Die Gegnerzüge kommen aus der PGN.",
      stats: "Gegnerzüge nach Lichess-Datenbank, Elo {r}, {s}.",
      autoNote: "{n} Züge vom Skript gewählt, bitte prüfen.",
      foot1: "Book Club läuft ganz in deinem Browser. Kein Konto, kein Server, kein Tracking.",
      foot2: "Zugstatistik: Lichess-Datenbank (CC0). Nicht verbunden mit Lichess. Figuren: Colin M.L. Burnett (CC BY-SA 3.0).",
      back: "Zurück", stop: "Beenden", next: "Weiter", hint: "Tipp", show: "Zug zeigen",
      yourMove: "Dein Zug", newMove: "Neu", review: "Wiederholung", context: "Anlauf", examChip: "Prüfung",
      newPrompt: "Neuer Zug: spiel {m}", reviewPrompt: "Was spielst du hier?", contextPrompt: "Weiter im Repertoire",
      examPrompt: "Was spielst du hier?",
      correct: "Richtig.", wrong: "Nicht dein Repertoire. Hier spielst du {m}.", playIt: "Spiel {m}, dann geht es weiter.",
      hintText: "Diese Figur zieht.", shownText: "Dein Zug ist {m}. Spiel ihn nach.",
      oppPlays: "{c} spielt {m}", share: "{p} der Partien auf diesem Niveau", lineEnd: "Ende dieser Linie.",
      afterWrong: "Kommt gleich nochmal.",
      sessionDone: "Fertig für heute", sessionDoneLead: "Alles Fällige ist durch. Morgen geht es weiter.",
      examDone: "Prüfung beendet",
      right: "richtig", wrongs: "falsch", newLearned: "neu gelernt", toHome: "Zur Übersicht", again: "Nochmal",
      moveList: "Züge",
      browseTitle: "Repertoire", browseStart: "Grundstellung", browseBack: "Zug zurück",
      browseMine: "Dein Zug", browseTheirs: "Antworten des Gegners", browseEnd: "Hier endet das Repertoire.",
      browseUnknown: "Keine Daten", auto: "auto", status: { "new": "neu", learning: "im Lernen", learned: "sitzt" },
      settings: "Einstellungen", close: "Schliessen",
      newPerDay: "Neue Züge pro Tag", newPerDayHelp: "Über alle Eröffnungen zusammen. 5 bis 10 ist ein guter Wert.",
      autoPlay: "Bekannte Züge im Anlauf automatisch spielen", autoPlayHelp: "Züge, die schon sitzen, spielt Book Club für dich, damit du schneller bei den fälligen Stellungen bist.",
      progress: "Fortschritt", exportBtn: "Sichern (Datei)", importBtn: "Laden (Datei)", resetBtn: "Alles zurücksetzen",
      progressHelp: "Der Fortschritt liegt nur in diesem Browser. Sichere ihn als Datei, um das Gerät zu wechseln.",
      progressServer: "Dein Fortschritt wird nach jedem Zug auf dem Server gespeichert (mit täglicher Sicherung). Alle Geräte teilen ihn.",
      syncSaved: "gespeichert", syncSaving: "speichert …", syncOffline: "offline, wird nachgeholt", syncError: "Speichern fehlgeschlagen",
      syncLocal: "nur dieser Browser",
      resetConfirm: "Wirklich den ganzen Lernstand löschen?",
      imported: "Lernstand geladen.", importFail: "Diese Datei ist kein Book-Club-Lernstand.",
      pgnTitle: "Eigenes Repertoire importieren",
      pgnHelp: "PGN mit Varianten. Kopfzeilen [Side \"white\"] oder [Side \"black\"] und [Event \"Name\"] legen Seite und Namen fest. Kommentare in {…} erscheinen beim Üben.",
      pgnSide: "Ich spiele", pgnName: "Name", pgnFile: "oder Datei wählen", pgnAdd: "Hinzufügen",
      pgnOk: "{name}: {n} Stellungen zum Lernen.", pgnFail: "Konnte die PGN nicht lesen: {e}",
      customs: "Eigene Repertoires", remove: "Entfernen", removeConfirm: "{name} und den Lernstand dazu entfernen?",
      emptyPacks: "Keine Eröffnung im Training. Schalte unten eine ein."
    },
    en: {
      tagline: "Your opening repertoire, drilled until it sticks.",
      heroTitle: "Know your opening <em>by heart</em>.",
      heroLead: "You play your moves, Book Club plays the replies opponents at your level actually choose. Every position comes back until it sticks: tomorrow, in three days, in a week.",
      due: "due", fresh: "new today", streak: "day streak",
      start: "Start training", nothingToday: "All done for today", moreNew: "More new moves",
      exam: "Random positions", examText: "Straight from the middle of your repertoire, no run-up. Once you've got positions right a few times.",
      examNeed: "Needs 5 settled positions", examGo: "Test 10 positions",
      ownTitle: "Your own repertoire", ownText: "A PGN with variations is all it takes. Your moves are the repertoire, the opponent's are the replies you want to know.",
      ownGo: "Import PGN",
      packsTitle: "Your openings",
      white: "White", black: "Black",
      learned: "settled", learning: "learning", unseen: "new",
      dueTag: "{n} due", train: "Train", browse: "Repertoire", active: "in training",
      noStats: "No database frequencies. Opponent moves come from the PGN.",
      stats: "Opponent moves from the Lichess database, rating {r}, {s}.",
      autoNote: "{n} moves picked by the script, please review.",
      foot1: "Book Club runs entirely in your browser. No account, no server, no tracking.",
      foot2: "Move statistics: Lichess database (CC0). Not affiliated with Lichess. Pieces: Colin M.L. Burnett (CC BY-SA 3.0).",
      back: "Back", stop: "Stop", next: "Next", hint: "Hint", show: "Show move",
      yourMove: "Your move", newMove: "New", review: "Review", context: "Run-up", examChip: "Test",
      newPrompt: "New move: play {m}", reviewPrompt: "What do you play here?", contextPrompt: "Keep following your repertoire",
      examPrompt: "What do you play here?",
      correct: "Correct.", wrong: "Not your repertoire. Here you play {m}.", playIt: "Play {m} to continue.",
      hintText: "This piece moves.", shownText: "Your move is {m}. Play it.",
      oppPlays: "{c} plays {m}", share: "{p} of games at this level", lineEnd: "End of this line.",
      afterWrong: "It comes back in a moment.",
      sessionDone: "Done for today", sessionDoneLead: "Everything due is done. See you tomorrow.",
      examDone: "Test finished",
      right: "right", wrongs: "wrong", newLearned: "newly learned", toHome: "Back to overview", again: "Again",
      moveList: "Moves",
      browseTitle: "Repertoire", browseStart: "Start position", browseBack: "Back one move",
      browseMine: "Your move", browseTheirs: "Opponent replies", browseEnd: "The repertoire ends here.",
      browseUnknown: "No data", auto: "auto", status: { "new": "new", learning: "learning", learned: "settled" },
      settings: "Settings", close: "Close",
      newPerDay: "New moves per day", newPerDayHelp: "Across all openings together. 5 to 10 works well.",
      autoPlay: "Auto-play settled moves in the run-up", autoPlayHelp: "Moves you already know are played for you, so you reach the due positions faster.",
      progress: "Progress", exportBtn: "Back up (file)", importBtn: "Restore (file)", resetBtn: "Reset everything",
      progressHelp: "Progress lives only in this browser. Back it up as a file to switch devices.",
      progressServer: "Your progress is saved on the server after every move (with a daily backup). All your devices share it.",
      syncSaved: "saved", syncSaving: "saving …", syncOffline: "offline, will retry", syncError: "saving failed",
      syncLocal: "this browser only",
      resetConfirm: "Really delete all progress?",
      imported: "Progress restored.", importFail: "This file is not Book Club progress.",
      pgnTitle: "Import your own repertoire",
      pgnHelp: "PGN with variations. Headers [Side \"white\"] or [Side \"black\"] and [Event \"Name\"] set side and name. Comments in {…} show up while training.",
      pgnSide: "I play", pgnName: "Name", pgnFile: "or choose a file", pgnAdd: "Add",
      pgnOk: "{name}: {n} positions to learn.", pgnFail: "Could not read the PGN: {e}",
      customs: "Your repertoires", remove: "Remove", removeConfirm: "Remove {name} and its progress?",
      emptyPacks: "No opening in training. Switch one on below."
    }
  };

  // ------------------------------------------------------------------ state
  var STORE = "bookclub.v1";
  var INTERVALS = [0, 1, 3, 7, 14, 30, 60];     // days per box; box >= 4 counts as settled
  var SETTLED = 4;

  function defaultState() {
    return {
      v: 1,
      lang: (navigator.language || "en").toLowerCase().indexOf("de") === 0 ? "de" : "en",
      newPerDay: 8,
      autoPlay: false,
      off: {},            // packId -> true when switched off
      cards: {},          // packId|key -> {box, due, seen, right, wrong, last}
      days: {},           // YYYY-MM-DD -> {reviews, right, fresh}
      custom: [],         // imported packs
      settingsAt: 0,      // when language or settings last changed (for merging devices)
      resetAt: 0,         // "reset everything": older answers stay gone
      removed: {}         // packId -> when an own repertoire was removed
    };
  }
  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.v === 1) return Object.assign(defaultState(), s);
      }
    } catch (e) { /* private mode, blocked storage: start fresh */ }
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* nothing we can do */ }
    if (sync.mode === "server") schedulePush();
  }
  function touchSettings() { state.settingsAt = Date.now(); }

  // ------------------------------------------------------------------ server sync
  // With the Book Club server (server/server.js) the progress lives in a file on
  // the server: loaded at start, merged with what this browser has, saved after
  // every answer. Without a server (GitHub Pages, file://) nothing changes.
  var Sync = window.BookClubSync;
  var API = "api/progress";
  var sync = { mode: "local", rev: null, status: "", timer: null, busy: false, again: false, retry: null };

  function setSyncStatus(st) {
    sync.status = st;
    var el = document.getElementById("syncStatus");
    if (!el) return;
    if (sync.mode !== "server") { el.hidden = true; return; }
    el.hidden = false;
    el.className = "sync " + st;
    el.textContent = t({ saved: "syncSaved", saving: "syncSaving", offline: "syncOffline", error: "syncError" }[st] || "syncSaved");
    el.title = el.textContent;
  }

  function adopt(remoteState) {
    var merged = Sync.merge(state, remoteState);
    var changedLocal = Sync.differs(merged, state);
    state = Object.assign(defaultState(), merged);
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ }
    return { changedLocal: changedLocal, changedRemote: !remoteState || Sync.differs(merged, remoteState) };
  }

  function startSync() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return Promise.resolve();
    return fetch(API, { cache: "no-store", credentials: "same-origin" }).then(function (res) {
      if (!res.ok) return null;
      return res.json().catch(function () { return null; });
    }).then(function (data) {
      if (!data || data.bookclub !== 1) return;
      sync.mode = "server";
      sync.rev = data.rev;
      var r = adopt(data.state && Sync.isState(data.state) ? data.state : null);
      loadPacks();
      setSyncStatus("saved");
      if (r.changedLocal && !session) rerender();
      if (r.changedRemote) push();
    }).catch(function () { /* no server: stay local */ });
  }

  function schedulePush() {
    clearTimeout(sync.timer);
    setSyncStatus("saving");
    sync.timer = setTimeout(push, 1200);
  }

  function push(keepalive) {
    if (sync.mode !== "server") return;
    clearTimeout(sync.timer);
    if (sync.busy) { sync.again = true; return; }
    sync.busy = true;
    setSyncStatus("saving");
    fetch(API, {
      method: "PUT", cache: "no-store", credentials: "same-origin", keepalive: !!keepalive,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rev: sync.rev, state: state })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
    }).then(function (r) {
      sync.busy = false;
      if (r.status === 200) {
        sync.rev = r.data.rev;
        setSyncStatus("saved");
      } else if (r.status === 409 && r.data && r.data.bookclub === 1) {
        // Another device saved in between: merge its copy and save again.
        sync.rev = r.data.rev;
        var a = adopt(r.data.state);
        loadPacks();
        if (a.changedLocal && !session) rerender();
        sync.again = true;
      } else {
        setSyncStatus("error");
        retryLater();
      }
      if (sync.again) { sync.again = false; push(); }
    }).catch(function () {
      sync.busy = false;
      setSyncStatus("offline");
      retryLater();
    });
  }
  function retryLater() {
    clearTimeout(sync.retry);
    sync.retry = setTimeout(push, 30000);
  }
  window.addEventListener("online", function () { if (sync.mode === "server") push(); });
  document.addEventListener("visibilitychange", function () {
    if (sync.mode !== "server") return;
    if (document.visibilityState === "hidden" && (sync.status === "saving" || sync.status === "offline")) push(true);
    if (document.visibilityState === "visible") pullIfChanged();
  });
  /** Coming back to the tab: another device may have trained in the meantime. */
  function pullIfChanged() {
    if (sync.busy || session) return;
    fetch(API, { cache: "no-store", credentials: "same-origin" }).then(function (res) { return res.ok ? res.json() : null; }).then(function (data) {
      if (!data || data.bookclub !== 1 || data.rev === sync.rev) return;
      sync.rev = data.rev;
      var r = adopt(data.state);
      loadPacks();
      if (r.changedLocal && !session) rerender();
      if (r.changedRemote) push();
    }).catch(function () { /* offline */ });
  }

  function t(key, vars) {
    var s = (T[state.lang] && T[state.lang][key]) || T.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  function loc(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[state.lang] || obj.en || obj.de || "";
  }
  /** German piece letters (S, L, T, D) when the app speaks German. */
  var DE_PIECES = { N: "S", B: "L", R: "T", Q: "D", K: "K" };
  function S(san) {
    if (state.lang !== "de" || !san) return san;
    return san.replace(/^[NBRQK]/, function (c) { return DE_PIECES[c]; }).replace(/=([NBRQ])/, function (_, c) { return "=" + DE_PIECES[c]; });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  // ------------------------------------------------------------------ dates
  function dayString(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
    return y + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
  }
  function today() { return dayString(new Date()); }
  function addDays(day, n) {
    var p = day.split("-").map(Number);
    return dayString(new Date(p[0], p[1] - 1, p[2] + n));
  }
  function dayStats(day) {
    day = day || today();
    if (!state.days[day]) state.days[day] = { reviews: 0, right: 0, fresh: 0 };
    return state.days[day];
  }
  function streak() {
    var n = 0, d = today();
    if (!state.days[d] || !state.days[d].reviews) d = addDays(d, -1);
    while (state.days[d] && state.days[d].reviews > 0) { n++; d = addDays(d, -1); }
    return n;
  }

  // ------------------------------------------------------------------ packs
  var packs = [];
  var meta = {};      // packId -> {mine: [keys], reach: {}, depth: {}, parents: {}}

  function loadPacks() {
    var list = (window.BOOKCLUB_PACKS || []).concat(state.custom || []);
    var seen = {};
    packs = list.filter(function (p) {
      if (!p || R.validatePack(p).length || seen[p.id]) return false;
      seen[p.id] = true;
      return true;
    });
    meta = {};
    packs.forEach(function (p) {
      var reach = R.reachProbabilities(p);
      var depth = R.depths(p);
      var parents = {};
      Object.keys(p.pos).forEach(function (k) {
        p.pos[k].m.forEach(function (e, i) {
          if (R.sideOf(k) === p.side && i > 0) return;
          (parents[e.t] = parents[e.t] || []).push({ from: k, edge: e });
        });
      });
      var mine = R.myPositions(p).filter(function (k) { return depth[k] !== undefined; });
      mine.sort(function (a, b) { return (reach[b] || 0) - (reach[a] || 0) || depth[a] - depth[b]; });
      meta[p.id] = { mine: mine, reach: reach, depth: depth, parents: parents };
    });
  }
  function packById(id) { return packs.filter(function (p) { return p.id === id; })[0]; }
  function activePacks() { return packs.filter(function (p) { return !state.off[p.id]; }); }

  function cardId(pack, key) { return pack.id + "|" + key; }
  function card(pack, key) { return state.cards[cardId(pack, key)]; }
  function isDue(c, day) { return c && c.due <= (day || today()); }

  function packCounts(pack) {
    var out = { learned: 0, learning: 0, unseen: 0, due: 0, total: 0 };
    var d = today();
    meta[pack.id].mine.forEach(function (k) {
      var c = card(pack, k);
      out.total++;
      if (!c) out.unseen++;
      else {
        if (c.box >= SETTLED) out.learned++; else out.learning++;
        if (isDue(c, d)) out.due++;
      }
    });
    return out;
  }

  function newBudgetLeft() {
    var d = dayStats();
    return Math.max(0, state.newPerDay + (d.bonus || 0) - d.fresh);
  }

  /**
   * Picks today's new positions across active packs, round robin, most common first.
   * A position only qualifies once the move before it is known (or picked too):
   * transpositions can make a deep position more common than its own run-up,
   * and you can't be asked a move you never reach.
   */
  function pickNew(budget) {
    var lists = activePacks().map(function (p) {
      return { p: p, keys: meta[p.id].mine.filter(function (k) { return !card(p, k); }) };
    });
    var picked = {}, out = [], i = 0, guard = 0;
    function known(p, k) { return !!card(p, k) || !!picked[cardId(p, k)]; }
    function eligible(p, k) {
      if (k === p.root) return true;
      var ps = meta[p.id].parents[k] || [];
      return ps.some(function (opp) {
        if (opp.from === p.root) return true;               // first move as Black
        return (meta[p.id].parents[opp.from] || []).some(function (mine) { return known(p, mine.from); });
      });
    }
    while (out.length < budget && guard++ < 10000) {
      var open = lists.filter(function (l) { return l.keys.length; });
      if (!open.length) break;
      var l = open[i++ % open.length];
      var idx = -1;
      for (var j = 0; j < l.keys.length; j++) { if (eligible(l.p, l.keys[j])) { idx = j; break; } }
      if (idx < 0) { l.keys = []; continue; }
      var k = l.keys.splice(idx, 1)[0];
      picked[cardId(l.p, k)] = true;
      out.push(cardId(l.p, k));
    }
    return out;
  }

  function grade(pack, key, result) {
    // result: "learned" (new move shown and played), "right", "soft" (right after a hint), "wrong"
    var id = cardId(pack, key);
    var c = state.cards[id] || { box: 0, due: today(), seen: 0, right: 0, wrong: 0 };
    var d = today();
    var stats = dayStats(d);
    if (result === "learned") {
      c.box = 0; c.due = d; stats.fresh++;
    } else if (result === "right") {
      c.box = Math.min(c.box + 1, INTERVALS.length - 1);
      c.due = addDays(d, INTERVALS[c.box]);
      c.right++; stats.reviews++; stats.right++;
    } else if (result === "soft") {
      c.box = 1; c.due = addDays(d, 1);
      stats.reviews++;
    } else {
      c.box = 0; c.due = d; c.wrong++; stats.reviews++;
    }
    c.seen++;
    c.last = d;
    c.t = Date.now();
    state.cards[id] = c;
    save();
    return c;
  }

  // ------------------------------------------------------------------ view plumbing
  var view = document.getElementById("view");
  var board = null;
  var session = null;

  function setLang(l, initial) {
    if (state.lang !== l) touchSettings();
    state.lang = l;
    if (!initial) save();
    document.documentElement.lang = l;
    document.querySelectorAll(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === l)); });
    document.getElementById("tagline").textContent = t("tagline");
    document.getElementById("settingsBtn").setAttribute("aria-label", t("settings"));
    setSyncStatus(sync.status);
    rerender();
  }
  var rerender = function () { renderHome(); };

  function mountBoard(container, orientation, onMove) {
    board = new window.Board(container, { orientation: orientation, onMove: onMove, instant: FAST });
    return board;
  }

  // ------------------------------------------------------------------ home
  function renderHome() {
    session = null;
    rerender = renderHome;
    var dueTotal = 0, newAvail = 0;
    activePacks().forEach(function (p) {
      var c = packCounts(p);
      dueTotal += c.due;
      newAvail += c.unseen;
    });
    var fresh = Math.min(newBudgetLeft(), newAvail);
    var settled = 0;
    packs.forEach(function (p) { meta[p.id].mine.forEach(function (k) { var c = card(p, k); if (c && c.box >= 2) settled++; }); });

    var html = '<section class="hero"><span class="eyebrow">Book Club</span><h1>' + t("heroTitle") + '</h1><p class="lead">' + esc(t("heroLead")) + "</p></section>";
    html += '<section class="today"><div class="counts">' +
      '<div class="count due"><b>' + dueTotal + "</b><span>" + esc(t("due")) + "</span></div>" +
      '<div class="count new"><b>' + fresh + "</b><span>" + esc(t("fresh")) + "</span></div>" +
      '<div class="count streak"><b>' + streak() + "</b><span>" + esc(t("streak")) + "</span></div></div>" +
      '<div class="actions">';
    if (!activePacks().length) html += '<span class="muted">' + esc(t("emptyPacks")) + "</span>";
    else if (dueTotal + fresh > 0) html += '<button class="btn primary" id="startBtn">' + esc(t("start")) + "</button>";
    else {
      html += '<span class="muted">' + esc(t("nothingToday")) + "</span>";
      if (newAvail) html += '<button class="btn secondary" id="moreBtn">' + esc(t("moreNew")) + ' <span class="num">+5</span></button>';
    }
    html += "</div></section>";

    html += '<div class="section-title"><h2>' + esc(t("packsTitle")) + "</h2></div><div class=\"packs\">";
    packs.forEach(function (p) {
      var c = packCounts(p);
      var pctL = c.total ? c.learned / c.total * 100 : 0, pctG = c.total ? c.learning / c.total * 100 : 0;
      var autos = 0;
      Object.keys(p.pos).forEach(function (k) { p.pos[k].m.forEach(function (e) { if (e.a) autos++; }); });
      var note = p.built && p.built.source === "explorer"
        ? t("stats", { r: (p.built.ratings || "").replace(/,/g, ", "), s: (p.built.speeds || "").replace(/,/g, " + ") })
        : t("noStats");
      html += '<article class="pack' + (state.off[p.id] ? " off" : "") + '">' +
        '<div class="head"><div><h3>' + esc(loc(p.name)) + '</h3><span class="side"><i class="' + p.side + '"></i>' + esc(p.side === "w" ? t("white") : t("black")) + "</span></div>" +
        (c.due ? '<span class="due-tag">' + esc(t("dueTag", { n: c.due })) + "</span>" : "") + "</div>" +
        '<p class="blurb">' + esc(loc(p.blurb)) + "</p>" +
        '<div class="bar" aria-hidden="true"><span class="learned" style="width:' + pctL + '%"></span><span class="learning" style="width:' + pctG + '%"></span></div>' +
        '<div class="legend"><span><i class="learned"></i><b>' + c.learned + "</b> " + esc(t("learned")) + '</span><span><i class="learning"></i><b>' + c.learning + "</b> " + esc(t("learning")) + '</span><span><i class="new"></i><b>' + c.unseen + "</b> " + esc(t("unseen")) + "</span></div>" +
        '<div class="row"><button class="btn small secondary" data-train="' + esc(p.id) + '">' + esc(t("train")) + '</button><button class="btn small ghost" data-browse="' + esc(p.id) + '">' + esc(t("browse")) + "</button></div>" +
        '<label class="toggle"><input type="checkbox" data-toggle="' + esc(p.id) + '"' + (state.off[p.id] ? "" : " checked") + "> " + esc(t("active")) + "</label>" +
        '<p class="packnote">' + esc(note) + "</p>" +
        (autos ? '<p class="packnote warn">' + esc(t("autoNote", { n: autos })) + "</p>" : "") +
        "</article>";
    });
    html += "</div>";

    html += '<div class="extras"><div class="extra"><h3>' + esc(t("exam")) + "</h3><p>" + esc(t("examText")) + "</p>" +
      '<button class="btn small secondary" id="examBtn"' + (settled < 5 ? " disabled" : "") + ">" + esc(settled < 5 ? t("examNeed") : t("examGo")) + "</button></div>" +
      '<div class="extra"><h3>' + esc(t("ownTitle")) + "</h3><p>" + esc(t("ownText")) + '</p><button class="btn small secondary" id="ownBtn">' + esc(t("ownGo")) + "</button></div></div>";
    html += '<footer class="foot"><span>' + esc(t("foot1")) + "</span><span>" + esc(t("foot2")) + "</span></footer>";
    view.innerHTML = html;

    on("#startBtn", function () { startSession(null); });
    on("#moreBtn", function () { var d = dayStats(); d.bonus = (d.bonus || 0) + 5; save(); startSession(null); });
    on("#examBtn", startExam);
    on("#ownBtn", function () { openSettings(true); });
    view.querySelectorAll("[data-train]").forEach(function (b) { b.onclick = function () { startSession(b.dataset.train); }; });
    view.querySelectorAll("[data-browse]").forEach(function (b) { b.onclick = function () { startBrowse(b.dataset.browse); }; });
    view.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.onchange = function () { if (b.checked) delete state.off[b.dataset.toggle]; else state.off[b.dataset.toggle] = true; touchSettings(); save(); renderHome(); };
    });
    window.scrollTo(0, 0);
  }
  function on(sel, fn) { var el = view.querySelector(sel); if (el) el.onclick = fn; }

  // ------------------------------------------------------------------ trainer layout
  function trainerLayout(extraControls) {
    view.innerHTML =
      '<div class="trainer"><div class="boardwrap"><div id="board"></div></div>' +
      '<aside class="panel">' +
      '<div class="crumbs"><button class="btn ghost small" id="backBtn">← ' + esc(t("back")) + '</button><span class="progressline" id="progress"></span></div>' +
      '<div class="opening" id="opening"></div>' +
      '<div class="prompt" id="prompt"></div>' +
      '<div class="feedback" id="feedback" aria-live="polite"></div>' +
      '<div class="moves" id="moves" aria-label="' + esc(t("moveList")) + '"></div>' +
      '<div class="controls" id="controls">' + (extraControls || "") + "</div>" +
      "</aside></div>";
    document.getElementById("backBtn").onclick = function () { renderHome(); };
  }
  function setPrompt(kind, text) {
    var chip = { "new": t("newMove"), review: t("review"), context: t("context"), exam: t("examChip") }[kind];
    document.getElementById("prompt").innerHTML = (chip ? '<span class="chip ' + kind + '">' + esc(chip) + "</span>" : "") + "<span>" + esc(text) + "</span>";
  }
  function setFeedback(parts) {
    var el = document.getElementById("feedback");
    if (!el) return;
    el.innerHTML = (parts || []).filter(Boolean).map(function (p) {
      return '<span class="' + p[0] + '">' + esc(p[1]) + "</span>";
    }).join("");
  }
  function moveListHtml(line, side) {
    // line: [{san, color}] starting from the root position (white first)
    var out = "", n = 1;
    line.forEach(function (m, i) {
      if (m.color === "w") out += "<b>" + n + ".</b> ";
      else if (i === 0) out += "<b>" + n + "…</b> ";
      out += '<span class="' + (m.color === side ? "mine" : "") + '">' + esc(S(m.san)) + "</span> ";
      if (m.color === "b") n++;
    });
    return out || "&nbsp;";
  }
  function shareText(pos, edge) {
    if (typeof edge.n !== "number" || !pos.g) return "";
    var p = Math.round(edge.n / pos.g * 100);
    return t("share", { p: (p < 1 ? "<1" : p) + "%" });
  }

  // ------------------------------------------------------------------ training session
  function startSession(onlyPack) {
    var list = onlyPack ? [packById(onlyPack)] : activePacks();
    list = list.filter(Boolean);
    if (!list.length) return renderHome();
    var allowed = {};
    var saveOff = state.off;
    if (onlyPack) {
      state.off = {};
      packs.forEach(function (p) { if (p.id !== onlyPack) state.off[p.id] = true; });
    }
    pickNew(newBudgetLeft()).forEach(function (id) { allowed[id] = true; });
    state.off = saveOff;
    session = {
      kind: "train", packs: list, allowed: allowed, right: 0, wrong: 0, fresh: 0, turn: 0,
      line: [], pack: null, key: null, awaiting: null, busy: false
    };
    trainerLayout('<button class="btn small secondary" id="hintBtn">' + esc(t("hint")) + '</button><button class="btn small ghost" id="showBtn">' + esc(t("show")) + "</button>");
    rerender = function () { trainerLayoutRefresh(); };
    mountBoard(document.getElementById("board"), "w", onUserMove);
    document.getElementById("hintBtn").onclick = function () { useHint(false); };
    document.getElementById("showBtn").onclick = function () { useHint(true); };
    nextLine();
  }
  function trainerLayoutRefresh() {
    // Language switch mid-session: simplest honest behaviour is to restart the screen texts.
    if (!session) return renderHome();
    var s = session;
    var keep = { pack: s.pack, key: s.key };
    trainerLayout(s.kind === "train"
      ? '<button class="btn small secondary" id="hintBtn">' + esc(t("hint")) + '</button><button class="btn small ghost" id="showBtn">' + esc(t("show")) + "</button>"
      : '<button class="btn small ghost" id="showBtn">' + esc(t("show")) + "</button>");
    mountBoard(document.getElementById("board"), keep.pack ? keep.pack.side : "w", onUserMove);
    var hb = document.getElementById("hintBtn"); if (hb) hb.onclick = function () { useHint(false); };
    document.getElementById("showBtn").onclick = function () { useHint(true); };
    if (s.kind === "train") presentPosition(); else presentExam();
  }
  function presentPosition() {
    var s = session;
    if (!s.pack) return nextLine();
    board.setOrientation(s.pack.side);
    board.setPosition(R.keyToFen(s.key), { movable: null });
    document.getElementById("opening").textContent = (s.pack.pos[s.key] && s.pack.pos[s.key].o) || loc(s.pack.name);
    document.getElementById("moves").innerHTML = moveListHtml(s.line, s.pack.side);
    updateProgress();
    var a = s.awaiting;
    if (!a) { if (!s.busy) step(); return; }
    board.setMovable(s.pack.side);
    if (a.mode === "new") { setPrompt("new", t("newPrompt", { m: S(a.rep.s) })); board.arrow(a.rep.u.slice(0, 2), a.rep.u.slice(2, 4), "info"); }
    else setPrompt(a.mode, a.mode === "review" ? t("reviewPrompt") : t("contextPrompt"));
    if (a.shown && a.mode !== "new") board.arrow(a.rep.u.slice(0, 2), a.rep.u.slice(2, 4), "good");
    setFeedback(oppFeedback());
  }

  function pendingKey(pack, key) {
    if (R.sideOf(key) !== pack.side) return false;
    var pos = pack.pos[key];
    if (!pos || !pos.m.length) return false;
    var c = card(pack, key);
    if (!c) return !!session.allowed[cardId(pack, key)];
    return isDue(c);
  }
  /** Is anything pending in the repertoire from this position on? */
  function hasPending(pack, key, memo, path) {
    if (memo[key] !== undefined) return memo[key];
    if (path[key]) return false;
    path[key] = true;
    var pos = pack.pos[key];
    var res = pendingKey(pack, key);
    // A move you have never seen and that isn't up for today blocks the way:
    // the line would have to teach it on the fly.
    var blocked = !res && R.sideOf(key) === pack.side && !card(pack, key);
    if (!res && !blocked && pos && pos.m.length) {
      var edges = R.sideOf(key) === pack.side ? pos.m.slice(0, 1) : pos.m;
      res = edges.some(function (e) { return hasPending(pack, e.t, memo, path); });
    }
    path[key] = false;
    memo[key] = res;
    return res;
  }
  function pendingCount() {
    var n = 0;
    session.packs.forEach(function (p) { meta[p.id].mine.forEach(function (k) { if (pendingKey(p, k)) n++; }); });
    return n;
  }

  function nextLine() {
    var candidates = session.packs.filter(function (p) { return hasPending(p, p.root, {}, {}); });
    if (!candidates.length) return finishSession();
    // Rotate through the packs so a session mixes openings.
    var pack = candidates[session.turn % candidates.length];
    session.turn++;
    session.pack = pack;
    session.key = pack.root;
    session.line = [];
    board.setOrientation(pack.side);
    board.setPosition(R.keyToFen(pack.root), { movable: null });
    document.getElementById("opening").textContent = loc(pack.name);
    document.getElementById("moves").innerHTML = moveListHtml([], pack.side);
    session.lastOpp = null;
    setFeedback([]);
    updateProgress();
    later(step, 250);
  }

  function updateProgress() {
    var el = document.getElementById("progress");
    if (!el || !session) return;
    var left = pendingCount(), done = session.right + session.wrong + session.fresh;
    var pct = done + left ? Math.round(done / (done + left) * 100) : 100;
    el.innerHTML = '<span class="bar" style="width:90px"><span style="width:' + pct + '%"></span></span><span>' + left + "</span>";
  }

  function step() {
    if (!session || session.kind !== "train") return;
    var pack = session.pack, key = session.key, pos = pack.pos[key];
    if (pos && pos.o) document.getElementById("opening").textContent = pos.o;
    if (!pos || !pos.m.length) return endOfLine();
    if (R.sideOf(key) === pack.side) return askMove();
    var memo = {};
    var options = pos.m.filter(function (e) { return hasPending(pack, e.t, memo, {}); });
    if (!options.length) return endOfLine();
    var weights = R.replyWeights(pos);
    var w = options.map(function (e) { return weights[pos.m.indexOf(e)]; });
    var sum = w.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * sum, pick = options[0];
    for (var i = 0; i < options.length; i++) { r -= w[i]; if (r <= 0) { pick = options[i]; break; } }
    playOpponent(pos, pick);
  }

  function playOpponent(pos, edge) {
    session.busy = true;
    var fen = R.keyToFen(session.key);
    var color = R.sideOf(session.key);
    later(function () {
      if (!session) return;
      var c = new Chess(fen);
      c.move({ from: edge.u.slice(0, 2), to: edge.u.slice(2, 4), promotion: edge.u[4] || "q" });
      board.animate(edge.u.slice(0, 2), edge.u.slice(2, 4), c.fen()).then(function () {
        if (!session) return;
        session.line.push({ san: edge.s, color: color });
        session.key = edge.t;
        session.lastOpp = { pos: pos, edge: edge, color: color };
        document.getElementById("moves").innerHTML = moveListHtml(session.line, session.pack.side);
        session.busy = false;
        step();
      });
    }, 380);
  }

  function oppFeedback() {
    var o = session.lastOpp;
    if (!o) return [];
    var who = o.color === "w" ? t("white") : t("black");
    return [["stat", t("oppPlays", { c: who, m: S(o.edge.s) }) + (shareText(o.pos, o.edge) ? " · " + shareText(o.pos, o.edge) : "")],
            o.edge.c ? ["comment", loc(o.edge.c)] : null];
  }

  function askMove() {
    var pack = session.pack, key = session.key;
    var rep = pack.pos[key].m[0];
    var c = card(pack, key);
    var mode;
    if (!c) mode = "new";
    else if (isDue(c)) mode = "review";
    else mode = "context";
    session.awaiting = { key: key, rep: rep, mode: mode, mistakes: 0, hinted: false, shown: mode === "new" };

    if (mode === "context" && state.autoPlay && c.box >= SETTLED) {
      setPrompt("context", t("contextPrompt"));
      return playMine(rep, true);
    }
    board.setMovable(pack.side);
    if (mode === "new") {
      setPrompt("new", t("newPrompt", { m: S(rep.s) }));
      board.arrow(rep.u.slice(0, 2), rep.u.slice(2, 4), "info");
      setFeedback(oppFeedback());
    } else {
      setPrompt(mode, mode === "review" ? t("reviewPrompt") : t("contextPrompt"));
      setFeedback(oppFeedback());
    }
  }

  function onUserMove(from, to) {
    if (!session || session.busy) return;
    if (session.kind === "exam") return onExamMove(from, to);
    var a = session.awaiting;
    if (!a) return;
    var rep = a.rep;
    var uci = from + to;
    var ok = rep.u.slice(0, 4) === uci;
    if (ok) {
      var pack = session.pack;
      var result;
      if (a.mode === "new") { result = "learned"; session.fresh++; }
      else if (a.mistakes || a.shown) result = null;          // already graded as wrong
      else if (a.hinted) { result = "soft"; session.right++; }
      else if (a.mode === "review") { result = "right"; session.right++; }
      else result = null;                                      // context move: no change
      if (result) grade(pack, a.key, result);
      session.awaiting = null;
      var parts = [];
      if (a.mode === "new") parts.push(["info", t("correct")]);
      else if (!a.mistakes && !a.shown) parts.push(["ok", t("correct")]);
      else parts.push(["muted", t("afterWrong")]);
      if (rep.c) parts.push(["comment", loc(rep.c)]);
      setFeedback(parts);
      board.mark(to, "good");
      playMine(rep, false);
      return;
    }
    // Wrong move: snap back, show the repertoire move, ask again.
    board.shake();
    board.mark(from, "bad");
    if (!a.mistakes && !a.shown && a.mode !== "new") {
      grade(session.pack, a.key, "wrong");
      session.wrong++;
    }
    a.mistakes++;
    a.shown = true;
    board.clearArrows();
    board.arrow(rep.u.slice(0, 2), rep.u.slice(2, 4), "good");
    setFeedback([["no", t("wrong", { m: S(rep.s) })], ["muted", t("playIt", { m: S(rep.s) })]]);
    updateProgress();
  }

  function useHint(full) {
    if (!session || session.busy) return;
    if (session.kind === "exam") return examShow();
    var a = session.awaiting;
    if (!a) return;
    var rep = a.rep;
    if (full) {
      if (!a.shown && a.mode !== "new") { grade(session.pack, a.key, "wrong"); session.wrong++; }
      a.shown = true;
      board.clearArrows();
      board.arrow(rep.u.slice(0, 2), rep.u.slice(2, 4), "good");
      setFeedback([["info", t("shownText", { m: S(rep.s) })]]);
      updateProgress();
    } else {
      a.hinted = true;
      board.mark(rep.u.slice(0, 2), "hint");
      setFeedback([["info", t("hintText")]]);
    }
  }

  function playMine(rep, animated) {
    var pack = session.pack;
    var fen = R.keyToFen(session.key);
    var color = R.sideOf(session.key);
    var c = new Chess(fen);
    c.move({ from: rep.u.slice(0, 2), to: rep.u.slice(2, 4), promotion: rep.u[4] || "q" });
    session.busy = true;
    var done = function () {
      session.line.push({ san: rep.s, color: color });
      session.key = rep.t;
      session.lastOpp = null;
      document.getElementById("moves").innerHTML = moveListHtml(session.line, pack.side);
      session.busy = false;
      updateProgress();
      step();
    };
    if (animated) board.animate(rep.u.slice(0, 2), rep.u.slice(2, 4), c.fen()).then(done);
    else { board.setPosition(c.fen(), { lastMove: [rep.u.slice(0, 2), rep.u.slice(2, 4)] }); board.mark(rep.u.slice(2, 4), "good"); done(); }
  }

  function endOfLine() {
    board.setMovable(null);
    setPrompt("", t("lineEnd"));
    session.busy = true;
    later(function () { if (session && session.kind === "train") { session.busy = false; nextLine(); } }, 1100);
  }

  function finishSession() {
    var s = session;
    session = null;
    rerender = renderHome;
    view.innerHTML = '<section class="summary"><span class="eyebrow">Book Club</span><h2>' + esc(t("sessionDone")) + '</h2><p class="muted">' + esc(t("sessionDoneLead")) + "</p>" +
      '<div class="counts"><div class="count streak"><b>' + s.right + "</b><span>" + esc(t("right")) + '</span></div><div class="count due"><b>' + s.wrong + "</b><span>" + esc(t("wrongs")) + '</span></div><div class="count new"><b>' + s.fresh + "</b><span>" + esc(t("newLearned")) + "</span></div></div>" +
      '<button class="btn primary" id="homeBtn">' + esc(t("toHome")) + "</button></section>";
    on("#homeBtn", renderHome);
  }

  // ------------------------------------------------------------------ random test
  function startExam() {
    var pool = [];
    packs.forEach(function (p) {
      meta[p.id].mine.forEach(function (k) {
        var c = card(p, k);
        if (c && c.box >= 2 && meta[p.id].parents[k]) pool.push({ pack: p, key: k });
      });
    });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    session = { kind: "exam", items: pool.slice(0, 10), index: 0, right: 0, wrong: 0, fresh: 0, awaiting: null, busy: false };
    trainerLayout('<button class="btn small ghost" id="showBtn">' + esc(t("show")) + '</button><button class="btn small secondary" id="nextBtn" hidden>' + esc(t("next")) + "</button>");
    rerender = function () { trainerLayoutRefresh(); };
    mountBoard(document.getElementById("board"), "w", onUserMove);
    document.getElementById("showBtn").onclick = examShow;
    presentExam();
  }

  function presentExam() {
    var s = session;
    var nb = document.getElementById("nextBtn");
    if (!nb) {
      document.getElementById("controls").insertAdjacentHTML("beforeend", '<button class="btn small secondary" id="nextBtn" hidden>' + esc(t("next")) + "</button>");
      nb = document.getElementById("nextBtn");
    }
    nb.onclick = function () { s.index++; presentExam(); };
    nb.hidden = true;
    if (s.index >= s.items.length) return finishExam();
    var item = s.items[s.index];
    var pack = item.pack, key = item.key;
    s.pack = pack; s.key = key;
    var parent = meta[pack.id].parents[key][0];
    s.awaiting = { key: key, rep: pack.pos[key].m[0], shown: false, mistakes: 0 };
    board.setOrientation(pack.side);
    board.setPosition(R.keyToFen(key), { lastMove: [parent.edge.u.slice(0, 2), parent.edge.u.slice(2, 4)], movable: pack.side });
    document.getElementById("opening").textContent = pack.pos[key].o || loc(pack.name);
    document.getElementById("moves").innerHTML = "<b>" + (s.index + 1) + " / " + s.items.length + "</b> · " + esc(loc(pack.name)) + " · " + esc(t("oppPlays", { c: parent.edge.s ? (R.sideOf(parent.from) === "w" ? t("white") : t("black")) : "", m: S(parent.edge.s) }));
    document.getElementById("progress").textContent = (s.index + 1) + "/" + s.items.length;
    setPrompt("exam", t("examPrompt"));
    setFeedback([]);
  }

  function onExamMove(from, to) {
    var s = session, a = s.awaiting;
    if (!a) return;
    var ok = a.rep.u.slice(0, 4) === from + to;
    if (ok) {
      var c = card(s.pack, a.key);
      if (!a.mistakes && !a.shown) {
        s.right++;
        if (isDue(c)) grade(s.pack, a.key, "right");
      }
      s.awaiting = null;
      var parts = [[a.mistakes || a.shown ? "muted" : "ok", a.mistakes || a.shown ? t("afterWrong") : t("correct")]];
      if (a.rep.c) parts.push(["comment", loc(a.rep.c)]);
      setFeedback(parts);
      var chess = new Chess(R.keyToFen(a.key));
      chess.move({ from: from, to: to, promotion: "q" });
      board.setPosition(chess.fen(), { lastMove: [from, to] });
      board.mark(to, "good");
      document.getElementById("nextBtn").hidden = false;
      return;
    }
    board.shake();
    board.mark(from, "bad");
    if (!a.mistakes && !a.shown) { grade(s.pack, a.key, "wrong"); s.wrong++; }
    a.mistakes++;
    board.clearArrows();
    board.arrow(a.rep.u.slice(0, 2), a.rep.u.slice(2, 4), "good");
    setFeedback([["no", t("wrong", { m: S(a.rep.s) })], ["muted", t("playIt", { m: S(a.rep.s) })]]);
  }

  function examShow() {
    var s = session, a = s && s.awaiting;
    if (!a) return;
    if (!a.shown && !a.mistakes) { grade(s.pack, a.key, "wrong"); s.wrong++; }
    a.shown = true;
    board.clearArrows();
    board.arrow(a.rep.u.slice(0, 2), a.rep.u.slice(2, 4), "good");
    setFeedback([["info", t("shownText", { m: S(a.rep.s) })]]);
  }

  function finishExam() {
    var s = session;
    session = null;
    rerender = renderHome;
    view.innerHTML = '<section class="summary"><span class="eyebrow">Book Club</span><h2>' + esc(t("examDone")) + "</h2>" +
      '<div class="counts"><div class="count streak"><b>' + s.right + "</b><span>" + esc(t("right")) + '</span></div><div class="count due"><b>' + s.wrong + "</b><span>" + esc(t("wrongs")) + "</span></div></div>" +
      '<div class="row" style="display:flex;gap:10px"><button class="btn secondary" id="againBtn">' + esc(t("again")) + '</button><button class="btn primary" id="homeBtn">' + esc(t("toHome")) + "</button></div></section>";
    on("#homeBtn", renderHome);
    on("#againBtn", startExam);
  }

  // ------------------------------------------------------------------ repertoire browser
  function startBrowse(packId) {
    var pack = packById(packId);
    if (!pack) return renderHome();
    session = { kind: "browse", pack: pack, path: [{ key: pack.root, edge: null, color: null }] };
    renderBrowse();
  }
  function renderBrowse() {
    var s = session;
    rerender = renderBrowse;
    var pack = s.pack;
    var here = s.path[s.path.length - 1];
    var pos = pack.pos[here.key] || { m: [] };
    view.innerHTML =
      '<div class="trainer"><div class="boardwrap"><div id="board"></div></div>' +
      '<aside class="panel">' +
      '<div class="crumbs"><button class="btn ghost small" id="backBtn">← ' + esc(t("back")) + "</button>" +
      '<span class="mono muted" style="font-size:.8rem">' + esc(loc(pack.name)) + "</span></div>" +
      '<div class="opening">' + esc(pos.o || loc(pack.name)) + "</div>" +
      '<div class="moves">' + moveListHtml(s.path.slice(1).map(function (p) { return { san: p.edge.s, color: p.color }; }), pack.side) + "</div>" +
      '<div class="feedback" id="feedback"></div>' +
      '<div class="choices" id="choices"></div>' +
      '<div class="controls"><button class="btn small secondary" id="upBtn"' + (s.path.length < 2 ? " disabled" : "") + ">" + esc(t("browseBack")) + '</button><button class="btn small ghost" id="rootBtn"' + (s.path.length < 2 ? " disabled" : "") + ">" + esc(t("browseStart")) + "</button></div>" +
      "</aside></div>";
    on("#backBtn", renderHome);
    on("#upBtn", function () { s.path.pop(); renderBrowse(); });
    on("#rootBtn", function () { s.path = s.path.slice(0, 1); renderBrowse(); });
    mountBoard(document.getElementById("board"), pack.side, function (from, to) {
      var e = pos.m.filter(function (x) { return x.u.slice(0, 4) === from + to; })[0];
      if (e) go(e); else board.setPosition(R.keyToFen(here.key), { movable: R.sideOf(here.key), lastMove: here.edge ? [here.edge.u.slice(0, 2), here.edge.u.slice(2, 4)] : null });
    });
    board.setPosition(R.keyToFen(here.key), { movable: R.sideOf(here.key), lastMove: here.edge ? [here.edge.u.slice(0, 2), here.edge.u.slice(2, 4)] : null });

    var mine = R.sideOf(here.key) === pack.side;
    var fb = [];
    if (here.edge && here.edge.c) fb.push(["comment", loc(here.edge.c)]);
    if (!pos.m.length) fb.push(["muted", t("browseEnd")]);
    setFeedback(fb);
    var html = "";
    if (pos.m.length) {
      html += '<span class="eyebrow">' + esc(mine ? t("browseMine") : t("browseTheirs")) + "</span>";
      var edges = mine ? pos.m.slice(0, 1) : pos.m;
      edges.forEach(function (e) {
        var share = typeof e.n === "number" && pos.g ? e.n / pos.g : null;
        var status = "";
        if (mine) {
          var c = card(pack, here.key);
          status = !c ? t("status")["new"] : c.box >= SETTLED ? t("status").learned : t("status").learning;
        }
        html += '<button class="choice' + (mine ? " mine" : "") + '" data-u="' + esc(e.u) + '"><span class="san">' + esc(S(e.s)) + "</span>" +
          '<span class="share">' + (share !== null ? '<span style="width:' + Math.round(share * 100) + '%"></span>' : "") + "</span>" +
          '<span class="pct">' + (share !== null ? Math.round(share * 100) + "%" : esc(status)) + (e.a ? '<span class="tag">' + esc(t("auto")) + "</span>" : "") + "</span></button>";
        if (mine) {
          board.arrow(e.u.slice(0, 2), e.u.slice(2, 4), "good");
        }
      });
    }
    document.getElementById("choices").innerHTML = html;
    view.querySelectorAll("[data-u]").forEach(function (b) {
      b.onclick = function () { go(pos.m.filter(function (e) { return e.u === b.dataset.u; })[0]); };
    });
    function go(e) {
      s.path.push({ key: e.t, edge: e, color: R.sideOf(here.key) });
      renderBrowse();
    }
  }

  // ------------------------------------------------------------------ settings
  var dlg = document.getElementById("settings");
  function openSettings(focusPgn) {
    var customs = (state.custom || []).map(function (p) {
      return "<div><span>" + esc(loc(p.name)) + ' <span class="muted mono" style="font-size:.8rem">' + esc(p.side === "w" ? t("white") : t("black")) + '</span></span><button type="button" class="btn small ghost" data-remove="' + esc(p.id) + '">' + esc(t("remove")) + "</button></div>";
    }).join("");
    dlg.innerHTML = '<form method="dialog" class="dlg">' +
      "<header><h2>" + esc(t("settings")) + '</h2><button class="iconbtn" value="close" aria-label="' + esc(t("close")) + '">✕</button></header>' +
      '<div class="field"><label for="npd">' + esc(t("newPerDay")) + '</label><input type="number" id="npd" min="0" max="50" value="' + state.newPerDay + '"><span class="help">' + esc(t("newPerDayHelp")) + "</span></div>" +
      '<div class="field"><label class="toggle" style="color:var(--text);font-weight:700"><input type="checkbox" id="autoplay"' + (state.autoPlay ? " checked" : "") + "> " + esc(t("autoPlay")) + '</label><span class="help">' + esc(t("autoPlayHelp")) + "</span></div>" +
      '<div class="group" id="pgnGroup"><span class="label" style="font-weight:700">' + esc(t("pgnTitle")) + '</span><span class="help muted" style="font-size:.88rem">' + esc(t("pgnHelp")) + "</span>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span>' + esc(t("pgnSide")) + '</span><label class="toggle"><input type="radio" name="pgnSide" value="white" checked> ' + esc(t("white")) + '</label><label class="toggle"><input type="radio" name="pgnSide" value="black"> ' + esc(t("black")) + "</label></div>" +
      '<input type="text" id="pgnName" placeholder="' + esc(t("pgnName")) + '">' +
      '<textarea id="pgnText" spellcheck="false" placeholder="1. e4 e5 2. Nf3 (2. Nc3) 2... Nc6 3. Bb5 *"></textarea>' +
      '<div class="buttons"><label class="btn small ghost">' + esc(t("pgnFile")) + '<input type="file" id="pgnFile" accept=".pgn,text/plain" hidden></label><button type="button" class="btn small secondary" id="pgnAdd">' + esc(t("pgnAdd")) + "</button></div>" +
      '<p class="msg" id="pgnMsg"></p>' +
      (customs ? '<span class="label" style="font-weight:700">' + esc(t("customs")) + '</span><div class="custom-list">' + customs + "</div>" : "") + "</div>" +
      '<div class="group"><span class="label" style="font-weight:700">' + esc(t("progress")) + '</span><span class="muted" style="font-size:.88rem">' + esc(sync.mode === "server" ? t("progressServer") : t("progressHelp")) + "</span>" +
      '<div class="buttons"><button type="button" class="btn small secondary" id="exportBtn">' + esc(t("exportBtn")) + '</button><label class="btn small secondary">' + esc(t("importBtn")) + '<input type="file" id="importFile" accept=".json,application/json" hidden></label><button type="button" class="btn small ghost" id="resetBtn">' + esc(t("resetBtn")) + "</button></div>" +
      '<p class="msg" id="progMsg"></p></div>' +
      "</form>";
    dlg.querySelector("#npd").onchange = function () { state.newPerDay = Math.max(0, Math.min(50, Number(this.value) || 0)); touchSettings(); save(); };
    dlg.querySelector("#autoplay").onchange = function () { state.autoPlay = this.checked; touchSettings(); save(); };
    dlg.querySelector("#exportBtn").onclick = exportProgress;
    dlg.querySelector("#importFile").onchange = function () { importProgress(this.files[0]); };
    dlg.querySelector("#resetBtn").onclick = function () {
      if (!confirm(t("resetConfirm"))) return;
      state.cards = {}; state.days = {}; state.resetAt = Date.now(); save(); dlg.close(); renderHome();
    };
    dlg.querySelector("#pgnFile").onchange = function () {
      var f = this.files[0];
      if (!f) return;
      f.text().then(function (txt) { dlg.querySelector("#pgnText").value = txt; });
    };
    dlg.querySelector("#pgnAdd").onclick = addPgn;
    dlg.querySelectorAll("[data-remove]").forEach(function (b) {
      b.onclick = function () {
        var p = packById(b.dataset.remove);
        if (!p || !confirm(t("removeConfirm", { name: loc(p.name) }))) return;
        state.custom = state.custom.filter(function (x) { return x.id !== p.id; });
        state.removed = state.removed || {};
        state.removed[p.id] = Date.now();
        Object.keys(state.cards).forEach(function (k) { if (k.indexOf(p.id + "|") === 0) delete state.cards[k]; });
        save(); loadPacks(); openSettings(true); renderHome();
      };
    });
    if (!dlg.open) dlg.showModal();
    if (focusPgn) { var g = dlg.querySelector("#pgnGroup"); g.scrollIntoView({ block: "start" }); }
  }
  dlg.addEventListener("close", function () { if (!session) renderHome(); });

  function addPgn() {
    var msg = dlg.querySelector("#pgnMsg");
    var text = dlg.querySelector("#pgnText").value;
    var name = dlg.querySelector("#pgnName").value.trim();
    var side = dlg.querySelector("input[name=pgnSide]:checked").value;
    try {
      var headers = /\[Side\s/.test(text) ? "" : '[Side "' + side + '"]\n';
      if (name) headers += '[Event "' + name.replace(/"/g, "'") + '"]\n';
      var res = R.packFromPgn(headers + text, Chess);
      var pack = res.pack;
      if (name) pack.name = { de: name, en: name };
      pack.addedAt = Date.now();
      if (!/\[Pack\s/.test(text)) pack.id = "custom-" + (pack.name.en || "pack").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) + "-" + Date.now().toString(36);
      var n = R.myPositions(pack).length;
      if (!n) throw new Error(state.lang === "de" ? "keine Züge für deine Seite gefunden" : "no moves for your side found");
      state.custom = (state.custom || []).filter(function (p) { return p.id !== pack.id; }).concat([pack]);
      save();
      loadPacks();
      msg.className = "msg ok";
      msg.textContent = t("pgnOk", { name: loc(pack.name), n: n });
      dlg.querySelector("#pgnText").value = "";
    } catch (e) {
      msg.className = "msg no";
      msg.textContent = t("pgnFail", { e: e.message });
    }
  }

  function exportProgress() {
    var data = JSON.stringify({ bookclub: 1, exported: new Date().toISOString(), state: state }, null, 1);
    var blob = new Blob([data], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bookclub-" + today() + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function importProgress(file) {
    var msg = dlg.querySelector("#progMsg");
    if (!file) return;
    file.text().then(function (txt) {
      var data = JSON.parse(txt);
      if (!data || data.bookclub !== 1 || !data.state || data.state.v !== 1) throw new Error("format");
      // Merge rather than replace: a backup never wipes newer answers.
      state = Object.assign(defaultState(), Sync.merge(state, data.state));
      save();
      loadPacks();
      msg.className = "msg ok";
      msg.textContent = t("imported");
    }).catch(function () {
      msg.className = "msg no";
      msg.textContent = t("importFail");
    });
  }

  // ------------------------------------------------------------------ boot
  document.querySelectorAll(".lang button").forEach(function (b) { b.onclick = function () { setLang(b.dataset.lang); }; });
  document.getElementById("settingsBtn").onclick = function () { openSettings(false); };
  document.getElementById("homeLink").onclick = function () { renderHome(); };
  loadPacks();
  setLang(state.lang, true);
  startSync().then(function () {
    if (sync.mode === "local" && navigator.storage && navigator.storage.persist) {
      // Ask the browser not to clear this site's storage when space runs low.
      navigator.storage.persist().catch(function () { /* optional */ });
    }
  });

  var framed = false;
  try { framed = window.top !== window; } catch (e) { framed = true; }
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !framed) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* offline cache is a bonus */ });
  }

  // For the self-test page.
  window.BookClub = { session: function () { return session; }, state: function () { return state; }, sync: function () { return sync; }, grade: grade, today: today, addDays: addDays, packs: function () { return packs; }, meta: function () { return meta; }, pickNew: pickNew };
})();
