// js/charts.js — polished charts for Purok Kaligtasan
// Replace this URL if your deployment URL differs
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxWs1kxkyleYw6qcQlIx1xsecQS8x2O-nyXxbcdcm5DVst6IcmDKR-NmzSgBxyH7ErvpA/exec";

let charts = {};

window.addEventListener('load', async () => {
  // basic auth guard (your site stores loggedIn)
  if (!localStorage.getItem("loggedIn")) {
    // redirect to main/login if not logged
    // location.href = "login.html";
  } else {
    document.getElementById("userName").innerText = localStorage.getItem("staffName") || "";
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    location.href = "login.html";
  });

  document.getElementById("btnPrint").addEventListener("click", () => window.print());
  document.getElementById("btnExportPDF").addEventListener("click", exportAllToPDF);
  document.getElementById("btnExportPNGs").addEventListener("click", exportAllPNGsZip);

  await loadAndRender();
});

/* ---------- helpers: parse date strings robustly ---------- */
function parseDateFlexible(v) {
  if (!v && v !== 0) return null;
  // If already a Date object
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v)) return null;
    return v;
  }
  const s = String(v).trim();
  if (!s) return null;

  // ISO-like: 2025-11-04T16:00:00.000Z
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  // dd/mm/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const p = s.split('/');
    // ambiguous: treat as dd/mm/yyyy (your sheet uses DD/MM/YYYY)
    return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  }

  // mm/dd/yyyy fallback
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const p = s.split('/');
    return new Date(Number(p[2]), Number(p[0]) - 1, Number(p[1]));
  }

  // last-ditch parse
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function computeAgeYearsMonthsFromDate(d) {
  if (!d) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  if (years < 0) years = 0;
  // months when <1 year
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  return { years: years, months: months < 0 ? 0 : months };
}

/* ---------- load data ---------- */
async function loadAndRender() {
  try {
    const url = SCRIPT_URL + "?action=getRecords";
    const res = await fetch(url);
    const json = await res.json();
    if (!json || !json.success) {
      console.error("No data or API error", json);
      return;
    }
    const rows = json.rows || [];

    // rows are raw sheet rows — can be heads + members; we'll treat each row as a person row
    const persons = rows.map(r => {
      // prefer keys as they come from sheet (header names)
      // normalize field names
      const obj = {};
      for (const k in r) {
        obj[k] = r[k];
      }
      // parse birthdate with fallback to Age field
      const bd = parseDateFlexible(r["Birthdate"] || r["birthdate"] || r["Birth Date"] || "");
      obj.__birthdateParsed = bd;
      // Age numeric if present and not parsed
      const ageNum = Number(r["Age"] || r["age"] || "");
      obj.__ageFromField = (!isNaN(ageNum) ? ageNum : null);
      return obj;
    });

    buildAndDrawCharts(persons);
  } catch (err) {
    console.error("loadAndRender error", err);
  }
}

/* ---------- build stats and draw ---------- */
function buildAndDrawCharts(rows) {
  // 1) Entry per Barangay
  const barangayCounts = {};
  rows.forEach(r => {
    const b = String(r["Barangay"] || r["barangay"] || "").trim() || "Unknown";
    barangayCounts[b] = (barangayCounts[b] || 0) + 1;
  });

  // 2) Age groups: Infant (0-11 months), School Children (1-17), Adult (18-59), Elderly (60+)
  const ageGroupCounts = { Infant: 0, "School Children": 0, Adult: 0, Elderly: 0 };

  // 3) Stage distribution (use Stage column if present)
  const stageCounts = {};

  // 4) PWD
  const pwdCounts = { Yes: 0, No: 0 };

  // 5) Status
  const statusCounts = {};

  // 6) Government support combined
  const supportKeys = [
    "TUPAD",
    "Local 4Ps",
    "National 4Ps",
    "Local Social Pension",
    "National Social Pension",
    "Solo Parent Assistance",
    "Cash Subsidy",
    "Relief Goods",
    "AICS"
  ];
  const supportCounts = {};
  supportKeys.forEach(k => supportCounts[k] = 0);

  rows.forEach(r => {
    // age: prefer parsed birthdate, fallback to Age column
    let ageYears = null;
    let ageMonths = null;
    if (r.__birthdateParsed) {
      const am = computeAgeYearsMonthsFromDate(r.__birthdateParsed);
      ageYears = am.years;
      ageMonths = am.months;
    } else if (r.__ageFromField !== null) {
      ageYears = r.__ageFromField;
      ageMonths = (r.__ageFromField === 0 ? 0 : null);
    }

    // classify age group
    if (ageYears === 0 || (ageYears === 0 && ageMonths !== null)) {
      // infant if explicitly <1 year — we also check months
      ageGroupCounts.Infant++;
    } else if (ageYears !== null && ageYears <= 17) {
      ageGroupCounts["School Children"]++;
    } else if (ageYears !== null && ageYears <= 59) {
      ageGroupCounts.Adult++;
    } else if (ageYears !== null && ageYears >= 60) {
      ageGroupCounts.Elderly++;
    } else {
      // unknown - try Stage field for classification (fallback)
      const st = String(r["Stage"] || "").trim();
      if (st.toLowerCase().includes("infant")) ageGroupCounts.Infant++;
      else if (st) ageGroupCounts.Adult++; // fallback to adult
    }

    // Stage
    const stage = String(r["Stage"] || r["stage"] || "").trim() || "Unknown";
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;

    // PWD
    const pwd = String(r["Persons with Disability (PWD)"] || r["PWD"] || "").trim().toLowerCase();
    if (pwd === "yes" || pwd === "y" || pwd === "true") pwdCounts.Yes++;
    else pwdCounts.No++;

    // Status
    const stt = String(r["Status"] || "").trim() || "Unknown";
    statusCounts[stt] = (statusCounts[stt] || 0) + 1;

    // Support flags (count Yes or non-empty AICS)
    supportKeys.forEach(k => {
      const val = String(r[k] || r[k.toLowerCase()] || "").toString().trim();
      if (k === "AICS") {
        if (val) supportCounts[k]++;
      } else {
        if (val.toLowerCase() === "yes" || val.toLowerCase() === "y" || val === "TRUE") supportCounts[k]++;
      }
    });
  });

  // Draw charts
  drawBarChart('chartBarangay', barangayCounts, 'Evacuees per Barangay');
  drawBarChart('chartAgeGroup', ageGroupCounts, 'Age Groups', {rounded: true});
  drawDoughnut('chartStage', stageCounts, 'Stage Distribution');
  drawDoughnut('chartPWD', pwdCounts, 'PWD (Yes / No)');
  drawDoughnut('chartStatus', statusCounts, 'Status Distribution');
  drawHorizontalBar('chartSupport', supportCounts, 'Government Support counts');
}

/* ---------- chart helpers ---------- */
function createGradient(ctx, topColor, bottomColor) {
  const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  g.addColorStop(0, topColor);
  g.addColorStop(1, bottomColor);
  return g;
}

function drawBarChart(canvasId, countsObj, label, opts = {}) {
  const labels = Object.keys(countsObj).sort();
  const data = labels.map(l => countsObj[l] || 0);

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (charts[canvasId]) charts[canvasId].destroy();

  // gradient
  const grad = createGradient(ctx, 'rgba(52,183,143,0.95)', 'rgba(15,122,74,0.95)');

  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: labels.map(() => grad),
        borderColor: labels.map(() => '#0f7a4a'),
        borderWidth: 1,
        borderRadius: opts.rounded ? 12 : 4,
        barPercentage: 0.7
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label || ''}: ${ctx.parsed.y ?? ctx.parsed || ''}`
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

function drawDoughnut(canvasId, countsObj, title) {
  const labels = Object.keys(countsObj).filter(k => k !== null);
  const data = labels.map(l => countsObj[l] || 0);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (charts[canvasId]) charts[canvasId].destroy();

  const colors = labels.map((_, i) => `hsl(${(i*45) % 360} 70% 55%)`);

  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { mode: 'index' }
      },
      cutout: '45%'
    }
  });
}

function drawHorizontalBar(canvasId, countsObj, title) {
  const labels = Object.keys(countsObj);
  const data = labels.map(l => countsObj[l] || 0);

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (charts[canvasId]) charts[canvasId].destroy();

  // create gradient per bar
  const bg = labels.map((_, i) => {
    // make pleasing palette
    const hue = (i * 30) % 360;
    return `hsl(${hue} 70% 50%)`;
  });

  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: title,
        data,
        backgroundColor: bg,
        borderWidth: 0,
        borderRadius: 8
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.parsed.x ?? ctx.parsed}`
          }
        }
      },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

/* ---------- export helpers (PDF / PNG ZIP) ---------- */
async function exportAllToPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    const ids = [
      'chartBarangay',
      'chartAgeGroup',
      'chartStage',
      'chartPWD',
      'chartStatus',
      'chartSupport'
    ];

    let page = 0;
    for (const id of ids) {
      const canvas = document.getElementById(id);
      if (!canvas) continue;
      const img = canvas.toDataURL("image/jpeg", 0.95);
      if (page > 0) doc.addPage();
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      const margin = 18;
      doc.addImage(img, 'JPEG', margin, margin, w - margin*2, h - margin*2);
      page++;
    }

    doc.save(`Charts_${(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`);
  } catch (err) {
    console.error("PDF export error", err);
    alert("PDF export failed: " + err.message);
  }
}

async function exportAllPNGsZip() {
  try {
    const zip = new JSZip();
    const ids = [
      'chartBarangay',
      'chartAgeGroup',
      'chartStage',
      'chartPWD',
      'chartStatus',
      'chartSupport'
    ];
    for (const id of ids) {
      const canvas = document.getElementById(id);
      if (!canvas) continue;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png", 1.0));
      if (blob) zip.file(`${id}.png`, blob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `Charts_PNGs_${(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'-')}.zip`);
  } catch (err) {
    console.error("PNG ZIP export error", err);
    alert("ZIP export failed: " + err.message);
  }
}
