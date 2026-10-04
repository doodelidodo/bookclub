/* Book Club guide: the ideas behind the Slav. Format: see guides/vienna.js. */
(window.BOOKCLUB_GUIDES = window.BOOKCLUB_GUIDES || []).push({
  pack: "slav",
  title: { de: "Die Ideen hinter dem Slawen", en: "The ideas behind the Slav" },
  steps: [
    {
      moves: "d4 d5 c4 c6",
      arrows: ["c6d5", "i:c8f5"],
      title: { de: "2…c6: d5 bleibt stehen", en: "2…c6: d5 stays put" },
      text: {
        de: "Weiss greift d5 mit c4 an. Schwarz deckt mit dem c-Bauern, nicht mit …e6. So bleibt der Läufer c8 frei, genau wie im Caro-Kann.",
        en: "White attacks d5 with c4. Black defends with the c-pawn, not with …e6. That keeps the c8 bishop free, just like in the Caro-Kann."
      }
    },
    {
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4",
      arrows: ["b7b5"],
      highlight: ["c4"],
      title: { de: "4…dxc4: den Bauern nehmen", en: "4…dxc4: take the pawn" },
      text: {
        de: "In der Hauptvariante nimmt Schwarz auf c4 und droht, den Bauern mit …b5 zu halten. Weiss bekommt ihn nur zurück, wenn er etwas dafür tut.",
        en: "In the main line Black takes on c4 and threatens to keep the pawn with …b5. White only gets it back by doing something about it."
      }
    },
    {
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5",
      arrows: ["x:a4b5", "i:e7e6"],
      highlight: ["f5"],
      title: { de: "5.a4 Lf5: der Läufer vor …e6", en: "5.a4 Bf5: the bishop before …e6" },
      text: {
        de: "Mit a4 verhindert Weiss …b5. Schwarz gibt den Bauern dann zurück, nutzt die Zeit aber: Der Läufer kommt nach f5, erst danach folgt …e6.",
        en: "With a4 White stops …b5. Black then gives the pawn back but uses the time: the bishop comes to f5, and only then …e6 follows."
      }
    },
    {
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O",
      arrows: ["b4c3", "i:b8d7"],
      title: { de: "Die Hauptstellung", en: "The main position" },
      text: {
        de: "Weiss hat den Bauern zurück, Schwarz ist voll entwickelt. Der Läufer b4 fesselt den Springer c3, Sbd7 und …c5 oder …e5 folgen. Gleich, gesund und leicht zu spielen.",
        en: "White has the pawn back, Black is fully developed. The b4 bishop pins the c3 knight, …Nbd7 and …c5 or …e5 follow. Equal, healthy and easy to play."
      }
    },
    {
      moves: "d4 d5 c4 c6 Nf3 Nf6 e3 Bf5",
      arrows: ["i:e7e6"],
      highlight: ["f5"],
      title: { de: "Ruhiges 4.e3: sofort …Lf5", en: "Quiet 4.e3: …Bf5 at once" },
      text: {
        de: "Wenn Weiss den Bauern c4 mit e3 deckt, muss Schwarz nicht nehmen. Der Läufer geht sofort nach f5, danach …e6 und …Sbd7: derselbe Aufbau wie immer.",
        en: "When White covers c4 with e3, Black doesn't need to take. The bishop goes to f5 at once, then …e6 and …Nbd7: the same setup as always."
      }
    },
    {
      moves: "d4 d5 c4 c6 Nf3 Nf6 e3 Bf5 Nc3 e6 Nh4 Bg6 Nxg6 hxg6",
      arrows: ["h8h2"],
      title: { de: "Weiss holt sich den Läufer", en: "White goes after the bishop" },
      text: {
        de: "Sh4 jagt den Läufer, Weiss bekommt das Läuferpaar. Dafür öffnet …hxg6 die h-Linie für den schwarzen Turm, und die Bauernstruktur bleibt gesund.",
        en: "Nh4 hunts the bishop and White gets the bishop pair. In return …hxg6 opens the h-file for Black's rook, and the pawn structure stays healthy."
      }
    },
    {
      moves: "d4 d5 c4 c6 cxd5 cxd5",
      arrows: ["b8c6", "g8f6", "i:c8f5"],
      title: { de: "Abtausch: spiegeln und entwickeln", en: "Exchange: mirror and develop" },
      text: {
        de: "Nach 3.cxd5 cxd5 ist alles symmetrisch. Schwarz entwickelt Sc6, Sf6 und Lf5 und hat keine Probleme. Wichtig ist nur, nicht passiv zu werden.",
        en: "After 3.cxd5 cxd5 everything is symmetrical. Black develops …Nc6, …Nf6 and …Bf5 and has no problems. The only thing that matters is not to turn passive."
      }
    },
    {
      moves: "d4 d5 c4 c6 Nc3 Nf6 Bg5 Ne4 Nxe4 dxe4 e3 Qa5+",
      arrows: ["a5g5"],
      title: { de: "Eine Falle zum Merken", en: "A trap worth knowing" },
      text: {
        de: "Nach 4.Lg5 Se4 5.Sxe4 dxe4 6.e3 gibt Schach mit 6…Da5+. Fast alle Gegner auf deinem Niveau decken mit 7.Dd2?? und verlieren den Läufer g5: 7…Dxg5.",
        en: "After 4.Bg5 Ne4 5.Nxe4 dxe4 6.e3 comes the check 6…Qa5+. Almost every opponent at your level blocks with 7.Qd2?? and loses the g5 bishop: 7…Qxg5."
      }
    }
  ]
});
