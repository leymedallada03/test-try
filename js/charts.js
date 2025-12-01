/******************************************************
 * charts.js — Purok Kaligtasan MDRRMO
 * Clean | Fast | 3D Styled Charts
 ******************************************************/

const API_URL =
  "https://script.google.com/macros/s/AKfycbxWs1kxkyleYw6qcQlIx1xsecQS8x2O-nyXxbcdcm5DVst6IcmDKR-NmzSgBxyH7ErvpA/exec";

let charts = {};

window.addEventListener("load", async () => {
  if (!localStorage.getItem("loggedIn")) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("userName").innerText =
    localStorage.getItem("staffName") || "";

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    location.href = "login.html";
  });

  document.getElementById("btnPrint").addEventListener("click", () => window.print());
  document.getElementById("btnExportPDF").addEventListener("click", exportPDF);
  document.getElementById("btnExportPNGs").addEventListener("click", exportPNGs);

  await loadAndRenderCharts();
});

/* ---------------------------------------------------
   LOAD CHART DATA
--------------------------------------------------- */
async function loadAndRenderCharts() {
  try {
    const res = await fetch(API_URL + "?action=list");
    const rows = await res.json();

    if (!Array.isArray(rows)) return;

    processAndRender(rows);

  } catch (e) {
    console.error("Error loading charts:", e);
  }
}

/* ---------------------------------------------------
   PROCESS DATA + RENDER ALL CHARTS
--------------------------------------------------- */
function processAndRender(rows) {

  /* ------------------ Barangay Count ------------------ */
  const barangayCounts = {};
  rows.forEach(r => {
    let b = r["Barangay"] || "";
    if (!b) return;
    barangayCounts[b] = (barangayCounts[b] || 0) + 1;
  });
  drawBarChart("chartBarangay", barangayCounts, "Entries");


  /* ------------------ AGE GROUPS ------------------ */
  const ages = {
    Infant: 0,
    "School Children": 0,
    Adult: 0,
    Elderly: 0
  };

  rows.forEach(r => {
    let age = parseInt(r["Age"] || r.Age || "", 10);
    if (isNaN(age)) return;

    if (age <= 0) ages["Infant"]++;
    else if (age <= 11 && r.Stage === "Infant") ages["Infant"]++;
    else if (age <= 17) ages["School Children"]++;
    else if (age <= 59) ages["Adult"]++;
    else if (age >= 60) ages["Elderly"]++;
  });

  drawDoughnut("chartAgeGroup", ages);


  /* ------------------ STAGE DISTRIBUTION ------------------ */
  const stageCounts = {};
  rows.forEach(r => {
    let st = r.Stage || "";
    if (!st) return;
    stageCounts[st] = (stageCounts[st] || 0) + 1;
  });
  drawDoughnut("chartStage", stageCounts);


  /* ------------------ PWD ------------------ */
  let pwdCounts = { Yes: 0, No: 0 };
  rows.forEach(r => {
    let pwd = (r["Persons with Disability (PWD)"] || "").toString().trim().toLowerCase();
    if (pwd === "yes") pwdCounts.Yes++;
    else pwdCounts.No++;
  });
  drawDoughnut("chartPWD", pwdCounts);


  /* ------------------ STATUS ------------------ */
  const statusCounts = {};
  rows.forEach(r => {
    let s = r.Status || "";
    if (!s) return;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  drawDoughnut("chartStatus", statusCounts);


  /* ------------------ GOVERNMENT SUPPORT ------------------ */
  const supportFields = [
    "TUPAD", "Local 4Ps", "National 4Ps",
    "Local Social Pension", "National Social Pension",
    "Solo Parent Assistance", "Cash Subsidy", "Relief Goods", "AICS"
  ];

  const supportCounts = {};
  supportFields.forEach(f => supportCounts[f] = 0);

  rows.forEach(r => {
    supportFields.forEach(f => {
      if ((r[f] || "").toString().trim().toLowerCase() === "yes") {
        supportCounts[f]++;
      }
    });
  });

  drawBarChart("chartSupport", supportCounts, "Recipients");
}

/* ---------------------------------------------------
   PIE / DOUGHNUT CHART (3D STYLE)
--------------------------------------------------- */
function drawDoughnut(id, obj) {
  const labels = Object.keys(obj);
  const data = Object.values(obj);

  const colors = labels.map((_, i) => `hsl(${(i * 32) % 360} 70% 55%)`);

  if (charts[id]) charts[id].destroy();

  charts[id] = new Chart(document.getElementById(id), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        hoverOffset: 15,
        borderWidth: 0,
      }]
    },
    options: {
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

/* ---------------------------------------------------
   BAR CHART (3D STYLE)
--------------------------------------------------- */
function drawBarChart(id, obj, label) {
  const labels = Object.keys(obj);
  const data = Object.values(obj);

  const ctx = document.getElementById(id);

  if (charts[id]) charts[id].destroy();

  charts[id] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: labels.map((_, i) =>
          `linear-gradient(180deg, rgba(52,183,143,0.9), rgba(15,122,74,0.9))`
        ),
        borderColor: "#0f7a4a",
        borderWidth: 1.2,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

/* ---------------------------------------------------
   EXPORT PDF
--------------------------------------------------- */
async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });

  const list = [
    "chartBarangay",
    "chartAgeGroup",
    "chartStage",
    "chartPWD",
    "chartStatus",
    "chartSupport"
  ];

  let first = true;
  for (let id of list) {
    const canvas = document.getElementById(id);
    if (!canvas) continue;

    const img = canvas.toDataURL("image/jpeg", 0.95);

    if (!first) doc.addPage();
    first = false;

    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const pad = 16;

    doc.addImage(img, "JPEG", pad, pad, w - pad * 2, h - pad * 2);
  }

  doc.save("Charts_Report.pdf");
}

/* ---------------------------------------------------
   EXPORT PNGs ZIP
--------------------------------------------------- */
async function exportPNGs() {
  const zip = new JSZip();

  const list = [
    "chartBarangay",
    "chartAgeGroup",
    "chartStage",
    "chartPWD",
    "chartStatus",
    "chartSupport"
  ];

  for (let id of list) {
    const canvas = document.getElementById(id);
    if (!canvas) continue;

    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    zip.file(id + ".png", blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "Charts_PNGs.zip");
}
