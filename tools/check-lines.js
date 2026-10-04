#!/usr/bin/env node
/* Book Club – check every repertoire move with Stockfish.
 *
 *   npm install --no-save stockfish@16
 *   node tools/check-lines.js [depth=14]
 *
 * Prints each own move that loses 40+ centipawns against the engine's best
 * move ("BAD" from 80). Opening theory and engines disagree now and then; this
 * is about catching hanging pieces and missed mates, not about grandmaster prep.
 */
global.window = global;
const path = require("path");
const ChessJS = require("../vendor/chess.js");
const R = require("../js/repertoire.js");
const fs = require("fs");
const { spawn } = require("child_process");
window.BOOKCLUB_PACKS = [];
for (const f of ["vienna", "caro-kann", "slav"]) eval(fs.readFileSync(path.join(__dirname, "..", "packs", f + ".js"), "utf8"));
const p = spawn("node", [path.join(__dirname, "..", "node_modules", "stockfish", "src", "stockfish-nnue-16.js")]);
let pending = null, lines = "";
p.stdout.on("data", (d) => {
  lines += d.toString();
  let i;
  while ((i = lines.indexOf("\n")) >= 0) {
    const l = lines.slice(0, i); lines = lines.slice(i + 1);
    if (pending) pending.onLine(l);
  }
});
const send = (s) => p.stdin.write(s + "\n");
function search(fen, extra, depth) {
  return new Promise((res) => {
    let score = null, pv = null;
    pending = { onLine: (l) => {
      const m = /score (cp|mate) (-?\d+).* pv (\S+)/.exec(l);
      if (m && / multipv 1 /.test(l + " ")) { score = m[1] === "cp" ? +m[2] : (m[2] > 0 ? 10000 : -10000); pv = m[3]; }
      else if (m) { score = m[1] === "cp" ? +m[2] : (m[2] > 0 ? 10000 : -10000); pv = m[3]; }
      if (l.startsWith("bestmove")) { pending = null; res({ score, best: l.split(" ")[1], pv }); }
    } };
    send("position fen " + fen);
    send("go depth " + depth + (extra ? " searchmoves " + extra : ""));
  });
}
(async () => {
  send("uci"); send("setoption name Threads value 4"); send("setoption name Hash value 128");
  await new Promise((r) => setTimeout(r, 1500));
  const depth = +(process.argv[2] || 14);
  for (const pack of window.BOOKCLUB_PACKS) {
    const mine = R.myPositions(pack);
    console.log("## " + pack.id + " (" + mine.length + ")");
    for (const k of mine) {
      const fen = R.keyToFen(k);
      const rep = pack.pos[k].m[0];
      const best = await search(fen, null, depth);
      if (best.best === rep.u) continue;
      const mineScore = await search(fen, rep.u, depth);
      const loss = best.score - mineScore.score;
      const c = new ChessJS.Chess(fen);
      const bestSan = c.move({ from: best.best.slice(0, 2), to: best.best.slice(2, 4), promotion: "q" }).san;
      const tag = loss >= 80 ? "BAD " : loss >= 40 ? "warn" : "ok  ";
      if (loss >= 40) console.log(tag + " loss " + loss + "cp  rep " + rep.s + " (" + mineScore.score + ")  best " + bestSan + " (" + best.score + ")  " + fen);
    }
  }
  send("quit");
  setTimeout(() => process.exit(0), 500);
})();
