// UI-lag: binder klassificer.js, beregn.js, konklusion.js og lovdata.js sammen med DOM'en.
// Ingen AI her — kun rendering og event-håndtering ud fra den regelbaserede analyse.

let state = {
  caseText: "",
  fund: [],
  checklist: [],
  beregning: null,
  beregningInputs: null,
  konklusion: null
};

const GRUPPE_OVERSKRIFT = {
  "parter": "Hvem er parterne?",
  "omraade": "Køberet eller transportret?",
  "lovvalg-koeb": "CISG eller Købeloven?",
  "transportform": "Hvilken transportlov gælder?",
  "aftalegrundlag": "Er NSAB aftalt?",
  "specialflag": "Særlige forhold",
  "tal": "Tal til beregningen"
};

const GRUPPE_RAEKKEFOELGE = ["parter", "omraade", "lovvalg-koeb", "transportform", "aftalegrundlag", "specialflag", "tal"];

const LOV_OPTIONS = [
  { value: "SOELOVEN", label: "Sølovens kapitel 13" },
  { value: "CMR", label: "CMR-loven" },
  { value: "NSAB", label: "NSAB 2015" }
];

function kortParagrafLabel(qualificeretNoegle) {
  if (!qualificeretNoegle.includes(":")) return qualificeretNoegle;
  const [lovKey, noegle] = qualificeretNoegle.split(":");
  const kort = { KBL: "KBL", CISG: "CISG", SOELOVEN: "SL", CMR: "CMR", NSAB: "NSAB" };
  return `${kort[lovKey] || lovKey} ${noegle}`;
}

function escapeHtml(tekst) {
  const div = document.createElement("div");
  div.textContent = tekst == null ? "" : String(tekst);
  return div.innerHTML;
}

function markdownBoldTilHtml(tekst) {
  return escapeHtml(tekst).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function formatKr(n) {
  return n.toLocaleString("da-DK", { maximumFractionDigits: 2 }) + " kr.";
}

// --- A. Faneskift ---

function skiftFane(tab) {
  const alleFaner = ["case", "lovvalg", "ansvar", "konklusion", "lovopslag"];
  alleFaner.forEach(t => {
    document.getElementById("tab-" + t).classList.toggle("hidden", t !== tab);
  });
  document.querySelectorAll("#tabbar .tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  if (tab === "lovvalg") renderLovvalg();
  if (tab === "ansvar") renderAnsvar();
  if (tab === "konklusion") renderKonklusion();
}

function wireTabs() {
  document.querySelectorAll("#tabbar .tab-btn").forEach(btn => {
    btn.addEventListener("click", () => skiftFane(btn.dataset.tab));
  });
}

// --- B. Filupload (fane 1) ---

function wireFileUpload() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");

  dropzone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) haandterFil(fileInput.files[0]);
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("border-blue-500");
  });
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("border-blue-500");
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("border-blue-500");
    if (e.dataTransfer.files.length > 0) haandterFil(e.dataTransfer.files[0]);
  });
}

async function haandterFil(fil) {
  const dropzone = document.getElementById("dropzone");
  const oprindeligTekst = dropzone.firstChild ? dropzone.firstChild.textContent : "";
  dropzone.classList.add("opacity-60");
  if (dropzone.firstChild) dropzone.firstChild.textContent = `Læser "${fil.name}" …`;
  try {
    const tekst = await laesFil(fil);
    document.getElementById("caseText").value = tekst;
    koerAnalyse();
  } catch (err) {
    alert("Kunne ikke læse filen: " + err.message);
  } finally {
    dropzone.classList.remove("opacity-60");
    if (dropzone.firstChild) dropzone.firstChild.textContent = oprindeligTekst;
  }
}

// --- C. Tekstanalyse (fane 1) ---

function koerAnalyse() {
  const tekst = document.getElementById("caseText").value;
  const resultat = klassificerCase(tekst);
  state.caseText = tekst;
  state.fund = resultat.fund;
  state.checklist = resultat.checklist;
  state.beregning = null;
  state.konklusion = null;
  renderChecklist();
  renderFund();
}

function renderChecklist() {
  const box = document.getElementById("checklistBox");
  const container = document.getElementById("checklist");
  container.innerHTML = "";

  if (state.checklist.length === 0) {
    box.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden");
  state.checklist.forEach(item => {
    const linje = document.createElement("div");
    linje.className = "flex gap-2 items-start";
    linje.innerHTML = `
      <span class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-gray-900 text-xs font-bold">!</span>
      <span><strong class="text-white">${escapeHtml(item.tekst)}</strong> — <span class="text-gray-400">${escapeHtml(item.note)}</span></span>
    `;
    container.appendChild(linje);
  });
}

function renderFund() {
  const box = document.getElementById("fundBox");
  const list = document.getElementById("fundList");
  const count = document.getElementById("fundCount");
  list.innerHTML = "";

  box.classList.remove("hidden");
  count.textContent = `(${state.fund.length} fund)`;

  if (state.fund.length === 0) {
    list.innerHTML = '<p class="text-gray-500 text-sm">Der blev ikke fundet nogen juridiske signaler i teksten — indsæt evt. mere af casen, eller gå videre manuelt på fane 2.</p>';
    return;
  }

  state.fund.forEach(f => {
    const badges = (f.paragraffer || [])
      .map(p => `<span class="badge-ok text-xs px-2 py-0.5 rounded-full">${escapeHtml(kortParagrafLabel(p))}</span>`)
      .join(" ");

    const kort = document.createElement("div");
    kort.className = "card p-3 flex gap-3 items-start";
    kort.innerHTML = `
      <input type="checkbox" data-fund-id="${escapeHtml(f.id)}" class="fund-checkbox mt-1" ${f.valgt ? "checked" : ""}>
      <div class="flex-1">
        <div class="text-xs text-gray-500">${escapeHtml(f.label)}</div>
        <div class="font-bold text-white">${escapeHtml(f.vaerdi)}</div>
        ${f.citat ? `<div class="text-xs italic text-gray-400 mt-1">kildecitat: «${escapeHtml(f.citat)}»</div>` : ""}
        <div class="text-sm text-gray-400 mt-1">${escapeHtml(f.begrundelse)}</div>
        ${badges ? `<div class="flex flex-wrap gap-1 mt-2">${badges}</div>` : ""}
      </div>
    `;
    list.appendChild(kort);
  });

  list.querySelectorAll(".fund-checkbox").forEach(cb => {
    cb.addEventListener("change", () => {
      const fund = state.fund.find(f => f.id === cb.dataset.fundId);
      if (fund) fund.valgt = cb.checked;
    });
  });
}

function wireCaseAnalyse() {
  document.getElementById("btnFindValues").addEventListener("click", koerAnalyse);

  document.getElementById("btnSelectAll").addEventListener("click", () => {
    state.fund.forEach(f => { f.valgt = true; });
    renderFund();
  });

  document.getElementById("btnApply").addEventListener("click", () => {
    skiftFane("lovvalg");
  });
}

// --- F. Fane 2: Lovvalg ---

function renderLovvalg() {
  const container = document.getElementById("lovvalgSteps");
  const godkendt = state.fund.filter(f => f.valgt);

  if (godkendt.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Analysér en case på fane 1 først, og godkend fundene.</p>';
    return;
  }

  const grupper = {};
  godkendt.forEach(f => {
    if (!grupper[f.gruppe]) grupper[f.gruppe] = [];
    grupper[f.gruppe].push(f);
  });

  container.innerHTML = "";
  GRUPPE_RAEKKEFOELGE.forEach(gruppe => {
    if (!grupper[gruppe]) return;
    const linjer = grupper[gruppe].map(f => `
      <div class="mt-1 mb-3">
        <div><strong class="text-white">${escapeHtml(f.vaerdi)}</strong></div>
        <div class="text-gray-400">${escapeHtml(f.begrundelse)}</div>
        ${f.citat ? `<div class="text-xs italic text-gray-500">kildecitat: «${escapeHtml(f.citat)}»</div>` : ""}
      </div>
    `).join("");
    const blok = document.createElement("div");
    blok.innerHTML = `<h3 class="font-semibold text-white mb-1">${escapeHtml(GRUPPE_OVERSKRIFT[gruppe] || gruppe)}</h3>${linjer}`;
    container.appendChild(blok);
  });
}

// --- G. Fane 3: Ansvar & beregning ---

function renderAnsvar() {
  const hovedlov = bestemHovedlov(state.fund);
  const grundlagBox = document.getElementById("ansvarGrundlag");
  grundlagBox.innerHTML = `<p>${escapeHtml(ANSVARSGRUNDLAG_TEKST[hovedlov] || "Vælg og godkend fund på fane 1 og 2 først.")}</p>`;

  renderBeregningForm(hovedlov);

  const resultatBox = document.getElementById("beregningResultat");
  if (state.beregning) {
    renderBeregningResultat(state.beregning);
  } else {
    resultatBox.innerHTML = "";
  }
}

function udtraektTal(id) {
  const f = state.fund.find(f => f.id === id && f.valgt);
  if (!f) return null;
  const tal = parseFloat(String(f.vaerdi).replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(tal) ? null : tal;
}

function renderBeregningForm(hovedlov) {
  const container = document.getElementById("beregningInput");
  const foreslaaet = !state.beregningInputs ? {
    vaegtKg: udtraektTal("tal-vaegt"),
    antalKolli: udtraektTal("tal-kolli"),
    faktiskTab: udtraektTal("tal-tab")
  } : {};
  const gemte = state.beregningInputs || foreslaaet;
  const lovValgt = gemte.lov || hovedlov || "SOELOVEN";

  const options = LOV_OPTIONS
    .map(o => `<option value="${o.value}" ${o.value === lovValgt ? "selected" : ""}>${o.label}</option>`)
    .join("");

  const harForslag = foreslaaet.vaegtKg != null || foreslaaet.antalKolli != null || foreslaaet.faktiskTab != null;
  container.innerHTML = `
    ${harForslag ? '<p class="col-span-2 text-xs text-blue-300">Felter er foreslået ud fra tal fundet i casen (fane 1) — tjek dem, de kan være forkerte.</p>' : ""}
    <div>
      <label class="block text-gray-400 mb-1">Lov</label>
      <select id="inputLov" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2">${options}</select>
    </div>
    <div>
      <label class="block text-gray-400 mb-1">Vægt (kg)</label>
      <input type="number" id="inputVaegt" min="0" step="any" value="${gemte.vaegtKg != null ? gemte.vaegtKg : ""}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2">
    </div>
    <div>
      <label class="block text-gray-400 mb-1">Antal kolli (valgfrit)</label>
      <input type="number" id="inputKolli" min="0" step="any" value="${gemte.antalKolli ? gemte.antalKolli : ""}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2">
    </div>
    <div>
      <label class="block text-gray-400 mb-1">Faktisk tab (kr.)</label>
      <input type="number" id="inputTab" min="0" step="any" value="${gemte.faktiskTab != null ? gemte.faktiskTab : ""}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2">
    </div>
    <div class="col-span-2">
      <label class="block text-gray-400 mb-1">SDR-kurs (kr. pr. SDR)</label>
      <input type="number" id="inputSdrKurs" min="0" step="any" value="${gemte.sdrKurs != null ? gemte.sdrKurs : SDR_KURS}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2">
      <p class="text-xs text-gray-500 mt-1">${escapeHtml(SDR_KURS_KILDE)}</p>
    </div>
    <div class="col-span-2">
      <button id="btnBeregn" class="btn-primary w-full py-2 rounded-lg font-medium">Beregn erstatning</button>
    </div>
  `;

  document.getElementById("btnBeregn").addEventListener("click", koerBeregning);
}

function koerBeregning() {
  const lov = document.getElementById("inputLov").value;
  const vaegtKg = parseFloat(document.getElementById("inputVaegt").value);
  const antalKolliRaw = document.getElementById("inputKolli").value;
  const antalKolli = antalKolliRaw ? parseFloat(antalKolliRaw) : 0;
  const faktiskTab = parseFloat(document.getElementById("inputTab").value);
  const sdrKurs = parseFloat(document.getElementById("inputSdrKurs").value) || SDR_KURS;

  state.beregningInputs = { lov, vaegtKg, antalKolli, faktiskTab, sdrKurs };

  const resultatBox = document.getElementById("beregningResultat");
  try {
    state.beregning = beregnErstatning({ lov, vaegtKg, antalKolli, faktiskTab, sdrKurs });
    state.konklusion = null;
    renderBeregningResultat(state.beregning);
  } catch (err) {
    state.beregning = null;
    resultatBox.innerHTML = `<p class="text-sm text-amber-300">${escapeHtml(err.message)}</p>`;
  }
}

function renderBeregningResultat(res) {
  const box = document.getElementById("beregningResultat");
  const trinHtml = res.trin.map(t => `<li>${escapeHtml(t)}</li>`).join("");

  box.innerHTML = `
    <h3 class="font-bold text-white mb-2">${escapeHtml(res.metodeNavn)}</h3>
    <div class="grid grid-cols-3 gap-3 mb-3">
      <div class="card p-3 text-center">
        <div class="text-xs text-gray-500">Lovens grænse</div>
        <div class="text-lg font-bold text-white">${formatKr(res.graenseKr)}</div>
      </div>
      <div class="card p-3 text-center">
        <div class="text-xs text-gray-500">Erstatning (normalt ansvar)</div>
        <div class="text-lg font-bold text-white">${formatKr(res.normalErstatningKr)}</div>
        <div class="text-xs text-gray-500">ca. ${res.normalDaekketProcent}% af tabet</div>
      </div>
      <div class="card p-3 text-center border-amber-800">
        <div class="text-xs text-amber-400">Erstatning (hvis ansvarsgennembrud)</div>
        <div class="text-lg font-bold text-amber-300">${formatKr(res.fuldErstatningKr)}</div>
        <div class="text-xs text-gray-500">kræver bevist forsæt/grov uagtsomhed</div>
      </div>
    </div>
    <h4 class="font-semibold text-white mb-1">Sådan er det regnet</h4>
    <ol class="list-decimal list-inside text-sm text-gray-400 space-y-1">${trinHtml}</ol>
  `;
}

// --- H. Fane 4: Konklusion ---

function renderKonklusion() {
  const resultat = genererKonklusion(state.fund, state.beregning);
  state.konklusion = resultat;

  document.getElementById("konklusionTekst").innerHTML =
    resultat.afsnit.map(a => `<p>${markdownBoldTilHtml(a)}</p>`).join("");

  const tagBox = document.getElementById("tagStillingBox");
  const tagListe = document.getElementById("tagStillingListe");
  if (resultat.tagStilling.length > 0) {
    tagBox.classList.remove("hidden");
    tagListe.innerHTML = resultat.tagStilling.map(t => `<li>${escapeHtml(t)}</li>`).join("");
  } else {
    tagBox.classList.add("hidden");
    tagListe.innerHTML = "";
  }

  const paragrafBox = document.getElementById("paragrafBox");
  const paragrafListe = document.getElementById("paragrafListe");
  if (resultat.paragraffer.length > 0) {
    paragrafBox.classList.remove("hidden");
    paragrafListe.innerHTML = resultat.paragraffer.map(p => {
      const opslag = slaaParagrafOp(p);
      return `<div><strong class="text-white">${escapeHtml(opslag.visning)}</strong>${opslag.forklaring ? " — " + escapeHtml(opslag.forklaring) : ""}</div>`;
    }).join("");
  } else {
    paragrafBox.classList.add("hidden");
    paragrafListe.innerHTML = "";
  }
}

// Paragraffer er gemt som "LOVKODE:§X" (fx "CMR:§24") netop for at undgå at blande
// paragraffer med samme nummer fra forskellige love sammen (Købeloven og CMR-loven
// har begge en §24, med helt forskelligt indhold).
function slaaParagrafOp(qualificeretNoegle) {
  const [lovKey, noegle] = qualificeretNoegle.includes(":") ? qualificeretNoegle.split(":") : [null, qualificeretNoegle];
  const lov = lovKey && LOVDATA[lovKey];
  if (lov && lov.paragraffer[noegle]) {
    return { visning: `${lov.navn}, ${noegle}`, forklaring: lov.paragraffer[noegle] };
  }
  return { visning: noegle, forklaring: null };
}

function wireKonklusion() {
  document.getElementById("btnCopyKonklusion").addEventListener("click", () => {
    const btn = document.getElementById("btnCopyKonklusion");
    const afsnit = state.konklusion ? state.konklusion.afsnit : [];
    const rentTekst = afsnit.map(a => a.replace(/\*\*/g, "")).join("\n\n");

    const visKvittering = (tekstVisning) => {
      const oprindeligTekst = btn.textContent;
      btn.textContent = tekstVisning;
      setTimeout(() => { btn.textContent = oprindeligTekst; }, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rentTekst)
        .then(() => visKvittering("Kopieret!"))
        .catch(() => visKvittering("Kunne ikke kopiere"));
    } else {
      visKvittering("Kunne ikke kopiere");
    }
  });
}

// --- I. Fane Lovopslag ---

function renderLovopslag() {
  const container = document.getElementById("lovopslagIndhold");
  container.innerHTML = Object.values(LOVDATA).map(lov => {
    const linjer = Object.entries(lov.paragraffer)
      .map(([key, tekst]) => `<div>${escapeHtml(key)}: ${escapeHtml(tekst)}</div>`)
      .join("");
    return `
      <div>
        <h3 class="font-semibold text-white mb-1">${escapeHtml(lov.navn)}</h3>
        <div class="space-y-0.5">${linjer}</div>
      </div>
    `;
  }).join("");
}

// --- J. Initialisering ---

function initUI() {
  renderLovopslag();
  wireTabs();
  wireFileUpload();
  wireCaseAnalyse();
  wireKonklusion();
}

initUI();
