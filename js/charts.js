/******************************************************
 * charts.js — MDRRMO Alitagtag
 * - Loads chartData from Apps Script backend
 * - Draws 6 charts with Chart.js
 * - Floating export menu: Print, Export PDF, Export PNG ZIP
 ******************************************************/

// ===== DYNAMIC API URL (NO MORE HARD-CODED URL) =====
const API_URL = "https://script.google.com/macros/s/AKfycbxjeV8tRepnPhKYG7ZfO5O6kkO7r2nUXc23zDgUonHBFvm0K29NGzcUI5qdzOBfbQRclA/exec";

// =====================================================

let charts = {}; // Chart.js instances

window.addEventListener('load', async () => {

  // LOGIN CHECK
  if (!localStorage.getItem("loggedIn")) {
    window.location.href = "login.html";
    return;
  }

  // USER NAME DISPLAY
  document.getElementById("userName").innerText =
    localStorage.getItem("staffName") || "";

  // LOGOUT BUTTON
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    location.href = "login.html";
  });

  // EXPORT BUTTONS
  document.getElementById("btnPrint").addEventListener("click", printCharts);
  document.getElementById("btnExportPDF").addEventListener("click", exportAllToPDF);
  document.getElementById("btnExportPNGs").addEventListener("click", exportAllPNGsZip);

  await loadChartDataAndRender();
});

/* ------------------------------
   FETCH chartData FROM BACKEND
--------------------------------*/
async function loadChartDataAndRender() {
  try {
    const res = await fetch(API_URL + "?action=chartData");
    const j = await res.json();

    if (!j || !j.success) {
      console.error("chartData error", j);
      return;
    }

    const raw = j;
    const allRows = await fetchAllRows();
    renderAllCharts(raw.barangayCount || {}, allRows || []);

  } catch (err) {
    console.error("loadChartDataAndRender failed", err);
  }
}

/* ---- LOAD ALL ROWS FOR DERIVED CHARTS ---- */
async function fetchAllRows() {
  try {
    const res = await fetch(API_URL + "?action=list");
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;

  } catch (e) {
    console.error("fetchAllRows failed", e);
    return [];
  }
}

/* ------------------------------
   BUILD STATS + RENDER ALL CHARTS
--------------------------------*/
function renderAllCharts(barangayCount, rows) {

  drawBarangayChart(barangayCount);

  // Counters
  const stageCounts = {};
  const pwdCount = { yes: 0, no: 0 };
  const statusCounts = {};
  const transportCounts = {};
  const ageBuckets = {
    infant: 0,
    school: 0,
    adult: 0,
    elderly: 0
  };

  rows.forEach(r => {
    const stage = (r.Stage || r['Stage'] || '').toString();
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;

    const pwd = (r.PWD || r['Persons with Disability (PWD)'] || '').toString().toLowerCase();
    pwd === 'yes' ? pwdCount.yes++ : pwdCount.no++;

    const status = (r.Status || '').toString();
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const transport = (r.Transportation || '').toString();
    transportCounts[transport] = (transportCounts[transport] || 0) + 1;

    // Age group
    const age = parseInt(r.Age || r['Age'] || '', 10);
    if (!isNaN(age)) {
      if (age === 0) ageBuckets.infant++;
      else if (age <= 17) ageBuckets.school++;
      else if (age >= 60) ageBuckets.elderly++;
      else ageBuckets.adult++;
    }
  });

  drawPieChart('chartStage', stageCounts, 'Stage distribution');
  drawPieChart('chartPWD', { Yes: pwdCount.yes, No: pwdCount.no }, 'PWD');
  drawPieChart('chartStatus', statusCounts, 'Status');
  drawPieChart('chartTransport', transportCounts, 'Transportation');
  drawPieChart('chartAgeGroup',
    {
      Infant: ageBuckets.infant,
      "School Children": ageBuckets.school,
      Adult: ageBuckets.adult,
      Elderly: ageBuckets.elderly
    },
    'Age groups'
  );
}

/* ------------------------------
   BARANGAY BAR CHART
--------------------------------*/
function drawBarangayChart(counts) {
  const labels = Object.keys(counts).sort();
  const data = labels.map(k => counts[k] || 0);

  const ctx = document.getElementById('chartBarangay').getContext('2d');
  if (charts.barangay) charts.barangay.destroy();

  charts.barangay = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Evacuees',
        data,
        backgroundColor: labels.map(() => 'rgba(52,183,143,0.75)'),
        borderColor: labels.map(() => '#0f7a4a'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

/* ------------------------------
   PIE / DOUGHNUT CHARTS
--------------------------------*/
function drawPieChart(canvasId, countsObj, title) {
  const labels = Object.keys(countsObj);
  const data = labels.map(k => countsObj[k] || 0);

  const ctx = document.getElementById(canvasId).getContext('2d');
  if (charts[canvasId]) charts[canvasId].destroy();

  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) =>
          `hsl(${(i * 40) % 360} 70% 55%)`
        ),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

/* ------------------------------
   PRINT CHARTS
--------------------------------*/
function printCharts() {
  window.print();
}

/* ------------------------------
   EXPORT TO PDF
--------------------------------*/
async function exportAllToPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    const ids = [
      'chartBarangay',
      'chartStage',
      'chartPWD',
      'chartStatus',
      'chartTransport',
      'chartAgeGroup'
    ];

    let page = 0;
    for (const id of ids) {
      const canvas = document.getElementById(id);
      if (!canvas) continue;

      const img = canvas.toDataURL("image/jpeg", 0.95);

      if (page > 0) doc.addPage();

      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      const margin = 20;

      doc.addImage(img, 'JPEG', margin, margin, w - margin * 2, h - margin * 2);
      page++;
    }

    const filename = `Charts_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`;
    doc.save(filename);

  } catch (err) {
    console.error("PDF export error", err);
    alert("PDF export failed: " + err.message);
  }
}

/* ------------------------------
   EXPORT PNG ZIP
--------------------------------*/
async function exportAllPNGsZip() {
  try {
    const zip = new JSZip();
    const ids = [
      'chartBarangay',
      'chartStage',
      'chartPWD',
      'chartStatus',
      'chartTransport',
      'chartAgeGroup'
    ];

    for (const id of ids) {
      const canvas = document.getElementById(id);
      if (!canvas) continue;

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/png", 1.0)
      );

      if (blob) zip.file(`${id}.png`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });

    saveAs(
      content,
      `Charts_PNGs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.zip`
    );

  } catch (err) {
    console.error("PNG ZIP export error", err);
    alert("ZIP export failed: " + err.message);
  }
}







