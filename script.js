
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxdQyx2wFGyxQ4wuHzKp3_lh80h0ZczEoLGtc1MSCi5OsRMEABjHySqJ9ZtHoPFgNfs-g/exec";
    
    // Admin credentials
    const ADMIN_USER = "alhidaya";
    const ADMIN_PASS = "hudaelection";
    
    // Positions and candidates
    const POSITIONS = {
        president: { name: "President", candidates: [] },
        secretary: { name: "Secretary", candidates: [] },
        treasurer: { name: "Treasurer", candidates: [] }
    };
    
    let order = ["president", "secretary", "treasurer"];
    let currentPosition = "president";
    let selections = { president: null, secretary: null, treasurer: null };
    let currentVoter = null;
    let charts = {};
    
    // ============ GOOGLE SHEETS API FUNCTIONS ============
    async function fetchCandidatesFromSheet() {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getCandidates' })
            });
            const data = await response.json();
            if (data.success && data.candidates) {
                POSITIONS.president.candidates = data.candidates.president || [];
                POSITIONS.secretary.candidates = data.candidates.secretary || [];
                POSITIONS.treasurer.candidates = data.candidates.treasurer || [];
                return true;
            }
        } catch(e) {
            console.error("Error fetching candidates:", e);
        }
        // Fallback default candidates
        POSITIONS.president.candidates = [
            { id: "p1", name: "Aisha Rahman", party: "Progressive", photo: "https://randomuser.me/api/portraits/women/68.jpg", logo: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" },
            { id: "p2", name: "Omar Farooq", party: "Unity", photo: "https://randomuser.me/api/portraits/men/32.jpg", logo: "https://cdn-icons-png.flaticon.com/512/3069/3069174.png" }
        ];
        POSITIONS.secretary.candidates = [
            { id: "s1", name: "Zainab Malik", party: "Students First", photo: "https://randomuser.me/api/portraits/women/44.jpg", logo: "https://cdn-icons-png.flaticon.com/512/1946/1946484.png" },
            { id: "s2", name: "Rahul Verma", party: "Campus Voice", photo: "https://randomuser.me/api/portraits/men/45.jpg", logo: "https://cdn-icons-png.flaticon.com/512/2972/2972674.png" }
        ];
        POSITIONS.treasurer.candidates = [
            { id: "t1", name: "Fatima Khan", party: "Integrity", photo: "https://randomuser.me/api/portraits/women/90.jpg", logo: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" },
            { id: "t2", name: "Yusuf Ibrahim", party: "Trust", photo: "https://randomuser.me/api/portraits/men/75.jpg", logo: "https://cdn-icons-png.flaticon.com/512/3069/3069174.png" }
        ];
        return true;
    }
    
    async function checkIfVoted(admissionNo) {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getResults' })
            });
            const data = await response.json();
            if (data.success && data.votes) {
                return data.votes.some(v => v.admissionNo === admissionNo);
            }
        } catch(e) {
            console.error("Error checking vote status:", e);
        }
        return false;
    }
    
    async function submitVotesToSheet(admission, name, pres, sec, tres) {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'saveBulkVote',
                    admissionNo: admission,
                    voterName: name,
                    presidentVote: pres,
                    secretaryVote: sec,
                    treasurerVote: tres
                })
            });
            const data = await response.json();
            return data.success;
        } catch(e) {
            console.error("Error submitting votes:", e);
            return false;
        }
    }
    
    async function fetchResultsFromSheet() {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getResults' })
            });
            const data = await response.json();
            if (data.success) {
                return data.votes;
            }
        } catch(e) {
            console.error("Error fetching results:", e);
        }
        return [];
    }
    
    // ============ UI FUNCTIONS ============
    function playSound(freq = 780, duration = 0.2) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.value = 0.1;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            osc.stop(ctx.currentTime + duration);
        } catch(e) { }
    }
    
    function playSuccessAudio() {
        playSound(880, 0.3);
        setTimeout(() => playSound(1046, 0.3), 200);
        setTimeout(() => playSound(1318, 0.4), 500);
    }
    
    function showSuccessPopup() {
        const popup = document.getElementById("successPopup");
        popup.classList.add("active");
        let seconds = 3;
        const timerDiv = document.getElementById("popupTimer");
        const interval = setInterval(() => {
            seconds--;
            timerDiv.innerText = `Reloading in ${seconds}s...`;
            if (seconds <= 0) {
                clearInterval(interval);
                popup.classList.remove("active");
                window.location.reload();
            }
        }, 1000);
    }
    
    function renderTabs() {
        const container = document.getElementById("tabsContainer");
        container.innerHTML = "";
        order.forEach((pos, idx) => {
            const btn = document.createElement("button");
            btn.className = `pos-tab ${currentPosition === pos ? 'active' : ''} ${selections[pos] ? 'completed' : ''}`;
            btn.innerHTML = POSITIONS[pos].name;
            btn.onclick = () => {
                currentPosition = pos;
                renderTabs();
                renderCandidates();
                updateNavButtons();
                playSound(600, 0.1);
            };
            container.appendChild(btn);
        });
    }
    
    function renderCandidates() {
        const container = document.getElementById("candidatesContainer");
        const candidates = POSITIONS[currentPosition].candidates;
        if (!candidates) return;
        
        container.innerHTML = "";
        candidates.forEach(c => {
            const isSelected = selections[currentPosition] === c.id;
            const card = document.createElement("div");
            card.className = `candidate-card ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `
                <img class="candidate-photo" src="${c.photo}" onerror="this.src='https://randomuser.me/api/portraits/lego/1.jpg'">
                <img class="party-logo" src="${c.logo}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135715.png'">
                <div class="candidate-name">${c.name}</div>
                <div style="font-size: 0.8rem; color: #2c7da0;">${c.party}</div>
                <button class="select-btn" data-id="${c.id}"><i class="fas fa-check"></i> Select</button>
            `;
            const btn = card.querySelector(".select-btn");
            btn.onclick = (e) => {
                e.stopPropagation();
                selections[currentPosition] = c.id;
                renderCandidates();
                renderTabs();
                playSound(660, 0.15);
            };
            container.appendChild(card);
        });
    }
    
    function updateNavButtons() {
        const currentIdx = order.indexOf(currentPosition);
        document.getElementById("prevBtn").style.display = currentIdx === 0 ? "none" : "flex";
        const nextBtn = document.getElementById("nextBtn");
        if (currentIdx === order.length - 1) {
            nextBtn.innerHTML = "✓ Submit All Votes";
        } else {
            nextBtn.innerHTML = "Next Position →";
        }
    }
    
    async function handleNext() {
        if (!selections[currentPosition]) {
            alert(`Please select a candidate for ${POSITIONS[currentPosition].name}`);
            playSound(500, 0.2);
            return;
        }
        
        const currentIdx = order.indexOf(currentPosition);
        if (currentIdx === order.length - 1) {
            // Submit all votes
            if (!order.every(pos => selections[pos])) {
                alert("Please select candidates for all three positions");
                return;
            }
            
            const success = await submitVotesToSheet(
                currentVoter.admission,
                currentVoter.name,
                selections.president,
                selections.secretary,
                selections.treasurer
            );
            
            if (success) {
                playSuccessAudio();
                showSuccessPopup();
            } else {
                alert("Error submitting votes. You may have already voted!");
                window.location.reload();
            }
        } else {
            currentPosition = order[currentIdx + 1];
            renderTabs();
            renderCandidates();
            updateNavButtons();
        }
    }
    
    function handlePrev() {
        const currentIdx = order.indexOf(currentPosition);
        if (currentIdx > 0) {
            currentPosition = order[currentIdx - 1];
            renderTabs();
            renderCandidates();
            updateNavButtons();
        }
    }
    
    async function authenticate() {
        const name = document.getElementById("voterName").value.trim();
        const admission = document.getElementById("admissionNo").value.trim();
        const errorDiv = document.getElementById("authError");
        
        if (!name || !admission) {
            errorDiv.style.display = "block";
            errorDiv.innerHTML = "Please enter both Name and Admission Number";
            playSound(500, 0.2);
            return;
        }
        
        const alreadyVoted = await checkIfVoted(admission);
        if (alreadyVoted) {
            errorDiv.style.display = "block";
            errorDiv.innerHTML = "This Admission Number has already voted!";
            playSound(500, 0.2);
            return;
        }
        
        errorDiv.style.display = "none";
        currentVoter = { name, admission };
        selections = { president: null, secretary: null, treasurer: null };
        currentPosition = "president";
        
        document.getElementById("authSection").style.display = "none";
        document.getElementById("votingSection").style.display = "block";
        document.getElementById("welcomeMsg").innerHTML = `<i class="fas fa-user-check"></i> Welcome ${name} (${admission}) - Vote for all positions`;
        
        renderTabs();
        renderCandidates();
        updateNavButtons();
        playSound(700, 0.15);
    }
    
    // ============ DASHBOARD FUNCTIONS ============
    async function renderDashboard() {
        const votes = await fetchResultsFromSheet();
        const totalVotes = votes.length;
        const uniqueVoters = new Set(votes.map(v => v.admissionNo)).size;
        
        // Calculate vote counts per position
        const presCount = {}, secCount = {}, tresCount = {};
        POSITIONS.president.candidates.forEach(c => presCount[c.id] = 0);
        POSITIONS.secretary.candidates.forEach(c => secCount[c.id] = 0);
        POSITIONS.treasurer.candidates.forEach(c => tresCount[c.id] = 0);
        
        votes.forEach(v => {
            if (v.presidentVote && presCount[v.presidentVote] !== undefined) presCount[v.presidentVote]++;
            if (v.secretaryVote && secCount[v.secretaryVote] !== undefined) secCount[v.secretaryVote]++;
            if (v.treasurerVote && tresCount[v.treasurerVote] !== undefined) tresCount[v.treasurerVote]++;
        });
        
        const container = document.getElementById("dashboardContent");
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><i class="fas fa-users"></i><div class="stat-number">${totalVotes}</div><div>Total Votes</div></div>
                <div class="stat-card"><i class="fas fa-id-card"></i><div class="stat-number">${uniqueVoters}</div><div>Unique Voters</div></div>
                <div class="stat-card"><i class="fas fa-google"></i><div class="stat-number">✓</div><div>Google Sheets Sync</div></div>
            </div>
            <div class="chart-container">
                <div class="chart-box"><canvas id="presChart"></canvas><h4>President Race</h4></div>
                <div class="chart-box"><canvas id="secChart"></canvas><h4>Secretary Race</h4></div>
                <div class="chart-box"><canvas id="tresChart"></canvas><h4>Treasurer Race</h4></div>
            </div>
            <h3>📋 Voter Records</h3>
            <table class="result-table"><thead><tr><th>Voter</th><th>Admission</th><th>President</th><th>Secretary</th><th>Treasurer</th><th>Time</th></tr></thead><tbody id="dashTableBody"></tbody></table>
        `;
        
        // Destroy old charts
        if (charts.pres) charts.pres.destroy();
        if (charts.sec) charts.sec.destroy();
        if (charts.tres) charts.tres.destroy();
        
        charts.pres = new Chart(document.getElementById("presChart"), {
            type: 'bar',
            data: { labels: POSITIONS.president.candidates.map(c => c.name), datasets: [{ label: 'Votes', data: POSITIONS.president.candidates.map(c => presCount[c.id]), backgroundColor: '#2c7da0' }] }
        });
        charts.sec = new Chart(document.getElementById("secChart"), {
            type: 'bar',
            data: { labels: POSITIONS.secretary.candidates.map(c => c.name), datasets: [{ label: 'Votes', data: POSITIONS.secretary.candidates.map(c => secCount[c.id]), backgroundColor: '#1f6e43' }] }
        });
        charts.tres = new Chart(document.getElementById("tresChart"), {
            type: 'bar',
            data: { labels: POSITIONS.treasurer.candidates.map(c => c.name), datasets: [{ label: 'Votes', data: POSITIONS.treasurer.candidates.map(c => tresCount[c.id]), backgroundColor: '#e67e22' }] }
        });
        
        const tbody = document.getElementById("dashTableBody");
        tbody.innerHTML = votes.map(v => `<tr><td>${escapeHtml(v.voterName)}</td><td>${escapeHtml(v.admissionNo)}</td><td>${getCandidateName('president', v.presidentVote)}</td><td>${getCandidateName('secretary', v.secretaryVote)}</td><td>${getCandidateName('treasurer', v.treasurerVote)}</td><td>${v.timestamp || ''}</td></tr>`).join("");
    }
    
    function getCandidateName(pos, id) {
        const candidate = POSITIONS[pos].candidates.find(c => c.id === id);
        return candidate ? candidate.name : id || "—";
    }
    
    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // Dashboard modal functions
    const dashModal = document.getElementById("dashboardModal");
    const dashPanel = document.getElementById("dashboardPanel");
    
    function openDashboardLogin() {
        dashModal.classList.add("active");
        playSound(700, 0.15);
    }
    
    function closeDashboardLogin() {
        dashModal.classList.remove("active");
    }
    
    function closeDashboardPanel() {
        dashPanel.classList.remove("active");
    }
    
    async function validateDashboardLogin() {
        const user = document.getElementById("adminUser").value;
        const pass = document.getElementById("adminPass").value;
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            dashModal.classList.remove("active");
            await renderDashboard();
            dashPanel.classList.add("active");
            playSound(800, 0.2);
            document.getElementById("dashError").innerText = "";
        } else {
            document.getElementById("dashError").innerText = "Invalid credentials!";
            playSound(500, 0.2);
        }
    }
    
    // ============ INITIALIZATION ============
    document.getElementById("authBtn").addEventListener("click", authenticate);
    document.getElementById("nextBtn").addEventListener("click", handleNext);
    document.getElementById("prevBtn").addEventListener("click", handlePrev);
    document.getElementById("openDashboardBtn").addEventListener("click", openDashboardLogin);
    document.getElementById("dashLoginBtn").addEventListener("click", validateDashboardLogin);
    document.getElementById("closeDashModal").addEventListener("click", closeDashboardLogin);
    document.getElementById("closeDashPanel").addEventListener("click", closeDashboardPanel);
    
    // Load candidates from Google Sheets on startup
    fetchCandidatesFromSheet().then(() => {
        console.log("Candidates loaded from Google Sheets");
    });