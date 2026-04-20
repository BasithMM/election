
// const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxdQyx2wFGyxQ4wuHzKp3_lh80h0ZczEoLGtc1MSCi5OsRMEABjHySqJ9ZtHoPFgNfs-g/exec";
const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbw_1WvYJajRusDd9nB5w-dGiw3OGpdKo_wwZBxLg_lgA_Akr9jJQcu6Q7CBrQtKG1yrQw/exec";
// POSITIONS & CANDIDATES

   const POSITIONS = {
        president: { name: "President", candidates: [
            { id: "p1", name: "MUHAMMED JURAIJ", party: "Progressive Alliance", photo: "#", logo: "#" },
            { id: "p2", name: "MUHAMMED RIZWAN", party: "Unity Movement", photo: "#", logo: "#" }
        ]},
        vicepresident: { name: "Vice President", candidates: [
            { id: "vp1", name: "FATHIMA SHERIN", party: "Students Voice", photo: "#", logo: "#" },
            { id: "vp2", name: "ABDUL RAHMAN K", party: "Campus Unity", photo: "#", logo: "#" }
        ]},
        secretary: { name: "Secretary", candidates: [
            { id: "s1", name: "SHAHAFAS IBI", party: "Students First", photo: "#", logo: "#" },
            { id: "s2", name: "MUHAMMED RASI A", party: "Campus Vision", photo: "#", logo: "#" }
        ]},
        jointsecretary: { name: "Joint Secretary", candidates: [
            { id: "js1", name: "NASEEHA BANU", party: "Equality Front", photo: "#", logo: "#" },
            { id: "js2", name: "SAFIYA M", party: "Progressive Youth", photo: "#", logo: "#" }
        ]},
        treasurer: { name: "Treasurer", candidates: [
            { id: "t1", name: "HABEEBU RAHMAN E", party: "Economic Reform", photo: "#", logo: "#" },
            { id: "t2", name: "MUHAMMED NIHAL", party: "Transparency Front", photo: "#", logo: "#" }
        ]}
    };

    const TAB_ORDER = ["president", "vicepresident", "secretary", "jointsecretary", "treasurer"];

    let voteRecords = []; // each: { admissionNo, voterName, presidentName, vicepresidentName, secretaryName, jointsecretaryName, treasurerName, timestamp }
    const STORAGE_KEY = "MultiPositionElectionDataV2";
    let charts = {};

    let currentVoter = null;
    let selections = { president: null, vicepresident: null, secretary: null, jointsecretary: null, treasurer: null };
    let currentTab = "president";

    // Audio elements
    const clickSound = new Audio();
    const successSound = new Audio("succss.mp4");
    clickSound.volume = 0.5;
    successSound.volume = 0.7;
    function playClickSound() { try { clickSound.currentTime = 0; clickSound.play().catch(()=>{}); } catch(e) {} }
    function playSuccessAudio() { try { successSound.currentTime = 0; successSound.play().catch(()=>{}); } catch(e) {} }

    // Helper: check if voter already voted
    function hasVoted(admission) { return voteRecords.some(v => v.admissionNo === admission); }

    // Save to local excel backup (localStorage)
    function saveToExcel() {
        const sheetData = voteRecords.map(v => ({ 
            AdmissionNumber: v.admissionNo, VoterName: v.voterName, 
            PresidentVote: v.presidentName || "", VicePresidentVote: v.vicepresidentName || "",
            SecretaryVote: v.secretaryName || "", JointSecretaryVote: v.jointsecretaryName || "",
            TreasurerVote: v.treasurerName || "", Timestamp: v.timestamp 
        }));
        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "MultiPositionVotes");
        localStorage.setItem(STORAGE_KEY, XLSX.write(wb, { type: 'base64' }));
    }

    // Load from google sheets or fallback
    async function loadFromStorage() {
        try {
            const response = await fetch(`${GOOGLE_SHEETS_WEBHOOK_URL}?action=getResults`);
            const data = await response.json();
            if (data && data.success && data.votes) {
                voteRecords = data.votes.map(r => ({
                    admissionNo: r["Admission Number"],
                    voterName: r["Voter Name"],
                    presidentName: r["President Vote"],
                    vicepresidentName: r["Vice President Vote"],
                    secretaryName: r["Secretary Vote"],
                    jointsecretaryName: r["Joint Secretary Vote"],
                    treasurerName: r["Treasurer Vote"],
                    timestamp: r["Timestamp"]
                }));
                saveToExcel();
                return;
            }
        } catch (error) { console.warn("Sheet load error", error); }
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored) {
            try {
                const wb = XLSX.read(atob(stored), { type: 'binary' });
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                voteRecords = rows.map(r => ({
                    admissionNo: r.AdmissionNumber, voterName: r.VoterName,
                    presidentName: r.PresidentVote, vicepresidentName: r.VicePresidentVote,
                    secretaryName: r.SecretaryVote, jointsecretaryName: r.JointSecretaryVote,
                    treasurerName: r.TreasurerVote, timestamp: r.Timestamp
                }));
            } catch(e) { voteRecords = []; }
        } else voteRecords = [];
    }

    // Submit to google sheets (POST)
    async function sendToGoogleSheets(voteData) {
        try {
            const formData = new URLSearchParams();
            for (const key in voteData) if (voteData[key]) formData.append(key, voteData[key]);
            await fetch(GOOGLE_SHEETS_WEBHOOK_URL, { method: "POST", mode: "no-cors", body: formData });
        } catch (error) { console.error("Sheet submit error", error); }
    }

    async function submitFinalVote() {
        if(!selections.president || !selections.vicepresident || !selections.secretary || !selections.jointsecretary || !selections.treasurer) 
            return { success: false, message: "Please select candidates for all 5 positions!" };
        if(hasVoted(currentVoter.admission)) return { success: false, message: "Already voted!" };
        const voteData = {
            admissionNo: currentVoter.admission,
            voterName: currentVoter.name,
            presidentName: selections.president.name,
            vicepresidentName: selections.vicepresident.name,
            secretaryName: selections.secretary.name,
            jointsecretaryName: selections.jointsecretary.name,
            treasurerName: selections.treasurer.name,
            timestamp: new Date().toLocaleString()
        };
        voteRecords.push(voteData);
        saveToExcel();
        sendToGoogleSheets(voteData);
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
                const idx = TAB_ORDER.indexOf(currentTab);
                if(idx < TAB_ORDER.length-1) setTimeout(() => goToTab(TAB_ORDER[idx+1]), 300);
            });
            container.appendChild(card);
        });
        const nextBtn = document.getElementById("nextTabBtn");
        if(currentTab === TAB_ORDER[TAB_ORDER.length-1]) nextBtn.textContent = "✅ Submit All Votes";
        else nextBtn.textContent = "Next →";
    }

    function goToTab(tab) {
        currentTab = tab;
        document.querySelectorAll(".pos-tab").forEach(btn => { btn.classList.remove("active"); if(btn.dataset.pos === tab) btn.classList.add("active"); });
        renderCandidates();
        const prevBtn = document.getElementById("prevTabBtn");
        prevBtn.disabled = (TAB_ORDER.indexOf(tab) === 0);
        const nextBtn = document.getElementById("nextTabBtn");
        if(tab === TAB_ORDER[TAB_ORDER.length-1]) nextBtn.textContent = "✅ Submit All Votes";
        else nextBtn.textContent = "Next →";
        playClickSound();
    }

    async function handleNext() {
        if(!selections[currentTab]) {
            document.getElementById("voteFeedback").innerHTML = `<div class="info-message" style="background:#ffe0db;">⚠️ Please select a candidate for ${POSITIONS[currentTab].name}</div>`;
            playClickSound(); return;
        }
        const idx = TAB_ORDER.indexOf(currentTab);
        if(idx === TAB_ORDER.length-1) {
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
            goToTab(TAB_ORDER[idx+1]);
            document.getElementById("voteFeedback").innerHTML = "";
        }
    }

    function goPrev() { const idx = TAB_ORDER.indexOf(currentTab); if(idx>0) goToTab(TAB_ORDER[idx-1]); document.getElementById("voteFeedback").innerHTML = ""; }
    function authenticateVoter() {
        const name = document.getElementById("voterName").value.trim();
        const admission = document.getElementById("admissionNo").value.trim();
        const errDiv = document.getElementById("authError");
        if(!name || !admission) { errDiv.style.display="block"; errDiv.innerHTML="Please fill all fields"; playClickSound(); return; }
        if(hasVoted(admission)) { errDiv.style.display="block"; errDiv.innerHTML="Already voted!"; playClickSound(); return; }
        errDiv.style.display="none";
        currentVoter = { name, admission };
        selections = { president: null, vicepresident: null, secretary: null, jointsecretary: null, treasurer: null };
        currentTab = "president";
        document.getElementById("voterAuthArea").style.display = "none";
        document.getElementById("votingPanelArea").style.display = "block";
        document.getElementById("voterWelcomeMsg").innerHTML = `<i class="fas fa-user-check"></i> Welcome ${name} (${admission}) — Vote for all 5 positions.`;
        goToTab("president");
    }
    function resetAuth() { document.getElementById("voterAuthArea").style.display="block"; document.getElementById("votingPanelArea").style.display="none"; currentVoter=null; document.getElementById("voterName").value=""; document.getElementById("admissionNo").value=""; document.getElementById("authError").style.display="none"; document.getElementById("voteFeedback").innerHTML=""; }

    // Dashboard helpers
    function getCountsByPosition() {
        let pres={}, vp={}, sec={}, js={}, treas={};
        POSITIONS.president.candidates.forEach(c => pres[c.name]=0);
        POSITIONS.vicepresident.candidates.forEach(c => vp[c.name]=0);
        POSITIONS.secretary.candidates.forEach(c => sec[c.name]=0);
        POSITIONS.jointsecretary.candidates.forEach(c => js[c.name]=0);
        POSITIONS.treasurer.candidates.forEach(c => treas[c.name]=0);
        voteRecords.forEach(v => {
            if(v.presidentName) pres[v.presidentName] = (pres[v.presidentName]||0)+1;
            if(v.vicepresidentName) vp[v.vicepresidentName] = (vp[v.vicepresidentName]||0)+1;
            if(v.secretaryName) sec[v.secretaryName] = (sec[v.secretaryName]||0)+1;
            if(v.jointsecretaryName) js[v.jointsecretaryName] = (js[v.jointsecretaryName]||0)+1;
            if(v.treasurerName) treas[v.treasurerName] = (treas[v.treasurerName]||0)+1;
        });
        return { pres, vp, sec, js, treas };
    }

    function updateCharts() {
        const counts = getCountsByPosition();
        if(charts.president) charts.president.destroy();
        if(charts.vicepresident) charts.vicepresident.destroy();
        if(charts.secretary) charts.secretary.destroy();
        if(charts.jointsecretary) charts.jointsecretary.destroy();
        if(charts.treasurer) charts.treasurer.destroy();
        charts.president = new Chart(document.getElementById("presidentChart"), { type: 'bar', data: { labels: Object.keys(counts.pres), datasets: [{ label: 'Votes', data: Object.values(counts.pres), backgroundColor: '#1f6e43' }] }, options: { responsive: true } });
        charts.vicepresident = new Chart(document.getElementById("vicepresidentChart"), { type: 'bar', data: { labels: Object.keys(counts.vp), datasets: [{ label: 'Votes', data: Object.values(counts.vp), backgroundColor: '#3498db' }] }, options: { responsive: true } });
        charts.secretary = new Chart(document.getElementById("secretaryChart"), { type: 'bar', data: { labels: Object.keys(counts.sec), datasets: [{ label: 'Votes', data: Object.values(counts.sec), backgroundColor: '#2c7da0' }] }, options: { responsive: true } });
        charts.jointsecretary = new Chart(document.getElementById("jointsecretaryChart"), { type: 'bar', data: { labels: Object.keys(counts.js), datasets: [{ label: 'Votes', data: Object.values(counts.js), backgroundColor: '#8e44ad' }] }, options: { responsive: true } });
        charts.treasurer = new Chart(document.getElementById("treasurerChart"), { type: 'bar', data: { labels: Object.keys(counts.treas), datasets: [{ label: 'Votes', data: Object.values(counts.treas), backgroundColor: '#e67e22' }] }, options: { responsive: true } });
    }

    function renderDashboard() {
        const counts = getCountsByPosition();
        const totalVoters = voteRecords.length;
        const totalUnique = new Set(voteRecords.map(v=>v.admissionNo)).size;
        let presWinner = Object.entries(counts.pres).sort((a,b)=>b[1]-a[1])[0];
        let vpWinner = Object.entries(counts.vp).sort((a,b)=>b[1]-a[1])[0];
        let secWinner = Object.entries(counts.sec).sort((a,b)=>b[1]-a[1])[0];
        let jsWinner = Object.entries(counts.js).sort((a,b)=>b[1]-a[1])[0];
        let treasWinner = Object.entries(counts.treas).sort((a,b)=>b[1]-a[1])[0];
        document.getElementById("dashStats").innerHTML = `<div class="stats-grid">
            <div class="stat-card"><div class="stat-number">${totalVoters}</div><div>Total Votes</div></div>
            <div class="stat-card"><div class="stat-number">${totalUnique}</div><div>Unique Voters</div></div>
            <div class="stat-card"><div class="stat-number">${presWinner?.[0]||'—'}</div><div>President Leader</div></div>
            <div class="stat-card"><div class="stat-number">${vpWinner?.[0]||'—'}</div><div>Vice President Leader</div></div>
            <div class="stat-card"><div class="stat-number">${secWinner?.[0]||'—'}</div><div>Secretary Leader</div></div>
            <div class="stat-card"><div class="stat-number">${jsWinner?.[0]||'—'}</div><div>Joint Secretary Leader</div></div>
            <div class="stat-card"><div class="stat-number">${treasWinner?.[0]||'—'}</div><div>Treasurer Leader</div></div>
        </div>`;
        let tableHtml = `<table class="result-table"><thead><tr><th>Position</th><th>Candidate</th><th>Party</th><th>Votes</th></tr></thead><tbody>`;
        for(let pos of ['president','vicepresident','secretary','jointsecretary','treasurer']){
            let cands = POSITIONS[pos].candidates;
            let countMap = counts[pos === 'president' ? 'pres' : (pos === 'vicepresident' ? 'vp' : (pos === 'secretary' ? 'sec' : (pos === 'jointsecretary' ? 'js' : 'treas')))];
            cands.forEach(c=>{ tableHtml += `<tr><td>${POSITIONS[pos].name}</td><td>${c.name}</td><td>${c.party}</td><td><span class="vote-badge">${countMap[c.name]||0}</span></td></tr>`; });
        }
        tableHtml += `</tbody></table>`;
        document.getElementById("dashResultsTable").innerHTML = tableHtml;
        updateCharts();
    }

    async function downloadVoterExcel() {
        const btn = document.getElementById("downloadVoterExcelBtn");
        const original = btn.innerText;
        btn.innerText = "Downloading...";
        btn.disabled = true;
        try {
            const response = await fetch(`${GOOGLE_SHEETS_WEBHOOK_URL}?action=getResults`);
            const data = await response.json();
            if (data && data.success && data.votes) {
                const ws = XLSX.utils.json_to_sheet(data.votes);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "ElectionResults");
                XLSX.writeFile(wb, `ElectionData_${new Date().toISOString().slice(0,19)}.xlsx`);
            } else alert("Could not fetch latest data");
        } catch(e) { alert("Export error"); }
        finally { btn.innerText = original; btn.disabled = false; }
    }

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
    function refreshExcel() { localStorage.removeItem(STORAGE_KEY); loadFromStorage().then(()=>{ renderDashboard(); alert("Data refreshed"); }); }

    // Event listeners
    document.getElementById("openDashboardBtn").addEventListener("click", openDashboardLogin);
    document.getElementById("submitDashboardLogin").addEventListener("click", validateDashboardLogin);
    document.getElementById("closeModalBtn").addEventListener("click", closeLoginModal);
    document.getElementById("closeDashboardPanelBtn").addEventListener("click", closeDashboardPanel);
    document.getElementById("closeDashboardPanelBtn2").addEventListener("click", closeDashboardPanel);
    document.getElementById("refreshExcelBtn").addEventListener("click", refreshExcel);
    document.getElementById("downloadVoterExcelBtn").addEventListener("click", downloadVoterExcel);
    document.getElementById("authenticateBtn").addEventListener("click", authenticateVoter);
    document.getElementById("resetVoteBtn").addEventListener("click", resetAuth);
    document.getElementById("nextTabBtn").addEventListener("click", handleNext);
    document.getElementById("prevTabBtn").addEventListener("click", goPrev);
    document.querySelectorAll(".pos-tab").forEach(btn => { btn.addEventListener("click", () => goToTab(btn.dataset.pos)); });

    window.addEventListener("DOMContentLoaded", async () => { await loadFromStorage(); resetAuth(); });