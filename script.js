
const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxdQyx2wFGyxQ4wuHzKp3_lh80h0ZczEoLGtc1MSCi5OsRMEABjHySqJ9ZtHoPFgNfs-g/exec";
// POSITIONS & CANDIDATES
    const POSITIONS = {
        president: { name: "President", candidates: [
            { id: "p1", name: "Basith", party: "Progressive Alliance", photo: "#", logo: "#" },
            { id: "p2", name: "Omar Farooq", party: "Unity Movement", photo: "#", logo: "#" }
        ]},
        secretary: { name: "Secretary", candidates: [
            { id: "s1", name: "Zainab Malik", party: "Students First", photo: "#", logo: "#" },
            { id: "s2", name: "Hamza Idris", party: "Campus Vision", photo: "#", logo: "#" }
        ]},
        treasurer: { name: "Treasurer", candidates: [
            { id: "t1", name: "Fatima Al Zahra", party: "Economic Reform", photo: "#", logo: "#" },
            { id: "t2", name: "Bilal Ahmed", party: "Transparency Front", photo: "#", logo: "#" }
        ]}
    };

    let voteRecords = []; // each: { admissionNo, voterName, presidentId, presidentName, secretaryId, secretaryName, treasurerId, treasurerName, timestamp }
    const STORAGE_KEY = "MultiPositionElectionData";
    let charts = {};

    // Current voting session
    let currentVoter = null;
    let selections = { president: null, secretary: null, treasurer: null };
    let currentTab = "president";
    const tabOrder = ["president", "secretary", "treasurer"];

    // Audio
    function playClickSound() { try { const ctx = new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value=720; g.gain.value=0.1; o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.2); o.stop(ctx.currentTime+0.15); } catch(e){} }
    function playSuccessAudio() { try { const ctx = new (window.AudioContext||window.webkitAudioContext)(); const g=ctx.createGain(); g.connect(ctx.destination); g.gain.value=0.15; [880,1046,1318].forEach((freq,i)=>{ const o=ctx.createOscillator(); o.frequency.value=freq; o.type="sine"; o.connect(g); o.start(ctx.currentTime+i*0.3); o.stop(ctx.currentTime+i*0.6); }); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+2.5); } catch(e){} }

    // Excel Storage
    function saveToExcel() {
        const sheetData = voteRecords.map(v => ({ AdmissionNumber: v.admissionNo, VoterName: v.voterName, PresidentVote: v.presidentName, SecretaryVote: v.secretaryName, TreasurerVote: v.treasurerName, Timestamp: v.timestamp }));
        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "MultiPositionVotes");
        localStorage.setItem(STORAGE_KEY, XLSX.write(wb, { type: 'base64' }));
    }
    async function loadFromStorage() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored) { try { const wb = XLSX.read(atob(stored), { type: 'binary' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); voteRecords = rows.map(r => ({ admissionNo: r.AdmissionNumber, voterName: r.VoterName, presidentName: r.PresidentVote, secretaryName: r.SecretaryVote, treasurerName: r.TreasurerVote, timestamp: r.Timestamp })); } catch(e){} }
        else voteRecords = [];
    }

    function hasVoted(admission) { return voteRecords.some(v => v.admissionNo === admission); }

    async function submitFinalVote() {
        if(!selections.president || !selections.secretary || !selections.treasurer) return false;
        if(hasVoted(currentVoter.admission)) return { success: false, message: "Already voted!" };
        voteRecords.push({
            admissionNo: currentVoter.admission, voterName: currentVoter.name,
            presidentName: selections.president.name, secretaryName: selections.secretary.name, treasurerName: selections.treasurer.name,
            timestamp: new Date().toLocaleString()
        });
        saveToExcel();
        return { success: true };
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
        selections = { president: null, secretary: null, treasurer: null };
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
        POSITIONS.secretary.candidates.forEach(c => sec[c.name]=0);
        POSITIONS.treasurer.candidates.forEach(c => treas[c.name]=0);
        voteRecords.forEach(v => { if(v.presidentName) pres[v.presidentName] = (pres[v.presidentName]||0)+1; if(v.secretaryName) sec[v.secretaryName] = (sec[v.secretaryName]||0)+1; if(v.treasurerName) treas[v.treasurerName] = (treas[v.treasurerName]||0)+1; });
        return { pres, sec, treas };
    }

    function updateCharts() {
        const counts = getCountsByPosition();
        if(charts.president) charts.president.destroy();
        if(charts.secretary) charts.secretary.destroy();
        if(charts.treasurer) charts.treasurer.destroy();
        charts.president = new Chart(document.getElementById("presidentChart"), { type: 'bar', data: { labels: Object.keys(counts.pres), datasets: [{ label: 'Votes', data: Object.values(counts.pres), backgroundColor: '#1f6e43', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: true } });
        charts.secretary = new Chart(document.getElementById("secretaryChart"), { type: 'bar', data: { labels: Object.keys(counts.sec), datasets: [{ label: 'Votes', data: Object.values(counts.sec), backgroundColor: '#2c7da0', borderRadius: 8 }] }, options: { responsive: true } });
        charts.treasurer = new Chart(document.getElementById("treasurerChart"), { type: 'bar', data: { labels: Object.keys(counts.treas), datasets: [{ label: 'Votes', data: Object.values(counts.treas), backgroundColor: '#e67e22', borderRadius: 8 }] }, options: { responsive: true } });
    }

    function renderDashboard() {
        const counts = getCountsByPosition();
        const totalVoters = voteRecords.length;
        const totalUnique = new Set(voteRecords.map(v=>v.admissionNo)).size;
        let presWinner = Object.entries(counts.pres).sort((a,b)=>b[1]-a[1])[0];
        let secWinner = Object.entries(counts.sec).sort((a,b)=>b[1]-a[1])[0];
        let treasWinner = Object.entries(counts.treas).sort((a,b)=>b[1]-a[1])[0];
        document.getElementById("dashStats").innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-number">${totalVoters}</div><div>Total Votes Cast</div></div><div class="stat-card"><div class="stat-number">${totalUnique}</div><div>Unique Voters</div></div><div class="stat-card"><div class="stat-number">${presWinner?.[0]||'—'}</div><div>President Leader</div></div><div class="stat-card"><div class="stat-number">${secWinner?.[0]||'—'}
                                                          </div><div>Secretary Leader</div></div><div class="stat-card"><div class="stat-number">${treasWinner?.[0]||'—'}
                                                          </div><div>Treasurer Leader</div></div></div>`;
        let tableHtml = `<table class="result-table"><thead><tr><th>Position</th><th>Candidate</th><th>Party</th><th>Votes</th></tr></thead><tbody>`;
        for(let pos of ['president','secretary','treasurer']){
            let cands = POSITIONS[pos].candidates;
            let countMap = pos==='president'?counts.pres:(pos==='secretary'?counts.sec:counts.treas);
            cands.forEach(c=>{ tableHtml += `<tr><td>${POSITIONS[pos].name}</td><td>${c.name}</td><td>${c.party}</td><td><span class="vote-badge">${countMap[c.name]||0}</span></td></tr>`; });
        }
        tableHtml += `</tbody></table>`;
        document.getElementById("dashResultsTable").innerHTML = tableHtml;
        updateCharts();
    }

    function downloadVoterExcel() {
        const exportData = voteRecords.map(v => ({ "Voter Name": v.voterName, "Admission Number": v.admissionNo, "President Vote": v.presidentName, "Secretary Vote": v.secretaryName, "Treasurer Vote": v.treasurerName, "Timestamp": v.timestamp }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "VoterList");
        XLSX.writeFile(wb, `VoterList_MultiPosition_${new Date().toISOString().slice(0,19)}.xlsx`);
        playClickSound();
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