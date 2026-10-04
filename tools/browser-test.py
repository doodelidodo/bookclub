#!/usr/bin/env python3
"""Book Club – browser test. Plays real sessions in Chromium, day after day.

    pip install playwright && python -m playwright install chromium
    python tools/browser-test.py [--shots DIR]

Opens index.html straight from disk (file://), the same way a downloaded copy runs.
"""
import json
import os
import pathlib
import random
import subprocess
import sys
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri() + "?fast"
SHOTS = None
if "--shots" in sys.argv:
    SHOTS = pathlib.Path(sys.argv[sys.argv.index("--shots") + 1])
    SHOTS.mkdir(parents=True, exist_ok=True)

passed = failed = 0


def check(name, cond, detail=None):
    global passed, failed
    if cond:
        passed += 1
    else:
        failed += 1
        print(f"  FAIL {name}" + (f" -> {detail}" if detail is not None else ""))


def shot(pg, name, full=False):
    if SHOTS:
        pg.screenshot(path=str(SHOTS / f"{name}.png"), full_page=full)


def square_center(pg, sq):
    return pg.evaluate(
        """(sq) => {
          const b = document.querySelector('#board'); const r = b.getBoundingClientRect();
          const s = window.BookClub.session(); const o = s && s.pack ? s.pack.side : 'w';
          const f = 'abcdefgh'.indexOf(sq[0]), rk = +sq[1];
          const col = o === 'w' ? f : 7 - f, row = o === 'w' ? 8 - rk : rk - 1;
          return [r.left + (col + .5) * r.width / 8, r.top + (row + .5) * r.height / 8];
        }""",
        sq,
    )


def tap(pg, sq):
    x, y = square_center(pg, sq)
    pg.mouse.click(x, y)


def drag(pg, a, b):
    x1, y1 = square_center(pg, a)
    x2, y2 = square_center(pg, b)
    pg.mouse.move(x1, y1)
    pg.mouse.down()
    pg.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, steps=4)
    pg.mouse.move(x2, y2, steps=4)
    pg.mouse.up()


def awaiting(pg):
    return pg.evaluate(
        """() => { const s = window.BookClub.session(); if (!s) return null;
          const a = s.awaiting;
          return { busy: s.busy, kind: s.kind, a: a ? { u: a.rep.u, mode: a.mode, mistakes: a.mistakes } : null }; }"""
    )


def other_move(pg):
    return pg.evaluate(
        """() => { const s = window.BookClub.session();
          const c = new ChessJS.Chess(Repertoire.keyToFen(s.awaiting.key));
          const ms = c.moves({ verbose: true }).filter(m => m.from + m.to !== s.awaiting.rep.u.slice(0, 4));
          const m = ms[Math.floor(ms.length / 2)]; return m.from + m.to; }"""
    )


def play_session(pg, wrong_rate, rng, stop_kind="train"):
    """Answers until the session ends. Returns (moves, wrong attempts, wrong keys)."""
    moves = wrongs = 0
    wrong_keys = []
    for _ in range(20000):
        s = awaiting(pg)
        if s is None or s["kind"] != stop_kind:
            return moves, wrongs, wrong_keys
        if s["busy"] or not s["a"]:
            pg.wait_for_timeout(15)
            continue
        a = s["a"]
        if a["mode"] == "review" and a["mistakes"] == 0 and rng.random() < wrong_rate:
            wrong_keys.append(pg.evaluate("() => { const s = window.BookClub.session(); return s.pack.id + '|' + s.awaiting.key; }"))
            mv = other_move(pg)
            tap(pg, mv[:2])
            tap(pg, mv[2:4])
            wrongs += 1
            continue
        if moves % 3 == 1:
            drag(pg, a["u"][:2], a["u"][2:4])
        else:
            tap(pg, a["u"][:2])
            tap(pg, a["u"][2:4])
        moves += 1
    raise RuntimeError("session did not end")


def time_travel(pg, days=1):
    pg.evaluate(
        """(n) => { const B = window.BookClub, s = B.state();
          for (const k in s.cards) s.cards[k].due = B.addDays(s.cards[k].due, -n);
          const nd = {}; for (const d in s.days) nd[B.addDays(d, -n)] = s.days[d]; s.days = nd;
          localStorage.setItem('bookclub.v1', JSON.stringify(s)); }""",
        days,
    )


def no_overflow(pg):
    return pg.evaluate("() => document.scrollingElement.scrollWidth <= window.innerWidth + 1")


def start_server(data_dir, port):
    env = dict(os.environ, PORT=str(port), BASE_PATH="/bookclub/", DATA_DIR=data_dir)
    proc = subprocess.Popen(["node", str(ROOT / "server" / "server.js")], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(50):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/bookclub/api/health", timeout=1)
            return proc
        except Exception:
            time.sleep(0.1)
    raise RuntimeError("server did not start")


def server_state(port):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/bookclub/api/progress", timeout=3) as r:
        return json.load(r)


def wait_saved(pg, timeout=8000):
    pg.wait_for_function("() => { const s = window.BookClub.sync(); return s.mode === 'server' && s.status === 'saved' && !s.busy; }", timeout=timeout)


def server_test(browser, rng, errors):
    port = 8765
    data = tempfile.mkdtemp(prefix="bookclub-data-")
    url = f"http://127.0.0.1:{port}/bookclub/?fast"
    proc = start_server(data, port)
    try:
        laptop = browser.new_context(viewport={"width": 1200, "height": 900}, locale="de-CH").new_page()
        laptop.on("pageerror", lambda e: errors.append(str(e)))
        laptop.goto(url)
        laptop.wait_for_selector(".pack")
        laptop.wait_for_function("() => window.BookClub.sync().mode === 'server'")
        check("server found", True)
        laptop.click("#startBtn")
        play_session(laptop, 0.0, rng)
        wait_saved(laptop)
        check("status shows saved", "gespeichert" in laptop.inner_text("#syncStatus"), laptop.inner_text("#syncStatus"))
        srv = server_state(port)
        check("laptop progress on the server", len(srv["state"]["cards"]) == 8, len(srv["state"]["cards"]))
        shot(laptop, "server-home")

        phone_ctx = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, locale="de-CH")
        phone = phone_ctx.new_page()
        phone.on("pageerror", lambda e: errors.append(str(e)))
        phone.goto(url)
        phone.wait_for_selector(".pack")
        phone.wait_for_function("() => Object.keys(window.BookClub.state().cards).length === 8")
        check("phone sees the laptop's progress", True)
        check("phone: nothing new left today", phone.inner_text(".count.new b") == "0", phone.inner_text(".count.new b"))

        # Both change something before seeing the other: the second save meets a conflict and merges.
        laptop.evaluate("() => { const B = window.BookClub; const s = B.state(); s.newPerDay = 12; s.settingsAt = Date.now(); }")
        phone.click("#moreBtn")
        play_session(phone, 0.0, rng)
        wait_saved(phone)
        laptop.evaluate("() => { const B = window.BookClub; const s = B.state(); localStorage.setItem('bookclub.v1', JSON.stringify(s)); }")
        laptop.evaluate("() => { const s = window.BookClub.state(); s.cards['vienna|laptop-only'] = { box: 2, due: '2099-01-01', seen: 1, right: 1, wrong: 0, t: Date.now() }; }")
        laptop.click("#homeBtn")
        laptop.click("[data-toggle=slav]")      # a save from the laptop with an old revision
        wait_saved(laptop)
        srv = server_state(port)
        cards = srv["state"]["cards"]
        check("conflict merged: phone's new cards kept", len([k for k in cards if not k.endswith("laptop-only")]) == 13, len(cards))
        check("conflict merged: laptop's change kept", "vienna|laptop-only" in cards and srv["state"]["off"].get("slav") is True)
        check("conflict merged: newer setting kept", srv["state"]["newPerDay"] == 12, srv["state"]["newPerDay"])

        # Offline on the phone: answers wait, then go out when the network is back.
        phone.goto(url)
        phone.wait_for_function("() => window.BookClub.sync().mode === 'server'")
        before = server_state(port)["rev"]
        phone_ctx.set_offline(True)
        phone.evaluate("() => { const B = window.BookClub; const p = B.packs()[0]; B.grade(p, B.meta()[p.id].mine[0], 'right'); }")
        phone.wait_for_function("() => window.BookClub.sync().status === 'offline'", timeout=8000)
        check("offline is shown", "offline" in phone.inner_text("#syncStatus"))
        shot(phone, "server-offline")
        phone_ctx.set_offline(False)
        phone.evaluate("() => window.dispatchEvent(new Event('online'))")
        wait_saved(phone)
        check("saved after coming back online", server_state(port)["rev"] > before)

        # Server restart: everything still there.
        rev = server_state(port)["rev"]
        proc.terminate()
        proc.wait(5)
        proc = start_server(data, port)
        srv = server_state(port)
        check("progress survives a restart", srv["rev"] == rev and len(srv["state"]["cards"]) >= 14)
        check("backup file exists", len(os.listdir(os.path.join(data, "backups"))) == 1)
    finally:
        proc.terminate()


def answer_exam(pg, wrong_first=0):
    """Plays a level test: the first `wrong_first` answers deliberately wrong."""
    i = 0
    while True:
        s = awaiting(pg)
        if s is None or s["kind"] != "exam" or not s["a"]:
            return
        u = s["a"]["u"]
        if i < wrong_first:
            mv = other_move(pg)
            tap(pg, mv[:2]); tap(pg, mv[2:4])
        tap(pg, u[:2]); tap(pg, u[2:4])
        pg.click("#nextBtn")
        i += 1


def path_test(browser, rng, errors):
    ctx = browser.new_context(viewport={"width": 1200, "height": 900}, locale="de-CH")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL)
    pg.wait_for_selector(".pack")
    check("card shows the level", "Level 1 von" in pg.inner_text(".pack"))
    pg.click("[data-path=vienna]")
    pg.wait_for_selector(".path")
    check("path: level 1 current, rest locked", pg.locator(".lv.current").count() == 1 and pg.locator(".lv.locked").count() >= 5)
    check("path: test locked at the start", pg.locator("[data-lvexam]").is_disabled())
    # Guide: step through to the end, it is marked as read.
    pg.click("#guideBtn")
    pg.wait_for_selector(".guidetitle")
    n_steps = pg.locator(".steps i").count()
    check("guide has steps", n_steps >= 5, n_steps)
    check("guide draws arrows", pg.locator("#board .arrows line").count() >= 1)
    shot(pg, "guide")
    pg.keyboard.press("ArrowRight")
    check("arrow key goes to the next step", pg.locator(".steps i.cur").count() == 1 and pg.locator(".steps i.done").count() == 1)
    for _ in range(n_steps - 1):
        pg.click("#nextBtn")
    pg.wait_for_selector(".path")
    check("guide marked as read", "✓" in pg.inner_text(".guidecard"))
    # Strict: even a big budget only offers level-1 moves.
    lv = pg.evaluate("""() => { const B = window.BookClub; const p = B.packs().find(x => x.id === 'vienna');
        const ids = B.pickNew(200).filter(id => id.startsWith('vienna|'));
        const L = B.meta().vienna; return ids.map(id => L.levelOf[id.split('|')[1]]); }""")
    check("strict: new moves only from level 1", lv and all(n == 1 for n in lv), lv)
    pg.click("[data-lvtrain]")
    play_session(pg, 0.0, rng)
    pg.goto(URL)
    pg.wait_for_selector(".pack")
    time_travel(pg)
    pg.goto(URL)
    pg.wait_for_selector(".pack")
    if pg.locator("#startBtn").count():
        pg.click("#startBtn")
        play_session(pg, 0.0, rng)
        pg.goto(URL)
        pg.wait_for_selector(".pack")
    check("ready banner on the start page", pg.locator("[data-levelexam=vienna]").count() == 1)
    shot(pg, "path-banner", True)
    pg.click("[data-levelexam=vienna]")
    pg.wait_for_selector(".prompt .chip.exam")
    shot(pg, "path-exam")
    answer_exam(pg, wrong_first=3)
    check("failed test does not unlock", pg.evaluate("() => { const B = window.BookClub; const p = B.packs().find(x => x.id === 'vienna'); return B.currentLevel(p).index; }") == 1)
    check("fail message", "braucht es" in pg.inner_text(".summary"))
    pg.click("#againBtn")
    pg.wait_for_selector(".prompt .chip.exam")
    answer_exam(pg)
    check("passed test unlocks level 2", pg.evaluate("() => { const B = window.BookClub; const p = B.packs().find(x => x.id === 'vienna'); return B.currentLevel(p).index; }") == 2)
    check("pass message", "Bestanden" in pg.inner_text(".summary"))
    shot(pg, "path-passed")
    pg.click("#pathBtn")
    pg.wait_for_selector(".path")
    check("path: level 1 done, level 2 current", pg.locator(".lv.done").count() == 1 and pg.locator(".lv.current h3").inner_text().startswith("Andere"))
    lv2 = pg.evaluate("""() => { const B = window.BookClub; const ids = B.pickNew(200).filter(id => id.startsWith('vienna|'));
        const L = B.meta().vienna; return ids.map(id => L.levelOf[id.split('|')[1]]); }""")
    check("level 2 moves now on offer", lv2 and set(lv2) <= {1, 2} and 2 in lv2, lv2)
    shot(pg, "path-after", True)
    ctx.close()


def main():
    rng = random.Random(7)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1200, "height": 900}, locale="de-CH", accept_downloads=True)
        pg = ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        print("1 start page")
        pg.goto(URL)
        pg.wait_for_selector(".pack")
        check("three packs", pg.locator(".pack").count() == 3)
        check("German from browser language", "Deine Eröffnungen" in pg.inner_text("#view"))
        check("8 new today", pg.inner_text(".count.new b") == "8", pg.inner_text(".count.new b"))
        shot(pg, "home", True)

        print("2 day by day")
        wrong_seen = []
        for day in range(8):
            pg.goto(URL)
            pg.wait_for_selector(".pack")
            if pg.locator("#startBtn").count():
                pg.click("#startBtn")
                if day == 0:
                    pg.wait_for_selector(".prompt .chip.new")
                    shot(pg, "train-new")
                moves, wrongs, wkeys = play_session(pg, 0.2 if day else 0.0, rng)
                wrong_seen += wkeys
                check(f"day {day}: summary shown", pg.locator(".summary").count() == 1)
            st = pg.evaluate("() => window.BookClub.state()")
            today = pg.evaluate("() => window.BookClub.today()")
            fresh = st["days"].get(today, {}).get("fresh", 0)
            check(f"day {day}: new moves within the daily limit", fresh <= st["newPerDay"], fresh)
            due_left = [k for k, c in st["cards"].items() if c["due"] <= today]
            check(f"day {day}: nothing due left after the session", not due_left, due_left[:3])
            boxes = {}
            for c in st["cards"].values():
                boxes[c["box"]] = boxes.get(c["box"], 0) + 1
            print(f"  day {day}: {len(st['cards'])} cards, boxes {dict(sorted(boxes.items()))}")
            time_travel(pg)
        st = pg.evaluate("() => window.BookClub.state()")
        check("cards reach box 3 after a week", any(c["box"] >= 3 for c in st["cards"].values()))
        if wrong_seen:
            k = wrong_seen[-1]
            check("a wrong answer drops back and gets relearned", st["cards"][k]["wrong"] >= 1 and st["cards"][k]["box"] <= 2, st["cards"][k])

        print("3 random positions")
        pg.goto(URL)
        pg.wait_for_selector(".pack")
        check("test unlocked", not pg.locator("#examBtn").is_disabled())
        pg.click("#examBtn")
        pg.wait_for_selector(".prompt .chip.exam")
        shot(pg, "exam")
        right = 0
        for i in range(10):
            s = awaiting(pg)
            if s is None or s["kind"] != "exam":
                break
            u = s["a"]["u"]
            if i == 3:
                mv = other_move(pg)
                tap(pg, mv[:2])
                tap(pg, mv[2:4])
                check("wrong move shows the answer", "Nicht dein Repertoire" in pg.inner_text("#feedback"))
            tap(pg, u[:2])
            tap(pg, u[2:4])
            pg.click("#nextBtn")
            right += 1
        check("test finishes with a summary", pg.locator(".summary").count() == 1)

        print("4 repertoire browser")
        pg.click("#homeBtn")
        pg.click("[data-browse=vienna]")
        pg.wait_for_selector(".choice")
        check("own move shown first", pg.locator(".choice.mine").count() == 1)
        pg.click(".choice.mine")
        pg.wait_for_selector(".choice")
        n_replies = pg.locator(".choice").count()
        check("opponent replies listed", n_replies >= 5, n_replies)
        pg.click(".choice >> nth=0")
        check("move list follows", "e4" in pg.inner_text(".moves") and "e5" in pg.inner_text(".moves"))
        shot(pg, "browse")
        pg.click("#upBtn")
        check("one move back", pg.locator(".choice").count() == n_replies)

        print("5 settings")
        pg.click("#backBtn")
        pg.click("#settingsBtn")
        pg.wait_for_selector("dialog[open]")
        pg.fill("#pgnName", "Londoner")
        pg.fill("#pgnText", "1. d4 d5 (1... Nf6 2. Bf4) 2. Bf4 Nf6 3. e3 c5 (3... e6 4. Nf3) 4. c3 *")
        pg.click("#pgnAdd")
        check("PGN import accepted", "Londoner" in pg.inner_text("#pgnMsg"), pg.inner_text("#pgnMsg"))
        pg.fill("#pgnText", "1. e4 e5 2. Ke3 *")
        pg.click("#pgnAdd")
        check("bad PGN explained", "Ke3" in pg.inner_text("#pgnMsg"), pg.inner_text("#pgnMsg"))
        with pg.expect_download() as dl:
            pg.click("#exportBtn")
        check("progress export", dl.value.suggested_filename.startswith("bookclub-"))
        shot(pg, "settings")
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(100)
        check("imported pack on start page", pg.locator(".pack").count() == 4)
        pg.click("[data-lang=en]")
        check("switch to English", "Your openings" in pg.inner_text("#view"))

        print("6 phone width")
        ph = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, locale="en-GB")
        pp = ph.new_page()
        pp.on("pageerror", lambda e: errors.append(str(e)))
        pp.goto(URL)
        pp.wait_for_selector(".pack")
        check("phone: start page fits", no_overflow(pp))
        shot(pp, "phone-home", True)
        pp.click("#startBtn")
        pp.wait_for_selector(".prompt .chip")
        check("phone: training fits", no_overflow(pp))
        bw = pp.evaluate("() => document.querySelector('#board').getBoundingClientRect().width")
        check("phone: board uses the width", bw >= 340, bw)
        a = awaiting(pp)["a"]
        x1, y1 = square_center(pp, a["u"][:2])
        x2, y2 = square_center(pp, a["u"][2:4])
        pp.touchscreen.tap(x1, y1)
        pp.touchscreen.tap(x2, y2)
        pp.wait_for_timeout(100)
        check("phone: tap-tap move", "Correct" in pp.inner_text("#feedback") or awaiting(pp)["a"] is None or awaiting(pp)["a"]["u"] != a["u"])
        shot(pp, "phone-train")
        pp.click("#backBtn")
        pp.click("[data-guide=slav]")
        pp.wait_for_selector(".guidetitle")
        check("phone: guide fits", no_overflow(pp))
        shot(pp, "phone-guide", True)
        pp.click("#backBtn")
        pp.click("#backBtn")
        pp.click("[data-browse=slav]")
        check("phone: browser fits", no_overflow(pp))

        print("8 path: levels and tests")
        path_test(browser, rng, errors)

        print("7 server: two devices, one progress")
        server_test(browser, rng, errors)

        check("no page errors", not errors, errors[:5])
        browser.close()

    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
