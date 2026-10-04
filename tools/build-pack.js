#!/usr/bin/env node
/* Book Club – build a repertoire pack.
 *
 *   node tools/build-pack.js repertoire/vienna.pgn                 # PGN only, no network
 *   node tools/build-pack.js repertoire/vienna.pgn --explorer      # + Lichess opening explorer
 *   node tools/build-pack.js repertoire/*.pgn --explorer           # several at once
 *
 * With --explorer the script walks the repertoire and asks the Lichess
 * opening explorer, position by position, what players at the chosen rating
 * actually play:
 *   - opponent positions get every reply with at least --min-share of the games,
 *   - each move gets its game count and results (the app weights replies by it),
 *   - where your PGN has no move for your side, the script picks the best
 *     scoring popular move and marks it "auto" so you can review it,
 *   - repertoire moves that score badly at that rating are reported.
 *
 * Options (defaults in brackets):
 *   --ratings 1200,1400,1600   Lichess rating buckets of the players
 *   --speeds blitz,rapid       time controls
 *   --max-ply 18               how deep the explorer extends the tree (half-moves)
 *   --min-share 0.05           smallest share of games for an opponent reply
 *   --min-games 40             smallest game count for any move taken from the explorer
 *   --min-node-games 300       stop extending below positions with fewer games
 *   --out packs                output folder
 *   --token <t>                Lichess API token (or env LICHESS_TOKEN)
 *
 * Answers are cached in tools/.cache, so a second run costs nothing.
 * Needs Node 18 or newer (built-in fetch). No npm install.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Chess } = require("../vendor/chess.js");
const R = require("../js/repertoire.js");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(__dirname, ".cache");
const EXPLORER = "https://explorer.lichess.ovh/lichess";

function parseArgs(argv) {
  const opts = {
    files: [], explorer: false, ratings: "1200,1400,1600", speeds: "blitz,rapid",
    maxPly: 18, minShare: 0.05, minGames: 40, minNodeGames: 300,
    out: path.join(ROOT, "packs"), token: process.env.LICHESS_TOKEN || ""
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--explorer") opts.explorer = true;
    else if (a === "--ratings") opts.ratings = next();
    else if (a === "--speeds") opts.speeds = next();
    else if (a === "--max-ply") opts.maxPly = Number(next());
    else if (a === "--min-share") opts.minShare = Number(next());
    else if (a === "--min-games") opts.minGames = Number(next());
    else if (a === "--min-node-games") opts.minNodeGames = Number(next());
    else if (a === "--out") opts.out = path.resolve(next());
    else if (a === "--token") opts.token = next();
    else if (a === "-h" || a === "--help") { printHelp(); process.exit(0); }
    else if (a.startsWith("--")) { console.error("Unknown option " + a); process.exit(2); }
    else opts.files.push(a);
  }
  if (!opts.files.length) { printHelp(); process.exit(2); }
  return opts;
}

function printHelp() {
  const src = fs.readFileSync(__filename, "utf8");
  const head = src.split("*/")[0].replace(/^#!.*\n/, "");
  console.log(head.split("\n").map((l) => l.replace(/^\s*\/?\*\s?/, "")).join("\n").trim());
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

async function explorer(fen, opts) {
  const params = new URLSearchParams({
    variant: "standard", fen, speeds: opts.speeds, ratings: opts.ratings,
    moves: "15", topGames: "0", recentGames: "0"
  });
  const url = EXPLORER + "?" + params.toString();
  const cacheDir = opts.cacheDir || CACHE;
  const file = path.join(cacheDir, crypto.createHash("sha1").update(url).digest("hex") + ".json");
  if (cacheDir !== "none" && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));

  for (let attempt = 1; attempt <= 5; attempt++) {
    const wait = lastRequest + (opts.pauseMs === undefined ? 2500 : opts.pauseMs) - Date.now();   // slow enough for the Lichess rate limit
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    const headers = { "User-Agent": "BookClub-opening-trainer (github.com/doodelidodo)" };
    if (opts.token) headers.Authorization = "Bearer " + opts.token;
    let res;
    try { res = await fetch(url, { headers }); } catch (e) {
      console.warn("  network error (" + e.message + "), retry " + attempt);
      await sleep(5000 * attempt);
      continue;
    }
    if (res.status === 429) {
      console.warn("  rate limited by Lichess, waiting 60 s");
      await sleep(60000);
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "The Lichess explorer refused the request (HTTP " + res.status + "). " +
        "Create a personal token at https://lichess.org/account/oauth/token (no scopes needed) " +
        "and run again with LICHESS_TOKEN=<token> or --token <token>."
      );
    }
    if (!res.ok) throw new Error("Explorer answered HTTP " + res.status + " for " + url);
    const data = await res.json();
    if (cacheDir !== "none") {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data));
    }
    return data;
  }
  throw new Error("Explorer not reachable after 5 attempts");
}

const total = (x) => (x.white || 0) + (x.draws || 0) + (x.black || 0);
const scoreFor = (x, side) => {
  const n = total(x);
  if (!n) return null;
  return ((side === "w" ? x.white : x.black) + x.draws / 2) / n;
};
const pct = (x) => Math.round(x * 100) + "%";

/**
 * Lichess writes castling as "king takes rook" (e1h1, e8a8). chess.js and the
 * packs use the usual king move (e1g1, e8c8). Re-derive every move from its SAN
 * so both spellings meet; moves chess.js can't play are dropped.
 */
function normalizeMoves(fen, moves) {
  const out = [];
  (moves || []).forEach((m) => {
    let mv = null;
    try { mv = new Chess(fen).move(m.san); } catch (e) { mv = null; }
    if (!mv) return;
    out.push(Object.assign({}, m, { uci: R.uciOf(mv), san: mv.san }));
  });
  return out;
}

async function extendWithExplorer(pack, opts, warnings) {
  const depth = {};
  depth[pack.root] = 0;
  const queue = [pack.root];
  const visited = new Set();
  let requests = 0;

  while (queue.length) {
    const key = queue.shift();
    if (visited.has(key)) continue;
    visited.add(key);
    const pos = pack.pos[key];
    const ply = depth[key];
    const mine = R.sideOf(key) === pack.side;

    // PGN moves are always followed, explorer additions only up to max-ply.
    const fen = R.keyToFen(key);
    const data = await explorer(fen, opts);
    requests++;
    if (requests % 25 === 0) console.log("  " + requests + " positions asked, " + queue.length + " waiting");
    const moves = normalizeMoves(fen, data.moves);
    const games = total(data);
    pos.g = games;
    if (data.opening && data.opening.name) pos.o = (data.opening.eco ? data.opening.eco + " " : "") + data.opening.name;

    const stats = {};
    moves.forEach((m) => { stats[m.uci] = m; });
    const extend = ply < opts.maxPly && games >= opts.minNodeGames;

    // Stats onto the moves we already have.
    pos.m.forEach((e) => {
      const s = stats[e.u];
      e.n = s ? total(s) : 0;
      if (s) { e.w = s.white; e.d = s.draws; e.b = s.black; }
    });

    if (mine) {
      if (!pos.m.length && extend) {
        // Pick: popular enough, then best score for us.
        const candidates = moves.filter(
          (m) => total(m) >= opts.minGames && total(m) / games >= Math.max(opts.minShare, 0.08)
        );
        candidates.sort((a, b) => scoreFor(b, pack.side) - scoreFor(a, pack.side) || total(b) - total(a));
        const pick = candidates[0];
        if (pick) {
          const board = new Chess(fen);
          const mv = board.move({ from: pick.uci.slice(0, 2), to: pick.uci.slice(2, 4), promotion: pick.uci[4] });
          const t = R.fenKey(board.fen());
          if (!pack.pos[t]) pack.pos[t] = { m: [] };
          pos.m.push({ s: mv.san, u: pick.uci, t, n: total(pick), w: pick.white, d: pick.draws, b: pick.black, x: 1, a: 1 });
          warnings.push({
            kind: "auto_pick", where: ply,
            text: "Picked " + mv.san + " (" + pct(scoreFor(pick, pack.side)) + " score, " + total(pick) + " games) in " + key
          });
        }
      } else if (pos.m.length && games >= opts.minNodeGames) {
        const e = pos.m[0];
        const s = stats[e.u];
        if (!s) warnings.push({ kind: "rep_unplayed", where: ply, text: e.s + " is not played at this rating in " + key });
        else {
          const sc = scoreFor(s, pack.side);
          const share = total(s) / games;
          if (total(s) >= opts.minGames && sc < 0.45) {
            warnings.push({ kind: "rep_scores_low", where: ply, text: e.s + " scores only " + pct(sc) + " (" + total(s) + " games) in " + key });
          } else if (share < 0.02) {
            warnings.push({ kind: "rep_rare", where: ply, text: e.s + " is rare here (" + pct(share) + " of games), worth a check: " + key });
          }
        }
      }
      if (pos.m[0]) {
        const t = pos.m[0].t;
        if (depth[t] === undefined) depth[t] = ply + 1;
        queue.push(t);
      }
    } else {
      if (extend) {
        moves.forEach((m) => {
          const n = total(m);
          if (n < opts.minGames || n / games < opts.minShare) return;
          if (pos.m.some((e) => e.u === m.uci)) return;
          const board = new Chess(fen);
          const mv = board.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
          const t = R.fenKey(board.fen());
          if (!pack.pos[t]) pack.pos[t] = { m: [] };
          pos.m.push({ s: mv.san, u: m.uci, t, n, w: m.white, d: m.draws, b: m.black, x: 1 });
        });
      }
      // Most played reply first.
      pos.m.sort((a, b) => (b.n || 0) - (a.n || 0));
      pos.m.forEach((e) => {
        if (depth[e.t] === undefined) depth[e.t] = ply + 1;
        queue.push(e.t);
      });
    }
  }
  return requests;
}

function prune(pack) {
  // Drop positions that are no longer reachable along repertoire edges.
  const keep = new Set(R.topoOrder(pack));
  Object.keys(pack.pos).forEach((k) => { if (!keep.has(k)) delete pack.pos[k]; });
}

function summary(pack) {
  const mine = R.myPositions(pack).length;
  const auto = Object.values(pack.pos).reduce((s, p) => s + p.m.filter((e) => e.a).length, 0);
  return Object.keys(pack.pos).length + " positions, " + mine + " to learn" + (auto ? ", " + auto + " auto-picked" : "");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  fs.mkdirSync(opts.out, { recursive: true });
  for (const file of opts.files) {
    const pgn = fs.readFileSync(file, "utf8");
    const { pack, warnings } = R.packFromPgn(pgn, Chess);
    console.log("\n" + pack.name.en + " (" + path.basename(file) + ")");
    if (opts.explorer) {
      const n = await extendWithExplorer(pack, opts, warnings);
      pack.built = {
        at: new Date().toISOString().slice(0, 10), source: "explorer",
        ratings: opts.ratings, speeds: opts.speeds, minShare: opts.minShare, maxPly: opts.maxPly
      };
      console.log("  " + n + " positions looked up");
    }
    prune(pack);
    const errors = R.validatePack(pack);
    if (errors.length) throw new Error("Pack invalid: " + errors.join("; "));
    const target = path.join(opts.out, pack.id + ".js");
    const js =
      "/* Book Club repertoire pack – generated by tools/build-pack.js from " + path.basename(file) + ".\n" +
      "   Move statistics: Lichess opening explorer, lichess.org database (CC0). Do not edit by hand. */\n" +
      "(window.BOOKCLUB_PACKS = window.BOOKCLUB_PACKS || []).push(" + JSON.stringify(pack) + ");\n";
    fs.writeFileSync(target, js);
    console.log("  " + summary(pack) + " -> " + path.relative(process.cwd(), target));
    const byKind = {};
    warnings.forEach((w) => { (byKind[w.kind] = byKind[w.kind] || []).push(w); });
    Object.keys(byKind).forEach((k) => {
      console.log("  " + k + " (" + byKind[k].length + "):");
      byKind[k].slice(0, 40).forEach((w) => console.log("    - " + w.text));
      if (byKind[k].length > 40) console.log("    … " + (byKind[k].length - 40) + " more");
    });
  }
}

if (require.main === module) {
  main().catch((e) => { console.error("\n" + e.message); process.exit(1); });
}
module.exports = { extendWithExplorer, prune, explorer, normalizeMoves };
