/******************************************************
 * charts.js — Fixed for your GAS backend
 * - Uses action=getRecords (returns { success, header, rows })
 * - Draws:
 *   - chartBarangay (bar)
 *   - chartAgeGroup (doughnut)
 *   - chartStage (doughnut)
 *   - chartPWD (doughnut)
 *   - chartStatus (doughnut)
 *   - chartSupport (bar) -> combined assistance counts
 ******************************************************/

const API_URL = "https://script.google.com/macros/s/AKfycbxWs1kxkyleYw6qcQlIx1xsecQS8x2O-nyXxbcdcm5DVst6IcmDKR-NmzSgBxyH7ErvpA/exec";

let charts = {};

window.addEventListener('load', async () => {
  // auth check
  if (!localStorage.getItem("loggedIn")) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("userName").innerText = localStorage.getItem("staffName") || "";
  document.getElementById("logoutBtn").addEventListener("click", ()=>{ localStorage.clear(); location.href="login.html"; });

  // export buttons (if present)
  const pb = document.getElementById("btnPrint"); if(pb) pb.addEventListener("click", ()=>window.print());
  const pdfb = document.getElementById("btnExportPDF"); if(pdfb) pdfb.addEventListener("click", exportPDF);
  const pngb = document.getElementById("btnExportPNGs"); if(pngb) pngb.addEventListener("click", exportPNGs);

  await loadAndRender();
});

/* -------------------------
   fetch records from GAS
   returns array of row objects (header->value)
------------------------- */
async function loadAndRender(){
  try {
    const resp = await fetch(API_URL + "?action=getRecords");
    const j = await resp.json();
    if(!j || !j.success){ console.error("getRecords failed", j); return; }

    const rows = Array.isArray(j.rows) ? j.rows : [];
    renderAllCharts(rows);
  } catch (err) {
    console.error("loadAndRender error", err);
  }
}

/* ---------------------------------------------------
   Render all charts from rows (rows = array of objects)
--------------------------------------------------- */
function renderAllCharts(rows){
  // Normalize keys accessor (in case your sheet has slightly different headers)
  const safe = (obj, key) => (obj && (obj[key] !== undefined) ? obj[key] : (obj && obj[key] === undefined ? "" : ""));

  // 1) Evacuees per barangay
  const barangayCounts = {};
  rows.forEach(r => {
    const b = (r["Barangay"] || r.Barangay || "").toString().trim();
    if (!b) return;
    barangayCounts[b] = (barangayCounts[b] || 0) + 1;
  });
  drawBar("chartBarangay", barangayCounts, "Evacuees");

  // 2) Age groups (by rules you gave)
  const ageBuckets = { Infant:0, "School Children":0, Adult:0, Elderly:0 };
  rows.forEach(r => {
    // Age in sheet may be numeric or text; attempt parse
    let rawAge = r["Age"] ?? r.Age ?? "";
    let age = parseInt(String(rawAge).replace(/\D/g,''), 10);
    if (isNaN(age)) {
      // try to infer from Birthdate if present (yyyy-mm-dd or dd/mm/yyyy)
      let bd = (r["Birthdate"] || r.Birthdate || "").toString().trim();
      if (bd) {
        const parsed = parseDateToJS(bd);
        if (parsed) {
          const yrs = computeAgeYears(parsed);
          if (yrs !== null) age = yrs;
        }
      }
    }
    if (isNaN(age)) return;
    // NOTE: 0-11 months considered Infant — your sheets store ages in years mostly; we treat age===0 as Infant too
    if (age === 0) ageBuckets.Infant++;
    else if (age <= 11 && (String(r.Stage||"").toLowerCase() === "infant")) ageBuckets.Infant++;
    else if (age <= 17) ageBuckets["School Children"]++;
    else if (age <= 59) ageBuckets.Adult++;
    else ageBuckets.Elderly++;
  });
  drawDoughnut("chartAgeGroup", ageBuckets);

  // 3) Stage distribution (using Stage column)
  const stageCounts = {};
  rows.forEach(r => {
    const s = (r["Stage"] || r.Stage || "").toString().trim();
    if (!s) return;
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });
  drawDoughnut("chartStage", stageCounts);

  // 4) PWD
  const pwd = { Yes:0, No:0 };
  rows.forEach(r => {
    const v = (r["Persons with Disability (PWD)"] || r["PWD"] || r.PWD || "").toString().trim().toLowerCase();
    if (v === "yes") pwd.Yes++; else pwd.No++;
  });
  drawDoughnut("chartPWD", pwd);

  // 5) Status distribution
  const statusCounts = {};
  rows.forEach(r => {
    const st = (r["Status"] || r.Status || "").toString().trim();
    if (!st) return;
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });
  drawDoughnut("chartStatus", statusCounts);

  // 6) Combined Government Support (one chart)
  const supportFields = [
    "TUPAD","Local 4Ps","National 4Ps",
    "Local Social Pension","National Social Pension",
    "Solo Parent Assistance","Cash Subsidy","Relief Goods","AICS"
  ];
  const supportCounts = {};
  supportFields.forEach(f => supportCounts[f] = 0);

  rows.forEach(r => {
    supportFields.forEach(f => {
      const val = (r[f] || r[f.replace(/\s+/g,"")] || "").toString().trim().toLowerCase();
      if (val === "yes") supportCounts[f]++;
    });
  });

  // if your HTML does NOT have chartSupport canvas, fallback to chartTransport if exists
  const supportCanvas = document.getElementById("chartSupport");
  if (supportCanvas) drawBar("chartSupport", supportCounts, "Recipients");
  else if (document.getElementById("chartTransport")) drawBar("chartTransport", supportCounts, "Recipients");
  else {
    console.warn("No canvas found for support chart (chartSupport or chartTransport). Add <canvas id='chartSupport'> to HTML.");
  }
}

/* ----------------------- helpers: draw charts ----------------------- */
function drawBar(elementId, countsObj, label){
  const el = document.getElementById(elementId);
  if(!el){ console.warn("Canvas not found:", elementId); return; }

  const labels = Object.keys(countsObj);
  const data = labels.map(k => countsObj[k] || 0);

  if (charts[elementId]) charts[elementId].destroy();

  charts[elementId] = new Chart(el.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: label || "",
        data,
        // subtle 3D feel by graduated HSL colors
        backgroundColor: labels.map((_,i) => `hsl(${(i*28)%360} 70% 50% / 0.9)`),
        borderColor: labels.map(() => "#0f7a4a"),
        borderWidth: 1
      }]
    },
    options: {
      responsive:true,
      plugins: { legend:{ display:false } },
      scales: { y: { beginAtZero:true, ticks:{ stepSize: 1 } } }
    }
  });
}

function drawDoughnut(elementId, countsObj){
  const el = document.getElementById(elementId);
  if(!el){ console.warn("Canvas not found:", elementId); return; }

  const labels = Object.keys(countsObj);
  const data = labels.map(k => countsObj[k] || 0);

  if (charts[elementId]) charts[elementId].destroy();

  charts[elementId] = new Chart(el.getContext("2d"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_,i) => `hsl(${(i*42)%360} 70% 50% / 0.9)`),
        hoverOffset: 12
      }]
    },
    options: { responsive:true, plugins:{ legend:{ position:'bottom' } } }
  });
}

/* ---------------- utility: parse a variety of date text into JS Date or null ---------------- */
function parseDateToJS(txt){
  if(!txt) return null;
  txt = String(txt).trim();

  // DD/MM/YYYY
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(txt)){
    const parts = txt.split("/");
    const d = parseInt(parts[0],10), m = parseInt(parts[1],10)-1, y = parseInt(parts[2],10);
    return new Date(y,m,d);
  }

  // ISO yyyy-mm-dd or yyyy-mm-ddT...
  if(/^\d{4}-\d{2}-\d{2}/.test(txt)){
    return new Date(txt);
  }

  // try Date constructor fallback
  const d = new Date(txt);
  return isNaN(d) ? null : d;
}

function computeAgeYears(d){
  if(!(d instanceof Date) || isNaN(d)) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if(m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return years;
}

/* ---------------- Export helpers (PDF / PNG ZIP) ---------------- */
async function exportPDF(){
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });
    const ids = ["chartBarangay","chartAgeGroup","chartStage","chartPWD","chartStatus","chartSupport"];
    let page = 0;
    for(const id of ids){
      const c = document.getElementById(id) || document.getElementById("chartTransport");
      if(!c) continue;
      const img = c.toDataURL("image/jpeg", 0.9);
      if(page>0) doc.addPage();
      page++;
      const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight(), pad = 14;
      doc.addImage(img, "JPEG", pad, pad, w - pad*2, h - pad*2);
    }
    doc.save(`Charts_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.pdf`);
  } catch (err) { console.error(err); alert("PDF export failed: "+err.message); }
}

async function exportPNGs(){
  try {
    const zip = new JSZip();
    const ids = ["chartBarangay","chartAgeGroup","chartStage","chartPWD","chartStatus","chartSupport"];
    for(const id of ids){
      const c = document.getElementById(id) || document.getElementById("chartTransport");
      if(!c) continue;
      const blob = await new Promise(res => c.toBlob(res, "image/png"));
      zip.file(id + ".png", blob);
    }
    const content = await zip.generateAsync({ type:"blob" });
    saveAs(content, `Charts_PNGs_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.zip`);
  } catch (err) { console.error(err); alert("PNG export failed: "+err.message); }
}
