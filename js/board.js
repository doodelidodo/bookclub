/* Book Club – chessboard.
 *
 * Tap-tap and drag, mouse and touch. Lessons taken over from Knightmare's
 * trainer: pointer capture sits on the board element itself (it survives
 * re-rendering, so Safari's pointerup is never lost), and every new press,
 * window blur or pointercancel clears a stuck drag.
 *
 *   const b = new Board(el, { orientation: "w", onMove(from, to) -> bool })
 *   b.setPosition(fen, { lastMove: ["e2","e4"], movable: "w" })
 *   b.animate(from, to, fenAfter) -> Promise
 *   b.arrow(from, to, color) / b.clearArrows()
 *   b.mark(square, cls) / b.clearMarks()
 */
(function (root) {
  "use strict";
  var FILES = "abcdefgh";
  var COLORS = { good: "#3fb57f", bad: "#ff7a4d", info: "#8098ff" };

  function injectPieces() {
    if (document.getElementById("bookclub-pieces") || !root.BOOKCLUB_PIECES) return;
    var holder = document.createElement("div");
    holder.id = "bookclub-pieces";
    holder.innerHTML = root.BOOKCLUB_PIECES;
    document.body.appendChild(holder);
  }

  function pieceSvg(code) {
    return '<svg class="piece" viewBox="0 0 40 40" aria-hidden="true"><use href="#pc-' + code + '"/></svg>';
  }

  function parseFen(fen) {
    var rows = fen.split(" ")[0].split("/");
    var map = {};
    rows.forEach(function (row, i) {
      var rank = 8 - i, f = 0;
      for (var k = 0; k < row.length; k++) {
        var ch = row[k];
        if (/\d/.test(ch)) { f += Number(ch); continue; }
        var color = ch === ch.toUpperCase() ? "w" : "b";
        map[FILES[f] + rank] = color + ch.toLowerCase();
        f++;
      }
    });
    return map;
  }

  function Board(el, opts) {
    injectPieces();
    this.el = el;
    this.opts = opts || {};
    this.orientation = this.opts.orientation || "w";
    this.fen = "8/8/8/8/8/8/8/8 w - - 0 1";
    this.pieces = {};
    this.movable = null;           // "w", "b" or null
    this.selected = null;
    this.drag = null;
    this.lastMove = null;
    this.marks = {};
    this.arrowsList = [];
    this.chess = new root.ChessJS.Chess();
    el.classList.add("board");
    el.setAttribute("role", "img");
    this._bind();
  }

  Board.prototype.setOrientation = function (o) {
    this.orientation = o;
    this.render();
  };

  Board.prototype.setPosition = function (fen, o) {
    o = o || {};
    this.cancelDrag();
    this.fen = fen;
    this.pieces = parseFen(fen);
    try { this.chess.load(fen); } catch (e) { /* positions come from chess.js, so this should not happen */ }
    this.lastMove = o.lastMove || null;
    this.movable = o.movable || null;
    this.selected = null;
    this.marks = {};
    this.arrowsList = [];
    this.render();
  };

  Board.prototype.setMovable = function (color) {
    this.movable = color;
    this.selected = null;
    this.render();
  };

  Board.prototype.squareAt = function (clientX, clientY) {
    var r = this.el.getBoundingClientRect();
    var x = (clientX - r.left) / r.width, y = (clientY - r.top) / r.height;
    if (x < 0 || y < 0 || x >= 1 || y >= 1) return null;
    var col = Math.floor(x * 8), row = Math.floor(y * 8);
    if (this.orientation === "w") return FILES[col] + (8 - row);
    return FILES[7 - col] + (row + 1);
  };

  Board.prototype.squareRect = function (sq) {
    var f = FILES.indexOf(sq[0]), r = Number(sq[1]);
    var col = this.orientation === "w" ? f : 7 - f;
    var row = this.orientation === "w" ? 8 - r : r - 1;
    return { x: col, y: row };
  };

  Board.prototype.targetsFrom = function (sq) {
    try { return this.chess.moves({ square: sq, verbose: true }); } catch (e) { return []; }
  };

  Board.prototype.render = function () {
    var html = "";
    var targets = {};
    if (this.selected) {
      this.targetsFrom(this.selected).forEach(function (m) { targets[m.to] = m.captured ? "cap" : "dot"; });
    }
    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        var f = this.orientation === "w" ? col : 7 - col;
        var r = this.orientation === "w" ? 8 - row : row + 1;
        var sq = FILES[f] + r;
        var light = (f + r) % 2 === 1;
        var cls = "sq" + (light ? " light" : "");
        if (this.lastMove && (this.lastMove[0] === sq || this.lastMove[1] === sq)) cls += " last";
        if (this.selected === sq) cls += " sel";
        if (this.marks[sq]) cls += " " + this.marks[sq];
        if (targets[sq]) cls += " " + targets[sq];
        html += '<div class="' + cls + '" data-sq="' + sq + '">';
        if (row === 7) html += '<span class="coord file">' + FILES[f] + "</span>";
        if (col === 0) html += '<span class="coord rank">' + r + "</span>";
        var p = this.pieces[sq];
        if (p) html += pieceSvg(p).replace('class="piece"', 'class="piece' + (this.drag && this.drag.from === sq && this.drag.moved ? " lifted" : "") + '"');
        html += "</div>";
      }
    }
    html += this._arrowsSvg();
    this.el.innerHTML = html;
    if (this.drag && this.drag.ghost) this.el.appendChild(this.drag.ghost);
  };

  Board.prototype._arrowsSvg = function () {
    if (!this.arrowsList.length) return "";
    var self = this;
    var out = '<svg class="arrows" viewBox="0 0 8 8" aria-hidden="true"><defs>';
    Object.keys(COLORS).forEach(function (k) {
      out += '<marker id="ah-' + k + '" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.6" markerHeight="2.6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + COLORS[k] + '"/></marker>';
    });
    out += "</defs>";
    this.arrowsList.forEach(function (a) {
      var p1 = self.squareRect(a.from), p2 = self.squareRect(a.to);
      var x1 = p1.x + .5, y1 = p1.y + .5, x2 = p2.x + .5, y2 = p2.y + .5;
      var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
      x2 -= dx / len * .32; y2 -= dy / len * .32;
      out += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + COLORS[a.color] +
        '" stroke-width=".17" stroke-linecap="round" opacity=".88" marker-end="url(#ah-' + a.color + ')"/>';
    });
    return out + "</svg>";
  };

  Board.prototype.arrow = function (from, to, color) {
    this.arrowsList.push({ from: from, to: to, color: color || "good" });
    this.render();
  };
  Board.prototype.clearArrows = function () { this.arrowsList = []; this.render(); };
  Board.prototype.mark = function (sq, cls) { this.marks[sq] = cls; this.render(); };
  Board.prototype.clearMarks = function () { this.marks = {}; this.render(); };

  /** Slides a piece, then shows the position after the move. */
  Board.prototype.animate = function (from, to, fenAfter, o) {
    var self = this;
    o = o || {};
    return new Promise(function (resolve) {
      var piece = self.pieces[from];
      var reduce = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!piece || reduce || self.opts.instant) {
        self.setPosition(fenAfter, { lastMove: [from, to], movable: o.movable || null });
        resolve();
        return;
      }
      delete self.pieces[from];
      self.render();
      var a = self.squareRect(from), b = self.squareRect(to);
      var size = self.el.clientWidth / 8;
      var fly = document.createElement("div");
      fly.className = "flyer";
      fly.style.width = fly.style.height = size + "px";
      fly.style.left = a.x * size + "px";
      fly.style.top = a.y * size + "px";
      fly.innerHTML = pieceSvg(piece);
      self.el.appendChild(fly);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fly.style.transform = "translate(" + (b.x - a.x) * size + "px," + (b.y - a.y) * size + "px)";
        });
      });
      setTimeout(function () {
        self.setPosition(fenAfter, { lastMove: [from, to], movable: o.movable || null });
        resolve();
      }, 240);
    });
  };

  Board.prototype.shake = function () {
    var el = this.el;
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  };

  Board.prototype.cancelDrag = function () {
    if (this.drag && this.drag.ghost && this.drag.ghost.parentNode) this.drag.ghost.parentNode.removeChild(this.drag.ghost);
    var had = !!this.drag;
    this.drag = null;
    if (had) this.render();
  };

  Board.prototype._own = function (sq) {
    var p = this.pieces[sq];
    return p && this.movable && p[0] === this.movable;
  };

  Board.prototype._tryMove = function (from, to) {
    var legal = this.targetsFrom(from).some(function (m) { return m.to === to; });
    this.selected = null;
    if (!legal) { this.render(); return false; }
    if (this.opts.onMove) this.opts.onMove(from, to);
    return true;
  };

  Board.prototype._bind = function () {
    var self = this, el = this.el;
    el.addEventListener("pointerdown", function (ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      self.cancelDrag();
      var sq = self.squareAt(ev.clientX, ev.clientY);
      if (!sq || !self.movable) return;
      ev.preventDefault();
      if (self.selected && self.selected !== sq && !self._own(sq)) {
        self._tryMove(self.selected, sq);
        return;
      }
      if (!self._own(sq)) { self.selected = null; self.render(); return; }
      try { el.setPointerCapture(ev.pointerId); } catch (e) { /* older browsers */ }
      self.drag = { from: sq, id: ev.pointerId, x: ev.clientX, y: ev.clientY, moved: false, ghost: null, wasSelected: self.selected === sq };
      self.selected = sq;
      self.render();
    });
    el.addEventListener("pointermove", function (ev) {
      var d = self.drag;
      if (!d || d.id !== ev.pointerId) return;
      var size = el.clientWidth / 8;
      if (!d.moved && Math.abs(ev.clientX - d.x) + Math.abs(ev.clientY - d.y) < size * .18) return;
      if (!d.moved) {
        d.moved = true;
        var g = document.createElement("div");
        g.className = "drag-ghost";
        g.style.width = g.style.height = size * 1.08 + "px";
        g.innerHTML = pieceSvg(self.pieces[d.from]);
        d.ghost = g;
        self.render();
      }
      var r = el.getBoundingClientRect();
      d.ghost.style.left = ev.clientX - r.left - size * .54 + "px";
      d.ghost.style.top = ev.clientY - r.top - size * .7 + "px";
    });
    function finish(ev) {
      var d = self.drag;
      if (!d || d.id !== ev.pointerId) return;
      var to = self.squareAt(ev.clientX, ev.clientY);
      var from = d.from, moved = d.moved, wasSelected = d.wasSelected;
      self.cancelDrag();
      if (moved) {
        if (to && to !== from) { self._tryMove(from, to); return; }
        self.selected = null;
        self.render();
        return;
      }
      if (wasSelected) { self.selected = null; self.render(); }
    }
    el.addEventListener("pointerup", finish);
    el.addEventListener("pointercancel", function () { self.cancelDrag(); });
    el.addEventListener("lostpointercapture", function (ev) {
      if (self.drag && self.drag.id === ev.pointerId) self.cancelDrag();
    });
    root.addEventListener("blur", function () { self.cancelDrag(); });
    el.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
  };

  root.Board = Board;
})(window);
