// Konklusionsgenerator: REGELBASERET tekstopbygning (if/else + skabelon), ingen AI.
// Skriver en SAMMENHÆNGENDE juridisk konklusion i løbende prosa, hvor tal, parter og
// paragraffer er flettet ind i sætningerne — ikke en liste af "Label: fund"-afsnit, og
// ikke sprog som "nævnt i teksten" (den slags reasoning-sprog hører til Lovvalg-fanen).

const KOEB_FORKLARING = {
  "kbl-groenland": "Grønland/Færøerne anses ikke for en kontraherende CISG-stat, jf. CISG art. 93 stk. 3, hvorfor Købeloven finder anvendelse på trods af handlens internationale karakter",
  "cisg": "parterne har forretningssted i hver sit land, hvorfor forholdet er omfattet af CISG, jf. art. 1, under forudsætning af at mindst én af parterne er i en kontraherende stat",
  "kbl-nordisk": "handlen er mellem nordiske lande, hvorfor det nordiske forbehold i CISG art. 94 medfører at Købeloven finder anvendelse i stedet for CISG",
  "kbl-national": "handlen er indgået uden international dimension og er derfor omfattet af Købeloven"
};

const TRANSPORT_FORKLARING = {
  "soeloven": "transporten er sket med skib, hvorfor Sølovens kapitel 13 om godsansvar finder anvendelse",
  "cmr": "transporten er international vejtransport mellem to stater, hvorfor CMR-loven finder anvendelse, jf. CMR-lovens §1",
  "nsab-national": "transporten er ren national vejtransport, hvorfor CMR-loven ikke finder anvendelse (§1) — i stedet lægges NSAB 2015's egne regler til grund"
};

const ANSVARSGRUNDLAG_TEKST = {
  SOELOVEN: "transportøren er underlagt et præsumptionsansvar efter Sølovens §275: transportøren anses for ansvarlig for tab eller skade i varetægtsperioden (§274), medmindre en fritagelsesgrund i §276 (nautisk fejl eller brand) eller §277 (særlige risici ved levende dyr) kan godtgøres",
  CMR: "fragtføreren hæfter efter CMR-lovens §24 for bortkomst, beskadigelse og forsinkelse i perioden fra overtagelse til aflevering, og hæfter efter §4 for sine ansatte og andre personer, hvis ydelser fragtføreren benytter til transportens udførelse, som var det egne handlinger — ansvaret er kun udelukket hvis en af de særlige fritagelsesgrunde i §25 kan godtgøres",
  NSAB: "speditøren skal efter NSAB §6 godtgøre at have udvist fornøden omhu, og hæfter efter §3B for egne opgaver og for antagne undertransportørers forhold, som var det speditørens egne"
};

const GENNEMBRUD_PARAGRAF = { SOELOVEN: "SOELOVEN:§283", CMR: "CMR:§37", NSAB: "NSAB:§6" };
const GENNEMBRUD_HENVISNING = { SOELOVEN: "§283", CMR: "§37", NSAB: "§6 stk. 2" };
const REKLAMATION_PARAGRAF = { SOELOVEN: "SOELOVEN:§288", CMR: "CMR:§38", NSAB: "NSAB:§27" };

function genererKonklusion(fund, beregning) {
  const godkendt = fund.filter(f => f.valgt);
  const afsnit = [];
  const tagStilling = [];
  const paragraffer = new Set();

  const findFund = (id) => godkendt.find(f => f.id === id);
  const koebLov = godkendt.find(f => f.gruppe === "lovvalg-koeb");
  const transportform = godkendt.filter(f => f.gruppe === "transportform" && f.id !== "multimodal");
  const nsabVedtaget = findFund("nsab-vedtaget");
  const grovUagtsomhed = findFund("mulig-grov-uagtsomhed");
  const sagsoeger = findFund("sagsoeger");
  const sagsoegte = findFund("sagsoegte");
  const transportoerNavn = findFund("transportoer-navn");
  const hovedlov = bestemHovedlov(fund);

  godkendt.forEach(f => (f.paragraffer || []).forEach(p => paragraffer.add(p)));

  const sagsoegerNavn = sagsoeger ? sagsoeger.vaerdi : "Den skadelidte part";
  const sagsoegteNavn = sagsoegte ? sagsoegte.vaerdi : (transportoerNavn ? transportoerNavn.vaerdi : "den ansvarlige transportør/sælger");
  if (!sagsoeger || !sagsoegte) {
    tagStilling.push("Kontrollér selv navnene på sagsøger og sagsøgte — appen har gættet ud fra sætningsopbygningen i casen og kan tage fejl.");
  }

  // --- Afsnit 1: Parter og lovgrundlag, flettet i én sammenhængende tekst ---
  const lovgrundlagDele = [];
  if (koebLov) lovgrundlagDele.push(`købsaftalen er omfattet af ${koebLov.vaerdi}, da ${KOEB_FORKLARING[koebLov.id] || ""}`);
  if (transportform.length > 0) {
    const forklaringer = transportform.map(f => TRANSPORT_FORKLARING[f.id]).filter(Boolean).join("; ");
    let taet = `transportaftalen er omfattet af ${transportform.map(f => f.vaerdi).join(" og ")}, da ${forklaringer}`;
    if (nsabVedtaget && hovedlov && hovedlov !== "NSAB") {
      taet += `. Global Forwarding-typen af aftale henviser ganske vist til NSAB 2015, men NSAB's netværksklausul (§2) sender netop ansvaret videre til reglerne for den konkrete transportform, når transportformen er kendt, som tilfældet er her`;
      paragraffer.add("NSAB:§2");
    }
    lovgrundlagDele.push(taet);
  }

  if (lovgrundlagDele.length > 0) {
    afsnit.push(`**${sagsoegerNavn}** kan rejse et erstatningskrav mod **${sagsoegteNavn}**. ${capitalize(lovgrundlagDele.join(". "))}.`);
  } else {
    afsnit.push(`**${sagsoegerNavn}** kan rejse et erstatningskrav mod **${sagsoegteNavn}**, men der mangler tilstrækkelige signaler i casen til at fastlægge lovgrundlaget automatisk — gennemgå fund-tjeklisten på fane 1 og bekræft manuelt.`);
    tagStilling.push("Afgør selv om sagen er køberetlig, transportretlig, eller begge dele.");
  }

  // --- Afsnit 2: Ansvarsgrundlag, med evt. konkret adfærd fra casen flettet ind ---
  if (hovedlov && ANSVARSGRUNDLAG_TEKST[hovedlov]) {
    let ansvarTekst = `Ansvarsgrundlaget følger heraf: ${ANSVARSGRUNDLAG_TEKST[hovedlov]}.`;
    if (grovUagtsomhed) {
      ansvarTekst += ` Det bemærkes at casen beskriver en adfærd ("${grovUagtsomhed.citat}"), som kan være relevant for spørgsmålet om ansvarsgennembrud, jf. nedenfor.`;
    }
    afsnit.push(ansvarTekst);
  }

  tagStilling.push("Vurdér selv om der er grundlag for ansvarsgennembrud (forsæt eller grov uagtsomhed) — se de to erstatningsscenarier nedenfor.");
  if (hovedlov && REKLAMATION_PARAGRAF[hovedlov]) {
    paragraffer.add(REKLAMATION_PARAGRAF[hovedlov]);
    tagStilling.push("Tjek at reklamation er sket rettidigt, og at søgsmålsfristen (typisk 1 år) er overholdt.");
  }

  // --- Afsnit 3: Erstatningsopgørelse, tal flettet ind i sammenhængende tekst ---
  if (beregning) {
    paragraffer.add(GENNEMBRUD_PARAGRAF[hovedlov] || null);
    const gennembrudHenv = GENNEMBRUD_HENVISNING[hovedlov] || "reglerne om ansvarsgennembrud";
    const godsBeskrivelse = beregning.antalKolli
      ? `godset på ${beregning.vaegtKg} kg fordelt på ${beregning.antalKolli} kolli`
      : `godset på ${beregning.vaegtKg} kg`;

    afsnit.push(
      `Det opgjorte tab udgør ${formatKr(beregning.fuldErstatningKr)} ${capitalize(beregning.metodeNavn)} sætter en beløbsgrænse på ${formatKr(beregning.graenseKr)} for ${godsBeskrivelse}, hvilket ved normalt (begrænset) ansvar giver en erstatning på ${formatKr(beregning.normalErstatningKr)} — ca. ${beregning.normalDaekketProcent}% af tabet. Beregningen bruger en SDR-kurs på ${beregning.sdrKurs} kr., som er en standardkurs til undervisningsbrug og ikke en dokumenteret dagskurs.`
    );
    afsnit.push(
      `Beløbsgrænsen bortfalder kun hvis det kan bevises at skaden skyldes forsæt eller grov uagtsomhed, jf. ${gennembrudHenv}. Kan dette bevises, kan ${sagsoegerNavn} i stedet opnå fuld erstatning på ${formatKr(beregning.fuldErstatningKr)} Det er ikke godtgjort alene ved en mistanke.`
    );
  } else {
    afsnit.push("Erstatningsbeløbet er endnu ikke beregnet — udfyld felterne på fane 3 (vægt, kolli, tab) for at få det regnet ud.");
  }

  // --- Afsnit 4: Samlet konklusion ---
  if (hovedlov) {
    const normalDel = beregning ? formatKr(beregning.normalErstatningKr) : "et beløb begrænset af lovens beløbsgrænse";
    const fuldDel = beregning ? formatKr(beregning.fuldErstatningKr) : "det fulde tab";
    afsnit.push(`**Konklusion:** ${sagsoegerNavn} kan som udgangspunkt kræve ${normalDel} fra ${sagsoegteNavn}. Kun hvis ansvarsgennembrud kan bevises, kan kravet forhøjes til ${fuldDel} Se "Det skal du selv tage stilling til" for de punkter der kræver et konkret juridisk skøn.`);
  }

  return {
    afsnit,
    tagStilling,
    paragraffer: Array.from(paragraffer).filter(Boolean)
  };
}

function capitalize(s) {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}
