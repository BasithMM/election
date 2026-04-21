// Google Sheets Webhook URL
const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxQpG3hXIk74zq7HKfZ3tMpqn76knF3O6UQc47Qs346u6QVW9qMSdY-WWKn8WynZkYZJA/exec";

// 5 POSITIONS WITH 2 CANDIDATES EACH
const POSITIONS = {
    president: { name: "President", candidates: [
        { id: "p1", name: "MUHAMMED JURAIJ", party: "Progressive Alliance", photo: "#", logo: "#" },
        { id: "p2", name: "MUHAMMED RIZWAN", party: "Unity Movement", photo: "#", logo: "#" }
    ]},
    vicepresident: { name: "Vice President", candidates: [
        { id: "vp1", name: "ABDUL BASITH MM", party: "Hope Coalition", photo: "#", logo: "#" },
        { id: "vp2", name: "AHMED YASIR MK", party: "Student Voice", photo: "#", logo: "#" }
    ]},
    secretary: { name: "Secretary", candidates: [
        { id: "s1", name: "SHAHAFAS IBI", party: "Students First", photo: "#", logo: "#" },
        { id: "s2", name: "MUHAMMED RASI A", party: "Campus Vision", photo: "#", logo: "#" }
    ]},
    joinsecretary: { name: "Joint Secretary", candidates: [
        { id: "js1", name: "HADI AMEEN P", party: "Empower Future", photo: "#", logo: "#" },
        { id: "js2", name: "JAZIB MOHAMMED K", party: "Integrity Bloc", photo: "#", logo: "#" }
    ]},
    treasurer: { name: "Treasurer", candidates: [
        { id: "t1", name: "HABEEBU RAHMAN E", party: "Economic Reform", photo: "#", logo: "#" },
        { id: "t2", name: "MUHAMMED NIHAL ON", party: "Transparency Front", photo: "#", logo: "#" }
    ]}
};

const TAB_ORDER = ["president", "vicepresident", "secretary", "joinsecretary", "treasurer"];

let voteRecords = []; // each record: admissionNo, voterName, presidentName, vicePresidentName, secretaryName, jointSecretaryName, treasurerName, timestamp
const STORAGE_KEY = "MultiPositionElectionData_V5";
let charts = {};

let currentVoter = null;
let selections = { president: null, vicepresident: null, secretary: null, joinsecretary: null, treasurer: null };
let currentTab = "president";

// Audio (optional)
const clickSound = new Audio();
const successSound = new Audio("succss.mp4");
clickSound.volume = 0.4;
successSound.volume = 0.6;
function playClickSound() { try { clickSound.currentTime = 0; clickSound.play().catch(()=>{}); } catch(e) {} }
function playSuccessAudio() { try { successSound.currentTime = 0; successSound.play().catch(()=>{}); } catch(e) {} }

// Excel Storage + Google Sheets sync
function saveToLocalExcel() {
    const sheetData = voteRecords.map(v => ({ 
        AdmissionNumber: v.admissionNo, 
        VoterName: v.voterName, 
        PresidentVote: v.presidentName || "", 
        VicePresidentVote: v.vicePresidentName || "",
        SecretaryVote: v.secretaryName || "", 
        JointSecretaryVote: v.jointSecretaryName || "",
        TreasurerVote: v.treasurerName || "", 
        Timestamp: v.timestamp 
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MultiPositionVotes");
    localStorage.setItem(STORAGE_KEY, XLSX.write(wb, { type: 'base64' }));
}

async function loadFromStorage() {
    try {
        const response = await fetch(`${GOOGLE_SHEETS_WEBHOOK_URL}?action=getResults&_=${Date.now()}`);
        const data = await response.json();
        if (data && data.success && data.votes) {
            voteRecords = data.votes.map(r => ({
                admissionNo: r["Admission Number"],
                voterName: r["Voter Name"],
                presidentName: r["President Vote"],
                vicePresidentName: r["Vice President Vote"],
                secretaryName: r["Secretary Vote"],
                jointSecretaryName: r["Joint Secretary Vote"],
                treasurerName: r["Treasurer Vote"],
                timestamp: r["Timestamp"]
            }));
            saveToLocalExcel();
            return;
        }
    } catch (error) { console.warn("Google Sheets fallback", error); }
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored) {
        try {
            const wb = XLSX.read(atob(stored), { type: 'binary' });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            voteRecords = rows.map(r => ({
                admissionNo: r.AdmissionNumber, voterName: r.VoterName,
                presidentName: r.PresidentVote, vicePresidentName: r.VicePresidentVote,
                secretaryName: r.SecretaryVote, jointSecretaryName: r.JointSecretaryVote,
                treasurerName: r.TreasurerVote, timestamp: r.Timestamp
            }));
        } catch(e) {}
    } else voteRecords = [];
}

function hasVoted(admission) { return voteRecords.some(v => v.admissionNo === admission); }

async function sendToGoogleSheets(voteData) {
    try {
        const formData = new URLSearchParams();
        for (const key in voteData) if (voteData[key]) formData.append(key, voteData[key]);
        await fetch(GOOGLE_SHEETS_WEBHOOK_URL, { method: "POST", mode: "no-cors", body: formData });
    } catch(e) { console.error(e); }
}

async function submitFinalVote() {
    if(!selections.president || !selections.vicepresident || !selections.secretary || !selections.joinsecretary || !selections.treasurer) 
        return { success: false, message: "Please select a candidate for ALL five positions!" };
    if(hasVoted(currentVoter.admission)) return { success: false, message: "Already voted!" };
    
    const voteData = {
        admissionNo: currentVoter.admission,
        voterName: currentVoter.name,
        presidentName: selections.president.name,
        vicePresidentName: selections.vicepresident.name,
        secretaryName: selections.secretary.name,
        jointSecretaryName: selections.joinsecretary.name,
        treasurerName: selections.treasurer.name,
        timestamp: new Date().toLocaleString()
    };
    voteRecords.push(voteData);
    saveToLocalExcel();
    sendToGoogleSheets(voteData);
    return { success: true };
}

function renderCandidates() {
    const container = document.getElementById("candidatesContainer");
    const position = POSITIONS[currentTab];
    if(!position) return;
    container.innerHTML = "";
    position.candidates.forEach(cand => {
        const isSelected = selections[currentTab] && selections[currentTab].id === cand.id;
        const card = document.createElement("div");
        card.className = `candidate-card ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `
            <img class="candidate-photo" src="${cand.photo}" onerror="this.src='https://randomuser.me/api/portraits/lego/1.jpg'">
            <img class="party-logo" src="${cand.logo}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135715.png'">
            <div class="candidate-name">${cand.name}</div>
            <div style="color:#2c7da0; font-size:0.8rem;">${cand.party}</div>
            <button class="btn-secondary" style="margin-top:12px; padding:8px 20px;">${isSelected ? '✓ Selected' : 'Select'}</button>
        `;
        card.addEventListener("click", () => {
            selections[currentTab] = cand;
            renderCandidates();
            playClickSound();
            // Auto move to next tab if not last
            const idx = TAB_ORDER.indexOf(currentTab);
            if(idx < TAB_ORDER.length - 1) {
                setTimeout(() => goToTab(TAB_ORDER[idx+1]), 280);
            }
        });
        container.appendChild(card);
    });
    const nextBtn = document.getElementById("nextTabBtn");
    nextBtn.textContent = (currentTab === TAB_ORDER[TAB_ORDER.length-1]) ? "Submit All Votes ✓" : "Next →";
}

function goToTab(tab) {
    if(!POSITIONS[tab]) return;
    currentTab = tab;
    document.querySelectorAll(".pos-tab").forEach(btn => {
        btn.classList.remove("active");
        if(btn.dataset.pos === tab) btn.classList.add("active");
    });
    renderCandidates();
    const prevBtn = document.getElementById("prevTabBtn");
    prevBtn.disabled = (TAB_ORDER.indexOf(tab) === 0);
    playClickSound();
}

async function handleNext() {
    if(!selections[currentTab]) {
        document.getElementById("voteFeedback").innerHTML = `<div class="info-message" style="background:#ffe0db;">⚠️ Please select a candidate for ${POSITIONS[currentTab].name}!</div>`;
        playClickSound();
        return;
    }
    const idx = TAB_ORDER.indexOf(currentTab);
    if(idx === TAB_ORDER.length-1) {
        const result = await submitFinalVote();
        if(result.success) {
            playSuccessAudio();
            const popup = document.getElementById("successPopup");
            const timerDiv = document.getElementById("popupTimer");
            popup.classList.add("active");
            let sec = 3;
            timerDiv.textContent = `Redirecting in ${sec} seconds...`;
            const interval = setInterval(() => { sec--; timerDiv.textContent = `Redirecting in ${sec} seconds...`; if(sec<0){ clearInterval(interval); popup.classList.remove("active"); window.location.reload(); } }, 1000);
        } else {
            document.getElementById("voteFeedback").innerHTML = `<div class="info-message" style="background:#ffe0db;">${result.message}</div>`;
            playClickSound();
        }
    } else {
        goToTab(TAB_ORDER[idx+1]);
        document.getElementById("voteFeedback").innerHTML = "";
    }
}

function goPrev() {
    const idx = TAB_ORDER.indexOf(currentTab);
    if(idx > 0) goToTab(TAB_ORDER[idx-1]);
    document.getElementById("voteFeedback").innerHTML = "";
}

function authenticateVoter() {
    const name = document.getElementById("voterName").value.trim();
    const admission = document.getElementById("admissionNo").value.trim();
    const errDiv = document.getElementById("authError");
    if(!name || !admission) { errDiv.style.display="block"; errDiv.innerHTML="Please fill all fields"; playClickSound(); return; }
    if(hasVoted(admission)) { errDiv.style.display="block"; errDiv.innerHTML="❌ Admission number already voted!"; playClickSound(); return; }
    errDiv.style.display="none";
    currentVoter = { name, admission };
    selections = { president: null, vicepresident: null, secretary: null, joinsecretary: null, treasurer: null };
    currentTab = "president";
    document.getElementById("voterAuthArea").style.display = "none";
    document.getElementById("votingPanelArea").style.display = "block";
    document.getElementById("voterWelcomeMsg").innerHTML = `<i class="fas fa-user-check"></i> Welcome ${name} (${admission}) — Please select candidate for each position (auto-advance).`;
    goToTab("president");
}

function resetAuth() {
    document.getElementById("voterAuthArea").style.display="block";
    document.getElementById("votingPanelArea").style.display="none";
    currentVoter=null;
    document.getElementById("voterName").value="";
    document.getElementById("admissionNo").value="";
    document.getElementById("authError").style.display="none";
    document.getElementById("voteFeedback").innerHTML="";
}

// ---------- DASHBOARD STATS & CHARTS (5 positions) ----------
function getCountsByPosition() {
    let pres={}, vp={}, sec={}, js={}, treas={};
    POSITIONS.president.candidates.forEach(c => pres[c.name]=0);
    POSITIONS.vicepresident.candidates.forEach(c => vp[c.name]=0);
    POSITIONS.secretary.candidates.forEach(c => sec[c.name]=0);
    POSITIONS.joinsecretary.candidates.forEach(c => js[c.name]=0);
    POSITIONS.treasurer.candidates.forEach(c => treas[c.name]=0);
    voteRecords.forEach(v => {
        if(v.presidentName) pres[v.presidentName] = (pres[v.presidentName]||0)+1;
        if(v.vicePresidentName) vp[v.vicePresidentName] = (vp[v.vicePresidentName]||0)+1;
        if(v.secretaryName) sec[v.secretaryName] = (sec[v.secretaryName]||0)+1;
        if(v.jointSecretaryName) js[v.jointSecretaryName] = (js[v.jointSecretaryName]||0)+1;
        if(v.treasurerName) treas[v.treasurerName] = (treas[v.treasurerName]||0)+1;
    });
    return { pres, vp, sec, js, treas };
}

function updateAllCharts() {
    const counts = getCountsByPosition();
    if(charts.president) charts.president.destroy();
    if(charts.vicepresident) charts.vicepresident.destroy();
    if(charts.secretary) charts.secretary.destroy();
    if(charts.joinsecretary) charts.joinsecretary.destroy();
    if(charts.treasurer) charts.treasurer.destroy();
    
    charts.president = new Chart(document.getElementById("presidentChart"), { type: 'bar', data: { labels: Object.keys(counts.pres), datasets: [{ label: 'Votes', data: Object.values(counts.pres), backgroundColor: '#1f6e43', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: true } });
    charts.vicepresident = new Chart(document.getElementById("vicepresidentChart"), { type: 'bar', data: { labels: Object.keys(counts.vp), datasets: [{ label: 'Votes', data: Object.values(counts.vp), backgroundColor: '#2c7da0', borderRadius: 8 }] }, options: { responsive: true } });
    charts.secretary = new Chart(document.getElementById("secretaryChart"), { type: 'bar', data: { labels: Object.keys(counts.sec), datasets: [{ label: 'Votes', data: Object.values(counts.sec), backgroundColor: '#e67e22', borderRadius: 8 }] }, options: { responsive: true } });
    charts.joinsecretary = new Chart(document.getElementById("joinsecretaryChart"), { type: 'bar', data: { labels: Object.keys(counts.js), datasets: [{ label: 'Votes', data: Object.values(counts.js), backgroundColor: '#8e44ad', borderRadius: 8 }] }, options: { responsive: true } });
    charts.treasurer = new Chart(document.getElementById("treasurerChart"), { type: 'bar', data: { labels: Object.keys(counts.treas), datasets: [{ label: 'Votes', data: Object.values(counts.treas), backgroundColor: '#d35400', borderRadius: 8 }] }, options: { responsive: true } });
}

function renderDashboard() {
    const counts = getCountsByPosition();
    const totalVotes = voteRecords.length;
    const uniqueVoters = new Set(voteRecords.map(v=>v.admissionNo)).size;
    const presLeader = Object.entries(counts.pres).sort((a,b)=>b[1]-a[1])[0];
    const vpLeader = Object.entries(counts.vp).sort((a,b)=>b[1]-a[1])[0];
    const secLeader = Object.entries(counts.sec).sort((a,b)=>b[1]-a[1])[0];
    const jsLeader = Object.entries(counts.js).sort((a,b)=>b[1]-a[1])[0];
    const treasLeader = Object.entries(counts.treas).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById("dashStats").innerHTML = `<div class="stats-grid">
        <div class="stat-card"><div class="stat-number">${totalVotes}</div><div>Total Votes</div></div>
        <div class="stat-card"><div class="stat-number">${uniqueVoters}</div><div>Unique Voters</div></div>
        <div class="stat-card"><div class="stat-number">${presLeader?.[0]||'—'}</div><div>President Leader</div></div>
        <div class="stat-card"><div class="stat-number">${vpLeader?.[0]||'—'}</div><div>Vice President Leader</div></div>
        <div class="stat-card"><div class="stat-number">${secLeader?.[0]||'—'}</div><div>Secretary Leader</div></div>
        <div class="stat-card"><div class="stat-number">${jsLeader?.[0]||'—'}</div><div>Joint Secretary Leader</div></div>
        <div class="stat-card"><div class="stat-number">${treasLeader?.[0]||'—'}</div><div>Treasurer Leader</div></div>
    </div>`;
    
    let tableHtml = `<table class="result-table"><thead><tr><th>Position</th><th>Candidate</th><th>Party</th><th>Votes</th></tr></thead><tbody>`;
    const positionKeys = ['president','vicepresident','secretary','joinsecretary','treasurer'];
    positionKeys.forEach(posKey => {
        const countMap = counts[posKey === 'president' ? 'pres' : (posKey === 'vicepresident' ? 'vp' : (posKey === 'secretary' ? 'sec' : (posKey === 'joinsecretary' ? 'js' : 'treas')))];
        POSITIONS[posKey].candidates.forEach(c => {
            tableHtml += `<tr><td>${POSITIONS[posKey].name}</td><td>${c.name}</td><td>${c.party}</td><td><span class="vote-badge">${countMap[c.name]||0}</span></td></tr>`;
        });
    });
    tableHtml += `</tbody></table>`;
    document.getElementById("dashResultsTable").innerHTML = tableHtml;
    updateAllCharts();
}

async function downloadVoterExcel() {
    playClickSound();
    const btn = document.getElementById("downloadVoterExcelBtn");
    const original = btn.innerText;
    btn.innerText = "Fetching...";
    btn.disabled = true;
    try {
        const response = await fetch(`${GOOGLE_SHEETS_WEBHOOK_URL}?action=getResults&_=${Date.now()}`);
        const data = await response.json();
        if(data && data.success && data.votes) {
            const ws = XLSX.utils.json_to_sheet(data.votes);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "FullVoterList");
            XLSX.writeFile(wb, `AlHidaya_Election_Results_${new Date().toISOString().slice(0,19)}.xlsx`);
        } else alert("Could not retrieve data");
    } catch(e) { alert("Download error"); } finally { btn.innerText = original; btn.disabled = false; }
}

function refreshData() { loadFromStorage().then(()=>{ renderDashboard(); alert("Dashboard data refreshed from storage"); }); }

// Dashboard modal logic
const modalOverlay = document.getElementById("dashboardModal");
const dashboardPanel = document.getElementById("dashboardPanel");
function openDashboardLogin() { modalOverlay.classList.add("active"); playClickSound(); }
function closeLoginModal() { modalOverlay.classList.remove("active"); }
function closeDashboardPanel() { dashboardPanel.classList.remove("active"); }
function validateDashboardLogin() {
    const user = document.getElementById("adminUsername").value, pass = document.getElementById("adminPassword").value;
    if(user === "alhidaya" && pass === "hudaelection") {
        modalOverlay.classList.remove("active");
        loadFromStorage().then(()=>{ renderDashboard(); dashboardPanel.classList.add("active"); playClickSound(); });
    } else { document.getElementById("dashboardLoginError").innerText = "Invalid credentials!"; playClickSound(); }
}

// Event binding
document.getElementById("openDashboardBtn").addEventListener("click", openDashboardLogin);
document.getElementById("submitDashboardLogin").addEventListener("click", validateDashboardLogin);
document.getElementById("closeModalBtn").addEventListener("click", closeLoginModal);
document.getElementById("closeDashboardPanelBtn").addEventListener("click", closeDashboardPanel);
document.getElementById("refreshExcelBtn").addEventListener("click", refreshData);
document.getElementById("downloadVoterExcelBtn").addEventListener("click", downloadVoterExcel);
document.getElementById("authenticateBtn").addEventListener("click", authenticateVoter);
document.getElementById("resetVoteBtn").addEventListener("click", resetAuth);
document.getElementById("nextTabBtn").addEventListener("click", handleNext);
document.getElementById("prevTabBtn").addEventListener("click", goPrev);
document.querySelectorAll(".pos-tab").forEach(btn => { btn.addEventListener("click", (e) => { goToTab(btn.dataset.pos); }); });

window.addEventListener("DOMContentLoaded", async () => { await loadFromStorage(); resetAuth(); });