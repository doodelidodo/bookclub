/* Book Club – repertoire core.
 *
 * Shared by the browser app and tools/build-pack.js:
 *   - PGN with variations and {de: … || en: …} comments  ->  pack
 *   - a pack is a graph of positions, keyed by FEN without move counters,
 *     so transpositions land on the same position automatically.
 *
 * Pack format (version 1):
 *   {
 *     v: 1, id, side: "w" | "b", name: {de, en}, blurb: {de, en},
 *     built: { at, source: "pgn" | "explorer", ratings?, speeds? },
 *     root: <key>,
 *     pos: {
 *       <key>: {
 *         m: [ { s: SAN, u: UCI, t: <key>,      // move and target position
 *                n?: games, w?, d?, b?,         // explorer stats (white wins / draws / black wins)
 *                c?: {de, en},                  // comment shown after the move
 *                x?: 1,                         // added from the explorer, not in the PGN
 *                a?: 1 } ],                     // repertoire move picked by the script, please review
 *         g?: games in this position, o?: opening name
 *       }
 *     }
 *   }
 * In positions where the repertoire side is to move, m[0] is the repertoire move.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.Repertoire = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  /** Position key: placement, side to move, castling, en passant. No move counters. */
  function fenKey(fen) {
    return fen.split(" ").slice(0, 4).join(" ");
  }
  function keyToFen(key) {
    return key + " 0 1";
  }
  function sideOf(key) {
    return key.split(" ")[1];
  }

  /** "{de: Text || en: Text}" -> {de, en}; plain text is used for both languages. */
  function parseComment(raw) {
    var text = raw.replace(/\s+/g, " ").trim();
    if (!text) return null;
    var m = /^de:\s*([\s\S]*?)\s*\|\|\s*en:\s*([\s\S]*)$/i.exec(text);
    if (m) return { de: m[1].trim(), en: m[2].trim() };
    m = /^en:\s*([\s\S]*?)\s*\|\|\s*de:\s*([\s\S]*)$/i.exec(text);
    if (m) return { de: m[2].trim(), en: m[1].trim() };
    return { de: text, en: text };
  }

  /** Splits PGN into headers and movetext tokens. */
  function tokenize(pgn) {
    var headers = {};
    var body = pgn.replace(/\r\n?/g, "\n").replace(/^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm, function (_, k, v) {
      headers[k] = v.replace(/\\"/g, '"');
      return "";
    });
    var tokens = [];
    var i = 0, line = 1;
    while (i < body.length) {
      var ch = body[i];
      if (ch === "\n") { line++; i++; continue; }
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === "{") {
        var end = body.indexOf("}", i);
        if (end < 0) throw new Error("Unclosed comment starting on line " + line);
        var text = body.slice(i + 1, end);
        tokens.push({ type: "comment", text: text, line: line });
        line += (text.match(/\n/g) || []).length;
        i = end + 1;
        continue;
      }
      if (ch === ";") { var nl = body.indexOf("\n", i); i = nl < 0 ? body.length : nl; continue; }
      if (ch === "(" || ch === ")") { tokens.push({ type: ch, line: line }); i++; continue; }
      var j = i;
      while (j < body.length && !/[\s(){};]/.test(body[j])) j++;
      var word = body.slice(i, j);
      i = j;
      if (/^\$\d+$/.test(word)) continue;                       // NAG
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(word)) continue;       // result
      word = word.replace(/^\d+\.(\.\.)?/, "");                  // "12." / "12..." glued to the move
      if (!word || /^\.+$/.test(word)) continue;
      word = word.replace(/[!?]+$/, "");
      if (!word) continue;
      tokens.push({ type: "move", san: word, line: line });
    }
    return { headers: headers, tokens: tokens };
  }

  function emptyPack(headers) {
    var side = /^b/i.test(headers.Side || "white") ? "b" : "w";
    var id = (headers.Pack || headers.Event || "repertoire").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "repertoire";
    return {
      v: 1,
      id: id,
      side: side,
      name: { de: headers.NameDe || headers.Event || id, en: headers.NameEn || headers.Event || id },
      blurb: { de: headers.BlurbDe || "", en: headers.BlurbEn || "" },
      built: { at: new Date().toISOString().slice(0, 10), source: "pgn" },
      root: fenKey(headers.FEN || START_FEN),
      pos: {}
    };
  }

  function ensurePos(pack, key) {
    if (!pack.pos[key]) pack.pos[key] = { m: [] };
    return pack.pos[key];
  }

  /**
   * Adds an edge. In positions where the repertoire side moves, the first
   * move wins and a different one is reported, because a repertoire has
   * exactly one answer per position.
   */
  function addEdge(pack, fromKey, mv, toKey, warnings, where) {
    var p = ensurePos(pack, fromKey);
    ensurePos(pack, toKey);
    for (var i = 0; i < p.m.length; i++) {
      if (p.m[i].u === mv.u) return p.m[i];
    }
    if (sideOf(fromKey) === pack.side && p.m.length > 0) {
      warnings.push({
        kind: "second_repertoire_move", where: where,
        text: "Two repertoire moves in one position: kept " + p.m[0].s + ", ignored " + mv.s
      });
      return null;
    }
    var edge = { s: mv.s, u: mv.u, t: toKey };
    p.m.push(edge);
    return edge;
  }

  function uciOf(move) {
    return move.from + move.to + (move.promotion || "");
  }

  /**
   * PGN (with variations) -> pack. `Chess` is the chess.js constructor.
   * Returns { pack, warnings }. Illegal moves throw with the line number.
   */
  function packFromPgn(pgn, Chess) {
    var parsed = tokenize(pgn);
    var pack = emptyPack(parsed.headers);
    var warnings = [];
    var startFen = parsed.headers.FEN || START_FEN;
    ensurePos(pack, pack.root);

    // A frame is one line of play: current position, position before the
    // last move (where a variation branches off) and the last edge (for comments).
    var frame = { fen: startFen, before: null, edge: null };
    var stack = [];
    var pendingComment = null;

    parsed.tokens.forEach(function (tok) {
      if (tok.type === "(") {
        if (!frame.before) throw new Error("Variation without a preceding move (line " + tok.line + ")");
        stack.push(frame);
        frame = { fen: frame.before, before: null, edge: null };
        return;
      }
      if (tok.type === ")") {
        if (!stack.length) throw new Error("Unbalanced ')' on line " + tok.line);
        frame = stack.pop();
        return;
      }
      if (tok.type === "comment") {
        var c = parseComment(tok.text);
        if (!c) return;
        if (frame.edge) frame.edge.c = c;
        else pendingComment = c;
        return;
      }
      var board = new Chess(frame.fen);
      var move;
      try { move = board.move(tok.san, { strict: false }); } catch (e) { move = null; }
      if (!move) {
        throw new Error("Illegal move '" + tok.san + "' on line " + tok.line + " in position " + frame.fen);
      }
      var fromKey = fenKey(frame.fen);
      var toKey = fenKey(board.fen());
      var edge = addEdge(pack, fromKey, { s: move.san, u: uciOf(move) }, toKey, warnings, "line " + tok.line);
      if (edge && pendingComment) { edge.c = pendingComment; }
      pendingComment = null;
      frame = { fen: board.fen(), before: frame.fen, edge: edge };
    });
    if (stack.length) throw new Error("Unclosed variation at end of PGN");
    return { pack: pack, warnings: warnings };
  }

  /** Repertoire positions (side to move = pack side) that have a move. */
  function myPositions(pack) {
    return Object.keys(pack.pos).filter(function (k) {
      return sideOf(k) === pack.side && pack.pos[k].m.length > 0;
    });
  }

  /** Weights for the opponent's replies: explorer games, or PGN order (main line counts double). */
  function replyWeights(pos) {
    var hasStats = pos.m.some(function (e) { return typeof e.n === "number"; });
    return pos.m.map(function (e, i) {
      if (hasStats) return Math.max(e.n || 0, 0) + 0.5;
      return i === 0 ? 2 : 1;
    });
  }

  /**
   * How likely each position is to come up in a game, starting from 1 at the
   * root: opponent moves split the probability by weight, our move passes it on.
   * Positions reachable via several move orders add up.
   */
  function reachProbabilities(pack) {
    var order = topoOrder(pack);
    var prob = {};
    prob[pack.root] = 1;
    order.forEach(function (key) {
      var p = prob[key] || 0;
      var pos = pack.pos[key];
      if (!pos || !pos.m.length || !p) return;
      if (sideOf(key) === pack.side) {
        var t = pos.m[0].t;
        prob[t] = (prob[t] || 0) + p;
      } else {
        var w = replyWeights(pos);
        var sum = w.reduce(function (a, b) { return a + b; }, 0);
        pos.m.forEach(function (e, i) { prob[e.t] = (prob[e.t] || 0) + p * w[i] / sum; });
      }
    });
    return prob;
  }

  /** Topological order over the edges that are part of the repertoire (cycles are cut). */
  function topoOrder(pack) {
    var seen = {}, onStack = {}, out = [];
    function visit(key) {
      if (seen[key] || onStack[key]) return;
      onStack[key] = true;
      var pos = pack.pos[key];
      if (pos) {
        var edges = sideOf(key) === pack.side ? pos.m.slice(0, 1) : pos.m;
        edges.forEach(function (e) { visit(e.t); });
      }
      onStack[key] = false;
      seen[key] = true;
      out.push(key);
    }
    visit(pack.root);
    return out.reverse();
  }

  /** Depth (in plies) of the shortest path to each position. */
  function depths(pack) {
    var d = {};
    d[pack.root] = 0;
    var queue = [pack.root];
    while (queue.length) {
      var key = queue.shift();
      var pos = pack.pos[key];
      if (!pos) continue;
      var edges = sideOf(key) === pack.side ? pos.m.slice(0, 1) : pos.m;
      edges.forEach(function (e) {
        if (d[e.t] === undefined) { d[e.t] = d[key] + 1; queue.push(e.t); }
      });
    }
    return d;
  }

  function validatePack(pack) {
    var errors = [];
    if (!pack || pack.v !== 1) errors.push("not a version 1 pack");
    else {
      if (pack.side !== "w" && pack.side !== "b") errors.push("side must be w or b");
      if (!pack.pos || !pack.pos[pack.root]) errors.push("root position missing");
      Object.keys(pack.pos || {}).forEach(function (k) {
        (pack.pos[k].m || []).forEach(function (e) {
          if (!pack.pos[e.t]) errors.push("dangling move " + e.s + " in " + k);
        });
      });
    }
    return errors;
  }

  return {
    START_FEN: START_FEN,
    fenKey: fenKey,
    keyToFen: keyToFen,
    sideOf: sideOf,
    parseComment: parseComment,
    tokenize: tokenize,
    packFromPgn: packFromPgn,
    myPositions: myPositions,
    replyWeights: replyWeights,
    reachProbabilities: reachProbabilities,
    topoOrder: topoOrder,
    depths: depths,
    validatePack: validatePack,
    uciOf: uciOf
  };
});
