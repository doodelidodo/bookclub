#!/usr/bin/env node
/* Book Club – self-test. `node tools/selftest.js`, no network, no npm install.
 * Covers the PGN reader, the pack format, the shipped repertoires and the
 * explorer extension (against a fake explorer). The app's training logic is
 * covered by tools/browser-test.py (Playwright).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { Chess } = require("../vendor/chess.js");
const R = require("../js/repertoire.js");
const B = require("./build-pack.js");

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; return; }
  failed++;
  console.log("  FAIL " + name + (detail !== undefined ? " -> " + JSON.stringify(detail) : ""));
}
function section(name) { console.log(name); }
const ROOT = path.resolve(__dirname, "..");
const key = (moves) => { const c = new Chess(); moves.split(" ").filter(Boolean).forEach((m) => c.move(m)); return R.fenKey(c.fen()); };

(async function () {
  section("1 PGN reader");
  {
    const tok = R.tokenize('[Side "black"]\n[Event "X"]\n1.e4 c6! 2. d4 $1 d5?! {de: A || en: B} (2... e5 ; rest of line\n) 3.e5 *');
    check("headers", tok.headers.Side === "black" && tok.headers.Event === "X", tok.headers);
    const moves = tok.tokens.filter((t) => t.type === "move").map((t) => t.san);
    check("moves without numbers, NAGs, annotations", moves.join(" ") === "e4 c6 d4 d5 e5 e5", moves);
    check("line comment skipped", !tok.tokens.some((t) => t.type === "comment" && /rest/.test(t.text)));
    check("comment de/en", JSON.stringify(R.parseComment("de: Hallo || en: Hello")) === '{"de":"Hallo","en":"Hello"}');
    check("comment en/de order", R.parseComment("en: Hi || de: Hallo").de === "Hallo");
    check("plain comment both languages", R.parseComment("Just text").de === "Just text");
    check("empty comment is null", R.parseComment("   ") === null);
  }

  section("2 PGN -> pack");
  {
    const pgn = '[Side "black"]\n1. e4 c6 {de: Caro || en: Caro} 2. d4 (2. Nc3 d5) 2... d5 3. Nc3 (3. Nd2 dxe4 4. Nxe4) 3... dxe4 4. Nxe4 Bf5 *';
    const { pack, warnings } = R.packFromPgn(pgn, Chess);
    check("side", pack.side === "b");
    check("no warnings", warnings.length === 0, warnings);
    const after1 = pack.pos[key("e4")];
    check("first black move", after1.m.length === 1 && after1.m[0].s === "c6", after1);
    check("comment on edge", after1.m[0].c && after1.m[0].c.en === "Caro");
    const opp = pack.pos[key("e4 c6")];
    check("two white replies", opp.m.map((e) => e.s).join(",") === "d4,Nc3", opp.m);
    const tr1 = key("e4 c6 d4 d5 Nc3 dxe4 Nxe4"), tr2 = key("e4 c6 d4 d5 Nd2 dxe4 Nxe4");
    check("transposition: same key", tr1 === tr2);
    check("transposition: Bf5 known via both", pack.pos[tr1].m[0].s === "Bf5");
    check("my positions (Nc3 and Nd2 lines differ until 4.Nxe4)", R.myPositions(pack).length === 6, R.myPositions(pack).length);
    check("valid", R.validatePack(pack).length === 0, R.validatePack(pack));

    let err = "";
    try { R.packFromPgn("1. e4 e5\n2. Ke3 *", Chess); } catch (e) { err = e.message; }
    check("illegal move named with line", /Ke3/.test(err) && /line 2/.test(err), err);
    err = "";
    try { R.packFromPgn("1. e4 e5 (1... c5 2. Nf3", Chess); } catch (e) { err = e.message; }
    check("unclosed variation", /Unclosed/.test(err), err);

    const two = R.packFromPgn('[Side "white"]\n1. e4 (1. d4) e5 *', Chess);
    check("second repertoire move is reported", two.warnings.length === 1 && two.warnings[0].kind === "second_repertoire_move", two.warnings);
    check("first repertoire move kept", two.pack.pos[two.pack.root].m.length === 1 && two.pack.pos[two.pack.root].m[0].s === "e4");
  }

  section("3 reach and depth");
  {
    const { pack } = R.packFromPgn('[Side "white"]\n1. e4 e5 (1... c5 2. Nc3) (1... d6 2. d4 Nf6 3. Nc3 g6 4. f4) (1... g6 2. d4 Bg7 3. Nc3 d6 4. f4 Nf6) 2. Nc3 *', Chess);
    const reach = R.reachProbabilities(pack);
    check("root is 1", reach[pack.root] === 1);
    const afterE4 = key("e4");
    const sum = pack.pos[afterE4].m.reduce((s, e) => s + reach[e.t], 0);
    check("replies split the probability", Math.abs(sum - 1) < 1e-9, sum);
    check("main line counts double without stats", Math.abs(reach[key("e4 e5")] - 0.4) < 1e-9, reach[key("e4 e5")]);
    const p1 = key("e4 d6 d4 Nf6 Nc3 g6 f4"), p2 = key("e4 g6 d4 Bg7 Nc3 d6 f4 Nf6");
    check("different positions keep different keys", p1 !== p2 && pack.pos[p1] && pack.pos[p2]);
    const d = R.depths(pack);
    check("depth counts plies", d[key("e4 e5")] === 2, d[key("e4 e5")]);
    const withStats = { m: [{ n: 90 }, { n: 10 }] };
    const w = R.replyWeights(withStats);
    check("weights follow game counts", w[0] > w[1] * 8, w);
  }

  section("4 shipped repertoires");
  for (const f of ["vienna", "caro-kann", "slav"]) {
    const pgn = fs.readFileSync(path.join(ROOT, "repertoire", f + ".pgn"), "utf8");
    let res;
    try { res = R.packFromPgn(pgn, Chess); } catch (e) { check(f + " parses", false, e.message); continue; }
    const { pack, warnings } = res;
    check(f + " parses without warnings", warnings.length === 0, warnings);
    check(f + " valid", R.validatePack(pack).length === 0);
    const mine = R.myPositions(pack);
    check(f + " exactly one move per own position", mine.every((k) => pack.pos[k].m.length === 1));
    check(f + " has comments in both languages", Object.values(pack.pos).some((p) => p.m.some((e) => e.c && e.c.de !== e.c.en)));
    const shipped = fs.readFileSync(path.join(ROOT, "packs", f + ".js"), "utf8");
    const json = JSON.parse(shipped.slice(shipped.indexOf(".push(") + 6, shipped.lastIndexOf(");")));
    // The shipped pack may hold more (explorer), but every PGN move must be in it, unchanged.
    const missing = mine.filter((k) => !json.pos[k] || !json.pos[k].m.length || json.pos[k].m[0].u !== pack.pos[k].m[0].u);
    check(f + " shipped pack contains every PGN move", missing.length === 0, missing.slice(0, 3).map((k) => [k, pack.pos[k].m[0].s, json.pos[k] && json.pos[k].m[0] && json.pos[k].m[0].s]));
    console.log("  " + f + ": " + Object.keys(pack.pos).length + " positions, " + mine.length + " to learn");
  }

  section("4b levels");
  {
    check("level tag parsed", JSON.stringify(R.parseLevel("level 2: de: Zwei || en: Two")) === '{"n":2,"name":{"de":"Zwei","en":"Two"}}');
    check("level tag without name", R.parseLevel("level 3").n === 3 && R.parseLevel("level 3").name === null);
    check("normal comment is no level", R.parseLevel("de: Text || en: Text") === null);
    const pgn = '[Side "white"]\n[Level1De "Eins"]\n[Level1En "One"]\n1. e4 e5 (1... c5 {level 3: de: Drei || en: Three} 2. Nc3) (1... e6 {level 2: de: Zwei || en: Two} 2. d4) 2. Nf3 Nc6 (2... d6 {level 2} 3. d4) 3. Bb5 *';
    const { pack } = R.packFromPgn(pgn, Chess);
    const L = R.assignLevels(pack);
    check("levels in order with names", L.levels.map((l) => l.n + ":" + l.name.en).join(",") === "1:One,2:Two,3:Three", L.levels);
    check("tagged reply starts its level", L.levelOf[key("e4 c5")] === 3 && L.levelOf[key("e4 e6")] === 2);
    check("untagged moves inherit", L.levelOf[key("e4 e5 Nf3 Nc6")] === 1 && L.levelOf[key("e4 e5 Nf3 d6")] === 2);
    check("level sizes count own moves", L.levels.map((l) => l.size).join(",") === "3,2,1", L.levels.map((l) => l.size));
    // Transposition: reachable in level 1 and level 2 -> level 1
    const tr = R.packFromPgn('[Side "black"]\n1. e4 c6 2. d4 (2. Nc3 {level 2} d5 3. d4) 2... d5 *', Chess);
    const TL = R.assignLevels(tr.pack);
    check("transposition takes the lower level", TL.levelOf[key("e4 c6 d4 d5")] === 1);
    // Explorer reply next to tagged ones takes the highest sibling level
    const ex = R.packFromPgn('[Side "white"]\n1. e4 e5 (1... c5 {level 2} 2. Nc3) (1... e6 {level 3} 2. d4) 2. Nf3 *', Chess);
    const kE4 = key("e4");
    const c = new Chess(); c.move("e4"); c.move("d5");
    ex.pack.pos[kE4].m.push({ s: "d5", u: "d7d5", t: R.fenKey(c.fen()), x: 1 });
    ex.pack.pos[R.fenKey(c.fen())] = { m: [{ s: "exd5", u: "e4d5", t: "x" }] };
    ex.pack.pos["x"] = { m: [] };
    check("explorer reply joins the highest sibling level", R.assignLevels(ex.pack).levelOf[R.fenKey(c.fen())] === 3);
    // Own import without tags: automatic levels at the first choice
    const auto = R.packFromPgn('[Side "white"]\n1. e4 e5 (1... c5 2. Nf3) (1... e6 2. d4) 2. Nf3 *', Chess);
    const AL = R.assignLevels(auto.pack);
    check("automatic levels for imports", AL.auto && AL.levels.length === 3 && /e5/.test(AL.levels[0].name.en), AL.levels.map((l) => l.name.en));
    for (const f of ["vienna", "caro-kann", "slav"]) {
      const sh = fs.readFileSync(path.join(ROOT, "packs", f + ".js"), "utf8");
      const pk = JSON.parse(sh.slice(sh.indexOf(".push(") + 6, sh.lastIndexOf(");")));
      const PL = R.assignLevels(pk);
      check(f + " shipped pack has named levels", PL.levels.length >= 5 && PL.levels.every((l) => l.name.de && l.name.en && !/^Level /.test(l.name.de)), PL.levels.map((l) => l.name.de));
      check(f + " level 1 is small", PL.levels[0].size <= 10, PL.levels[0].size);
    }
    const S = require("../js/sync.js");
    const mp = S.merge({ v: 1, cards: {}, path: { vienna: { passed: { 1: 100 } } } }, { v: 1, cards: {}, path: { vienna: { passed: { 1: 50, 2: 200 } } }, resetAt: 0 });
    check("passed levels merge (union, earliest)", mp.path.vienna.passed[1] === 50 && mp.path.vienna.passed[2] === 200);
    check("reset clears passed levels", Object.keys(S.merge({ v: 1, cards: {}, path: { vienna: { passed: { 1: 100 } } } }, { v: 1, cards: {}, resetAt: 150 }).path).length === 0);
  }

  section("4c guides");
  {
    global.window = global.window || {};
    window.BOOKCLUB_GUIDES = [];
    for (const f of ["vienna", "caro-kann", "slav"]) eval(fs.readFileSync(path.join(ROOT, "guides", f + ".js"), "utf8"));
    check("three guides", window.BOOKCLUB_GUIDES.length === 3);
    for (const g of window.BOOKCLUB_GUIDES) {
      const packSrc = fs.readFileSync(path.join(ROOT, "packs", g.pack + ".js"), "utf8");
      const pk = JSON.parse(packSrc.slice(packSrc.indexOf(".push(") + 6, packSrc.lastIndexOf(");")));
      check(g.pack + " guide has 5-10 steps", g.steps.length >= 5 && g.steps.length <= 10, g.steps.length);
      g.steps.forEach((st, i) => {
        const where = g.pack + " step " + (i + 1);
        const c = new Chess();
        let ok = true;
        for (const san of st.moves.split(/\s+/).filter(Boolean)) {
          try { c.move(san); } catch (e) { ok = false; check(where + ": legal move " + san, false); break; }
        }
        if (!ok) return;
        check(where + ": texts in both languages", st.title.de && st.title.en && st.text.de && st.text.en && st.text.de !== st.text.en);
        (st.arrows || []).forEach((a) => {
          const m = /^(?:([xi]):)?([a-h][1-8])([a-h][1-8])$/.exec(a);
          check(where + ": arrow " + a + " well formed", !!m && m[2] !== m[3]);
          if (!m || m[1]) return;
          // A green arrow is a plan: a piece of the side it belongs to must stand on the start square.
          check(where + ": arrow " + a + " starts on a piece", !!c.get(m[2]), a);
        });
        (st.highlight || []).forEach((sq) => check(where + ": square " + sq, /^[a-h][1-8]$/.test(sq)));
        // The guide's position should be part of the repertoire (or right next to it).
        const k = R.fenKey(c.fen());
        check(where + ": position is in the repertoire", !!pk.pos[k], st.moves);
      });
    }
  }

  section("5 explorer extension (fake explorer)");
  {
    // Fake explorer: every legal move, the first ones most popular; one move scores terribly.
    const calls = [];
    global.fetch = async (url) => {
      const u = new URL(url);
      calls.push(u);
      const fen = u.searchParams.get("fen");
      const c = new Chess(fen);
      const PREF = ["e2e4", "e7e5", "b1c3", "g8f6", "b8c6", "c7c5"];
      const rank = (m) => { const i = PREF.indexOf(m.from + m.to); return i < 0 ? 99 : i; };
      const legal = c.moves({ verbose: true }).sort((a, b) => rank(a) - rank(b));
      const moves = legal.slice(0, 6).map((m, i) => {
        const n = [600, 250, 80, 40, 20, 10][i];
        const uci = m.from + m.to + (m.promotion || "");
        const bad = uci === "e2e4" && fen.startsWith("rnbqkbnr/pppppppp");   // make 1.e4 look bad for White
        return { uci, san: m.san, white: bad ? n * 0.2 : n * 0.5, draws: n * 0.1, black: bad ? n * 0.7 : n * 0.4 };
      });
      const total = moves.reduce((s, m) => s + m.white + m.draws + m.black, 0);
      return { ok: true, status: 200, json: async () => ({ white: total * 0.5, draws: total * 0.1, black: total * 0.4, moves, opening: { eco: "C25", name: "Test Opening" } }) };
    };
    const { pack, warnings } = R.packFromPgn('[Side "white"]\n1. e4 e5 2. Nc3 *', Chess);
    const opts = { ratings: "1200,1400,1600", speeds: "blitz,rapid", maxPly: 4, minShare: 0.05, minGames: 20, minNodeGames: 50, cacheDir: "none", pauseMs: 0 };
    await B.extendWithExplorer(pack, opts, warnings);
    B.prune(pack);
    check("rating and speed sent", calls[0].searchParams.get("ratings") === "1200,1400,1600" && calls[0].searchParams.get("speeds") === "blitz,rapid");
    const afterE4 = pack.pos[key("e4")];
    check("opponent replies added from explorer", afterE4.m.length >= 3, afterE4.m.map((e) => e.s));
    check("rare replies left out (4% and below)", afterE4.m.length === 3, afterE4.m.map((e) => [e.s, e.n]));
    check("PGN reply kept", afterE4.m.some((e) => e.s === "e5" && !e.x));
    check("replies sorted by games", afterE4.m.every((e, i, a) => i === 0 || (a[i - 1].n || 0) >= (e.n || 0)));
    check("game counts stored", afterE4.g > 0 && afterE4.m.every((e) => typeof e.n === "number"));
    check("opening name stored", afterE4.o === "C25 Test Opening");
    check("bad repertoire move reported", warnings.some((w) => w.kind === "rep_scores_low" && /e4/.test(w.text)), warnings.map((w) => w.kind));
    const autos = Object.values(pack.pos).reduce((s, p) => s + p.m.filter((e) => e.a).length, 0);
    check("missing own moves auto-picked and flagged", autos > 0 && warnings.some((w) => w.kind === "auto_pick"), autos);
    const d = R.depths(pack);
    check("explorer stops at max ply", Object.keys(pack.pos).every((k) => d[k] <= opts.maxPly + 1), Math.max(...Object.keys(pack.pos).map((k) => d[k])));
    check("every own position still has one move", R.myPositions(pack).every((k) => pack.pos[k].m.length === 1));
    check("pack valid after extension", R.validatePack(pack).length === 0, R.validatePack(pack));

    // Reach limit: a tree that would explode under the share rule alone stays small.
    global.fetch = async (url) => {
      const fen = new URL(url).searchParams.get("fen");
      const legal = new Chess(fen).moves({ verbose: true }).slice(0, 5);
      const moves = legal.map((m) => ({ uci: m.from + m.to, san: m.san, white: 2000, draws: 0, black: 2000 }));
      return { ok: true, status: 200, json: async () => ({ white: 10000, draws: 0, black: 10000, moves }) };
    };
    const wide = R.packFromPgn('[Side "black"]\n1. e4 c6 *', Chess);
    await B.extendWithExplorer(wide.pack, { ...opts, maxPly: 30, minShare: 0.05, minReach: 0.01 }, wide.warnings);
    const nWide = Object.keys(wide.pack.pos).length;
    check("reach limit keeps the tree small", nWide < 200, nWide);
    check("Black's pack does not add other first moves", wide.pack.pos[wide.pack.root].m.length === 1, wide.pack.pos[wide.pack.root].m.map((e) => e.s));

    // Lichess spells castling as king-takes-rook.
    const castleFen = "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    const norm = B.normalizeMoves(castleFen, [{ uci: "e1h1", san: "O-O", white: 5, draws: 1, black: 4 }, { uci: "zzzz", san: "Qh9" }]);
    check("castling e1h1 becomes e1g1", norm.length === 1 && norm[0].uci === "e1g1" && norm[0].white === 5, norm);
    global.fetch = async (url) => {
      const fen = new URL(url).searchParams.get("fen");
      const canCastle = new Chess(fen).moves().includes("O-O") && fen.split(" ")[1] === "w";
      const moves = canCastle ? [{ uci: "e1h1", san: "O-O", white: 300, draws: 50, black: 250 }] : [];
      return { ok: true, status: 200, json: async () => ({ white: 300, draws: 50, black: 250, moves }) };
    };
    const castle = R.packFromPgn('[Side "white"]\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *', Chess);
    await B.extendWithExplorer(castle.pack, { ...opts, maxPly: 8, minReach: 0 }, castle.warnings);
    const after = castle.pack.pos[key("e4 e5 Nf3 Nc6 Bc4 Bc5")];
    check("explorer castling auto-pick works", after.m.length === 1 && after.m[0].s === "O-O" && after.m[0].u === "e1g1", after.m);

    global.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
    let err = "";
    try { await B.explorer(R.START_FEN, { ...opts }); } catch (e) { err = e.message; }
    check("401 explains the token", /token/i.test(err) && /lichess.org\/account\/oauth\/token/.test(err), err);

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bookclub-"));
    let n = 0;
    global.fetch = async () => { n++; return { ok: true, status: 200, json: async () => ({ white: 1, draws: 0, black: 0, moves: [] }) }; };
    await B.explorer(R.START_FEN, { ...opts, cacheDir: tmp });
    await B.explorer(R.START_FEN, { ...opts, cacheDir: tmp });
    check("cache answers the second call", n === 1, n);
  }

  section("6 merging progress from two devices");
  {
    const S = require("../js/sync.js");
    const phone = { v: 1, lang: "de", newPerDay: 8, settingsAt: 100, cards: { "a|x": { box: 3, t: 500, seen: 4 }, "a|y": { box: 1, t: 200, seen: 1 } }, days: { "2026-10-01": { reviews: 5, right: 4, fresh: 2 } }, custom: [] };
    const laptop = { v: 1, lang: "en", newPerDay: 12, settingsAt: 300, cards: { "a|x": { box: 1, t: 400, seen: 5 }, "a|z": { box: 2, t: 100, seen: 2 } }, days: { "2026-10-01": { reviews: 7, right: 3, fresh: 1 } }, custom: [] };
    const m = S.merge(phone, laptop);
    check("newer answer wins per card", m.cards["a|x"].box === 3, m.cards["a|x"]);
    check("cards from both devices kept", m.cards["a|y"] && m.cards["a|z"]);
    check("settings from the device that changed them last", m.lang === "en" && m.newPerDay === 12, [m.lang, m.newPerDay]);
    check("day statistics take the larger number", m.days["2026-10-01"].reviews === 7 && m.days["2026-10-01"].right === 4);
    check("merge is symmetric for cards", !S.differs(S.merge(laptop, phone).cards, m.cards));
    check("merging twice changes nothing", !S.differs(S.merge(m, laptop), m));
    const reset = Object.assign({}, laptop, { cards: {}, days: {}, resetAt: 450 });
    const afterReset = S.merge(phone, reset);
    check("reset wins over older answers", !afterReset.cards["a|y"] && !afterReset.cards["a|z"], Object.keys(afterReset.cards));
    check("answers after the reset survive", !!afterReset.cards["a|x"]);
    const withPack = Object.assign({}, phone, { custom: [{ id: "custom-x", addedAt: 50 }], cards: { "custom-x|k": { box: 2, t: 60 } } });
    const removedIt = Object.assign({}, laptop, { removed: { "custom-x": 70 } });
    const mr = S.merge(withPack, removedIt);
    check("removed own repertoire stays removed", mr.custom.length === 0 && !mr.cards["custom-x|k"], mr.custom);
    check("re-imported repertoire comes back", S.merge(mr, { v: 1, cards: {}, custom: [{ id: "custom-x", addedAt: 90 }] }).custom.length === 1);
    check("state check", S.isState(m) && !S.isState({ v: 2 }) && !S.isState(null));
  }

  section("7 server");
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bookclub-srv-"));
    process.env.DATA_DIR = tmp;
    process.env.BASE_PATH = "/bookclub/";
    const { server } = require("../server/server.js");
    await new Promise((r) => server.listen(0, r));
    const base = "http://127.0.0.1:" + server.address().port;
    const realFetch = require("http");
    const req = (method, p, body) => new Promise((resolve, reject) => {
      const data = body === undefined ? null : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
      const r = realFetch.request(base + p, { method, headers: data ? { "Content-Type": "application/json", "Content-Length": data.length } : {} }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null; try { json = JSON.parse(text); } catch (e) { /* not json */ }
          resolve({ status: res.statusCode, headers: res.headers, text, json });
        });
      });
      r.on("error", reject);
      if (data) r.write(data);
      r.end();
    });
    let r = await req("GET", "/bookclub");
    check("/bookclub redirects to /bookclub/", r.status === 301 && r.headers.location === "/bookclub/", r.status);
    r = await req("GET", "/bookclub/");
    check("serves the app", r.status === 200 && /book club/.test(r.text) && /no-cache/.test(r.headers["cache-control"]));
    r = await req("GET", "/bookclub/packs/vienna.js");
    check("serves packs", r.status === 200 && /javascript/.test(r.headers["content-type"]));
    r = await req("GET", "/bookclub/server/server.js");
    check("does not serve its own source or data", r.status === 404);
    r = await req("GET", "/bookclub/../tools/selftest.js");
    check("no path tricks", r.status === 404 || r.status === 400, r.status);
    r = await req("GET", "/bookclub/api/progress");
    check("empty progress at start", r.status === 200 && r.json.bookclub === 1 && r.json.rev === 0 && r.json.state === null, r.json);
    check("progress is never cached", r.headers["cache-control"] === "no-store");
    const st = { v: 1, cards: { "vienna|k": { box: 2, t: 1 } }, days: {} };
    r = await req("PUT", "/bookclub/api/progress", { rev: 0, state: st });
    check("save accepted", r.status === 200 && r.json.rev === 1, r.json);
    r = await req("PUT", "/bookclub/api/progress", { rev: 0, state: st });
    check("stale save rejected with the current copy", r.status === 409 && r.json.rev === 1 && r.json.state.cards["vienna|k"], r.status);
    r = await req("PUT", "/bookclub/api/progress", { rev: 1, state: { v: 9 } });
    check("foreign data rejected", r.status === 400, r.status);
    r = await req("PUT", "/bookclub/api/progress", "{not json");
    check("broken JSON rejected", r.status === 400, r.status);
    check("progress file written", JSON.parse(fs.readFileSync(path.join(tmp, "progress.json"), "utf8")).rev === 1);
    const backups = fs.readdirSync(path.join(tmp, "backups"));
    check("daily backup written", backups.length === 1 && /^progress-\d{4}-\d{2}-\d{2}\.json$/.test(backups[0]), backups);
    check("no temp files left", fs.readdirSync(tmp).every((f) => !/tmp/.test(f)));
    await new Promise((r2) => server.close(r2));
  }

  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})();
