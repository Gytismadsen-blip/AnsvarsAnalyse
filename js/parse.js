// Filparsing: docx (JSZip) og pdf (pdf.js). Samme mønster som FragtAnalyse.
// Alt sker i browseren, intet forlader maskinen.

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function xmlTekst(xml) {
  return xml
    .replace(/<w:p[ >]/g, "\n$&")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

async function laesDocx(fil) {
  const zip = await JSZip.loadAsync(fil);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("Ikke en gyldig .docx-fil");
  const xml = await doc.async("string");
  return xmlTekst(xml);
}

async function laesPdf(fil) {
  const buf = await fil.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let tekst = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const side = await pdf.getPage(i);
    const indhold = await side.getTextContent();
    tekst += indhold.items.map(it => it.str).join(" ") + "\n\n";
  }
  return tekst.trim();
}

async function laesFil(fil) {
  const navn = fil.name.toLowerCase();
  if (navn.endsWith(".docx")) return laesDocx(fil);
  if (navn.endsWith(".pdf")) return laesPdf(fil);
  if (navn.endsWith(".txt")) return fil.text();
  throw new Error("Filtype ikke understøttet: " + navn);
}
