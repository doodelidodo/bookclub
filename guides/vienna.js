/* Book Club guide: the ideas behind the Vienna Gambit.
   Each step: moves from the start (SAN), arrows ("e2e4" = your plan, "x:e2e4" = the opponent's
   idea or a threat, "i:e2e4" = for information), squares to highlight, title and text. */
(window.BOOKCLUB_GUIDES = window.BOOKCLUB_GUIDES || []).push({
  pack: "vienna",
  title: { de: "Die Ideen hinter dem Wiener Gambit", en: "The ideas behind the Vienna Gambit" },
  steps: [
    {
      moves: "e4 e5 Nc3",
      arrows: ["i:c3e4", "f2f4"],
      title: { de: "Erst der Springer, dann f4", en: "Knight first, then f4" },
      text: {
        de: "2.Sc3 deckt e4 und lässt den f-Bauern frei. Genau darum geht es im Wiener: Weiss will mit f2–f4 den Bauern e5 angreifen, ohne dass ein Springer auf f3 im Weg steht.",
        en: "2.Nc3 guards e4 and keeps the f-pawn free. That is the whole point of the Vienna: White wants to hit e5 with f2–f4, with no knight on f3 in the way."
      }
    },
    {
      moves: "e4 e5 Nc3 Nf6 f4",
      arrows: ["f4e5"],
      title: { de: "Das Gambit: 3.f4", en: "The gambit: 3.f4" },
      text: {
        de: "Weiss bietet den f-Bauern an. Nimmt Schwarz nicht, schlägt Weiss auf e5 und verjagt den Springer f6. Nimmt Schwarz, öffnet sich die f-Linie für den Turm nach der Rochade.",
        en: "White offers the f-pawn. If Black ignores it, White takes on e5 and chases the f6 knight. If Black takes, the f-file opens for the rook once White has castled."
      }
    },
    {
      moves: "e4 e5 Nc3 Nf6 f4 d5",
      arrows: ["x:d5e4", "f4e5"],
      title: { de: "Die beste Antwort: 3…d5", en: "The best reply: 3…d5" },
      text: {
        de: "Schwarz schlägt im Zentrum zurück und greift e4 an. Weiss nimmt trotzdem auf e5: 4.fxe5 Sxe4. Der Bauer auf e5 gibt Weiss viel Raum und nimmt dem Springer das Feld f6.",
        en: "Black strikes back in the centre and hits e4. White takes on e5 anyway: 4.fxe5 Nxe4. The pawn on e5 gives White space and takes f6 away from Black's knight."
      }
    },
    {
      moves: "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3",
      arrows: ["d2d4", "f1d3", "i:e1g1"],
      highlight: ["e5"],
      title: { de: "Der Plan nach 5.Sf3", en: "The plan after 5.Nf3" },
      text: {
        de: "Weiss deckt e5, spielt d4 und Ld3 und rochiert kurz. Der Springer auf e4 steht schön, aber er wird bald angegriffen. Halte den Bauern e5: Er ist dein Raumvorteil.",
        en: "White guards e5, plays d4 and Bd3, and castles short. The knight on e4 looks nice but will soon be attacked. Keep the e5 pawn: it is your space advantage."
      }
    },
    {
      moves: "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 f5 exf6 Bxf6 O-O",
      arrows: ["f3e5", "i:f1f6", "i:d3e4"],
      title: { de: "Ziel erreicht: die offene f-Linie", en: "Mission accomplished: the open f-file" },
      text: {
        de: "Der f-Bauer ist weg, die Linie ist offen. Sobald der Springer f3 springt (etwa nach e5), wirkt der Turm direkt auf f6. Läufer d3 und Springer c3 drücken auf den Springer e4. Weiss ist entwickelt und spielt am Königsflügel.",
        en: "The f-pawn is gone and the file is open. As soon as the f3 knight jumps (to e5, say), the rook hits f6 directly. The d3 bishop and the c3 knight press the e4 knight. White is developed and plays on the kingside."
      }
    },
    {
      moves: "e4 e5 Nc3 Nf6 f4 exf4 e5",
      arrows: ["e5f6"],
      highlight: ["f4"],
      title: { de: "Wenn Schwarz nimmt: 3…exf4 4.e5", en: "If Black takes: 3…exf4 4.e5" },
      text: {
        de: "Der Bauer vertreibt den Springer, der kein gutes Feld hat. Den Bauern f4 holst du dir später zurück, meist nach d4 mit dem Läufer c1. Achtung auf 4…Sh5 und 4…Sg4: Dort hängt der Springer, die Dame schlägt ihn.",
        en: "The pawn kicks the knight, which has no good square. You win the f4 pawn back later, usually with the c1 bishop after d4. Watch for 4…Nh5 and 4…Ng4: the knight hangs there and the queen takes it."
      }
    },
    {
      moves: "e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4",
      arrows: ["g4g7", "c4f7"],
      title: { de: "Gegen 2…Sc6: Lc4 und die Falle mit Dg4", en: "Against 2…Nc6: Bc4 and the Qg4 trap" },
      text: {
        de: "Ohne …Sf6 kommt zuerst der Läufer nach c4, f4 folgt später. Nach 3…Lc5 greift 4.Dg4 den Bauern g7 an. Spielt Schwarz hier 4…Sf6?, folgt 5.Dxg7 Tg8 6.Dxf7 matt.",
        en: "Without …Nf6 the bishop goes to c4 first, f4 comes later. After 3…Bc5, 4.Qg4 attacks g7. If Black plays 4…Nf6? here, 5.Qxg7 Rg8 6.Qxf7 is mate."
      }
    },
    {
      moves: "e4 c5 Nc3 Nc6 f4",
      arrows: ["g1f3", "f1c4", "i:f4f5"],
      title: { de: "Überall derselbe Bauplan", en: "The same plan everywhere" },
      text: {
        de: "Gegen Sizilianisch (Grand-Prix-Angriff), Pirc und Modern (Österreichischer Angriff) spielst du dieselbe Idee: Sc3, f4, Sf3 und Angriff am Königsflügel. So musst du wenig Neues lernen.",
        en: "Against the Sicilian (Grand Prix Attack), the Pirc and the Modern (Austrian Attack) you play the same idea: Nc3, f4, Nf3 and a kingside attack. That keeps the new material small."
      }
    }
  ]
});
