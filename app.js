const AppState = {
    data: null,
    profile: { username: "Élève de 3e", avatar: "🦊", streak: 0, lastActivity: null },
    progress: {},
    scores: {},
    currentQuiz: { chapitreId: null, questions: [], currentIndex: 0, score: 0 }
};

document.addEventListener("DOMContentLoaded", () => {
    initLocalStorage();
    loadPedagogicalData();
    setupEventListeners();
});

function initLocalStorage() {
    if (localStorage.getItem("revis_profile")) AppState.profile = JSON.parse(localStorage.getItem("revis_profile"));
    else localStorage.setItem("revis_profile", JSON.stringify(AppState.profile));

    if (localStorage.getItem("revis_progress")) AppState.progress = JSON.parse(localStorage.getItem("revis_progress"));
    if (localStorage.getItem("revis_scores")) AppState.scores = JSON.parse(localStorage.getItem("revis_scores"));

    checkAndUpdateStreak();
    renderProfileUI();
}

function checkAndUpdateStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (AppState.profile.lastActivity) {
        const lastDate = new Date(AppState.profile.lastActivity);
        const diffDays = Math.ceil(Math.abs(new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) AppState.profile.streak += 1;
        else if (diffDays > 1) AppState.profile.streak = 1;
    } else { AppState.profile.streak = 1; }
    AppState.profile.lastActivity = today;
    localStorage.setItem("revis_profile", JSON.stringify(AppState.profile));
}

async function loadPedagogicalData() {
    try {
        const response = await fetch('data/troisieme.json');
        if (!response.ok) throw new Error("Fichier introuvable.");
        AppState.data = await response.json();
        
        // Initialisation de la progression pour chaque chapitre
        AppState.data.matieres.forEach(mat => {
            mat.chapitres.forEach(chap => {
                if (!AppState.progress[chap.id]) AppState.progress[chap.id] = "a_reviser";
            });
        });
        localStorage.setItem("revis_progress", JSON.stringify(AppState.progress));

        buildNavigationMenu();
        renderDashboardHome();
        updateGlobalProgressRing();
    } catch (error) {
        console.error(error);
        document.getElementById("app-view-container").innerHTML = `<div class="card" style="border-left:4px solid var(--color-danger)"><h3>⚠️ Erreur</h3><p>Vérifiez que troisieme.json est placé dans un dossier nommé 'data' et qu'il est correct.</p></div>`;
    }
}

function buildNavigationMenu() {
    const menu = document.getElementById("sidebar-menu");
    menu.innerHTML = `<li><a class="nav-item active" id="btn-home"><span>🏠</span><span>Accueil</span></a></li>`;
    document.getElementById("btn-home").addEventListener("click", (e) => {
        document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
        e.currentTarget.classList.add("active");
        renderDashboardHome();
    });
    
    AppState.data.matieres.forEach(mat => {
        const li = document.createElement("li");
        li.innerHTML = `<a class="nav-item"><span>${mat.emoji}</span><span>${mat.label}</span></a>`;
        li.querySelector("a").addEventListener("click", (e) => {
            document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
            e.currentTarget.classList.add("active");
            renderMatiereView(mat.id);
        });
        menu.appendChild(li);
    });
}

function renderDashboardHome() {
    const container = document.getElementById("app-view-container");
    container.innerHTML = `<h2 style="margin-bottom:20px;">Mes Matières</h2><div class="matieres-grid" id="matieres-grid"></div>`;
    const grid = document.getElementById("matieres-grid");
    
    AppState.data.matieres.forEach(mat => {
        const total = mat.chapitres.length;
        const acquis = mat.chapitres.filter(c => AppState.progress[c.id] === "acquis").length;
        const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;

        const card = document.createElement("div");
        card.className = "card";
        card.style.borderLeft = `5px solid ${mat.couleur || 'var(--color-primary)'}`;
        card.style.cursor = "pointer";
        card.innerHTML = `
            <h3>${mat.emoji} ${mat.label}</h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin: 8px 0 16px;">${total} chapitres</p>
            <div style="background:#E5E7EB; height:6px; border-radius:3px; overflow:hidden;"><div style="background:var(--color-primary); width:${pct}%; height:100%;"></div></div>
            <p style="font-size:0.75rem; font-weight:700; text-align:right; margin-top:4px;">${pct}% acquis</p>
        `;
        card.addEventListener("click", () => renderMatiereView(mat.id));
        grid.appendChild(card);
    });
}

function renderMatiereView(matId) {
    const mat = AppState.data.matieres.find(m => m.id === matId);
    if (!mat) return;
    
    const container = document.getElementById("app-view-container");
    container.innerHTML = `<div style="margin-bottom:24px;"><button id="back-btn" class="btn" style="padding:6px 12px; background:none; border:1px solid var(--border-color); border-radius:4px; cursor:pointer; color:var(--text-primary);">← Retour</button><h2 style="margin-top:16px;">${mat.emoji} ${mat.label}</h2></div><div class="chapitres-list" style="display:grid; gap:16px;"></div>`;
    document.getElementById("back-btn").addEventListener("click", renderDashboardHome);

    const list = container.querySelector(".chapitres-list");
    mat.chapitres.forEach(chap => {
        const stat = AppState.progress[chap.id] || "a_reviser";
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span class="status-badge status-${stat}">${formatStatut(stat)}</span>
                <span style="font-size:0.8rem; padding:2px 6px; background:#F3F4F6; border-radius:4px; font-weight:bold;">⚠️ Priorité ${chap.priorite}</span>
            </div>
            <h4>${chap.titre}</h4>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:8px; line-height:1.4;">${chap.fiche}</p>
            <div style="margin-top:16px; display:flex; gap:8px;">
                <button class="btn-status" style="padding:6px 12px; font-size:0.8rem; cursor:pointer; border:1px solid var(--border-color); background:none; border-radius:4px; color:var(--text-primary);">🔄 Statut</button>
                <button class="btn-quiz" style="padding:6px 12px; font-size:0.8rem; cursor:pointer; background:var(--color-primary); color:white; border:none; border-radius:4px; font-weight:600;">🎯 Quiz</button>
            </div>
        `;
        card.querySelector(".btn-status").addEventListener("click", (e) => { e.stopPropagation(); cycleStatus(chap.id); renderMatiereView(matId); });
        card.querySelector(".btn-quiz").addEventListener("click", (e) => { e.stopPropagation(); startQuiz(chap); });
        list.appendChild(card);
    });
}

function cycleStatus(chapId) {
    const order = ["a_reviser", "en_cours", "acquis"];
    AppState.progress[chapId] = order[(order.indexOf(AppState.progress[chapId]) + 1) % order.length];
    localStorage.setItem("revis_progress", JSON.stringify(AppState.progress));
    updateGlobalProgressRing();
}

function startQuiz(chapitre) {
    if (!chapitre.quiz || chapitre.quiz.length === 0) return alert("Pas de quiz disponible pour ce chapitre.");
    AppState.currentQuiz = { chapitreId: chapitre.id, questions: chapitre.quiz, currentIndex: 0, score: 0 };
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function showQuestion() {
    const q = AppState.currentQuiz.questions[AppState.currentQuiz.currentIndex];
    document.getElementById("quiz-progress").innerText = `Question ${AppState.currentQuiz.currentIndex + 1}/${AppState.currentQuiz.questions.length}`;
    document.getElementById("quiz-question-text").innerText = q.enonce;
    document.getElementById("quiz-explanation").classList.add("hidden");
    document.getElementById("quiz-next-btn").classList.add("hidden");

    const container = document.getElementById("quiz-options-container");
    container.innerHTML = "";
    q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "btn-option";
        btn.style.width = "100%"; 
        btn.style.padding = "12px"; 
        btn.style.textAlign = "left"; 
        btn.style.cursor = "pointer";
        btn.style.margin = "4px 0";
        btn.style.border = "1px solid var(--border-color)";
        btn.style.borderRadius = "6px";
        btn.style.background = "var(--bg-card)";
        btn.style.color = "var(--text-primary)";
        btn.innerText = opt;
        
        btn.addEventListener("click", () => {
            Array.from(container.children).forEach(b => b.disabled = true);
            if (idx === q.bonne_reponse) { 
                btn.style.background = "rgba(46,196,182,0.2)"; 
                btn.style.borderColor = "#2ec4b6"; 
                AppState.currentQuiz.score++; 
            } else { 
                btn.style.background = "rgba(232,72,85,0.2)"; 
                btn.style.borderColor = "#e84855"; 
                container.children[q.bonne_reponse].style.background = "rgba(46,196,182,0.2)"; 
                container.children[q.bonne_reponse].style.borderColor = "#2ec4b6"; 
            }
            document.getElementById("explanation-text").innerText = q.explication;
            document.getElementById("quiz-explanation").classList.remove("hidden");
            document.getElementById("quiz-next-btn").classList.remove("hidden");
        });
        container.appendChild(btn);
    });
}

document.getElementById("quiz-next-btn").addEventListener("click", () => {
    AppState.currentQuiz.currentIndex++;
    if (AppState.currentQuiz.currentIndex < AppState.currentQuiz.questions.length) showQuestion();
    else {
        const cId = AppState.currentQuiz.chapitreId;
        if (AppState.currentQuiz.score === AppState.currentQuiz.questions.length) AppState.progress[cId] = "acquis";
        localStorage.setItem("revis_progress", JSON.stringify(AppState.progress));
        updateGlobalProgressRing();
        alert(`Quiz terminé ! Ton score : ${AppState.currentQuiz.score}/${AppState.currentQuiz.questions.length}`);
        document.getElementById("quiz-modal").classList.remove("active");
        renderDashboardHome();
    }
});

function updateGlobalProgressRing() {
    const circle = document.getElementById("global-progress-circle");
    if (!circle) return;
    const circumference = 52 * 2 * Math.PI; // r=52
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const total = Object.keys(AppState.progress).length;
    const acquis = Object.values(AppState.progress).filter(v => v === "acquis").length;
    const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;
    circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    document.getElementById("global-progress-percent").innerText = pct;
}

function renderProfileUI() {
    document.getElementById("display-username").innerText = AppState.profile.username;
    document.getElementById("welcome-name").innerText = AppState.profile.username;
    document.getElementById("display-avatar").innerText = AppState.profile.avatar;
    document.getElementById("display-streak").innerText = AppState.profile.streak;
}

function formatStatut(s) { return s === "a_reviser" ? "⚪ À réviser" : s === "en_cours" ? "🟡 En cours" : "🟢 Acquis"; }

function setupEventListeners() {
    const toggle = () => document.body.classList.toggle("dark-mode");
    document.getElementById("theme-toggle").addEventListener("click", toggle);
    document.getElementById("theme-toggle-mobile").addEventListener("click", toggle);
    document.getElementById("edit-profile-btn").addEventListener("click", () => { document.getElementById("input-username").value = AppState.profile.username; document.getElementById("profile-modal").classList.add("active"); });
    document.getElementById("close-modal-btn").addEventListener("click", () => document.getElementById("profile-modal").classList.remove("active"));
    document.getElementById("profile-form").addEventListener("submit", (e) => {
        e.preventDefault(); 
        AppState.profile.username = document.getElementById("input-username").value; 
        AppState.profile.avatar = document.querySelector('input[name="avatar"]:checked').value; 
        localStorage.setItem("revis_profile", JSON.stringify(AppState.profile)); 
        renderProfileUI(); 
        document.getElementById("profile-modal").classList.remove("active"); 
    });
}
