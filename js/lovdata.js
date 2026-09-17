// Lovdata: strukturerede nøgleparagraffer pr. lov, udtrukket fra CMR-loven, Sølovens kap. 13,
// NSAB 2015, Købeloven og CISG (Transportjura 3. semester UCL).
// Bruges til (a) Lovopslag-fanen, (b) at validere/vise paragrafhenvisninger i konklusionen.

const LOVDATA = {
  KBL: {
    navn: "Købeloven",
    paragraffer: {
      "§4": "Handelskøb — skærper væsentlighedskravet ved misligholdelse.",
      "§9": "Pladskøb/hentekøb — levering sker hos sælger.",
      "§10": "Forsendelseskøb — levering sker ved overgivelse til første selvstændige fragtfører.",
      "§11": "Bringekøb — levering sker når varen er fremme, hvis sælger selv transporterer den.",
      "§17": "Risikoens overgang — sælger bærer faren for hændelig undergang/forringelse indtil levering.",
      "§21": "Købers beføjelser ved forsinkelse — i handelskøb er enhver forsinkelse væsentlig, medmindre kun en ringe del er forsinket.",
      "§22": "Ophævelse — kun for den forsinkede delsending, ikke automatisk hele aftalen.",
      "§23": "Erstatning ved speciesvarer — culpa med omvendt bevisbyrde.",
      "§24": "Erstatning ved genusvarer — objektivt ansvar, kun fri ved force majeure.",
      "§42": "Mangelsbeføjelser for speciesvarer.",
      "§43": "Mangelsbeføjelser for genusvarer — omlevering, afslag, ophævelse ved væsentlig mangel, erstatning.",
      "§44": "Bedømmelsestidspunkt for mangel = farens overgang.",
      "§50": "Kvantitativ manko — mangelsreglerne anvendes tilsvarende, men ikke omlevering.",
      "§51": "Undersøgelsespligt.",
      "§52": "Reklamationspligt — synlig mangel: straks; ellers uden ugrundet ophold.",
      "§59": "Retlige mangler/vanhjemmel."
    }
  },
  CISG: {
    navn: "CISG",
    paragraffer: {
      "Art. 1": "Anvendelsesområde — forskellige stater, mindst én kontraherende, eller lovvalg dertil.",
      "Art. 25": "Væsentlig misligholdelse.",
      "Art. 31-32": "Leveringssted.",
      "Art. 33": "Leveringstid.",
      "Art. 35-36": "Mangler.",
      "Art. 38-39": "Undersøgelses- og reklamationspligt.",
      "Art. 45-52": "Købers beføjelser (fastholdelse, Nachfrist, ophævelse).",
      "Art. 66-70": "Risikoens overgang.",
      "Art. 73": "Delleverancer/ophævelse af hele aftalen.",
      "Art. 74-77": "Erstatning (inkl. tabt fortjeneste, begrænset til det forudseelige).",
      "Art. 93": "Territorial udelukkelse (bl.a. Grønland, jf. stk. 3).",
      "Art. 94": "Nordisk forbehold — mellem nordiske lande bruges national købelov, ikke CISG."
    }
  },
  SOELOVEN: {
    navn: "Sølovens kapitel 13",
    paragraffer: {
      "§251": "Definitioner (transportør, undertransportør, afsender, aflaster, transportdokument).",
      "§252": "Geografisk anvendelsesområde.",
      "§253": "Gælder ikke certepartier (befragtning).",
      "§254": "Præceptivitet — ufravigeligt til skade for varesiden.",
      "§255-261": "Levering af gods til transportøren, herunder afsenderens oplysningspligt om godsets art (fx farligt gods).",
      "§262": "Transportørens omsorgspligt og sødygtighed.",
      "§263": "Dækslast — kun hvis aftalt/sædvane/lov.",
      "§274": "Varetægtsperioden — fra modtagelse til udlevering.",
      "§275": "Ansvarsgrundlaget — præsumptionsansvar/culpa med omvendt bevisbyrde.",
      "§276": "Fritagelser — nautisk fejl og brand (ikke egen skyld).",
      "§277": "Fritagelse for levende dyr — særlige risici, hvis instrukser fulgt.",
      "§278": "Forsinkelse — samme standard som §275-277. Stk. 3: 60-dages totaltabsformodning.",
      "§279": "Erstatningens beregning (godsets værdi).",
      "§280": "Ansvarsbegrænsning — den HØJESTE af 667 SDR pr. kollo eller 2 SDR pr. kg.",
      "§281": "Container-klausul — kolli angivet i transportdokument tæller enkeltvis.",
      "§282": "Begrænsning gælder også uden for kontrakt.",
      "§283": "Ansvarsgennembrud — forsæt/grov uagtsomhed med forståelse af sandsynligt tab → fuld erstatning.",
      "§285-287": "Undertransportør hæfter solidarisk, samme loft som §280.",
      "§288": "Reklamation — synlig skade ved udlevering, skjult skade inden 3 dage, forsinkelse inden 60 dage.",
      "§290-291": "Afsenderens ansvar (culpa) og farligt gods.",
      "§501": "Forældelse — 1 år."
    }
  },
  CMR: {
    navn: "CMR-loven",
    paragraffer: {
      "§1": "Anvendelsesområde — international vejtransport mellem stater, mindst én konventionsstat.",
      "§4": "Fragtførerens ansvar for ansatte/hjælpere som egne handlinger.",
      "§12": "Afsenders ansvar for mangelfuld indpakning.",
      "§13": "Farligt gods — oplysningspligt.",
      "§24": "Hovedbestemmelsen — ansvar for bortkomst/beskadigelse og forsinket aflevering.",
      "§25": "Særlige fritagelsesgrunde (åbne køretøjer efter aftale, mangelfuld indpakning, afsender/modtagers egen læsning, godsets skrøbelighed, forkerte mærker, levende dyr).",
      "§27": "Forsinkelse defineret.",
      "§28": "Bortkomst efter 30/60 dage.",
      "§29": "Erstatning ved bortkomst — max 8,33 SDR pr. kg manglende bruttovægt.",
      "§30": "Angiven værdi hæver grænsen mod tillægsgodtgørelse.",
      "§31": "Erstatning ved beskadigelse — samme grænse som §29.",
      "§32": "Erstatning ved forsinkelse — begrænset til fragtbeløbet.",
      "§37": "Ansvarsgennembrud — forsæt eller grov uagtsomhed → ingen begrænsning.",
      "§38": "Indsigelse/reklamation — synlig skade ved aflevering, ellers inden 7 dage.",
      "§41": "Søgsmålsfrist — 1 år (3 år ved forsæt/grov uagtsomhed)."
    }
  },
  NSAB: {
    navn: "NSAB 2015",
    paragraffer: {
      "§1": "Anvendelse — kun for NSF-medlemmer, medmindre udvidet.",
      "§2": "Netværksklausulen — kendt transportform/skadested → brug DEN lovs regler i stedet for NSAB's egne §§15-21.",
      "§3B": "Speditør som kontraherende part — ansvarlig for egne opgaver og antagne undertransportører.",
      "§3C": "Speditør som formidler — kræver udtrykkelig præcisering, ellers §3B.",
      "§6": "Professionel standard/bevisbyrde. Stk. 2: ansvarsgennembrud ved forsæt/grov uagtsomhed.",
      "§15": "Speditørens ansvar som kontraktspart — varetægtsperiode.",
      "§16": "Fritagelsesgrunde (ordregiverfejl, egen stuvning, mangelfuld emballage m.fl.).",
      "§17": "Erstatning ved bortkomst/forringelse.",
      "§18": "Erstatning ved skade (værdiforringelsesprocent).",
      "§19": "Erstatning ved forsinkelse.",
      "§20": "Totaltab ved forsinkelse — 30 dage (int. vejtransport) / 60 dage (ellers).",
      "§21": "Maksimale beløb — A: 8,33 SDR/kg. B: fragtbeløbet. C: SDR 100.000/opgave.",
      "§27": "Reklamation — synlig skade straks, skjult inden 7 kalenderdage, andet inden 14 dage.",
      "§28": "Forældelse — 1 år.",
      "§29": "Værneting — speditørens hovedforretningssted."
    }
  }
};

// Standardkurs til undervisningsbrug — IKKE en officiel dagskurs. Efter fx CMR-lovens §29
// skal omregningen reelt ske efter kursen på domsdagen (eller en dato parterne aftaler).
// Brugeren kan selv indtaste en anden kurs i beregningsformularen.
const SDR_KURS = 9.25;
const SDR_KURS_KILDE = "Standardkurs til undervisningsbrug (ikke en dokumenteret dagskurs) — indtast selv den faktiske kurs på den relevante dato, hvis du kender den.";
