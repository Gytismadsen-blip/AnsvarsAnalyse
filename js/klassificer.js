// Klassifikationsmotor: regelbaseret (INGEN AI). Scanner case-teksten for juridiske
// signalord og bygger "fund" med kildecitat, som brugeren selv skal godkende —
// nøjagtig samme mønster som FragtAnalyse's fund-tjekliste.
//
// Beslutningstræet er bygget ud fra en gennemgang af Transportjura-undervisningens
// vejledende besvarelser (Furs and Feathers, Jack Jeans, GPE m.fl.) og lovteksterne
// (Købeloven, CISG, Sølovens kap. 13, CMR-loven, NSAB 2015).

const NORDISKE_LANDE = ["danmark", "dansk", "sverige", "svensk", "norge", "norsk", "finland", "finsk", "island", "islandsk"];
const SAERLANDE_UDEN_CISG = ["grønland", "grønlandsk", "færøerne", "færøsk"];
const ANDRE_LANDE = [
  "tyskland", "tysk", "portugal", "portugisisk", "spanien", "spansk", "england", "engelsk",
  "storbritannien", "frankrig", "fransk", "holland", "nederlandene", "belgien", "belgisk",
  "italien", "italiensk", "polen", "polsk", "usa", "kina", "kinesisk", "litauen", "tjekkiet",
  "østrig", "schweiz", "irland", "dublin"
];

function findSignal(regex, tekst, kontekst = 50) {
  const m = tekst.match(regex);
  if (!m) return null;
  const start = Math.max(0, m.index - kontekst);
  const slut = Math.min(tekst.length, m.index + m[0].length + kontekst);
  return {
    match: m[0],
    citat: (start > 0 ? "…" : "") + tekst.slice(start, slut).replace(/\s+/g, " ").trim() + (slut < tekst.length ? "…" : "")
  };
}

function findAlleLande(tekst) {
  const t = tekst.toLowerCase();
  const fundet = { nordisk: [], saer: [], andre: [] };
  for (const ord of NORDISKE_LANDE) if (t.includes(ord)) fundet.nordisk.push(ord);
  for (const ord of SAERLANDE_UDEN_CISG) if (t.includes(ord)) fundet.saer.push(ord);
  for (const ord of ANDRE_LANDE) if (t.includes(ord)) fundet.andre.push(ord);
  return fundet;
}

function nytFund(id, gruppe, label, vaerdi, citat, begrundelse, paragraffer = []) {
  return { id, gruppe, label, vaerdi, citat: citat || null, begrundelse, paragraffer, valgt: true };
}

function klassificerCase(tekst) {
  const fund = [];
  const checklist = [];

  // --- TRIN 1: Køberet eller transportret? ---
  const koeberetSignal = findSignal(/sælger|køber|levering|risikoens overgang|mangel|reklamation/i, tekst);
  const transportretSignal = findSignal(/transportør|fragtfører|speditør|fragtbrev|CMR[- ]?brev|konnossement|\bB\/L\b|undertransportør/i, tekst);

  if (koeberetSignal) {
    fund.push(nytFund("koeberet", "omraade", "Køberetligt element", "Købsaftale identificeret",
      koeberetSignal.citat, "Ord som 'sælger', 'køber' eller 'levering' peger på en handelskøbsretlig problemstilling."));
  } else {
    checklist.push({ tekst: "Køberetligt element", status: "mangler", note: "Ingen tydelige køberets-signaler fundet — bekræft selv om der er en købsaftale i sagen." });
  }

  if (transportretSignal) {
    fund.push(nytFund("transportret", "omraade", "Transportretligt element", "Transportaftale identificeret",
      transportretSignal.citat, "Ord som 'transportør', 'speditør' eller 'fragtbrev' peger på en transportretlig problemstilling."));
  } else {
    checklist.push({ tekst: "Transportretligt element", status: "mangler", note: "Ingen tydelige transportrets-signaler fundet — bekræft selv om en transportør/speditør er involveret." });
  }

  // --- TRIN 2: CISG eller Købeloven? (kun relevant hvis køberetligt element) ---
  if (koeberetSignal) {
    const lande = findAlleLande(tekst);
    const landeCitat = (ord) => {
      if (!ord || ord.length === 0) return null;
      const regex = new RegExp(ord.slice(0, 3).join("|"), "i");
      const sig = findSignal(regex, tekst);
      return sig ? sig.citat : null;
    };

    if (lande.saer.length > 0) {
      fund.push(nytFund("kbl-groenland", "lovvalg-koeb", "Købeloven (ikke CISG)", "Købeloven",
        landeCitat(lande.saer), `Grønland/Færøerne nævnt — disse anses IKKE for kontraherende stater efter CISG art. 93 stk. 3, selvom handlen er international.`,
        ["Art. 93", "§17"]));
    } else if (lande.andre.length > 0 && lande.nordisk.length === 0) {
      fund.push(nytFund("cisg", "lovvalg-koeb", "CISG (kandidat)", "CISG",
        landeCitat(lande.andre), `Parterne ser ud til at have forretningssted i forskellige, ikke-nordiske lande (${lande.andre.slice(0,2).join(", ")}) — bekræft selv at det faktisk er PARTERNES hjemland (og ikke bare fx et leveringssted/en havn), og at mindst én er kontraherende stat.`,
        ["Art. 1", "Art. 66-70"]));
    } else if (lande.andre.length > 0 && lande.nordisk.length > 0) {
      fund.push(nytFund("kbl-nordisk", "lovvalg-koeb", "Købeloven (nordisk forbehold)", "Købeloven",
        landeCitat(lande.nordisk), "Handel mellem nordiske lande — det nordiske forbehold (CISG art. 94) betyder at Købeloven bruges i stedet for CISG.",
        ["Art. 94", "§17"]));
    } else {
      fund.push(nytFund("kbl-national", "lovvalg-koeb", "Købeloven (national handel)", "Købeloven",
        null, "Ingen international dimension fundet i teksten — rent nationalt køb er altid omfattet af Købeloven, aldrig CISG.",
        ["§17", "§24"]));
    }

    const dkSelskabsform = tekst.match(/\b[A-ZÆØÅ][\wÆØÅæøå.&\- ]{1,40}\s(A\/S|ApS|I\/S|K\/S)\b/g) || [];
    if (dkSelskabsform.length >= 2 && (lande.andre.length > 0)) {
      checklist.push({ tekst: "Tjek parternes hjemland", status: "mangler",
        note: `Flere danske selskabsformer fundet (${dkSelskabsform.slice(0,2).join(", ")}) — et andet lands navn i teksten er ofte bare et leverings-/havnested, ikke nødvendigvis en parts hjemland. Bekræft selv om det reelt er en international handel.` });
    }
  }

  // --- TRIN 3: Transportform → hvilken lov? ---
  const soeSignal = findSignal(/\bskib\b|rederi|\bMSC\b|Maersk|CMA-?CGM|container.{0,20}ombord|konnossement|\bB\/L\b|sejles|lastehavn|lossehavn|\bhavn\b/i, tekst);
  const landevejSignal = findSignal(/lastbil|vognmand|chauffør|landevej|trailer|CMR[- ]?fragtbrev|CMR[- ]?brev/i, tekst);
  const flySignal = findSignal(/\bfly\b|luftfragtbrev|\bAWB\b/i, tekst);
  const togSignal = findSignal(/jernbane|tog(?!vogn)/i, tekst);

  if (soeSignal) {
    fund.push(nytFund("soeloven", "transportform", "Søtransport → Sølovens kapitel 13", "Sølovens kapitel 13",
      soeSignal.citat, "Skib/havn/rederi nævnt i teksten — søtransport er identificeret i kæden.",
      ["§274", "§275", "§280"]));
  }

  if (landevejSignal) {
    const lande = findAlleLande(tekst);
    const antalForskelligeLande = (lande.nordisk.length > 0 ? 1 : 0) + (lande.andre.length > 0 ? 1 : 0) + (lande.saer.length > 0 ? 1 : 0);
    if (antalForskelligeLande >= 2) {
      fund.push(nytFund("cmr", "transportform", "International landevejstransport → CMR-loven", "CMR-loven",
        landevejSignal.citat, "Lastbiltransport nævnt, og flere lande er identificeret i teksten — CMR-loven gælder kun international vejtransport (§1).",
        ["§1", "§24", "§29"]));
    } else {
      fund.push(nytFund("nsab-national", "transportform", "National landevejstransport → NSAB direkte", "NSAB 2015 (ikke CMR-loven)",
        landevejSignal.citat, "Lastbiltransport nævnt, men der er IKKE fundet to forskellige lande i teksten — CMR-loven gælder kun international transport (§1). Bekræft selv om begge steder ligger i samme land.",
        ["§21"]));
      checklist.push({ tekst: "National eller international vejtransport?", status: "mangler", note: "Bekræft selv om afsendelses- og modtagelsessted ligger i samme land (→ NSAB) eller forskellige lande (→ CMR-loven)." });
    }
  }

  if (flySignal) {
    fund.push(nytFund("luft", "transportform", "Lufttransport → Montrealkonventionen", "Montrealkonventionen/luftfartsloven",
      flySignal.citat, "Fly/luftfragtbrev nævnt i teksten."));
  }
  if (togSignal) {
    fund.push(nytFund("jernbane", "transportform", "Jernbanetransport → CIM/COTIF", "CIM/COTIF",
      togSignal.citat, "Jernbane nævnt i teksten."));
  }

  const antalTransportformer = [soeSignal, landevejSignal, flySignal, togSignal].filter(Boolean).length;
  if (antalTransportformer >= 2) {
    fund.push(nytFund("multimodal", "transportform", "Multimodal transport — NSAB netværksklausul", "NSAB 2015 §2 (netværksklausulen)",
      null, "Flere transportformer i samme forløb. NSAB's netværksklausul (§2) betyder: kan skadesstedet lokaliseres til én transportform, bruges DEN lovs regler direkte; kan det ikke, bruges NSAB's egne grænser (§§15-21).",
      ["§2", "§21"]));
  }

  if (antalTransportformer === 0 && transportretSignal) {
    checklist.push({ tekst: "Transportform", status: "mangler", note: "Der ser ud til at være en transportør involveret, men appen kunne ikke se hvilken transportform (skib/lastbil/fly/tog) — vælg selv." });
  }

  // --- TRIN 4: Er NSAB aftalt? ---
  const nsabSignal = findSignal(/NSAB|Nordisk Speditørforbund|Danske Speditører/i, tekst);
  if (nsabSignal) {
    fund.push(nytFund("nsab-vedtaget", "aftalegrundlag", "NSAB 2015 vedtaget", "NSAB 2015 som aftalegrundlag",
      nsabSignal.citat, "NSAB nævnt direkte i teksten — NSAB gælder kun hvis udtrykkeligt eller stiltiende vedtaget (§1). Netværksklausulen (§2) kan stadig sende sagen videre til søloven/CMR-loven.",
      ["§1", "§2", "§3B"]));
  } else if (transportretSignal) {
    checklist.push({ tekst: "Er NSAB vedtaget mellem parterne?", status: "mangler", note: "Ingen direkte henvisning til NSAB fundet — tjek selv om det fremgår af tilbud/ordrebekræftelse/kutyme." });
  }

  // --- TRIN 5: Særlige flag ---
  const dyrSignal = findSignal(/levende dyr|\bfår\b|kvæg|heste|husdyr|avlsdyr/i, tekst);
  if (dyrSignal) {
    fund.push(nytFund("levende-dyr", "specialflag", "Levende dyr", "Særlig fritagelsesregel kan være i spil",
      dyrSignal.citat, "Levende dyr transporteret — tjek Sølovens §277 / CMR-lovens §25 stk. 1 litra f. Fritagelsen kræver at transportøren har fulgt givne instrukser; tekniske udstyrsfejl (fx svigtende vanding) tæller normalt IKKE som en 'særlig risiko ved levende dyr'.",
      ["§277", "§25"]));
  }
  const koelSignal = findSignal(/køl(?:e|ing)?|frost|temperatur|kølekæde/i, tekst);
  if (koelSignal) {
    fund.push(nytFund("koel-frost", "specialflag", "Køl-/frostgods", "Skærpet krav til transportøren",
      koelSignal.citat, "Temperaturfølsomt gods — CMR §25 stk. 3: transportøren mister normalt retten til at påberåbe godsets-egen-beskaffenhed-fritagelsen, medmindre køleudstyret var korrekt vedligeholdt og brugt.",
      ["§25"]));
  }
  const aabenSignal = findSignal(/åben trailer|åbent køretøj|uden presenning/i, tekst);
  if (aabenSignal) {
    fund.push(nytFund("aaben-trailer", "specialflag", "Åben trailer/uden presenning", "Kan give fritagelse for transportøren",
      aabenSignal.citat, "CMR §25 litra a fritager kun, hvis den åbne transportform var UDTRYKKELIGT aftalt og optaget i fragtbrevet.",
      ["§25"]));
  }
  const farligtSignal = findSignal(/farligt gods|samlæs(?:ning|set)/i, tekst);
  if (farligtSignal) {
    fund.push(nytFund("farligt-gods", "specialflag", "Farligt gods / samlæsning", "Afsenderens oplysningspligt",
      farligtSignal.citat, "Tjek afsenderens oplysningspligt (CMR §13/Sølovens §257) og evt. ulovlig samlæsning som selvstændig ansvarsgrund for transportøren.",
      ["§13"]));
  }

  // --- Respekter eksplicitte afgrænsninger i opgaveteksten ---
  // Mange caseopgaver skriver direkte "X og dens retsvirkninger er ikke en del af opgaven".
  // Uden dette tjek vil generiske ord som "chauffør"/"trailer" i en rent køberetlig
  // ulykkesbeskrivelse fejlagtigt udløse et transportret-fund (set i "Jack Jeans"-casen).
  const afgraensningRegex = /([A-Za-zÆØÅæøå]+)\s+(?:og\s+(?:dens|dets|dennes|dettes)\s+retsvirkninger\s+)?er\s+ikke\s+(?:en\s+del\s+af|omfattet\s+af)\s+opgaven/gi;
  let afgraensning;
  while ((afgraensning = afgraensningRegex.exec(tekst)) !== null) {
    const emne = afgraensning[1];
    if (/transport/i.test(emne)) {
      const fjernet = fund.filter(f => f.gruppe === "transportform" || f.gruppe === "aftalegrundlag");
      if (fjernet.length > 0) {
        for (let i = fund.length - 1; i >= 0; i--) {
          if (fund[i].gruppe === "transportform" || fund[i].gruppe === "aftalegrundlag") fund.splice(i, 1);
        }
        checklist.push({ tekst: "Transportret afgrænset væk", status: "mangler", note: `Opgaveteksten angiver selv: "${emne} ... er ikke en del af opgaven" — transportretlige fund er derfor ikke vist automatisk.` });
      }
    }
    if (/køb|salg/i.test(emne)) {
      for (let i = fund.length - 1; i >= 0; i--) {
        if (fund[i].id === "koeberet" || fund[i].gruppe === "lovvalg-koeb") fund.splice(i, 1);
      }
      checklist.push({ tekst: "Køberet afgrænset væk", status: "mangler", note: `Opgaveteksten angiver selv: "${emne} ... er ikke en del af opgaven" — køberetlige fund er derfor ikke vist automatisk.` });
    }
  }

  return { fund, checklist };
}

function bestemHovedlov(fund) {
  const godkendt = fund.filter(f => f.valgt);
  if (godkendt.find(f => f.id === "soeloven")) return "SOELOVEN";
  if (godkendt.find(f => f.id === "cmr")) return "CMR";
  if (godkendt.find(f => f.id === "nsab-national")) return "NSAB";
  return null;
}
