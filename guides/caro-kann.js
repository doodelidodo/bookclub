/* Book Club guide: the ideas behind the Caro-Kann. Format: see guides/vienna.js. */
(window.BOOKCLUB_GUIDES = window.BOOKCLUB_GUIDES || []).push({
  pack: "caro-kann",
  title: { de: "Die Ideen hinter dem Caro-Kann", en: "The ideas behind the Caro-Kann" },
  steps: [
    {
      moves: "e4 c6",
      arrows: ["c6d5", "i:c8f5"],
      title: { de: "1…c6: Platz für …d5", en: "1…c6: room for …d5" },
      text: {
        de: "c6 bereitet …d5 vor. Der Unterschied zu Französisch (1…e6) ist der Läufer c8: Er bleibt frei und kommt später nach f5 oder g4, bevor …e6 ihn einsperrt.",
        en: "c6 prepares …d5. The difference to the French (1…e6) is the c8 bishop: it stays free and later goes to f5 or g4 before …e6 locks it in."
      }
    },
    {
      moves: "e4 c6 d4 d5",
      arrows: ["x:e4d5", "d5e4"],
      title: { de: "2…d5: Angriff auf e4", en: "2…d5: hitting e4" },
      text: {
        de: "Der Bauer d5 greift e4 an und wird von c6 gedeckt. Weiss muss sich entscheiden: vorbeiziehen (3.e5), decken (3.Sc3, 3.Sd2) oder tauschen (3.exd5).",
        en: "The d5 pawn attacks e4 and is backed by c6. White has to decide: push past (3.e5), defend (3.Nc3, 3.Nd2) or trade (3.exd5)."
      }
    },
    {
      moves: "e4 c6 d4 d5 e5 Bf5",
      arrows: ["i:e7e6"],
      highlight: ["f5"],
      title: { de: "Vorstoss: erst der Läufer, dann …e6", en: "Advance: bishop first, then …e6" },
      text: {
        de: "Der wichtigste Zug im Caro-Kann: Der Läufer geht nach f5, bevor …e6 kommt. Danach steht er ausserhalb der Bauernkette und ist ein guter Läufer statt ein eingesperrter.",
        en: "The key move of the Caro-Kann: the bishop goes to f5 before …e6. It then sits outside the pawn chain and is a good bishop instead of a buried one."
      }
    },
    {
      moves: "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O Ne7",
      arrows: ["c6c5", "e7f5", "i:e7g6"],
      title: { de: "Der Plan im Vorstoss: …c5 gegen d4", en: "The Advance plan: …c5 against d4" },
      text: {
        de: "Schwarz greift die Spitze der weissen Kette an: …c5 gegen d4. Der Springer kommt über e7 nach f5 oder g6 und drückt ebenfalls auf d4. Gegen e5 selbst arbeitet später …f6.",
        en: "Black attacks the base of White's chain: …c5 against d4. The knight comes via e7 to f5 or g6 and also presses d4. Later …f6 can work against e5 itself."
      }
    },
    {
      moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5",
      arrows: ["f5e4"],
      title: { de: "Klassisch: der Läufer mit Tempo", en: "Classical: the bishop with tempo" },
      text: {
        de: "Nach 3.Sc3 dxe4 4.Sxe4 kommt der Läufer nach f5 und greift dabei den Springer an. Weiss muss Zeit aufwenden, Schwarz entwickelt sich bequem.",
        en: "After 3.Nc3 dxe4 4.Nxe4 the bishop goes to f5 and attacks the knight on the way. White has to spend time, Black develops comfortably."
      }
    },
    {
      moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6",
      arrows: ["x:h4h5", "i:g6h7"],
      title: { de: "Der h-Bauer jagt den Läufer", en: "The h-pawn hunts the bishop" },
      text: {
        de: "Weiss droht h5 und will den Läufer fangen. Mit …h6 hat der Läufer das Feld h7 als Rückzug. Danach tauscht Schwarz ihn oft auf d3 und steht solide ohne Schwächen.",
        en: "White threatens h5 to trap the bishop. With …h6 the bishop keeps h7 as a retreat. Black often trades it on d3 later and stands solid with no weaknesses."
      }
    },
    {
      moves: "e4 c6 d4 d5 exd5 cxd5",
      arrows: ["b8c6", "g8f6", "i:c8g4"],
      title: { de: "Abtausch: einfach entwickeln", en: "Exchange: just develop" },
      text: {
        de: "Nach 3.exd5 cxd5 ist die Stellung symmetrisch. Schwarz bringt die Springer nach c6 und f6 und den Läufer nach g4 oder f5. Keine Theorie, nur gute Felder.",
        en: "After 3.exd5 cxd5 the position is symmetrical. Black brings the knights to c6 and f6 and the bishop to g4 or f5. No theory, just good squares."
      }
    },
    {
      moves: "e4 c6 Nc3 d5 Nf3 Bg4",
      arrows: ["g4f3"],
      title: { de: "Ohne 2.d4: der Läufer gegen den Springer", en: "Without 2.d4: bishop against knight" },
      text: {
        de: "Spielt Weiss Sc3 und Sf3, fesselt der Läufer von g4. Schwarz tauscht ihn oft gegen den Springer f3 und steht danach mit …e6 und …Sf6 felsenfest.",
        en: "When White plays Nc3 and Nf3, the bishop pins from g4. Black often trades it for the f3 knight and then stands rock solid with …e6 and …Nf6."
      }
    }
  ]
});
