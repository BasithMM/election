// Google Sheets Webhook URL
const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxQpG3hXIk74zq7HKfZ3tMpqn76knF3O6UQc47Qs346u6QVW9qMSdY-WWKn8WynZkYZJA/exec";

// 5 POSITIONS WITH 2 CANDIDATES EACH
const POSITIONS = {
    president: { name: "President", candidates: [
        { id: "p1", name: "MUHAMMED JURAIJ", party: "Progressive Alliance", photo: "#", logo: "#" },
        { id: "p2", name: "MUHAMMED RIZWAN", party: "Unity Movement", photo: "#", logo: "#" }
    ]},
    vicepresident: { name: "Vice President", candidates: [
        { id: "vp1", name: "ABDUL BASITH MM", party: "Hope Coalition", photo: "#", logo: "https://i.pinimg.com/1200x/ce/c5/a9/cec5a9feb3acb5c9ebb1c2154f4bd6a1.jpg" },
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

let voteRecords = [];
const STORAGE_KEY = "MultiPositionElectionData_V5";
let charts = {};
let currentVoter = null;
let selections = { president: null, vicepresident: null, secretary: null, joinsecretary: null, treasurer: null };
let currentTab = "president";
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 3;
let loginLockoutTime = null;

// Audio
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
    
    // Enhanced validation
    if(!name || !admission) { 
        errDiv.style.display="block"; 
        errDiv.innerHTML="❌ Please fill both Name and Admission Number fields"; 
        playClickSound(); 
        return; 
    }
    
    if(name.length < 2) {
        errDiv.style.display="block"; 
        errDiv.innerHTML="❌ Please enter a valid name (minimum 2 characters)"; 
        playClickSound(); 
        return;
    }
    
    if(!/^[0-9]+$/.test(admission)) {
        errDiv.style.display="block"; 
        errDiv.innerHTML="❌ Admission Number must contain only numbers"; 
        playClickSound(); 
        return;
    }
    
    if(hasVoted(admission)) { 
        errDiv.style.display="block"; 
        errDiv.innerHTML="❌ This Admission Number has already voted!"; 
        playClickSound(); 
        return; 
    }
    
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

// DASHBOARD STATS & CHARTS
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
    } catch(e) { alert("Download error: " + e.message); } finally { btn.innerText = original; btn.disabled = false; }
}

function refreshData() { 
    loadFromStorage().then(()=>{ 
        renderDashboard(); 
        showTemporaryMessage("Dashboard data refreshed successfully!", "success");
    }).catch(() => {
        showTemporaryMessage("Error refreshing data", "error");
    }); 
}

// Dashboard login with enhanced validation
function openDashboardLogin() { 
    // Reset login attempts and form when opening
    loginAttempts = 0;
    document.getElementById("adminUsername").value = "";
    document.getElementById("adminPassword").value = "";
    document.getElementById("dashboardLoginError").innerHTML = "";
    document.getElementById("adminUsername").disabled = false;
    document.getElementById("adminPassword").disabled = false;
    document.getElementById("submitDashboardLogin").disabled = false;
    modalOverlay.classList.add("active"); 
    playClickSound(); 
}

function closeLoginModal() { 
    modalOverlay.classList.remove("active");
    document.getElementById("dashboardLoginError").innerHTML = "";
}

function closeDashboardPanel() { 
    dashboardPanel.classList.remove("active"); 
}

function showTemporaryMessage(message, type = "info") {
    const msgDiv = document.createElement("div");
    msgDiv.className = `temporary-message ${type}`;
    msgDiv.innerHTML = message;
    msgDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === "success" ? "#4CAF50" : (type === "error" ? "#f44336" : "#2196F3")};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(msgDiv);
    setTimeout(() => {
        msgDiv.style.animation = "slideOut 0.3s ease-out";
        setTimeout(() => msgDiv.remove(), 300);
    }, 3000);
}

function validateDashboardLogin() {
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;
    const errorDiv = document.getElementById("dashboardLoginError");
    
    // Check lockout
    if(loginLockoutTime && Date.now() < loginLockoutTime) {
        const remainingMinutes = Math.ceil((loginLockoutTime - Date.now()) / 60000);
        errorDiv.innerHTML = `Too many failed attempts. Please try again in ${remainingMinutes} minute(s).`;
        playClickSound();
        return;
    } else if(loginLockoutTime && Date.now() >= loginLockoutTime) {
        loginLockoutTime = null;
        loginAttempts = 0;
    }
    
    // Input validation
    if(!username || !password) {
        errorDiv.innerHTML = "❌ Please enter both username and password";
        playClickSound();
        return;
    }
    
    if(username.length < 3) {
        errorDiv.innerHTML = "❌ Invalid username format";
        playClickSound();
        return;
    }
    
    // Rate limiting check
    if(loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        loginLockoutTime = Date.now() + (5 * 60 * 1000); // 5 minute lockout
        errorDiv.innerHTML = `Too many failed attempts! Please wait 5 minutes before trying again.`;
        document.getElementById("adminUsername").disabled = true;
        document.getElementById("adminPassword").disabled = true;
        document.getElementById("submitDashboardLogin").disabled = true;
        setTimeout(() => {
            document.getElementById("adminUsername").disabled = false;
            document.getElementById("adminPassword").disabled = false;
            document.getElementById("submitDashboardLogin").disabled = false;
            errorDiv.innerHTML = "";
        }, 300000);
        playClickSound();
        return;
    }
    
    // Credential validation
    if(username === "alhidaya" && password === "hudaelection") {
        errorDiv.innerHTML = "";
        loginAttempts = 0;
        modalOverlay.classList.remove("active");
        loadFromStorage().then(() => {
            renderDashboard(); 
            dashboardPanel.classList.add("active"); 
            playClickSound();
            showTemporaryMessage("Login successful! Welcome to the Dashboard.", "success");
        }).catch(() => {
            showTemporaryMessage("Error loading data", "error");
        });
    } else {
        loginAttempts++;
        const remainingAttempts = MAX_LOGIN_ATTEMPTS - loginAttempts;
        errorDiv.innerHTML = `❌ Invalid credentials! ${remainingAttempts} attempt(s) remaining.`;
        playClickSound();
        
        // Clear password field for security
        document.getElementById("adminPassword").value = "";
        
        // Focus back on password field
        document.getElementById("adminPassword").focus();
    }
}

// Add Enter key support for login
function setupLoginEnterKey() {
    const passwordInput = document.getElementById("adminPassword");
    if(passwordInput) {
        passwordInput.addEventListener("keypress", function(event) {
            if(event.key === "Enter") {
                event.preventDefault();
                validateDashboardLogin();
            }
        });
    }
    
    const usernameInput = document.getElementById("adminUsername");
    if(usernameInput) {
        usernameInput.addEventListener("keypress", function(event) {
            if(event.key === "Enter") {
                event.preventDefault();
                document.getElementById("adminPassword").focus();
            }
        });
    }
}

// Add CSS animations for temporary messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .temporary-message {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        font-weight: 500;
    }
`;
document.head.appendChild(style);

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

window.addEventListener("DOMContentLoaded", async () => { 
    await loadFromStorage(); 
    resetAuth();
    setupLoginEnterKey();
});