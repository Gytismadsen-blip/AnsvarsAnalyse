// Klassifikationsmotor: regelbaseret (INGEN AI). Scanner case-teksten for juridiske
// signalord og bygger "fund" med kildecitat, som brugeren selv skal godkende —
// nøjagtig samme mønster som FragtAnalyse's fund-tjekliste.
//
// Beslutningstræet er bygget ud fra en gennemgang af Transportjura-undervisningens
// vejledende besvarelser (Furs and Feathers, Jack Jeans, GPE m.fl.) og lovteksterne
// (Købeloven, CISG, Sølovens kap. 13, CMR-loven, NSAB 2015).
//
// Hver paragrafhenvisning er skrevet som "LOVKODE:§X" (fx "CMR:§24") og ALDRIG som
// bare "§24" — flere love bruger samme paragrafnummer (fx både Købeloven og CMR-loven
// har en §24 med helt forskelligt indhold), så uden lov-præfiks vil et opslag i
// LOVDATA gætte forkert og vise den forkerte lovs tekst.

// Danmark holdes ADSKILT fra de øvrige nordiske lande: i disse cases er Danmark næsten
// altid nævnt som hjemland, så det duer ikke som signal for at "modparten er nordisk".
// Det nordiske forbehold (CISG art. 94) er kun relevant hvis modparten er i ET ANDET
// nordisk land end Danmark (fx Sverige) — ikke bare fordi Danmark nævnes.
const DANMARK_ORD = ["danmark", "dansk"];
const NORDISKE_LANDE_UDEN_DK = ["sverige", "svensk", "norge", "norsk", "finland", "finsk", "island", "islandsk"];
const SAERLANDE_UDEN_CISG = ["grønland", "grønlandsk", "færøerne", "færøsk"];
const ANDRE_LANDE = [
  "tyskland", "tysk", "portugal", "portugisisk", "spanien", "spansk", "england", "engelsk",
  "storbritannien", "frankrig", "fransk", "holland", "nederlandene", "belgien", "belgisk",
  "italien", "italiensk", "polen", "polsk", "usa", "kina", "kinesisk", "litauen", "tjekkiet",
  "østrig", "schweiz", "irland"
];

// Caseteksterne bruger typisk BYNAVNE, ikke landenavne (fx "fra Hamborg til Aalborg"
// nævner aldrig "Tyskland"/"Danmark" direkte). Uden dette opslag tror motoren at der
// slet ikke er noget land i spil, og gætter forkert på national transport.
const BY_TIL_LAND = {
  "aalborg": "danmark", "århus": "danmark", "aarhus": "danmark", "københavn": "danmark", "kobenhavn": "danmark",
  "odense": "danmark", "esbjerg": "danmark", "horsens": "danmark", "vejle": "danmark", "kolding": "danmark",
  "fredericia": "danmark", "padborg": "danmark", "brønderslev": "danmark", "bronderslev": "danmark",
  "randers": "danmark", "herning": "danmark", "silkeborg": "danmark", "roskilde": "danmark",
  "hørby": "danmark", "horby": "danmark", "bøvlinghøj": "danmark", "bovlinghoj": "danmark",
  "nuuk": "grønland",
  "hamborg": "tyskland", "hamburg": "tyskland", "bremerhaven": "tyskland", "bremen": "tyskland",
  "berlin": "tyskland", "münchen": "tyskland", "munchen": "tyskland", "frankfurt": "tyskland", "köln": "tyskland",
  "valencia": "spanien", "madrid": "spanien", "barcelona": "spanien",
  "sines": "portugal", "lissabon": "portugal", "porto": "portugal",
  "antwerpen": "belgien", "bruxelles": "belgien",
  "dublin": "irland",
  "stockholm": "sverige", "göteborg": "sverige", "goteborg": "sverige", "malmö": "sverige", "malmo": "sverige",
  "oslo": "norge", "bergen": "norge",
  "helsinki": "finland"
};

// Hvilken "kategori" (samme inddeling som findAlleLande bruger) et land hører til.
const LAND_KATEGORI = {
  danmark: "danmark",
  grønland: "saer",
  sverige: "nordisk", norge: "nordisk", finland: "nordisk", island: "nordisk",
  tyskland: "andre", spanien: "andre", portugal: "andre", belgien: "andre", irland: "andre",
  england: "andre", frankrig: "andre", italien: "andre", polen: "andre", usa: "andre", kina: "andre",
  litauen: "andre", tjekkiet: "andre", østrig: "andre", schweiz: "andre", storbritannien: "andre"
};

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
  const fundet = { danmark: [], nordisk: [], saer: [], andre: [], byGaet: [] };
  for (const ord of DANMARK_ORD) if (t.includes(ord)) fundet.danmark.push(ord);
  for (const ord of NORDISKE_LANDE_UDEN_DK) if (t.includes(ord)) fundet.nordisk.push(ord);
  for (const ord of SAERLANDE_UDEN_CISG) if (t.includes(ord)) fundet.saer.push(ord);
  for (const ord of ANDRE_LANDE) if (t.includes(ord)) fundet.andre.push(ord);

  for (const by in BY_TIL_LAND) {
    if (!t.includes(by)) continue;
    const land = BY_TIL_LAND[by];
    const kategori = LAND_KATEGORI[land];
    if (!kategori || fundet[kategori].includes(by)) continue;
    fundet[kategori].push(by);
    fundet.byGaet.push(`${by[0].toUpperCase()}${by.slice(1)} → ${land[0].toUpperCase()}${land.slice(1)}`);
  }
  return fundet;
}

function nytFund(id, gruppe, label, vaerdi, citat, begrundelse, paragraffer = []) {
  return { id, gruppe, label, vaerdi, citat: citat || null, begrundelse, paragraffer, valgt: true };
}

// Finder navnene på sagsøger/sagsøgt/transportør ud fra typiske vendinger i caseteksterne
// (fx "X gør indsigelse mod Y" eller "transportvirksomheden Y"). Rent regex-baseret gæt —
// derfor et almindeligt fund med citat, som brugeren selv skal godkende/rette.
function udtraekParter(tekst) {
  const fund = [];

  const kravRegex = /([A-ZÆØÅ][\wÆØÅæøå .&-]{1,40}?)\s+(?:gør indsigelse|reklamerer|rejser (?:et )?(?:krav|erstatningskrav)|kræver erstatning|søger (?:om )?(?:fuld )?erstatning|sagsøger)\s*(?:mod|imod|hos|fra)?\s*([A-ZÆØÅ][\wÆØÅæøå .&-]{1,40})?/;
  const krav = tekst.match(kravRegex);
  if (krav) {
    const sagsoeger = krav[1].trim();
    const sagsoegteRaa = krav[2] ? krav[2].trim().replace(/[,.]$/, "") : null;
    fund.push(nytFund("sagsoeger", "parter", "Rejser kravet (sagsøger)", sagsoeger,
      findSignal(new RegExp(escapeRegex(krav[0])), tekst)?.citat, `Fundet ud fra formuleringen "${krav[0].trim()}" — bekræft selv at navnet er korrekt.`));
    if (sagsoegteRaa) {
      fund.push(nytFund("sagsoegte", "parter", "Kravet rettes mod (sagsøgte)", sagsoegteRaa,
        findSignal(new RegExp(escapeRegex(krav[0])), tekst)?.citat, `Fundet ud fra formuleringen "${krav[0].trim()}" — bekræft selv at navnet er korrekt.`));
    }
  }

  // OBS: nøgleordet skal findes UAFHÆNGIGT af store/små bogstaver (/i), men det navn der
  // følger efter skal KRÆVE stort begyndelsesbogstav (uden /i) for reelt at virke som et
  // filter for egennavne — ellers matcher [A-ZÆØÅ] også små bogstaver pga. /i-flaget.
  const transpNoegleordRegex = /(?:transportvirksomheden|speditøren|speditør|fragtføreren|rederiet|kontraherende transportør)/i;
  const transpNoegleord = tekst.match(transpNoegleordRegex);
  if (transpNoegleord) {
    const restTekst = tekst.slice(transpNoegleord.index + transpNoegleord[0].length);
    const navnMatch = restTekst.match(/^\s+([A-ZÆØÅ][^\n.,]{0,40}?)(?=[.,\n]|\s+(?:at|og|som|der|skal|er|har|til)\s|$)/);
    if (navnMatch) {
      const navn = navnMatch[1].trim();
      const heleFundet = transpNoegleord[0] + navnMatch[0];
      fund.push(nytFund("transportoer-navn", "parter", "Transportørens/speditørens navn", navn,
        findSignal(new RegExp(escapeRegex(heleFundet)), tekst)?.citat, `Fundet ud fra formuleringen "${heleFundet.trim()}" — bekræft selv at navnet er korrekt.`));
    }
  }

  return fund;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Dansk taltekst bruger "." som tusindtalsseparator og "," som decimal — modsat engelsk.
function parseDanskTal(str) {
  if (!str) return null;
  const tal = parseFloat(str.replace(/\./g, "").replace(",", "."));
  return isNaN(tal) ? null : tal;
}

// Finder vægt/beløb/antal-skadet i casen, så beregningsfelterne på fane 3 kan foreslås
// automatisk i stedet for at brugeren altid selv skal taste dem ind. Rent regex-baseret
// gæt — vises som almindelige fund med citat, som brugeren selv skal godkende.
function udtraekTal(tekst, checklist) {
  const fund = [];

  const valutaSignal = findSignal(/€|\$|(?<![A-Za-zæøå])(?:USD|EUR|GBP)(?![A-Za-zæøå])|\bdollar\b|\beuro\b/i, tekst);
  if (valutaSignal) {
    checklist.push({ tekst: "Anden valuta end kr. fundet", status: "mangler",
      note: `Teksten nævner muligvis en anden valuta ("${valutaSignal.match}") — omregn selv til kr. før du bruger beløbet i beregningen.` });
  }

  const vaegtPrStkM = tekst.match(/([\d.,]+)\s*kg[\s.]*(?:pr\.?|\/)\s*stk/i);
  const kroPrStkM = tekst.match(/([\d.,]+)\s*kr\.?[\s.]*(?:pr\.?|\/)\s*stk/i);
  const antalSkadetM = tekst.match(/(\d+)\s+[a-zæøåA-ZÆØÅ]+\s+(?:er\s+)?(?:væltet|beskadiget|ødelagt|totalskadet|gået i stykker|skadet)/i);
  const vaegtDirekteM = tekst.match(/vejer\s+([\d.,]+)\s*(kg|ton)/i);
  const vaerdiDirekteM = tekst.match(/(?:værdi(?:en)? p[åa]|koste[rn]?)\s*(?:ca\.?\s*)?([\d.,]+)\s*kr/i);

  const antalSkadet = antalSkadetM ? parseInt(antalSkadetM[1], 10) : null;
  const vaegtPrStk = parseDanskTal(vaegtPrStkM && vaegtPrStkM[1]);
  const kroPrStk = parseDanskTal(kroPrStkM && kroPrStkM[1]);

  if (antalSkadet && vaegtPrStk) {
    const totalVaegt = antalSkadet * vaegtPrStk;
    fund.push(nytFund("tal-vaegt", "tal", "Samlet vægt (beregnet)", `${totalVaegt} kg`,
      `${antalSkadetM[0]} … ${vaegtPrStkM[0]}`, `${antalSkadet} stk. × ${vaegtPrStk} kg/stk. = ${totalVaegt} kg.`));
    fund.push(nytFund("tal-kolli", "tal", "Antal kolli (beregnet)", `${antalSkadet}`,
      antalSkadetM[0], "Antaget at hvert beskadiget stk. tæller som ét kollo — bekræft selv."));
  } else if (vaegtDirekteM) {
    let totalVaegt = parseDanskTal(vaegtDirekteM[1]);
    if (/ton/i.test(vaegtDirekteM[2])) totalVaegt *= 1000;
    fund.push(nytFund("tal-vaegt", "tal", "Samlet vægt", `${totalVaegt} kg`,
      vaegtDirekteM[0], "Vægt fundet direkte i teksten."));
  }

  if (antalSkadet && kroPrStk) {
    const totalTab = antalSkadet * kroPrStk;
    fund.push(nytFund("tal-tab", "tal", "Faktisk tab (beregnet)", `${totalTab} kr.`,
      `${antalSkadetM[0]} … ${kroPrStkM[0]}`, `${antalSkadet} stk. × ${kroPrStk} kr./stk. = ${totalTab} kr.`));
  } else if (vaerdiDirekteM) {
    fund.push(nytFund("tal-tab", "tal", "Faktisk tab", `${parseDanskTal(vaerdiDirekteM[1])} kr.`,
      vaerdiDirekteM[0], "Beløb fundet direkte i teksten — bekræft selv at det er DETTE tab, og ikke fx den fulde ordreværdi."));
  }

  return fund;
}

function klassificerCase(tekst) {
  const fund = [];
  const checklist = [];

  fund.push(...udtraekParter(tekst));
  fund.push(...udtraekTal(tekst, checklist));

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

    // Rækkefølgen betyder noget: Danmark nævnes næsten altid (som hjemland) og må IKKE
    // i sig selv udløse "nordisk forbehold" — kun hvis modparten er i et ANDET nordisk
    // land (Sverige/Norge/Finland/Island), og der IKKE også er et ikke-nordisk land i spil.
    if (lande.saer.length > 0) {
      fund.push(nytFund("kbl-groenland", "lovvalg-koeb", "Købeloven (ikke CISG)", "Købeloven",
        landeCitat(lande.saer), `Grønland/Færøerne nævnt — disse anses IKKE for kontraherende stater efter CISG art. 93 stk. 3, selvom handlen er international.`,
        ["CISG:Art. 93", "KBL:§17"]));
    } else if (lande.andre.length > 0) {
      fund.push(nytFund("cisg", "lovvalg-koeb", "CISG (kandidat)", "CISG",
        landeCitat(lande.andre), `Et ikke-nordisk land er nævnt i teksten (${lande.andre.slice(0,2).join(", ")}) — bekræft selv at det faktisk er PARTERNES hjemland (og ikke bare fx et leveringssted/en havn), og at mindst én af parterne er i en kontraherende CISG-stat.`,
        ["CISG:Art. 1", "CISG:Art. 66-70"]));
    } else if (lande.nordisk.length > 0) {
      fund.push(nytFund("kbl-nordisk", "lovvalg-koeb", "Købeloven (nordisk forbehold)", "Købeloven",
        landeCitat(lande.nordisk), "Kun nordiske lande nævnt ud over Danmark — det nordiske forbehold (CISG art. 94) betyder at Købeloven bruges i stedet for CISG.",
        ["CISG:Art. 94", "KBL:§17"]));
    } else {
      fund.push(nytFund("kbl-national", "lovvalg-koeb", "Købeloven (national handel)", "Købeloven",
        null, "Ingen international dimension fundet i teksten — rent nationalt køb er altid omfattet af Købeloven, aldrig CISG.",
        ["KBL:§17", "KBL:§24"]));
    }

    if (lande.byGaet.length > 0) {
      checklist.push({ tekst: "Landegenkendelse ud fra bynavne", status: "mangler",
        note: `Byer i teksten er brugt til at gætte land: ${lande.byGaet.join(", ")}. Bekræft selv at gættet er korrekt.` });
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
  // "tog" er datid af udsagnsordet "at tage" (meget almindeligt) og bruges IKKE alene —
  // det ville fx fejlagtigt matche "modtog". Kun "jernbane" bruges som togsignal.
  const togSignal = findSignal(/jernbane/i, tekst);

  if (soeSignal) {
    fund.push(nytFund("soeloven", "transportform", "Søtransport → Sølovens kapitel 13", "Sølovens kapitel 13",
      soeSignal.citat, "Skib/havn/rederi nævnt i teksten — søtransport er identificeret i kæden.",
      ["SOELOVEN:§274", "SOELOVEN:§275", "SOELOVEN:§280"]));
  }

  if (landevejSignal) {
    const lande = findAlleLande(tekst);
    const antalForskelligeLande = (lande.danmark.length > 0 ? 1 : 0) + (lande.nordisk.length > 0 ? 1 : 0) + (lande.andre.length > 0 ? 1 : 0) + (lande.saer.length > 0 ? 1 : 0);
    if (antalForskelligeLande >= 2) {
      fund.push(nytFund("cmr", "transportform", "International landevejstransport → CMR-loven", "CMR-loven",
        landevejSignal.citat, "Lastbiltransport nævnt, og flere lande er identificeret i teksten — CMR-loven gælder kun international vejtransport (§1).",
        ["CMR:§1", "CMR:§4", "CMR:§24", "CMR:§29"]));
    } else {
      fund.push(nytFund("nsab-national", "transportform", "National landevejstransport → NSAB direkte", "NSAB 2015 (ikke CMR-loven)",
        landevejSignal.citat, "Lastbiltransport nævnt, men der er IKKE fundet to forskellige lande i teksten — CMR-loven gælder kun international transport (§1). Bekræft selv om begge steder ligger i samme land.",
        ["NSAB:§21"]));
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
      ["NSAB:§2", "NSAB:§21"]));
  }

  if (antalTransportformer === 0 && transportretSignal) {
    checklist.push({ tekst: "Transportform", status: "mangler", note: "Der ser ud til at være en transportør involveret, men appen kunne ikke se hvilken transportform (skib/lastbil/fly/tog) — vælg selv." });
  }

  // --- Respekter en eksplicit "tages udgangspunkt i X"-instruks i opgaveteksten ---
  // Set i "opgave NSAB"-casen (PH Thomsen): opgaven nævner Tyskland i forbindelse med en
  // HELT ANDEN ordre end den beskadigede sending, hvilket narrer den generelle
  // landegenkendelse til fejlagtigt at tro sagen er international. Når opgaven selv siger
  // hvilken lov der skal bruges, vejer det tungere end et land-gæt hen over hele teksten.
  const udgangspunktM = tekst.match(/tages\s+udgangspunkt\s+i\s+(NSAB(?:\s*2015)?|CMR-loven|S[øo]lovens?(?:\s+kapitel\s+13)?|K[øo]beloven|CISG)/i);
  if (udgangspunktM && /NSAB/i.test(udgangspunktM[1])) {
    const cmrIndex = fund.findIndex(f => f.id === "cmr");
    if (cmrIndex !== -1) {
      fund.splice(cmrIndex, 1);
      fund.push(nytFund("nsab-national", "transportform", "NSAB 2015 (opgaveteksten angiver det selv)", "NSAB 2015",
        findSignal(new RegExp(escapeRegex(udgangspunktM[0])), tekst)?.citat,
        "Opgaveteksten angiver selv at der skal tages udgangspunkt i NSAB 2015 — det vejer tungere end en automatisk landegenkendelse, som kan blive forvirret hvis casen nævner flere forskellige forsendelser/lande.",
        ["NSAB:§21"]));
      checklist.push({ tekst: "Lovvalg overstyret af opgavens egen instruks", status: "mangler",
        note: `Fandt "${udgangspunktM[0]}" i teksten — det automatiske CMR-gæt er derfor fjernet igen. Bekræft selv at NSAB 2015 er korrekt.` });
    }
  }

  // --- TRIN 4: Er NSAB aftalt? ---
  const nsabSignal = findSignal(/NSAB|Nordisk Speditørforbund|Danske Speditører/i, tekst);
  if (nsabSignal) {
    fund.push(nytFund("nsab-vedtaget", "aftalegrundlag", "NSAB 2015 vedtaget", "NSAB 2015 som aftalegrundlag",
      nsabSignal.citat, "NSAB nævnt direkte i teksten — NSAB gælder kun hvis udtrykkeligt eller stiltiende vedtaget (§1). Netværksklausulen (§2) kan stadig sende sagen videre til søloven/CMR-loven.",
      ["NSAB:§1", "NSAB:§2", "NSAB:§3B"]));
  } else if (transportretSignal) {
    checklist.push({ tekst: "Er NSAB vedtaget mellem parterne?", status: "mangler", note: "Ingen direkte henvisning til NSAB fundet — tjek selv om det fremgår af tilbud/ordrebekræftelse/kutyme." });
  }

  // --- TRIN 5: Særlige flag ---
  // "får" er også nutid af udsagnsordet "at få" (meget almindeligt, fx "chaufføren får
  // dokumenterne") — kræv derfor et forudgående tal eller en entydig substantivform
  // (fåret/fårene), ikke det bare ord "får".
  const dyrSignal = findSignal(/levende dyr|\bfåret\b|\bfårene\b|\d+\s*får\b|kvæg|heste|husdyr|avlsdyr/i, tekst);
  if (dyrSignal) {
    fund.push(nytFund("levende-dyr", "specialflag", "Levende dyr", "Særlig fritagelsesregel kan være i spil",
      dyrSignal.citat, "Levende dyr transporteret — tjek Sølovens §277 / CMR-lovens §25 stk. 1 litra f. Fritagelsen kræver at transportøren har fulgt givne instrukser; tekniske udstyrsfejl (fx svigtende vanding) tæller normalt IKKE som en 'særlig risiko ved levende dyr'.",
      ["SOELOVEN:§277", "CMR:§25"]));
  }
  const koelSignal = findSignal(/køl(?:e|ing)?|frost|temperatur|kølekæde/i, tekst);
  if (koelSignal) {
    fund.push(nytFund("koel-frost", "specialflag", "Køl-/frostgods", "Skærpet krav til transportøren",
      koelSignal.citat, "Temperaturfølsomt gods — CMR §25 stk. 3: transportøren mister normalt retten til at påberåbe godsets-egen-beskaffenhed-fritagelsen, medmindre køleudstyret var korrekt vedligeholdt og brugt.",
      ["CMR:§25"]));
  }
  const aabenSignal = findSignal(/åben trailer|åbent køretøj|uden presenning/i, tekst);
  if (aabenSignal) {
    fund.push(nytFund("aaben-trailer", "specialflag", "Åben trailer/uden presenning", "Kan give fritagelse for transportøren",
      aabenSignal.citat, "CMR §25 litra a fritager kun, hvis den åbne transportform var UDTRYKKELIGT aftalt og optaget i fragtbrevet.",
      ["CMR:§25"]));
  }
  const farligtSignal = findSignal(/farligt gods|samlæs(?:ning|set)/i, tekst);
  if (farligtSignal) {
    fund.push(nytFund("farligt-gods", "specialflag", "Farligt gods / samlæsning", "Afsenderens oplysningspligt",
      farligtSignal.citat, "Tjek afsenderens oplysningspligt (CMR §13/Sølovens §255-261) og evt. ulovlig samlæsning som selvstændig ansvarsgrund for transportøren.",
      ["CMR:§13", "SOELOVEN:§255-261"]));
  }
  const grovUagtsomhedSignal = findSignal(/for stærkt|for hurtigt|høj(?:e)? fart|helvedes fart|ignorer\w*|uden hensyn|bevidst|stresset|irriteret/i, tekst);
  if (grovUagtsomhedSignal) {
    fund.push(nytFund("mulig-grov-uagtsomhed", "specialflag", "Mulig grov uagtsomhed", "Adfærd der kan pege på grov uagtsomhed",
      grovUagtsomhedSignal.citat, "Teksten beskriver en adfærd der kan være relevant for spørgsmålet om ansvarsgennembrud — men det er fortsat et konkret bevisspørgsmål, ikke noget der er bevist i sig selv.",
      []));
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
