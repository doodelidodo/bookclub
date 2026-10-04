#!/usr/bin/env node
/* Book Club – optional server for your own machine or home server.
 *
 * Serves the app and keeps the progress in one file, so phone and laptop
 * share it and nothing lives only in a browser. No npm install, Node 18+.
 *
 *   node server/server.js                      # http://localhost:8080/
 *   PORT=80 BASE_PATH=/bookclub/ DATA_DIR=/data node server/server.js
 *
 * API (relative to BASE_PATH):
 *   GET  api/health    -> {ok: true}
 *   GET  api/progress  -> {bookclub: 1, rev, savedAt, state}
 *   PUT  api/progress  <- {rev, state}   200 {rev, savedAt}  or  409 {rev, state} when someone saved in between
 *
 * Every save goes to a temp file first and is then renamed, so a crash never
 * leaves half a file. The first save of each day also writes
 * backups/progress-YYYY-MM-DD.json; the newest BACKUP_DAYS (default 60) are kept.
 *
 * There is no login: run it on your own network or behind something that
 * does the login for you (Cloudflare Access, Traefik basic auth, …).
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8080);
const BASE = ("/" + (process.env.BASE_PATH || "/").replace(/^\/+|\/+$/g, "") + "/").replace(/\/+/g, "/");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const BACKUP_DAYS = Number(process.env.BACKUP_DAYS || 60);
const MAX_BODY = 8 * 1024 * 1024;
const FILE = path.join(DATA_DIR, "progress.json");
const PUBLIC = ["index.html", "manifest.webmanifest", "sw.js", "css/", "js/", "vendor/", "assets/", "packs/", "guides/", "fonts/"];
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8"
};

function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function readStore() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (data && data.bookclub === 1) return data;
  } catch (e) {
    if (e.code !== "ENOENT") console.error("progress.json unreadable, starting empty: " + e.message);
  }
  return { bookclub: 1, rev: 0, savedAt: null, state: null };
}

function writeStore(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, FILE);
  const dir = path.join(DATA_DIR, "backups");
  const backup = path.join(dir, "progress-" + today() + ".json");
  if (!fs.existsSync(backup)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(FILE, backup);
    const old = fs.readdirSync(dir).filter((f) => /^progress-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    old.slice(0, Math.max(0, old.length - BACKUP_DAYS)).forEach((f) => fs.unlinkSync(path.join(dir, f)));
  }
}

let store = readStore();

function send(res, status, body, headers) {
  const isJson = typeof body !== "string" && !Buffer.isBuffer(body);
  res.writeHead(status, Object.assign({
    "Content-Type": isJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin"
  }, isJson ? { "Cache-Control": "no-store" } : {}, headers || {}));
  res.end(isJson ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function api(req, res, route) {
  if (route === "health") return send(res, 200, { ok: true, rev: store.rev });
  if (route !== "progress") return send(res, 404, { error: "not_found" });
  if (req.method === "GET") return send(res, 200, store);
  if (req.method !== "PUT") return send(res, 405, { error: "method_not_allowed" }, { Allow: "GET, PUT" });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) {
    return send(res, e.status || 400, { error: e.status === 413 ? "too_large" : "invalid_json" });
  }
  const state = body && body.state;
  if (!state || state.v !== 1 || typeof state.cards !== "object") return send(res, 400, { error: "not_bookclub_progress" });
  if (body.rev !== store.rev) return send(res, 409, store);       // client merges and tries again
  const next = { bookclub: 1, rev: store.rev + 1, savedAt: new Date().toISOString(), state };
  try { writeStore(next); } catch (e) {
    console.error("save failed: " + e.message);
    return send(res, 500, { error: "save_failed" });
  }
  store = next;
  return send(res, 200, { rev: store.rev, savedAt: store.savedAt });
}

function serveFile(res, rel) {
  if (!rel || rel.endsWith("/")) rel += "index.html";
  if (!PUBLIC.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p))) return send(res, 404, "Not found");
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) return send(res, 404, "Not found");
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, "Not found");
    const ext = path.extname(file);
    const fresh = ext === ".html" || rel === "sw.js" || ext === ".webmanifest";
    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": fresh ? "no-cache, must-revalidate" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin"
    });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, "http://x"); } catch (e) { return send(res, 400, "Bad request"); }
  let p;
  try { p = decodeURIComponent(url.pathname); } catch (e) { return send(res, 400, "Bad request"); }
  if (p + "/" === BASE) return send(res, 301, "", { Location: BASE });
  if (!p.startsWith(BASE)) return send(res, 404, "Not found");
  const rel = p.slice(BASE.length);
  if (rel.startsWith("api/")) {
    api(req, res, rel.slice(4)).catch((e) => { console.error(e); send(res, 500, { error: "internal" }); });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  serveFile(res, rel);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log("Book Club on http://localhost:" + PORT + BASE + " · progress in " + FILE + " (rev " + store.rev + ")");
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
module.exports = { server, BASE };
