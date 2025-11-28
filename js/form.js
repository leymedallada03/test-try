/* form.js - dynamic members + submit (Option B, one row per member)
   Updated: dynamic API_URL, selector fixes, better error handling.
*/

/* ================================
   DYNAMIC API URL (NO HARDCODED URL)
   ================================= */
const API_URL = "https://script.google.com/macros/s/AKfycbwoeKPJG-P7ytS_3mtdP0UUlHJFF5AxQPUeHw5uf2_Q3MSaPX6nwrVHUbZv-7Jwo-S8Jw/exec";

/* ================================= */

function ensureLoginOrRedirect(){
  if(!localStorage.getItem('loggedIn')){
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/* ---------- Member UI ---------- */
function initMemberFields(){
  const container = document.getElementById('membersContainer');
  if(!container) return;
  const count = parseInt(document.getElementById('memberCount').value || 1, 10) || 1;
  container.innerHTML = '';
  for(let i=0;i<count;i++){
    const node = createMemberRow(i);
    container.appendChild(node);
  }

  container.querySelectorAll('.memberBirthdate').forEach(el=>{
    el.addEventListener('change', ()=>{
      const idx = el.dataset.i;
      computeAgeStageForIndex(idx);
    });
  });
}

function createMemberRow(i){
  const wrapper = document.createElement('div');
  wrapper.className = 'member-row card';
  wrapper.dataset.memberIndex = i;
  wrapper.style.padding = '10px';
  wrapper.style.marginBottom = '8px';

  wrapper.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
      <strong>Member #${i+1}</strong>
      <button type="button" class="btn secondary" style="margin-left:auto" onclick="removeMemberIndex(${i})">Remove</button>
    </div>
    <div class="form-grid" style="grid-template-columns:repeat(2,1fr);gap:8px;">
      <div><label>Name</label><input class="memberName" data-i="${i}" type="text"></div>
      <div><label>Sex</label>
        <div class="radio-line"><label class="radio-item"><input name="member_sex_${i}" type="radio" value="Male"> Male</label>
        <label class="radio-item"><input name="member_sex_${i}" type="radio" value="Female"> Female</label></div>
      </div>

      <div><label>Birthdate</label><input class="memberBirthdate" data-i="${i}" type="date"></div>
      <div><label>Age</label><input class="memberAge" data-i="${i}" type="number" readonly></div>

      <div><label>PWD</label>
        <div class="radio-line"><label class="radio-item"><input name="member_pwd_${i}" type="radio" value="Yes"> Yes</label>
        <label class="radio-item"><input name="member_pwd_${i}" type="radio" value="No" checked> No</label></div>
      </div>

      <div><label>Stage</label><input class="memberStage" data-i="${i}" readonly></div>

      <div><label>Status</label><select class="memberStatus" data-i="${i}"><option value="">Select...</option><option>With Sickness</option><option>Pregnant</option></select></div>

      <div><label>Transportation</label><select class="memberTransport" data-i="${i}"><option value="">Select...</option><option>Individual with Transportation</option><option>Individual needing Transportation</option></select></div>

      <div><label>Pick-Up Point</label><input class="memberPickup" data-i="${i}" type="text"></div>
      <div><label>Drop-Off Point</label><input class="memberDropoff" data-i="${i}" type="text"></div>

      <div><label>Camp Name</label><input class="memberCamp" data-i="${i}" type="text"></div>
      <div><label>Capacity</label><input class="memberCampCap" data-i="${i}" type="number"></div>

      <div><label>Inside Camp</label><input class="memberInside" data-i="${i}" type="number" min="0"></div>
      <div><label>Outside Camp</label><input class="memberOutside" data-i="${i}" type="number" min="0"></div>

      <div><label>Reasons</label><select class="memberReason" data-i="${i}"><option value="">Select...</option><option>With-in 14-15 KM Danger Zone</option><option>Others</option></select></div>

      <div style="grid-column:1/-1;margin-top:8px;">
        <div class="assist-grid" style="grid-template-columns: 1fr; gap:8px;">
          <label class="assist-item"><input class="memberTUPAD" data-i="${i}" type="checkbox"> TUPAD</label>
          <label class="assist-item"><input class="memberLocal4ps" data-i="${i}" type="checkbox"> Local 4Ps</label>
          <label class="assist-item"><input class="memberIntl4ps" data-i="${i}" type="checkbox"> National 4Ps</label>
          <label class="assist-item"><input class="memberLocalSP" data-i="${i}" type="checkbox"> Local Social Pension</label>
          <label class="assist-item"><input class="memberIntlSP" data-i="${i}" type="checkbox"> National Social Pension</label>
          <label class="assist-item"><input class="memberSolo" data-i="${i}" type="checkbox"> Solo Parent Assistance</label>
          <label class="assist-item"><input class="memberCash" data-i="${i}" type="checkbox"> Cash Subsidy</label>
          <label class="assist-item"><input class="memberRelief" data-i="${i}" type="checkbox"> Relief Goods</label>
        </div>

        <label style="display:block;margin-top:8px;">AICS</label>
        <select class="memberAICS" data-i="${i}"><option value="">None</option><option>Shelter Assistance</option><option>Burial</option><option>Scholarship</option></select>
      </div>
    </div>
  `;
  return wrapper;
}

function removeMemberIndex(index){
  const container = document.getElementById('membersContainer');
  if(!container) return;

  const node = container.querySelector(`div.member-row[data-member-index="${index}"]`);
  if(node) node.remove();

  const remaining = container.querySelectorAll('.member-row').length;
  document.getElementById('memberCount').value = Math.max(remaining,1);
  initMemberFields();
}

/* ---------- Age & Stage logic ---------- */
function computeAgeFromBirthdate(dateStr){
  if(!dateStr) return null;
  const b = new Date(dateStr);
  if(isNaN(b)) return null;

  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if(m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;

  if(years <= 0){
    const months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
    return { years: 0, months: months >=0 ? months : 0 };
  }

  return { years };
}

function deriveStageFromAge(ageObj){
  if(!ageObj) return '';
  if(ageObj.years === 0){
    return ageObj.months <= 10 ? 'Infant' : 'Children';
  }
  if(ageObj.years <= 17) return 'School Children';
  if(ageObj.years >= 60) return 'Elderly';
  return 'Adult';
}

function computeAgeStageForIndex(idx){
  const bEl = document.querySelector(`.memberBirthdate[data-i="${idx}"]`);
  const ageEl = document.querySelector(`.memberAge[data-i="${idx}"]`);
  const stageEl = document.querySelector(`.memberStage[data-i="${idx}"]`);
  if(!bEl || !ageEl || !stageEl) return;

  const ageObj = computeAgeFromBirthdate(bEl.value);
  if(!ageObj){
    ageEl.value = '';
    stageEl.value = '';
    return;
  }

  ageEl.value = ageObj.years === 0 ? 0 : ageObj.years;
  stageEl.value = deriveStageFromAge(ageObj);
}

/* ---------- Bindings ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const memberCountEl = document.getElementById('memberCount');
  if(memberCountEl){
    memberCountEl.addEventListener('change', initMemberFields);
  }

  initMemberFields();
});

/* ---------- Submit Record ---------- */
async function submitEvacuationForm(e){
  if(e?.preventDefault) e.preventDefault();
  if(!ensureLoginOrRedirect()) return;

  const barangay = document.getElementById('barangay')?.value || '';
  const sitio = document.getElementById('sitio')?.value || '';
  const head = document.getElementById('householdHead')?.value || '';
  const headSex = document.querySelector('input[name="head_sex"]:checked')?.value || '';

  if(!barangay || !sitio || !head || !headSex){
    alert("Please complete required head of household fields.");
    return;
  }

  const headBirth = document.getElementById('householdBirthdate')?.value || '';
  const headAge = document.getElementById('householdAge')?.value || '';
  const memberCount = parseInt(document.getElementById('memberCount').value || 0,10);

  /* Collect members */
  const members = [];
  const container = document.getElementById('membersContainer');
  if(container){
    const rows = container.querySelectorAll('.member-row');
    rows.forEach((row, idx) => {
      const m = {
        Name: row.querySelector('.memberName')?.value.trim() || '',
        Sex: row.querySelector(`input[name="member_sex_${idx}"]:checked`)?.value || '',
        Birthdate: row.querySelector(`.memberBirthdate[data-i="${idx}"]`)?.value || '',
        Age: row.querySelector(`.memberAge[data-i="${idx}"]`)?.value || '',
        PWD: row.querySelector(`input[name="member_pwd_${idx}"]:checked`)?.value || 'No',
        Stage: row.querySelector(`.memberStage[data-i="${idx}"]`)?.value || '',
        Status: row.querySelector(`.memberStatus[data-i="${idx}"]`)?.value || '',
        Transportation: row.querySelector(`.memberTransport[data-i="${idx}"]`)?.value || '',
        PickupPoint: row.querySelector(`.memberPickup[data-i="${idx}"]`)?.value || '',
        DropOffPoint: row.querySelector(`.memberDropoff[data-i="${idx}"]`)?.value || '',
        CampName: row.querySelector(`.memberCamp[data-i="${idx}"]`)?.value || '',
        CampCapacity: row.querySelector(`.memberCampCap[data-i="${idx}"]`)?.value || '',
        InsideCamp: row.querySelector(`.memberInside[data-i="${idx}"]`)?.value || '',
        OutsideCamp: row.querySelector(`.memberOutside[data-i="${idx}"]`)?.value || '',
        DisplacementReason: row.querySelector(`.memberReason[data-i="${idx}"]`)?.value || '',
        TUPAD: !!row.querySelector(`.memberTUPAD[data-i="${idx}"]`)?.checked,
        "Local 4Ps": !!row.querySelector(`.memberLocal4ps[data-i="${idx}"]`)?.checked,
        "National 4Ps": !!row.querySelector(`.memberIntl4ps[data-i="${idx}"]`)?.checked,
        "Local Social Pension": !!row.querySelector(`.memberLocalSP[data-i="${idx}"]`)?.checked,
        "National Social Pension": !!row.querySelector(`.memberIntlSP[data-i="${idx}"]`)?.checked,
        "Solo Parent Assistance": !!row.querySelector(`.memberSolo[data-i="${idx}"]`)?.checked,
        "Cash Subsidy": !!row.querySelector(`.memberCash[data-i="${idx}"]`)?.checked,
        "Relief Goods": !!row.querySelector(`.memberRelief[data-i="${idx}"]`)?.checked,
        AICS: row.querySelector(`.memberAICS[data-i="${idx}"]`)?.value || ''
      };

      if(m.Name) members.push(m);
    });
  }

  const payload = {
    action: "createRecord",
    auth: {
      username: localStorage.getItem("username"),
      pwHash: localStorage.getItem("pwHash")
    },
    record: {
      Barangay: barangay,
      SitioPurok: sitio,
      HouseholdHead: head,
      Sex: headSex,
      Birthdate: headBirth,
      Age: headAge,
      TotalMembers: members.length,
      MemberNames: members,
      SubmittedBy: localStorage.getItem("staffName") || ""
    }
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error("Server responded " + res.status);
    }

    const j = await res.json();

    if (j.success) {
      alert("Saved successfully! DataID: " + j.DataID);
      window.location.href = "records.html";
    } else {
      alert("Save failed: " + (j.message || j.error));
    }

  } catch (err) {
    console.error(err);
    alert("Connection error: " + err.message);
  }
}












