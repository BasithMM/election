
// const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxdQyx2wFGyxQ4wuHzKp3_lh80h0ZczEoLGtc1MSCi5OsRMEABjHySqJ9ZtHoPFgNfs-g/exec";
const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbw_1WvYJajRusDd9nB5w-dGiw3OGpdKo_wwZBxLg_lgA_Akr9jJQcu6Q7CBrQtKG1yrQw/exec";
// POSITIONS & CANDIDATES

    const POSITIONS = {
        president: { name: "President", candidates: [
            { id: "p1", name: "MUHAMMED JURAIJ", party: "Progressive Alliance", photo: "#", logo: "#" },
            { id: "p2", name: "MUHAMMED RIZWAN", party: "Unity Movement", photo: "#", logo: "#" }
        ]},
        vicepresident: { name: "vice President", candidates: [
            { id: "p1", name: "ABDUL BASITH MM", party: "Progressive Alliance", photo: "#", logo: "#" },
            { id: "p2", name: "AHMED YASIR MK", party: "Unity Movement", photo: "#", logo: "#" }
        ]},
        secretary: { name: "Secretary", candidates: [
            { id: "s1", name: "SHAHAFAS IBI", party: "Students First", photo: "#", logo: "#" },
            { id: "s2", name: "MUHAMMED RASI A", party: "Campus Vision", photo: "#", logo: "#" }
        ]},
        joinsecretary: { name: "Join Secretary", candidates: [
            { id: "s1", name: "HADI AMEEN P", party: "Students First", photo: "#", logo: "#" },
            { id: "s2", name: "JAZIB MOHAMMED K", party: "Campus Vision", photo: "#", logo: "#" }
        ]},
        treasurer: { name: "Treasurer", candidates: [
            { id: "t1", name: "HABEEBU RAHMAN E", party: "Economic Reform", photo: "#", logo: "#" },
            { id: "t2", name: "MUHAMMED NIHAL ON", party: "Transparency Front", photo: "#", logo: "#" }
        ]}
    };

    let voteRecords = []; // each: { admissionNo,voter name, presidentId, presidentName, vicepresidentId, vicepresidentName, secretaryId, secretaryName, joinSecretaryId, joinSecretaryName, treasurerId, treasurerName, timestamp }
    const STORAGE_KEY = "MultiPositionElectionData";
    let charts = {};

    // Current voting session
    let currentVoter = null;
    let selections = { president: null, vicepresident: null, secretary: null, joinSecretary: null, treasurer: null };
    let currentTab = "president";
    const tabOrder = ["president","vice president", "secretary","join Secretary", "treasurer"];

   // Audio (MP3 version)
const clickSound = new Audio();
const successSound = new Audio("succss.mp4");

// Optional settings
clickSound.volume = 0.5;
successSound.volume = 0.7;

function playClickSound() {
    try {
        clickSound.currentTime = 0; // restart sound
        clickSound.play().catch(() => {});
    } catch (e) {}
}

function playSuccessAudio() {
    try {
        successSound.currentTime = 0;
        successSound.play().catch(() => {});
    } catch (e) {}
}

    // Excel Storage
    function saveToExcel() {
        const sheetData = voteRecords.map(v => ({ AdmissionNumber: v.admissionNo, VoterName: v.voterName, PresidentVote: v.presidentName, vicePresidentvote: v.vicePresidentName, SecretaryVote: v.secretaryName, joinSecretaryvote: v.joinSecretaryName, TreasurerVote: v.treasurerName, Timestamp: v.timestamp }));
        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "MultiPositionVotes");
        localStorage.setItem(STORAGE_KEY, XLSX.write(wb, { type: 'base64' }));
    }
    async function loadFromStorage() {
        try {
            // First attempt to grab live data across all devices from Google Sheets
            const response = await fetch(`${GOOGLE_SHEETS_WEBHOOK_URL}?action=getResults`);
            const data = await response.json();
            
            if (data && data.success && data.votes) {
                voteRecords = data.votes.map(r => ({
                    admissionNo: r["Admission Number"],
                    voterName: r["Voter Name"],
                    presidentName: r["President Vote"],
                    vicepresidentName: r["vice President Vote"],
                    secretaryName: r["Secretary Vote"],
                    joinsecretaryName: r["join Secretary Vote"],
                    treasurerName: r["Treasurer Vote"],
                    timestamp: r["Timestamp"]
                }));
                // Update local storage backup
                saveToExcel();
                return; // successfully loaded from network
            }
        } catch (error) {
            console.warn("Failed to load from Google Sheets, using LocalStorage fallback", error);
        }
        
        // Offline Fallback
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored) { try { const wb = XLSX.read(atob(stored), { type: 'binary' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); voteRecords = rows.map(r => ({ admissionNo: r.AdmissionNumber, voterName: r.VoterName, presidentName: r.PresidentVote, vicepresidentName: r.vicePresidentVote, secretaryName: r.SecretaryVote, joinsecretaryName: r.joinSecretaryVote, treasurerName: r.TreasurerVote, timestamp: r.Timestamp })); } catch(e){} }
        else voteRecords = [];
    }

    function hasVoted(admission) { return voteRecords.some(v => v.admissionNo === admission); }

    async function submitFinalVote() {
    if(!selections.president || !selections.secretary || !selections.treasurer) return false;

    if(hasVoted(currentVoter.admission)) 
        return { success: false, message: "Already voted!" };

    const voteData = {
        admissionNo: currentVoter.admission,
        voterName: currentVoter.name,
        presidentName: selections.president.name,
        vicepresidentName: selections.vicepresident.name,
        secretaryName: selections.secretary.name,
        joinsecretaryName: selections.joinsecretary.name,
        treasurerName: selections.treasurer.name,
        timestamp: new Date().toLocaleString()
    };

    voteRecords.push(voteData);

    saveToExcel();

    // 🔥 SEND TO GOOGLE SHEETS
    sendToGoogleSheets(voteData);

    return { success: true };
}
    async function sendToGoogleSheets(voteData) {
        try {
            // Send as URLSearchParams (application/x-www-form-urlencoded)
            // This guarantees that GAS e.parameter automatically parses the payload.
            const formData = new URLSearchParams();
            for (const key in voteData) {
                if (voteData[key]) formData.append(key, voteData[key]);
            }

            await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
                method: "POST",
                mode: "no-cors",
                body: formData
            });

            console.log("Sent to Google Sheets");
        } catch (error) {
            console.error("Google Sheets Error:", error);
        }
    }

    // Render candidates for current tab
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
                <div style="color:#2c7da0;">${cand.party}</div>
                <button class="btn-secondary" style="margin-top:12px; padding:8px 20px;">${isSelected ? 'Selected' : 'Select'}</button>
            `;
            card.addEventListener("click", () => {
                selections[currentTab] = cand;
                renderCandidates();
                playClickSound();
                // Auto move to next tab after selection if not last
                const currentIdx = tabOrder.indexOf(currentTab);
                if(currentIdx < tabOrder.length-1) {
                    setTimeout(() => goToTab(tabOrder[currentIdx+1]), 300);
                }
            });
            container.appendChild(card);
        });
        // Update next button text
        const nextBtn = document.getElementById("nextTabBtn");
        if(currentTab === tabOrder[tabOrder.length-1]) nextBtn.textContent = "Submit All Votes ✓";
        else nextBtn.textContent = "Next →";
    }

    function goToTab(tab) {
        currentTab = tab;
        document.querySelectorAll(".pos-tab").forEach(btn => { btn.classList.remove("active"); if(btn.dataset.pos === tab) btn.classList.add("active"); });
        renderCandidates();
        const prevBtn = document.getElementById("prevTabBtn");
        const nextBtn = document.getElementById("nextTabBtn");
        prevBtn.disabled = (tabOrder.indexOf(tab) === 0);
        // Update next button text
        if(tab === tabOrder[tabOrder.length-1]) nextBtn.textContent = "Submit All Votes ✓";
        else nextBtn.textContent = "Next →";
        playClickSound();
    }

    async function handleNext() {
        if(!selections[currentTab]) { document.getElementById("voteFeedback").innerHTML = `<div class="info-message" style="background:#ffe0db;">Please select a candidate for ${POSITIONS[currentTab].name} position!</div>`; playClickSound(); return; }
        const currentIdx = tabOrder.indexOf(currentTab);
        if(currentIdx === tabOrder.length-1) {
            // Submit final vote
            const result = await submitFinalVote();
            if(result.success) {
                playSuccessAudio();
                const popup = document.getElementById("successPopup");
                const timerDiv = document.getElementById("popupTimer");
                popup.classList.add("active");
                let sec=3;
                timerDiv.textContent = `Redirecting in ${sec} seconds...`;
                const interval = setInterval(() => { sec--; timerDiv.textContent = `Redirecting in ${sec} seconds...`; if(sec<0){ clearInterval(interval); popup.classList.remove("active"); window.location.reload(); } }, 1000);
            } else {
                document.getElementById("voteFeedback").innerHTML = `<div class="info-message" style="background:#ffe0db;">${result.message}</div>`;
                playClickSound();
            }
        } else {
            goToTab(tabOrder[currentIdx+1]);
            document.getElementById("voteFeedback").innerHTML = "";
        }
    }

    function goPrev() { const idx = tabOrder.indexOf(currentTab); if(idx>0) goToTab(tabOrder[idx-1]); document.getElementById("voteFeedback").innerHTML = ""; }

    function authenticateVoter() {
        const name = document.getElementById("voterName").value.trim();
        const admission = document.getElementById("admissionNo").value.trim();
        const errDiv = document.getElementById("authError");
        if(!name || !admission) { errDiv.style.display="block"; errDiv.innerHTML="Please fill all fields"; playClickSound(); return; }
        if(hasVoted(admission)) { errDiv.style.display="block"; errDiv.innerHTML="Already voted!"; playClickSound(); return; }
        errDiv.style.display="none";
        currentVoter = { name, admission };
        selections = { president: null, vicePresident: null, secretary: null,JoinSecretary: null, treasurer: null };
        currentTab = "president";
        document.getElementById("voterAuthArea").style.display = "none";
        document.getElementById("votingPanelArea").style.display = "block";
        document.getElementById("voterWelcomeMsg").innerHTML = `<i class="fas fa-user-check"></i> Welcome ${name} (${admission}) — Select one candidate per position.`;
        goToTab("president");
    }

    function resetAuth() { document.getElementById("voterAuthArea").style.display="block"; document.getElementById("votingPanelArea").style.display="none"; currentVoter=null; document.getElementById("voterName").value=""; document.getElementById("admissionNo").value=""; document.getElementById("authError").style.display="none"; document.getElementById("voteFeedback").innerHTML=""; }

    // Dashboard & Charts
    function getCountsByPosition() {
        let pres = {}, sec = {}, treas = {};
        POSITIONS.president.candidates.forEach(c => pres[c.name]=0);
        POSITIONS.vicepresident.candidates.forEach(c => pres[c.name]=0);
        POSITIONS.secretary.candidates.forEach(c => sec[c.name]=0);
        POSITIONS.joinsecretary.candidates.forEach(c => sec[c.name]=0);
        POSITIONS.treasurer.candidates.forEach(c => treas[c.name]=0);
        voteRecords.forEach(v => { if(v.presidentName) pres[v.presidentName] = (pres[v.presidentName]||0)+1; if(v.vicepresidentName) pres[v.vicepresidentName] = (pres[v.vicepresidentName]||0)+1; if(v.secretaryName) sec[v.secretaryName] = (sec[v.secretaryName]||0)+1; if(v.joinsecretaryName) sec[v.joinsecretaryName] = (sec[v.joinsecretaryName]||0)+1; if(v.treasurerName) treas[v.treasurerName] = (treas[v.treasurerName]||0)+1; });
        return { pres, vicepres, sec, joinsec, treas };
    }

    function updateCharts() {
        const counts = getCountsByPosition();
        if(charts.president) charts.president.destroy();
        if(charts.vicepresident) charts.vicepresident.destroy();
        if(charts.secretary) charts.secretary.destroy();
        if(charts.joinsecretary) charts.joinsecretary.destroy();
        if(charts.treasurer) charts.treasurer.destroy();
        charts.president = new Chart(document.getElementById("presidentChart"), { type: 'bar', data: { labels: Object.keys(counts.pres), datasets: [{ label: 'Votes', data: Object.values(counts.pres), backgroundColor: '#1f6e43', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: true } });
        charts.vicepresident = new Chart(document.getElementById("vice presidentChart"), { type: 'bar', data: { labels: Object.keys(counts.vicepres), datasets: [{ label: 'Votes', data: Object.values(counts.vicepres), backgroundColor: '#6e1f1f', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: true } });
        charts.secretary = new Chart(document.getElementById("secretaryChart"), { type: 'bar', data: { labels: Object.keys(counts.sec), datasets: [{ label: 'Votes', data: Object.values(counts.sec), backgroundColor: '#2c7da0', borderRadius: 8 }] }, options: { responsive: true } });
        charts.joinsecretary = new Chart(document.getElementById("join secretaryChart"), { type: 'bar', data: { labels: Object.keys(counts.joinsec), datasets: [{ label: 'Votes', data: Object.values(counts.joinsec), backgroundColor: '#582ca0', borderRadius: 8 }] }, options: { responsive: true } });
        charts.treasurer = new Chart(document.getElementById("treasurerChart"), { type: 'bar', data: { labels: Object.keys(counts.treas), datasets: [{ label: 'Votes', data: Object.values(counts.treas), backgroundColor: '#e67e22', borderRadius: 8 }] }, options: { responsive: true } });
    }

    function renderDashboard() {
        const counts = getCountsByPosition();
        const totalVoters = voteRecords.length;
        const totalUnique = new Set(voteRecords.map(v=>v.admissionNo)).size;
        let presWinner = Object.entries(counts.pres).sort((a,b)=>b[1]-a[1])[0];
        let vicepresWinner = Object.entries(counts.vicepres).sort((a,b)=>b[1]-a[1])[0];
        let secWinner = Object.entries(counts.sec).sort((a,b)=>b[1]-a[1])[0];
        let joinsecWinner = Object.entries(counts.joinsec).sort((a,b)=>b[1]-a[1])[0];
        let treasWinner = Object.entries(counts.treas).sort((a,b)=>b[1]-a[1])[0];
        document.getElementById("dashStats").innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-number">${totalVoters}</div><div>Total Votes Cast</div></div><div class="stat-card"><div class="stat-number">${totalUnique}</div><div>Unique Voters</div></div>
                                                          <div class="stat-card"><div class="stat-number">${presWinner?.[0]||'—'}</div><div>President Leader</div></div>
                                                          <div class="stat-card"><div class="stat-number">${vicepresWinner?.[0]||'—'}</div><div>vice President Leader</div></div>
                                                          <div class="stat-card"><div class="stat-number">${secWinner?.[0]||'—'} </div><div>Secretary Leader</div></div>
                                                          <div class="stat-card"><div class="stat-number">${joinsecWinner?.[0]||'—'}</div><div>join Secretary Leader</div></div>
                                                          <div class="stat-card"><div class="stat-number">${treasWinner?.[0]||'—'}
                                                          </div><div>Treasurer Leader</div></div></div>`;
        let tableHtml = `<table class="result-table"><thead><tr><th>Position</th><th>Candidate</th><th>Party</th><th>Votes</th></tr></thead><tbody>`;
        for(let pos of ['president','vicepresident','secretary','joinsecretary','treasurer']){
            let cands = POSITIONS[pos].candidates;
            let countMap = (pos==='president'?counts.pres:counts.vicepres)(pos==='secretary'?counts.sec:counts.treas);
            cands.forEach(c=>{ tableHtml += `<tr><td>${POSITIONS[pos].name}</td><td>${c.name}</td><td>${c.party}</td><td><span class="vote-badge">${countMap[c.name]||0}</span></td></tr>`; });
        }
        tableHtml += `</tbody></table>`;
        document.getElementById("dashResultsTable").innerHTML = tableHtml;
        updateCharts();
    }

    async function downloadVoterExcel() {
        playClickSound();
        const btn = document.getElementById("downloadVoterExcelBtn");
        const originalText = btn.innerText || "Download Excel";
        btn.innerText = "Downloading...";
        btn.disabled = true;

        try {
            // GET requests to Apps Script from the browser automatically handle CORS allowing us to read the response.
            const response = await fetch(`${GOOGLE_SHEETS_WEBHOOK_URL}?action=getResults`);
            const data = await response.json();
            
            if (data && data.success && data.votes) {
                const ws = XLSX.utils.json_to_sheet(data.votes);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "VoterList");
                XLSX.writeFile(wb, `GoogleSheets_VoterList_${new Date().toISOString().slice(0,19)}.xlsx`);
            } else {
                alert("Could not process downloaded data.");
            }
        } catch (error) {
            console.error("Download Error:", error);
            alert("Error downloading data from Google Sheets.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }

    // Dashboard Modal Logic
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
    function refreshExcel() { localStorage.removeItem(STORAGE_KEY); loadFromStorage().then(()=>{ renderDashboard(); alert("Excel data refreshed"); }); }

    // Event Listeners
    document.getElementById("openDashboardBtn").addEventListener("click", openDashboardLogin);
    document.getElementById("submitDashboardLogin").addEventListener("click", validateDashboardLogin);
    document.getElementById("closeModalBtn").addEventListener("click", closeLoginModal);
    document.getElementById("closeDashboardPanelBtn").addEventListener("click", closeDashboardPanel);
    document.getElementById("refreshExcelBtn").addEventListener("click", refreshExcel);
    document.getElementById("downloadVoterExcelBtn").addEventListener("click", downloadVoterExcel);
    document.getElementById("authenticateBtn").addEventListener("click", authenticateVoter);
    document.getElementById("resetVoteBtn").addEventListener("click", resetAuth);
    document.getElementById("nextTabBtn").addEventListener("click", handleNext);
    document.getElementById("prevTabBtn").addEventListener("click", goPrev);
    document.querySelectorAll(".pos-tab").forEach(btn => { btn.addEventListener("click", (e) => { goToTab(btn.dataset.pos); }); });

    window.addEventListener("DOMContentLoaded", async () => { await loadFromStorage(); resetAuth(); });