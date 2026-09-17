// Erstatningsberegning: ren matematik, ingen AI. Beregner altid BEGGE metoder
// (kr./kg og kr./kollo, hvor relevant) og viser hvilken der er bedst for den
// skadelidte — samme metode som undervisers egen "Vejledende besvarelse incl. beregning".

function beregnErstatning({ lov, vaegtKg, antalKolli, faktiskTab, gennembrud, sdrKurs = SDR_KURS }) {
  const trin = [];
  let graenseKr = null;
  let metodeNavn = "";

  if (gennembrud) {
    trin.push("Ansvarsgennembrud lagt til grund (forsæt/grov uagtsomhed) → ingen beløbsgrænse.");
    return {
      metodeNavn: "Fuld erstatning (ansvarsgennembrud)",
      graenseKr: null,
      erstatningKr: faktiskTab,
      daekketProcent: 100,
      trin
    };
  }

  if (lov === "SOELOVEN") {
    const kgGraenseSDR = vaegtKg ? vaegtKg * 2 : 0;
    const kgGraenseKr = kgGraenseSDR * sdrKurs;
    trin.push(`Kg-metode: ${vaegtKg || 0} kg × 2 SDR/kg = ${round2(kgGraenseSDR)} SDR × ${sdrKurs} kr. = ${round2(kgGraenseKr)} kr.`);

    let kolloGraenseKr = 0;
    if (antalKolli) {
      const kolloGraenseSDR = antalKolli * 667;
      kolloGraenseKr = kolloGraenseSDR * sdrKurs;
      trin.push(`Kollo-metode: ${antalKolli} kolli × 667 SDR/kollo = ${round2(kolloGraenseSDR)} SDR × ${sdrKurs} kr. = ${round2(kolloGraenseKr)} kr.`);
    }

    if (kolloGraenseKr > kgGraenseKr) {
      graenseKr = kolloGraenseKr;
      metodeNavn = "Kollo-metoden (§280 — højeste af de to)";
      trin.push("Kollo-metoden giver den højeste grænse og lægges til grund, jf. Sølovens §280.");
    } else {
      graenseKr = kgGraenseKr;
      metodeNavn = "Kg-metoden (§280 — højeste af de to)";
      trin.push("Kg-metoden giver den højeste grænse (eller kolli-antal er ikke oplyst) og lægges til grund, jf. Sølovens §280.");
    }
  } else {
    // CMR-loven og NSAB bruger samme 8,33 SDR/kg-grænse
    const graenseSDR = vaegtKg ? vaegtKg * 8.33 : 0;
    graenseKr = graenseSDR * sdrKurs;
    metodeNavn = lov === "CMR" ? "8,33 SDR/kg (CMR-lovens §29/§31)" : "8,33 SDR/kg (NSAB §21A)";
    trin.push(`${vaegtKg || 0} kg × 8,33 SDR/kg = ${round2(graenseSDR)} SDR × ${sdrKurs} kr. = ${round2(graenseKr)} kr.`);
  }

  const erstatningKr = Math.min(faktiskTab || 0, graenseKr || 0);
  trin.push(`Erstatning = laveste af faktisk tab (${round2(faktiskTab || 0)} kr.) og lovens grænse (${round2(graenseKr)} kr.) = ${round2(erstatningKr)} kr.`);

  const daekketProcent = faktiskTab ? Math.round((erstatningKr / faktiskTab) * 100) : null;

  return { metodeNavn, graenseKr: round2(graenseKr), erstatningKr: round2(erstatningKr), daekketProcent, trin };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
