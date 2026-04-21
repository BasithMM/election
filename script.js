// ======================= CONFIGURATION =======================
    // Google Sheets Webhook URL (for both voter registry & vote storage)
    const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxQpG3hXIk74zq7HKfZ3tMpqn76knF3O6UQc47Qs346u6QVW9qMSdY-WWKn8WynZkYZJA/exec";
    
    // Master Voter Registry from Google Sheets (Sheet name: "Students")
    let voterRegistry = []; // { admissionNo, name }
    
    // Vote records storage
    let voteRecords = []; 
    const STORAGE_KEY = "AlHidaya_Election_Votes_Complete";
    
    // Positions & Candidates (5 positions with 2 candidates each)
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
    let currentVoter = null;
    let selections = { president: null, vicepresident: null, secretary: null, joinsecretary: null, treasurer: null };
    let currentTab = "president";
    let charts = {};
    
    // Helper: Play sounds (silent fail if not available)
    function playClickSound() { try { new Audio().play().catch(()=>{}); } catch(e) {} }
    function playSuccessAudio() { try { new Audio().play().catch(()=>{}); } catch(e) {} }
    
    // ======================= GOOGLE SHEETS: FETCH VOTER REGISTRY =======================
    async function loadVoterRegistry() {
        try {
            const response = await fetch(`${GOOGLE_SHEETS_WEBHOOK_URL}?action=getStudents&_=${Date.now()}`);
            const data = await response.json();
            if (data && data.success && data.students) {
                voterRegistry = data.students.map(s => ({ 
                    admissionNo: String(s["AD. NO"] || s["Admission No"] || s["admissionNo"] || "").trim(), 
                    name: (s["NAME"] || s["Name"] || s["name"] || "").trim().toUpperCase() 
                }));
                console.log("Voter registry loaded:", voterRegistry.length);
                return;
            }
        } catch (error) { console.warn("Failed to fetch voter registry from Google Sheets, using fallback local list", error); }
        // Fallback: Hardcoded from provided data
        const fallbackList = [
            [361,"ABDUL BASITH. PC"],[366,"AFNAN. M"],[370,"AHMAD THALHATH. PJ"],[354,"MUHAMMED SHAHABAS. PV"],[355,"MUHAMMED HASHIM. PP"],
            [350,"MUHAMMED NISHAD. T"],[351,"MUHAMMED AFEEF. CK"],[357,"MUHAMMED AJSAL. VT"],[330,"MUHAMMED ANSHID. KK"],[371,"MUHAMMED HASHID.T"],
            [368,"MUHAMMED IRFAN. PH"],[372,"MUHAMMED JURAIJ. KU"],[360,"MUHAMMED MAZIN. P"],[367,"MUHAMMED MUZAMMIL. PT"],[358,"MUHAMMED RAIHAN. PA"],
            [374,"MUHAMMED SHIFAN. M"],[369,"RAZEEN AHMAD. M"],[362,"SHEHIN MOHAMMED. TK"],[356,"MUHAMMED YASEEN. TA"],[352,"MUHAMMED ZAYYAN. P"],
            [310,"HASHIM BIN FAISAL. P"],[334,"MUHAMMED FARHAN. VV"],[331,"MUHAMMED SABAH. KP"],[338,"MUHAMMED SABITH. M"],[337,"MUHAMMED HASAN. KN"],
            [325,"MUHAMMED MUSTHAFA. P"],[333,"MUHAMMED SHAFIN. KK"],[342,"MUHAMMED ADHIL. T"],[326,"MUHAMMED AFLAH. PN"],[332,"MUHAMMED ASHMIL. P"],
            [327,"MUHAMMED BILAL. CS"],[345,"MUHAMMED HAFEEF. CP"],[339,"MUHAMMED MISHAL. K"],[340,"MUHAMMED SHAMWEEL. CP"],[328,"MUHAMMED SHIFAN. M"],
            [329,"MUHAMMED ZAYAN. MK"],[335,"MUHSINE AMEEN"],[336,"NAZIM FAISAL. K"],[347,"SIRAJUDHEEN. V"],[311,"ADEEB RAHMAN. P"],[316,"AFLAH. KM"],
            [277,"AHMAD FAWAS. K"],[306,"DHAKIR IBRAHIM. K"],[302,"MOHAMMED ANSHIF. K"],[312,"MOHAMMED RISVAN. K"],[301,"MUHAMMED JASIL. PK"],
            [309,"MUHAMMED NAFIH. M"],[305,"MUHAMMED ADIL. K"],[379,"MUHAMMED AMEEN. AM"],[322,"MUHAMMED SAHAL. CP"],[254,"MUHAMMED SHIBILI. KT"],
            [313,"MUHAMMED SWALIH. KK"],[307,"SALAHUDHEEN. AP"],[317,"WAMEEZ AHMAD. PM"],[274,"ANSHID. K"],[282,"HABEEB RAHMAN. CK"],[286,"MEHROOF. TN"],
            [288,"MUHAMMED SINAN. PP"],[272,"MUHAMMED RISHAN. AP"],[348,"MUHAMMED SHAFIN. MN"],[250,"MUHAMMED SAHAL.V"],[279,"MUHAMMED RINSHAD. C"],
            [324,"MUHAMMED ALFAN. VF"],[290,"MUHAMMED ASLAM. OP"],[252,"MUHAMMED JUNAIS. M"],[271,"MUHAMMED MUHSIN. O"],[235,"MUHAMMED UVAIS. PK"],
            [294,"MUHAMMED SALIH. A"],[266,"MUHAMMED SINAN. U"],[209,"AJWAD IHSAN. P"],[199,"MUHAMMAD FYROOZE. KB"],[178,"MUHAMMED MUSHFIQ. P"],
            [200,"MUHAMMED BADHUSHA. VM"],[186,"MUHAMMED JURAIJ. K"],[210,"MUHAMMED RIZWAN. KK"],[185,"MUHAMMED SHAHINSHA. CM"],[224,"MUHAMMED SHIFAN. K"],
            [177,"MUHAMMED SWALIH. V"],[201,"SUHAIL MUHAMMED. PM"],[212,"ARSHID"],[246,"ABDUL BASITH MM"],[226,"AHMED YASIR MK"],[255,"HADHI MF"],
            [259,"JAZIB MOHAMMED K"],[249,"MUHAMMED ANSHIF M"],[241,"MUHAMMED RASI A"],[240,"MUHAMMED RISHAM MK"],[211,"MUHAMMED AJSAL CM"],
            [233,"ALI MUNAVVIR PA"],[245,"HABEEB RAHMAN E"],[242,"HADI AMEEN P"],[253,"MUHAMMED NIHAL ON"],[239,"MUHAMMED RIYAN K"],
            [204,"NIZAMUDHEEN CK"],[258,"SHAHAFAS IBI"],[232,"SWALAHUDHEEN PS"]
        ];
        voterRegistry = fallbackList.map(([adNo, name]) => ({ admissionNo: String(adNo).trim(), name: name.trim().toUpperCase() }));
    }
    
    // ======================= LOAD VOTES FROM GOOGLE SHEETS =======================
    async function loadVotesFromSheets() {
        try {
            const response = await fetch(`${GOOGLE_SHEETS_WEBHOOK_URL}?action=getResults&_=${Date.now()}`);
            const data = await response.json();
            if (data && data.success && data.votes) {
                voteRecords = data.votes.map(r => ({
                    admissionNo: String(r["Admission Number"] || r["AdmissionNo"] || ""),
                    voterName: r["Voter Name"] || "",
                    presidentName: r["President Vote"] || "",
                    vicePresidentName: r["Vice President Vote"] || "",
                    secretaryName: r["Secretary Vote"] || "",
                    jointSecretaryName: r["Joint Secretary Vote"] || "",
                    treasurerName: r["Treasurer Vote"] || "",
                    timestamp: r["Timestamp"] || new Date().toISOString()
                }));
                saveToLocalBackup();
                return;
            }
        } catch (error) { console.warn("Google Sheets vote fetch failed, using local backup", error); }
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored) {
            try { voteRecords = JSON.parse(stored); } catch(e) { voteRecords = []; }
        }
    }
    
    function saveToLocalBackup() { localStorage.setItem(STORAGE_KEY, JSON.stringify(voteRecords)); }
    
    function hasVoted(admission) { return voteRecords.some(v => v.admissionNo === String(admission)); }
    
    async function sendVoteToSheets(voteData) {
        try {
            const formData = new URLSearchParams();
            for (const key in voteData) if (voteData[key]) formData.append(key, voteData[key]);
            await fetch(GOOGLE_SHEETS_WEBHOOK_URL, { method: "POST", mode: "no-cors", body: formData });
        } catch(e) { console.error(e); }
    }
    
    async function submitFinalVote() {
        if(!selections.president || !selections.vicepresident || !selections.secretary || !selections.joinsecretary || !selections.treasurer) 
            return { success: false, message: "Please select a candidate for ALL five positions!" };
        if(hasVoted(currentVoter.admission)) return { success: false, message: "Your admission number has already voted!" };
        
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
        saveToLocalBackup();
        sendVoteToSheets(voteData);
        return { success: true };
    }
    
    // ======================= UI RENDERING =======================
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
                if(idx < TAB_ORDER.length - 1) setTimeout(() => goToTab(TAB_ORDER[idx+1]), 280);
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
        document.getElementById("prevTabBtn").disabled = (TAB_ORDER.indexOf(tab) === 0);
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
    
    function goPrev() { const idx = TAB_ORDER.indexOf(currentTab); if(idx > 0) goToTab(TAB_ORDER[idx-1]); document.getElementById("voteFeedback").innerHTML = ""; }
    
    async function authenticateVoter() {
        const name = document.getElementById("voterName").value.trim().toUpperCase();
        const admission = document.getElementById("admissionNo").value.trim();
        const errDiv = document.getElementById("authError");
        if(!name || !admission) { errDiv.style.display="block"; errDiv.innerHTML="Please fill all fields"; playClickSound(); return; }
        // Verify against registry
        const registered = voterRegistry.find(v => v.admissionNo === admission && v.name === name);
        if(!registered) { errDiv.style.display="block"; errDiv.innerHTML="❌ Invalid credentials! Admission number and name do not match our records."; playClickSound(); return; }
        if(hasVoted(admission)) { errDiv.style.display="block"; errDiv.innerHTML="❌ You have already voted!"; playClickSound(); return; }
        errDiv.style.display="none";
        currentVoter = { name: registered.name, admission: registered.admissionNo };
        selections = { president: null, vicepresident: null, secretary: null, joinsecretary: null, treasurer: null };
        currentTab = "president";
        document.getElementById("voterAuthArea").style.display = "none";
        document.getElementById("votingPanelArea").style.display = "block";
        document.getElementById("voterWelcomeMsg").innerHTML = `<i class="fas fa-user-check"></i> Welcome ${registered.name} (${registered.admissionNo}) — Please select one candidate per position.`;
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
    
    // ======================= DASHBOARD =======================
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
        charts.president = new Chart(document.getElementById("presidentChart"), { type: 'bar', data: { labels: Object.keys(counts.pres), datasets: [{ label: 'Votes', data: Object.values(counts.pres), backgroundColor: '#1f6e43', borderRadius: 8 }] }, options: { responsive: true } });
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
            <div class="stat-card"><div class="stat-number">${totalVotes}</div><div>Total Votes Cast</div></div>
            <div class="stat-card"><div class="stat-number">${uniqueVoters}</div><div>Unique Voters</div></div>
            <div class="stat-card"><div class="stat-number">${presLeader?.[0]||'—'}</div><div>President Leader</div></div>
            <div class="stat-card"><div class="stat-number">${vpLeader?.[0]||'—'}</div><div>Vice President Leader</div></div>
            <div class="stat-card"><div class="stat-number">${secLeader?.[0]||'—'}</div><div>Secretary Leader</div></div>
            <div class="stat-card"><div class="stat-number">${jsLeader?.[0]||'—'}</div><div>Joint Secretary Leader</div></div>
            <div class="stat-card"><div class="stat-number">${treasLeader?.[0]||'—'}</div><div>Treasurer Leader</div></div>
        </div>`;
        let tableHtml = `<table class="result-table"><thead><tr><th>Position</th><th>Candidate</th><th>Party</th><th>Votes</th></tr></thead><tbody>`;
        const posKeys = ['president','vicepresident','secretary','joinsecretary','treasurer'];
        posKeys.forEach(posKey => {
            const mapKey = posKey === 'president' ? 'pres' : (posKey === 'vicepresident' ? 'vp' : (posKey === 'secretary' ? 'sec' : (posKey === 'joinsecretary' ? 'js' : 'treas')));
            const countMap = counts[mapKey];
            POSITIONS[posKey].candidates.forEach(c => {
                tableHtml += `<tr><td>${POSITIONS[posKey].name}</td><td>${c.name}</td><td>${c.party}</td><td><span class="vote-badge">${countMap[c.name]||0}</span></td></tr>`;
            });
        });
        tableHtml += `</tbody></table>`;
        document.getElementById("dashResultsTable").innerHTML = tableHtml;
        updateAllCharts();
    }
    
    async function downloadResultsExcel() {
        const btn = document.getElementById("downloadVoterExcelBtn");
        const original = btn.innerText;
        btn.innerText = "Generating...";
        btn.disabled = true;
        try {
            const response = await fetch(`${GOOGLE_SHEETS_WEBHOOK_URL}?action=getResults&_=${Date.now()}`);
            const data = await response.json();
            let exportData = [];
            if(data && data.success && data.votes) exportData = data.votes;
            else exportData = voteRecords.map(v => ({ "Admission Number": v.admissionNo, "Voter Name": v.voterName, "President Vote": v.presidentName, "Vice President Vote": v.vicePresidentName, "Secretary Vote": v.secretaryName, "Joint Secretary Vote": v.jointSecretaryName, "Treasurer Vote": v.treasurerName, "Timestamp": v.timestamp }));
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "ElectionResults");
            XLSX.writeFile(wb, `AlHidaya_Results_${new Date().toISOString().slice(0,19)}.xlsx`);
        } catch(e) { alert("Download failed"); } finally { btn.innerText = original; btn.disabled = false; }
    }
    
    async function refreshDashboardData() { await loadVotesFromSheets(); renderDashboard(); alert("Dashboard refreshed from Google Sheets"); }
    
    // Dashboard login
    const modalOverlay = document.getElementById("dashboardModal");
    const dashboardPanel = document.getElementById("dashboardPanel");
    function openDashboardLogin() { modalOverlay.classList.add("active"); playClickSound(); }
    function closeLoginModal() { modalOverlay.classList.remove("active"); }
    function closeDashboardPanel() { dashboardPanel.classList.remove("active"); }
    function validateDashboardLogin() {
        const user = document.getElementById("adminUsername").value, pass = document.getElementById("adminPassword").value;
        if(user === "alhidaya" && pass === "hudaelection") {
            modalOverlay.classList.remove("active");
            loadVotesFromSheets().then(()=>{ renderDashboard(); dashboardPanel.classList.add("active"); playClickSound(); });
        } else { document.getElementById("dashboardLoginError").innerText = "Invalid credentials!"; playClickSound(); }
    }
    
    // Event listeners
    document.getElementById("openDashboardBtn").addEventListener("click", openDashboardLogin);
    document.getElementById("submitDashboardLogin").addEventListener("click", validateDashboardLogin);
    document.getElementById("closeModalBtn").addEventListener("click", closeLoginModal);
    document.getElementById("closeDashboardPanelBtn").addEventListener("click", closeDashboardPanel);
    document.getElementById("refreshExcelBtn").addEventListener("click", refreshDashboardData);
    document.getElementById("downloadVoterExcelBtn").addEventListener("click", downloadResultsExcel);
    document.getElementById("authenticateBtn").addEventListener("click", authenticateVoter);
    document.getElementById("resetVoteBtn").addEventListener("click", resetAuth);
    document.getElementById("nextTabBtn").addEventListener("click", handleNext);
    document.getElementById("prevTabBtn").addEventListener("click", goPrev);
    document.querySelectorAll(".pos-tab").forEach(btn => { btn.addEventListener("click", (e) => { goToTab(btn.dataset.pos); }); });
    
    window.addEventListener("DOMContentLoaded", async () => { 
        await loadVoterRegistry(); 
        await loadVotesFromSheets(); 
        resetAuth(); 
    });