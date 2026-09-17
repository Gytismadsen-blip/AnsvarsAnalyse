// Erstatningsberegning: ren matematik, ingen AI. Beregner ALTID begge scenarier —
// (1) normalt ansvar med lovens beløbsgrænse, og (2) fuldt ansvar hvis et ansvars-
// gennembrud kan bevises — i stedet for at vise ét tal som om det var et facit.
// Grov uagtsomhed/forsæt er et juridisk skøn, ikke noget appen kan afgøre selv.

function beregnErstatning({ lov, vaegtKg, antalKolli, faktiskTab, sdrKurs = SDR_KURS }) {
  if (!(vaegtKg > 0) || !(faktiskTab > 0)) {
    throw new Error("Vægt og faktisk tab skal begge være positive tal større end 0.");
  }
  if (antalKolli != null && antalKolli < 0) {
    throw new Error("Antal kolli kan ikke være negativt.");
  }

  const trin = [];
  let graenseKr = null;
  let metodeNavn = "";

  if (lov === "SOELOVEN") {
    const kgGraenseSDR = vaegtKg * 2;
    const kgGraenseKr = kgGraenseSDR * sdrKurs;
    trin.push(`Kg-metode: ${vaegtKg} kg × 2 SDR/kg = ${round2(kgGraenseSDR)} SDR × ${sdrKurs} kr. = ${round2(kgGraenseKr)} kr.`);

    let kolloGraenseKr = 0;
    if (antalKolli) {
      const kolloGraenseSDR = antalKolli * 667;
      kolloGraenseKr = kolloGraenseSDR * sdrKurs;
      trin.push(`Kollo-metode: ${antalKolli} kolli × 667 SDR/kollo = ${round2(kolloGraenseSDR)} SDR × ${sdrKurs} kr. = ${round2(kolloGraenseKr)} kr.`);
    }

    if (kolloGraenseKr > kgGraenseKr) {
      graenseKr = kolloGraenseKr;
      metodeNavn = "Kollo-metoden (Sølovens §280 — højeste af de to)";
      trin.push("Kollo-metoden giver den højeste grænse og lægges til grund, jf. Sølovens §280.");
    } else {
      graenseKr = kgGraenseKr;
      metodeNavn = "Kg-metoden (Sølovens §280 — højeste af de to)";
      trin.push("Kg-metoden giver den højeste grænse (eller kolli-antal er ikke oplyst) og lægges til grund, jf. Sølovens §280.");
    }
  } else {
    // CMR-loven og NSAB bruger samme 8,33 SDR/kg-grænse
    const graenseSDR = vaegtKg * 8.33;
    graenseKr = graenseSDR * sdrKurs;
    metodeNavn = lov === "CMR" ? "8,33 SDR/kg (CMR-lovens §29/§31)" : "8,33 SDR/kg (NSAB §21A)";
    trin.push(`${vaegtKg} kg × 8,33 SDR/kg = ${round2(graenseSDR)} SDR × ${sdrKurs} kr. = ${round2(graenseKr)} kr.`);
  }

  const normalErstatningKr = Math.min(faktiskTab, graenseKr);
  trin.push(`Ved normalt (begrænset) ansvar: laveste af faktisk tab (${round2(faktiskTab)} kr.) og lovens grænse (${round2(graenseKr)} kr.) = ${round2(normalErstatningKr)} kr.`);

  return {
    lov,
    vaegtKg,
    antalKolli: antalKolli || null,
    metodeNavn,
    graenseKr: round2(graenseKr),
    normalErstatningKr: round2(normalErstatningKr),
    normalDaekketProcent: Math.round((normalErstatningKr / faktiskTab) * 100),
    fuldErstatningKr: round2(faktiskTab),
    sdrKurs,
    trin
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
