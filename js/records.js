/* records.js — Updated for new headers + modal editor + PDF + search */
// Dynamic API URL (auto matches your deployed Web App)
const API_URL = "https://script.google.com/macros/s/AKfycbzrlWenDLg1RENzvvCApTej-J2fLZXeR_hIjl8I2NPU1WvrncGjusUCVCu1I-v1Il0FNA/exec";


let ALL_ROWS = [];        // array of row objects from server
let EDIT_TARGET = null;   // the row object currently being edited

document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("loggedIn")) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("userName").innerText = localStorage.getItem("staffName") || "";

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => { localStorage.clear(); location.href = "index.html"; });

  const search = document.getElementById("searchInput");
  if (search) search.addEventListener("input", (e) => filterTable(e.target.value.trim().toLowerCase()));

  // Build modal HTML if not present in page
  ensureEditModal();

  loadRecords();
});

/* ---------- Data load ---------- */
async function loadRecords() {
  try {
    const res = await fetch(`${API_URL}?action=list`);
    const json = await res.json();
    if (!Array.isArray(json)) {
      console.error("List response not array:", json);
      renderError("Error loading data (invalid response).");
      return;
    }
    ALL_ROWS = json.map(r => normalizeRow(r));
    renderTable(ALL_ROWS);
  } catch (err) {
    console.error("Load error:", err);
    renderError("Connection error. Check console.");
  }
}

/* ---------- Row normalization (handles legacy keys/fallbacks) ---------- */
function normalizeRow(row) {
  const r = Object.assign({}, row || {});
  // Ensure canonical header names exist (fallback to other keys)
  if (r["Data ID"] === undefined) r["Data ID"] = r.DataID || r.DataId || r.dataId || "";
  if (r["Barangay"] === undefined) r["Barangay"] = r.barangay || "";
  if (r["Sitio / Purok"] === undefined) r["Sitio / Purok"] = r["SitioPurok"] || r.Sitio || r.sitio || "";
  if (r["Name of Household Head"] === undefined) r["Name of Household Head"] = r.HouseholdHead || r.householdHead || "";
  if (r["Sex"] === undefined) r["Sex"] = r.sex || "";
  if (r["Birthdate"] === undefined) r["Birthdate"] = r.Birthdate || r.birthdate || "";
  if (r["Age"] === undefined) r["Age"] = r.Age || r.age || "";
  if (r["No. of Household Member/s"] === undefined) r["No. of Household Member/s"] = r["No. of Household Member/s"] || r.TotalMembers || r.totalMembers || "";
  if (r["Name of Household Member/s"] === undefined) r["Name of Household Member/s"] = r["Name of Household Member/s"] || r.MemberNames || r.MemberName || r.memberName || "";
  if (r["Persons with Disability (PWD)"] === undefined) r["Persons with Disability (PWD)"] = r.PWD || r.pwd || r["Persons with Disability"] || "";
  if (r["Stage"] === undefined) r["Stage"] = r.Stage || r.stage || "";
  if (r["Status"] === undefined) r["Status"] = r.Status || r.status || "";
  if (r["Transportation"] === undefined) r["Transportation"] = r.Transportation || r.transportation || "";
  if (r["Designated Pick-Up Point"] === undefined) r["Designated Pick-Up Point"] = r.PickupPoint || r.pickup || r["Designated Pick-Up Point"] || "";
  if (r["Drop-Off Point"] === undefined) r["Drop-Off Point"] = r.DropOffPoint || r.dropoff || r["Drop-Off Point"] || "";
  if (r["Name of Camp"] === undefined) r["Name of Camp"] = r.CampName || r.campName || "";
  if (r["Capacity"] === undefined) r["Capacity"] = r.Capacity || r.capacity || "";
  if (r["No. of Individuals Inside Camp"] === undefined) r["No. of Individuals Inside Camp"] = r.InsideCamp || r.insideCamp || "";
  if (r["No. of Individuals Outside Camp"] === undefined) r["No. of Individuals Outside Camp"] = r.OutsideCamp || r.outsideCamp || "";
  if (r["Reasons for Displacement"] === undefined) r["Reasons for Displacement"] = r.Reasons || r.reasons || r.DisplacementReason || "";
  if (r["TUPAD"] === undefined) r["TUPAD"] = r.TUPAD || r.tupad || "";
  if (r["Local 4Ps"] === undefined) r["Local 4Ps"] = r["Local 4Ps"] || r.local4ps || "";
  if (r["National 4Ps"] === undefined) r["National 4Ps"] = r["National 4Ps"] || r.Intl4Ps || r["International 4Ps"] || r.international4ps || "";
  if (r["Local Social Pension"] === undefined) r["Local Social Pension"] = r.LocalSecPen || r.localSec || r["Local Social Pension"] || "";
  if (r["National Social Pension"] === undefined) r["National Social Pension"] = r["International Sec Pen"] || r.IntlSecPen || r.internationalSecPen || r["National Social Pension"] || "";
  if (r["Solo Parent Assistance"] === undefined) r["Solo Parent Assistance"] = r.SoloParentAssistance || r.soloParent || "";
  if (r["Cash Subsidy"] === undefined) r["Cash Subsidy"] = r.CashSubsidy || r.cashSubsidy || "";
  if (r["Relief Goods"] === undefined) r["Relief Goods"] = r.ReliefGoods || r.reliefGoods || "";
  if (r["AICS"] === undefined) r["AICS"] = r.AICS || r.Aics || "";
  if (r["Submitted By"] === undefined) r["Submitted By"] = r.SubmittedBy || r.submittedBy || "";
  if (r["Submitted On"] === undefined) r["Submitted On"] = r.SubmittedOn || r.submittedOn || "";
  return r;
}

/* ---------- Render table ---------- */
function renderTable(rows) {
  const tbody = document.getElementById("recordsBody");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="31" style="padding:14px">No records found.</td></tr>`;
    return;
  }

  // Build rows HTML
  const html = rows.map(r => {
    const id = esc(r["Data ID"]);
    const barangay = esc(r["Barangay"]);
    const sitio = esc(r["Sitio / Purok"]);
    const head = esc(r["Name of Household Head"]);
    const sex = esc(r["Sex"]);
    const birth = esc(r["Birthdate"]);
    const age = esc(r["Age"]);
    const total = esc(r["No. of Household Member/s"]);
    const member = esc(r["Name of Household Member/s"]);
    const pwd = esc(r["Persons with Disability (PWD)"]);
    const stage = esc(r["Stage"]);
    const status = esc(r["Status"]);
    const transport = esc(r["Transportation"]);
    const pickup = esc(r["Designated Pick-Up Point"]);
    const dropoff = esc(r["Drop-Off Point"]);
    const camp = esc(r["Name of Camp"]);
    const capacity = esc(r["Capacity"]);
    const inside = esc(r["No. of Individuals Inside Camp"]);
    const outside = esc(r["No. of Individuals Outside Camp"]);
    const reason = esc(r["Reasons for Displacement"]);
    const tupad = esc(r["TUPAD"]);
    const local4 = esc(r["Local 4Ps"]);
    const nat4 = esc(r["National 4Ps"]);
    const localSP = esc(r["Local Social Pension"]);
    const natSP = esc(r["National Social Pension"]);
    const solo = esc(r["Solo Parent Assistance"]);
    const cash = esc(r["Cash Subsidy"]);
    const relief = esc(r["Relief Goods"]);
    const aics = esc(r["AICS"]);
    const submittedBy = esc(r["Submitted By"]);
    const submittedOn = esc(r["Submitted On"]);

    // include data-row JSON as data attribute (encoded) to allow event listeners later
    const dataAttr = encodeURIComponent(JSON.stringify(r));

    return `
      <tr data-row='${dataAttr}'>
        <td>${id}</td>
        <td>${barangay}</td>
        <td>${sitio}</td>
        <td>${head}</td>
        <td>${sex}</td>
        <td>${birth}</td>
        <td>${age}</td>
        <td>${total}</td>
        <td>${member}</td>
        <td>${pwd}</td>
        <td>${stage}</td>
        <td>${status}</td>
        <td>${transport}</td>
        <td>${pickup}</td>
        <td>${dropoff}</td>
        <td>${camp}</td>
        <td>${capacity}</td>
        <td>${inside}</td>
        <td>${outside}</td>
        <td>${reason}</td>
        <td>${tupad}</td>
        <td>${local4}</td>
        <td>${nat4}</td>
        <td>${localSP}</td>
        <td>${natSP}</td>
        <td>${solo}</td>
        <td>${cash}</td>
        <td>${relief}</td>
        <td>${aics}</td>
        <td>${submittedBy}</td>
        <td>${submittedOn}</td>
        <td style="white-space:nowrap">
          <button class="btn small btn-edit">Edit</button>
          <button class="btn secondary small btn-pdf">PDF</button>
          <button class="btn danger small btn-delete">Delete</button>
        </td>
      </tr>`;
  }).join("");

  tbody.innerHTML = html;

  // Attach row-level event listeners
  tbody.querySelectorAll("tr").forEach(tr => {
    const encoded = tr.getAttribute('data-row');
    let rowObj = {};
    try { rowObj = JSON.parse(decodeURIComponent(encoded)); } catch (e) { rowObj = {}; }
    const editBtn = tr.querySelector(".btn-edit");
    const pdfBtn = tr.querySelector(".btn-pdf");
    const delBtn = tr.querySelector(".btn-delete");
    if (editBtn) editBtn.addEventListener("click", () => openEditModal(rowObj));
    if (pdfBtn) pdfBtn.addEventListener("click", () => downloadRowPDF(rowObj));
    if (delBtn) delBtn.addEventListener("click", () => confirmDelete(rowObj));
  });
}

/* ---------- Small helpers ---------- */
function esc(v) { if (v === undefined || v === null) return ""; return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"','&quot;').replaceAll("'","&#039;"); }

function renderError(msg) {
  const tbody = document.getElementById("recordsBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="31" style="padding:14px;color:#9b2c2c">${esc(msg)}</td></tr>`;
}

/* ---------- Search filter ---------- */
function filterTable(q) {
  if (!q) return renderTable(ALL_ROWS);
  const filtered = ALL_ROWS.filter(r => {
    return JSON.stringify(Object.values(r)).toLowerCase().indexOf(q) !== -1;
  });
  renderTable(filtered);
}

/* ---------- Edit modal (create if absent) ---------- */
function ensureEditModal() {
  if (document.getElementById("editModal")) return;

  const modalHtml = `
  <div id="editModal" class="modal-overlay" style="display:none;">
    <div class="modal-box" role="dialog" aria-modal="true">
      <h3>Edit Record</h3>
      <form id="editForm" onsubmit="return false;">
        <div class="modal-grid">
          <label>Data ID</label><input id="editDataID" readonly>
          <label>Barangay</label><input id="editBarangay">
          <label>Sitio / Purok</label><input id="editSitio">
          <label>Household Head</label><input id="editHead">
          <label>Sex</label><select id="editSex"><option>Male</option><option>Female</option></select>
          <label>Birthdate</label><input id="editBirthdate" type="date">
          <label>Age</label><input id="editAge" type="number" readonly>
          <label>Total Members</label><input id="editTotalMembers" type="number" min="0">
          <label>Member Name</label><input id="editMember">
          <label>PWD</label><select id="editPWD"><option value="">--</option><option>Yes</option><option>No</option></select>
          <label>Stage</label><input id="editStage">
          <label>Status</label><input id="editStatus">
          <label>Transportation</label><input id="editTransport">
          <label>Pickup Point</label><input id="editPickup">
          <label>Drop-Off Point</label><input id="editDropoff">
          <label>Camp Name</label><input id="editCamp">
          <label>Capacity</label><input id="editCapacity" type="number" min="0">
          <label>Inside Camp</label><input id="editInside" type="number" min="0">
          <label>Outside Camp</label><input id="editOutside" type="number" min="0">
          <label>Reason</label><input id="editReason">
          <label>TUPAD</label><select id="editTupad"><option value="">--</option><option>Yes</option><option>No</option></select>
          <label>Local 4Ps</label><select id="editLocal4"><option value="">--</option><option>Yes</option><option>No</option></select>
          <label>National 4Ps</label><select id="editNat4"><option value="">--</option><option>Yes</option><option>No</option></select>
          <label>Local Social Pension</label><select id="editLocalSP"><option value="">--</option><option>Yes</option><option>No</option></select>
          <label>National Social Pension</label><select id="editNatSP"><option value="">--</option><option>Yes</option><option>No</option></select>
          <label>Solo Parent</label><select id="editSolo"><option value="">--</option><option>Yes</option><option>No</option></select>
          <label>Cash Subsidy</label><select id="editCash"><option value="">--</option><option>Yes</option><option>No</option></select>
          <label>Relief Goods</label><select id="editRelief"><option value="">--</option><option>Yes</option><option>No</option></select>
          <label>AICS</label><input id="editAICS">
          <label>Submitted By</label><input id="editSubmittedBy" readonly>
          <label>Submitted On</label><input id="editSubmittedOn" readonly>
        </div>

        <div class="modal-actions">
          <button class="btn" id="saveEditBtn" type="button">Save</button>
          <button class="btn secondary" id="closeEditBtn" type="button">Cancel</button>
        </div>
      </form>
    </div>
  </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = modalHtml;
  document.body.appendChild(wrapper);

  // Bind buttons
  document.getElementById("closeEditBtn").addEventListener("click", closeEditModal);
  document.getElementById("saveEditBtn").addEventListener("click", saveEdit);

  // Birthdate -> compute age & stage on change
  document.getElementById("editBirthdate").addEventListener("change", () => {
    const bd = document.getElementById("editBirthdate").value;
    const ageEl = document.getElementById("editAge");
    const stageEl = document.getElementById("editStage");
    if (!bd) { ageEl.value = ""; stageEl.value = ""; return; }
    const ageObj = computeAgeFromBirthdate(bd);
    if (!ageObj) { ageEl.value = ""; stageEl.value = ""; return; }
    const ageVal = ageObj.years === 0 ? 0 : ageObj.years;
    ageEl.value = ageVal;
    stageEl.value = deriveStageFromAge(ageObj);
  });
}

/* ---------- Open / Close modal ---------- */
function openEditModal(row) {
  EDIT_TARGET = row || null;
  if (!row) return;

  document.getElementById("editDataID").value = row["Data ID"] || "";
  document.getElementById("editBarangay").value = row["Barangay"] || "";
  document.getElementById("editSitio").value = row["Sitio / Purok"] || "";
  document.getElementById("editHead").value = row["Name of Household Head"] || "";
  document.getElementById("editSex").value = row["Sex"] || "";
  document.getElementById("editBirthdate").value = row["Birthdate"] || "";
  document.getElementById("editAge").value = row["Age"] || "";
  document.getElementById("editTotalMembers").value = row["No. of Household Member/s"] || "";
  document.getElementById("editMember").value = row["Name of Household Member/s"] || "";
  document.getElementById("editPWD").value = row["Persons with Disability (PWD)"] || "";
  document.getElementById("editStage").value = row["Stage"] || "";
  document.getElementById("editStatus").value = row["Status"] || "";
  document.getElementById("editTransport").value = row["Transportation"] || "";
  document.getElementById("editPickup").value = row["Designated Pick-Up Point"] || "";
  document.getElementById("editDropoff").value = row["Drop-Off Point"] || "";
  document.getElementById("editCamp").value = row["Name of Camp"] || "";
  document.getElementById("editCapacity").value = row["Capacity"] || "";
  document.getElementById("editInside").value = row["No. of Individuals Inside Camp"] || "";
  document.getElementById("editOutside").value = row["No. of Individuals Outside Camp"] || "";
  document.getElementById("editReason").value = row["Reasons for Displacement"] || "";
  document.getElementById("editTupad").value = row["TUPAD"] || "";
  document.getElementById("editLocal4").value = row["Local 4Ps"] || "";
  document.getElementById("editNat4").value = row["National 4Ps"] || "";
  document.getElementById("editLocalSP").value = row["Local Social Pension"] || "";
  document.getElementById("editNatSP").value = row["National Social Pension"] || "";
  document.getElementById("editSolo").value = row["Solo Parent Assistance"] || "";
  document.getElementById("editCash").value = row["Cash Subsidy"] || "";
  document.getElementById("editRelief").value = row["Relief Goods"] || "";
  document.getElementById("editAICS").value = row["AICS"] || "";
  document.getElementById("editSubmittedBy").value = row["Submitted By"] || "";
  document.getElementById("editSubmittedOn").value = row["Submitted On"] || "";

  document.getElementById("editModal").style.display = "flex";
  // focus first field
  setTimeout(()=> document.getElementById("editBarangay").focus(), 50);
}

function closeEditModal() {
  EDIT_TARGET = null;
  const m = document.getElementById("editModal");
  if (m) m.style.display = "none";
}

/* ---------- Save edit (calls updateRecord) ---------- */
async function saveEdit() {
  if (!EDIT_TARGET) return alert("No record selected.");
  const dataID = document.getElementById("editDataID").value;

  const updates = {
    "Barangay": document.getElementById("editBarangay").value,
    "Sitio / Purok": document.getElementById("editSitio").value,
    "Name of Household Head": document.getElementById("editHead").value,
    "Sex": document.getElementById("editSex").value,
    "Birthdate": document.getElementById("editBirthdate").value,
    "Age": document.getElementById("editAge").value,
    "No. of Household Member/s": document.getElementById("editTotalMembers").value,
    "Name of Household Member/s": document.getElementById("editMember").value,
    "Persons with Disability (PWD)": document.getElementById("editPWD").value,
    "Stage": document.getElementById("editStage").value,
    "Status": document.getElementById("editStatus").value,
    "Transportation": document.getElementById("editTransport").value,
    "Designated Pick-Up Point": document.getElementById("editPickup").value,
    "Drop-Off Point": document.getElementById("editDropoff").value,
    "Name of Camp": document.getElementById("editCamp").value,
    "Capacity": document.getElementById("editCapacity").value,
    "No. of Individuals Inside Camp": document.getElementById("editInside").value,
    "No. of Individuals Outside Camp": document.getElementById("editOutside").value,
    "Reasons for Displacement": document.getElementById("editReason").value,
    "TUPAD": document.getElementById("editTupad").value,
    "Local 4Ps": document.getElementById("editLocal4").value,
    "National 4Ps": document.getElementById("editNat4").value,
    "Local Social Pension": document.getElementById("editLocalSP").value,
    "National Social Pension": document.getElementById("editNatSP").value,
    "Solo Parent Assistance": document.getElementById("editSolo").value,
    "Cash Subsidy": document.getElementById("editCash").value,
    "Relief Goods": document.getElementById("editRelief").value,
    "AICS": document.getElementById("editAICS").value
  };

  const auth = {
    username: localStorage.getItem("username") || localStorage.getItem("staffName"),
    pwHash: localStorage.getItem("pwHash") || null
  };

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateRecord",
        auth: auth,
        DataID: dataID,
        updates: updates
      })
    });
    const out = await resp.json();
    if (out && out.success) {
      closeEditModal();
      await loadRecords();
      alert("Record updated.");
    } else {
      console.error("Update failed:", out);
      alert("Update failed: " + (out.message || out.error || JSON.stringify(out)));
    }
  } catch (err) {
    console.error("Save error:", err);
    alert("Update error, check console.");
  }
}

/* ---------- Delete ---------- */
function confirmDelete(row) {
  const id = row["Data ID"];
  if (!confirm(`Delete all rows for Data ID ${id}? This cannot be undone.`)) return;
  doDelete(id);
}

async function doDelete(dataId) {
  const auth = {
    username: localStorage.getItem("username") || localStorage.getItem("staffName"),
    pwHash: localStorage.getItem("pwHash") || null
  };
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteRecord", auth: auth, DataID: dataId })
    });
    const out = await resp.json();
    if (out && out.success) {
      alert(`Deleted Data ID ${dataId} (${out.rowsDeleted || 0} rows).`);
      await loadRecords();
    } else {
      console.error("Delete failed:", out);
      alert("Delete failed: " + (out.message || out.error || JSON.stringify(out)));
    }
  } catch (err) {
    console.error("Delete error:", err);
    alert("Delete error, see console.");
  }
}

/* ---------- PDF generation for single row ---------- */
async function downloadRowPDF(row) {
  if (!row) return alert("Row not found.");
  const lines = [
    `Data ID: ${row["Data ID"] || ""}`,
    `Barangay: ${row["Barangay"] || ""}`,
    `Sitio/Purok: ${row["Sitio / Purok"] || ""}`,
    `Household Head: ${row["Name of Household Head"] || ""}`,
    `Sex: ${row["Sex"] || ""}`,
    `Birthdate: ${row["Birthdate"] || ""}`,
    `Age: ${row["Age"] || ""}`,
    `Member: ${row["Name of Household Member/s"] || ""}`,
    `PWD: ${row["Persons with Disability (PWD)"] || ""}`,
    `Stage: ${row["Stage"] || ""}`,
    `Status: ${row["Status"] || ""}`,
    `Transportation: ${row["Transportation"] || ""}`,
    `Pickup: ${row["Designated Pick-Up Point"] || ""}`,
    `Dropoff: ${row["Drop-Off Point"] || ""}`,
    `Camp: ${row["Name of Camp"] || ""}`,
    `Capacity: ${row["Capacity"] || ""}`,
    `Inside: ${row["No. of Individuals Inside Camp"] || ""}`,
    `Outside: ${row["No. of Individuals Outside Camp"] || ""}`,
    `Reason: ${row["Reasons for Displacement"] || ""}`,
    `TUPAD: ${row["TUPAD"] || ""}`,
    `Local 4Ps: ${row["Local 4Ps"] || ""}`,
    `National 4Ps: ${row["National 4Ps"] || ""}`,
    `Local Social Pension: ${row["Local Social Pension"] || ""}`,
    `National Social Pension: ${row["National Social Pension"] || ""}`,
    `Solo Parent Assistance: ${row["Solo Parent Assistance"] || ""}`,
    `Cash Subsidy: ${row["Cash Subsidy"] || ""}`,
    `Relief Goods: ${row["Relief Goods"] || ""}`,
    `AICS: ${row["AICS"] || ""}`,
    `Submitted By: ${row["Submitted By"] || ""}`,
    `Submitted On: ${row["Submitted On"] || ""}`
  ];

  if (typeof window.jspdf === "undefined") {
    // load jsPDF
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    document.head.appendChild(s);
    s.onload = () => generatePDF(lines, `Evac_Record_${row["Data ID"] || "unknown"}.pdf`);
    s.onerror = () => alert("Failed to load PDF library.");
  } else {
    generatePDF(lines, `Evac_Record_${row["Data ID"] || "unknown"}.pdf`);
  }
}

function generatePDF(lines, filename) {
  try {
    const { jsPDF } = window.jspdf || window.jspdf || window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    let y = 40;
    doc.setFontSize(14);
    doc.text("Alitagtag MDRRMO — Evacuation Record", 40, y); y += 24;
    doc.setFontSize(10);
    lines.forEach(line => {
      doc.text(line, 40, y);
      y += 14;
      if (y > 740) { doc.addPage(); y = 40; }
    });
    doc.save(filename);
  } catch (e) {
    alert("PDF generation failed: " + e);
  }
}

/* ---------- Age & Stage helpers (same logic as form.js) ---------- */
function computeAgeFromBirthdate(dateStr) {
  if (!dateStr) return null;
  const b = new Date(dateStr);
  if (isNaN(b)) return null;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  if (years <= 0) {
    const months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
    return { years: 0, months: months >= 0 ? months : 0 };
  }
  return { years };
}
function deriveStageFromAge(ageObj) {
  if (!ageObj) return "";
  if (ageObj.years === 0) {
    const m = ageObj.months || 0;
    if (m <= 10) return "Infant";
    return "Children";
  }
  if (ageObj.years <= 17) return "School Children";
  if (ageObj.years >= 60) return "Elderly";
  return "Adult";
}










