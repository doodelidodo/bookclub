<p align="center">
  <img src="assets/icon.svg" width="72" alt="">
</p>

<h1 align="center">Book Club</h1>

<p align="center">
  <em>Your opening repertoire, drilled until it sticks.</em><br>
  runs in the browser · works offline · optional server for all your devices · English and German
</p>

---

Knowing your opening "roughly" is how you lose a piece on move 9. Book Club
drills your repertoire the way it shows up in real games: you play your moves,
and it answers with the replies **players at your level actually choose**,
weighted by how often they choose them, straight from the Lichess database.

Every position you have to know is its own card. Get it right and it comes back
in 3 days, then a week, two weeks, a month. Get it wrong and it comes back in
the same session. A transposition is the same position, so it's the same card.

## Three ways to train

| Mode | What happens | When |
| --- | --- | --- |
| **Daily training** | Lines from move one. New moves are shown once with an arrow, then asked again later in the same session. Opponent replies follow the database frequencies. | Every day, ~5 minutes |
| **Random positions** | A position from the middle of your repertoire, no run-up. The real test: do you know it without the moves leading there? | Once positions are settled |
| **Repertoire browser** | Walk the tree, see your move, the replies and how often each one is played. | To look things up |

Every opening is a **path of levels**: the main idea first, then the
opponent's other tries one family at a time (Vienna: other replies to 3.f4,
without …Nf6, the Sicilian, …). New moves only come from your current level.
Once every move of the level has held for a day, its test opens: 8 of 10 right
unlocks the next level. Reviews always cover everything you already know.
Inside a level, new moves come most-common-first and only once you know the
move before them.

Each opening also has a **guide**: eight positions on the board with arrows
and a few sentences each, showing what the opening is about before you learn
the moves (`guides/*.js`, checked by the self-test: legal moves, arrows from
real pieces, every position part of the repertoire).

Levels are set in the PGN with a comment on the move that starts them,
`{level 2: de: Wenn Schwarz nimmt || en: When Black takes}`; later moves of the
same level just say `{level 2}`. Imported PGNs without tags get levels
automatically: each reply at the first branching point becomes one.

## Ships with

- **Vienna Gambit** for White: 1.e4 e5 2.Nc3 and f4 wherever it fits, plus answers to the Sicilian, French, Caro-Kann, Scandinavian, Pirc and Modern.
- **Caro-Kann** for Black against 1.e4: Advance, Classical, Exchange, Panov, Two Knights, Fantasy, King's Indian Attack.
- **Slav** for Black against 1.d4: main line with 4.Nc3 dxc4 5.a4, 4.e3 Bf5, Exchange, London setups.

Or import your own: any PGN with variations. Your moves are the repertoire, the
opponent's moves are the replies you want to know, and comments in `{…}` show
up while training (`{de: … || en: …}` for both languages).

## Use it

**In the browser:** open the GitHub Pages site and add it to your home screen.
It works offline after the first visit.

**Locally:** download the repository and open `index.html`. No server, no
install. Progress is stored in your browser; *Settings → Back up* saves it as a
file so you can move it to another device.

**On your own server:** see below. Progress is then stored on the server and
shared by all your devices.

## Your own server: progress that never gets lost

In the browser alone, progress lives in that browser. If you train every day,
run the small Book Club server instead: it serves the app and keeps the
progress in one file, so phone and laptop share it and a cleared browser loses
nothing.

```bash
docker run -d --name bookclub -p 8080:8080 -v bookclub_data:/data ghcr.io/doodelidodo/bookclub:latest
# or without Docker:
node server/server.js
```

- Saved after every answer. When two devices train at the same time, the copies are merged
  (newest answer per position wins), nothing is overwritten.
- Offline answers wait in the browser and go out when the connection is back.
- A daily copy goes to `/data/backups/`, the last 60 days are kept.
- No login built in: run it on your own network or behind something that handles login.
- `BASE_PATH=/bookclub/` serves it under a sub-path, see `deploy/my-platform.md`.

## Opponent moves from the Lichess database

The packs in `packs/` are built from the PGNs in `repertoire/`. Without network
access the script uses only the PGN; with `--explorer` it asks the Lichess
opening explorer, position by position, what players in the chosen rating range
play:

```bash
node tools/build-pack.js repertoire/*.pgn                 # PGN only
LICHESS_TOKEN=lip_xxx node tools/build-pack.js repertoire/*.pgn --explorer
```

- Opponent replies with at least 5 % of the games are added, each with its game count and results.
- Where your PGN has no move for your side, the script picks the best-scoring popular move and marks it **auto** (shown in the app), so you can review it.
- Repertoire moves that score badly at that rating, or are hardly ever played, are reported.
- Only positions that come up in at least 1 of 100 games with the opening are added (`--min-reach`).
- **Traps:** rarer opponent replies (from 2 % of games) are added too when they are mistakes, i.e. you
  score at least 65 % after them. Your punishing move and up to two follow-ups come with them. They form
  the last level of the path, and the app tells you when an opponent walks into one.
- Defaults: ratings 1200–1600, blitz + rapid, up to move 9. See `node tools/build-pack.js --help`.
- Changed only comments, levels or a move in the PGN? `--update` rebuilds the packs and keeps the
  Lichess data already in `packs/`, no network needed.

A personal Lichess token (no scopes needed) is created at
<https://lichess.org/account/oauth/token>. Answers are cached in `tools/.cache`,
so a second run is free. Needs Node 18 or newer, nothing to install.

## Check

```bash
node tools/selftest.js        # PGN reader, packs, explorer logic, merging, server API
python3 tools/browser-test.py # full sessions in Chromium, two devices on one server (needs Playwright)
npm install --no-save stockfish@16 && node tools/check-lines.js
                              # every repertoire move against Stockfish
```

The shipped lines were checked with Stockfish 16 at depth 14: no own move
loses more than 0.4 pawns against the engine's choice.

## Credits

- Move statistics: [Lichess](https://lichess.org) opening explorer, database under CC0. Not affiliated with Lichess.
- [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause) for the rules.
- Pieces by Colin M.L. Burnett, via [cm-chessboard](https://github.com/shaack/cm-chessboard), CC BY-SA 3.0.
- Fonts: Young Serif, Atkinson Hyperlegible, IBM Plex Mono (SIL Open Font License).

Made by [A Better Dodo](https://www.abetterdodo.ch), who also made
[Knightmare](https://github.com/doodelidodo/knightmare): it finds the patterns
behind your chess mistakes. MIT licensed.
