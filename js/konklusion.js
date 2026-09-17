// Konklusionsgenerator: REGELBASERET tekstopbygning (if/else + skabelon), ingen AI —
// samme princip som FragtAnalyse's prosaEnkelt/prosaFlere. Følger den faste 4-fase-struktur
// underviserens egne vejledende besvarelser bruger: Faktum → Relevant lovgivning →
// Analyse/subsumption → Konklusion, afsluttet med en paragrafliste.

function genererKonklusion(fund, beregning) {
  const godkendt = fund.filter(f => f.valgt);
  const afsnit = [];
  const tagStilling = [];
  const paragraffer = new Set();

  const koeb = godkendt.filter(f => f.gruppe === "lovvalg-koeb");
  const transportform = godkendt.filter(f => f.gruppe === "transportform");
  const aftale = godkendt.filter(f => f.gruppe === "aftalegrundlag");
  const special = godkendt.filter(f => f.gruppe === "specialflag");

  godkendt.forEach(f => (f.paragraffer || []).forEach(p => paragraffer.add(p)));

  // --- 1. Relevant lovgivning ---
  if (koeb.length === 0 && transportform.length === 0) {
    afsnit.push("**Relevant lovgivning:** Der er ikke fundet nok signaler i casen til at afgøre, om det er en køberetlig eller transportretlig problemstilling. Gennemgå fund-tjeklisten på fane 1 og bekræft manuelt.");
    tagStilling.push("Afgør selv om sagen er køberetlig, transportretlig, eller begge dele.");
  } else {
    if (koeb.length > 0) {
      afsnit.push(`**Købsaftalen:** ${koeb[0].begrundelse} Købsaftalen vurderes derfor efter **${koeb[0].vaerdi}**.`);
    }
    if (transportform.length > 0) {
      const lovNavne = transportform.map(f => f.vaerdi).join(" og ");
      afsnit.push(`**Transportaftalen:** ${transportform.map(f => f.begrundelse).join(" ")} Transportaftalen vurderes derfor efter **${lovNavne}**.`);
    }
    if (aftale.length > 0) {
      afsnit.push(`**Aftalegrundlag:** ${aftale[0].begrundelse}`);
    }
  }

  // --- 2. Ansvarsgrundlag ---
  const hovedlov = transportform.find(f => f.id === "soeloven") ? "SOELOVEN"
    : transportform.find(f => f.id === "cmr") ? "CMR"
    : transportform.find(f => f.id === "nsab-national") ? "NSAB"
    : null;

  if (hovedlov === "SOELOVEN") {
    afsnit.push("**Ansvarsgrundlag:** Efter Sølovens §275 gælder et præsumptionsansvar — transportøren anses for ansvarlig, medmindre denne kan bevise en fritagelsesgrund (§276: nautisk fejl eller brand; §277: særlige risici ved levende dyr).");
    paragraffer.add("§275");
  } else if (hovedlov === "CMR") {
    afsnit.push("**Ansvarsgrundlag:** Efter CMR-lovens §24 hæfter transportøren for bortkomst, beskadigelse og forsinkelse i perioden fra overtagelse til aflevering, medmindre en af de særlige fritagelsesgrunde i §25 kan godtgøres.");
    paragraffer.add("§24");
  } else if (hovedlov === "NSAB") {
    afsnit.push("**Ansvarsgrundlag:** Da transporten er national, gælder NSAB 2015 direkte (uden CMR-lovens internationale krav). Speditøren skal efter §6 godtgøre at have udvist fornøden omhu, og hæfter for egne og antagne undertransportørers fejl (§3B).");
    paragraffer.add("§6");
    paragraffer.add("§3B");
  }

  if (special.length > 0) {
    afsnit.push("**Særlige forhold:** " + special.map(f => f.begrundelse).join(" "));
    tagStilling.push("Vurdér selv om de særlige forhold (fx levende dyr, kølekrav, åben trailer) reelt fritager transportøren i denne konkrete sag.");
  }

  tagStilling.push("Vurdér selv om der er grundlag for ansvarsgennembrud (forsæt eller grov uagtsomhed) — det afgør om erstatningen er begrænset eller fuld.");
  tagStilling.push("Tjek at reklamation er sket rettidigt (straks ved synlig skade, kort frist ved skjult skade) og at søgsmålsfristen (typisk 1 år) er overholdt.");

  // --- 3. Erstatningsopgørelse ---
  if (beregning) {
    const graenseTekst = beregning.graenseKr !== null ? formatKr(beregning.graenseKr) : "ingen grænse";
    afsnit.push(`**Erstatningsopgørelse:** ${beregning.metodeNavn}. Lovens maksimale ansvarsbeløb er beregnet til ca. ${graenseTekst}. Erstatningen udgør herefter ${formatKr(beregning.erstatningKr)}.` +
      (beregning.daekketProcent !== null ? ` — svarende til ca. ${beregning.daekketProcent}% af det opgjorte tab.` : "."));
  } else {
    afsnit.push("**Erstatningsopgørelse:** Udfyld felterne på fane 3 (vægt, kolli, tab) for at få beregnet erstatningsbeløbet.");
  }

  // --- 4. Konklusion ---
  if (hovedlov) {
    afsnit.push(`**Konklusion:** På baggrund af ovenstående vurderes ansvaret at følge ${LOVDATA[hovedlov] ? LOVDATA[hovedlov].navn : hovedlov}, med de forbehold der er nævnt under "Det skal du selv tage stilling til".`);
  }

  return {
    afsnit,
    tagStilling,
    paragraffer: Array.from(paragraffer)
  };
}
