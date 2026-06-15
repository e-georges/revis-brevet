// --- ORCHESTRATEUR PRINCIPAL METAMORPHOSÉ v2.0 ---
import { 
    updateNiveauAdaptatif, 
    selectionnerQuestionsAdaptatives, 
    getNiveauActuel, 
    getMessageMotivation 
} from './adaptive-engine.js';

const AppState = {
    data: null,
    profile: { username: "Élève de 3e", avatar: "🦊", streak: 0 },
    progress: {},
    currentQuiz: { chapitreId: null, questions: [], currentIndex: 0, score: 0, modeInfini: false }
};

document.addEventListener("DOMContentLoaded", () => {
    initLocalStorage();
    loadPedagogicalData();
    setupEventListeners();
});

function initLocalStorage() {
    if (localStorage.getItem("revis_profile")) AppState.profile = JSON.parse(localStorage.getItem("revis_profile"));
    if (localStorage.getItem("revis_progress")) AppState.progress = JSON.parse(localStorage.getItem("revis_progress"));
    renderProfileUI();
}

async function loadPedagogicalData() {
    try {
        const response = await fetch('data/troisieme.json');
        if (!response.ok) throw new Error("Fichier introuvable");
        AppState.data = await response.json();
        
        AppState.data.matieres.forEach(mat => {
            mat.chapitres.forEach(chap => {
                if (!AppState.progress[chap.id]) AppState.progress[chap.id] = "a_reviser";
            });
        });
    } catch (error) {
        console.error("Erreur. Configuration de secours activée.", error);
        AppState.data = { matieres: [] };
    }
    
    buildNavigationMenu();
    renderDashboardHome();
    updateGlobalProgressRing();
}

function buildNavigationMenu() {
    const menu = document.getElementById("sidebar-menu");
    if (!menu) return;
    menu.innerHTML = `
        <li><a class="nav-item active" id="btn-home"><span>🏠</span><span>Accueil</span></a></li>
        <li><a class="nav-item" id="btn-infini" style="background: linear-gradient(135deg, #ff007f, #7928ca); color: white; border-radius: 6px; font-weight: bold; margin-top: 10px;"><span>🔥</span><span>QUIZ INFINI</span></a></li>
    `;
    
    document.getElementById("btn-home").addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
        document.getElementById("btn-home").classList.add("active");
        renderDashboardHome();
    });

    document.getElementById("btn-infini").addEventListener("click", startQuizInfini);
    
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
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>Mes Matières</h2>
            <button id="main-infini-btn" class="btn-primary">🚀 Mode Adaptatif Global</button>
        </div>
        
        ${AppState.data.pieges_classiques ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; color: #78350f;">
                <strong>⚠️ Le Piège Classique du Jour :</strong> ${AppState.data.pieges_classiques[Math.floor(Math.random() * AppState.data.pieges_classiques.length)]}
            </div>
        ` : ''}

        <div class="matieres-grid" id="matieres-grid"></div>
    `;
    
    document.getElementById("main-infini-btn").addEventListener("click", startQuizInfini);
    const grid = document.getElementById("matieres-grid");
    
    AppState.data.matieres.forEach(mat => {
        const total = mat.chapitres?.length || 0;
        const acquis = mat.chapitres?.filter(c => AppState.progress[c.id] === "acquis").length || 0;
        const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;

        const card = document.createElement("div");
        card.className = "card";
        card.style.borderLeft = `5px solid ${mat.couleur || '#3d5a99'}`;
        card.innerHTML = `
            <h3>${mat.emoji || "📚"} ${mat.label}</h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin: 8px 0 16px;">${total} chapitres dispos</p>
            <div style="background:#E5E7EB; height:6px; border-radius:3px; overflow:hidden;"><div style="background:#3D5A99; width:${pct}%; height:100%;"></div></div>
        `;
        card.addEventListener("click", () => renderMatiereView(mat.id));
        grid.appendChild(card);
    });
}

function renderMatiereView(matId) {
    const mat = AppState.data.matieres.find(m => m.id === matId);
    if (!mat) return;
    
    const container = document.getElementById("app-view-container");
    container.innerHTML = `
        <div style="margin-bottom:24px;">
            <button id="back-btn" class="btn-primary" style="padding:6px 12px;">← Retour</button>
            <h2 style="margin-top:16px;">${mat.emoji || "📚"} ${mat.label}</h2>
        </div>
        <div class="chapitres-list" style="display:grid; gap:16px;"></div>
    `;
    document.getElementById("back-btn").addEventListener("click", renderDashboardHome);

    const list = container.querySelector(".chapitres-list");
    
    mat.chapitres.forEach(chapitre => {
        const stat = AppState.progress[chapitre.id] || "a_reviser";
        const currentNiveau = getNiveauActuel(chapitre.id);
        
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span class="status-badge status-${stat}">${stat === "acquis" ? "🟢 Acquis (Niveau 3)" : "⚪ Entraînement"}</span>
                <span style="font-size:0.8rem; padding:2px 8px; background:#e0f2fe; color:#0369a1; border-radius:12px; font-weight:bold;">📊 Rang Évolutif : Niv. ${currentNiveau}</span>
            </div>
            <h4>${chapitre.titre}</h4>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:8px; line-height:1.4;">${chapitre.fiche}</p>
            ${chapitre.conseil_strategique ? `<p style="font-size:0.8rem; color:#047857; background:#ecfdf5; padding:8px; border-radius:6px; margin-top:10px;">💡 <strong>Conseil :</strong> ${chapitre.conseil_strategique}</p>` : ''}
            <div style="margin-top:16px;">
                <button class="btn-quiz btn-primary" style="font-size:0.85rem;">🎯 Démarrer le Quiz Adaptatif</button>
            </div>
        `;
        card.querySelector(".btn-quiz").addEventListener("click", () => startQuizAdaptatif(chapitre));
        list.appendChild(card);
    });
}

function startQuizAdaptatif(chapitre) {
    if (!chapitre.quiz || chapitre.quiz.length === 0) return alert("Pas de questions disponibles.");
    const questionsFiltrees = selectionnerQuestionsAdaptatives(chapitre.quiz, chapitre.id, 5);
    
    AppState.currentQuiz = { chapitreId: chapitre.id, questions: questionsFiltrees, currentIndex: 0, score: 0, modeInfini: false };
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function startQuizInfini() {
    let toutesLesQuestions = [];
    AppState.data.matieres.forEach(m => { m.chapitres.forEach(c => { if (c.quiz) toutesLesQuestions = toutesLesQuestions.concat(c.quiz); }); });
    if(toutesLesQuestions.length === 0) return alert("Aucune question trouvée.");
    
    AppState.currentQuiz = { chapitreId: "global_infini", questions: toutesLesQuestions.sort(() => Math.random() - 0.5), currentIndex: 0, score: 0, modeInfini: true };
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function showQuestion() {
    const q = AppState.currentQuiz.questions[AppState.currentQuiz.currentIndex];
    const infoNiveau = getNiveauActuel(AppState.currentQuiz.chapitreId);
    
    document.getElementById("quiz-progress").innerHTML = AppState.currentQuiz.modeInfini 
        ? `🔥 Mode Infini Évolutif — Score: ${AppState.currentQuiz.score}`
        : `Niveau ${q.difficulte || infoNiveau}/3 — Q. ${AppState.currentQuiz.currentIndex + 1}/${AppState.currentQuiz.questions.length}<br><small style="color:#6b7280; font-weight:normal;">${getMessageMotivation(q.difficulte || infoNiveau)}</small>`;
        
    document.getElementById("quiz-question-text").innerHTML = q.enonce;
    if(q.annale) document.getElementById("quiz-question-text").innerHTML += `<br><span style="display:inline-block; margin-top:8px; font-size:0.75rem; background:#f3f4f6; padding:2px 6px; border-radius:4px; color:#4b5563;">📜 Annale : ${q.annale}</span>`;

    document.getElementById("quiz-explanation").classList.add("hidden");
    document.getElementById("quiz-next-btn").classList.add("hidden");

    const container = document.getElementById("quiz-options-container");
    container.innerHTML = "";
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "btn-option";
        btn.innerText = opt;
        
        btn.addEventListener("click", () => {
            Array.from(container.children).forEach(b => b.disabled = true);
            const isCorrect = (idx === q.bonne_reponse);
            
            if (isCorrect) { 
                btn.style.background = "#D1FAE5"; btn.style.borderColor = "#10B981"; 
                AppState.currentQuiz.score++; 
            } else { 
                btn.style.background = "#FEE2E2"; btn.style.borderColor = "#EF4444"; 
                container.children[q.bonne_reponse].style.background = "#D1FAE5";
                container.children[q.bonne_reponse].style.borderColor = "#10B981";
            }
            
            if(!AppState.currentQuiz.modeInfini) {
                const action = updateNiveauAdaptatif(AppState.currentQuiz.chapitreId, isCorrect);
                if(action.montee) showToast("🎉 Niveau supérieur débloqué !");
                if(action.descente) showToast("📉 Niveau réajusté pour consolider vos bases.");
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
    if (AppState.currentQuiz.currentIndex < AppState.currentQuiz.questions.length) {
        showQuestion();
    } else {
        if(!AppState.currentQuiz.modeInfini && AppState.currentQuiz.score >= 4) {
            AppState.progress[AppState.currentQuiz.chapitreId] = "acquis";
            localStorage.setItem("revis_progress", JSON.stringify(AppState.progress));
        }
        alert(`Session terminée ! Score : ${AppState.currentQuiz.score}/${AppState.currentQuiz.questions.length}`);
        document.getElementById("quiz-modal").classList.remove("active");
        renderDashboardHome();
        updateGlobalProgressRing();
    }
});

function showToast(message) {
    const toast = document.createElement("div");
    toast.style.position = "fixed"; toast.style.bottom = "80px"; toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)"; toast.style.background = "#1e293b";
    toast.style.color = "white"; toast.style.padding = "12px 24px"; toast.style.borderRadius = "30px";
    toast.style.fontSize = "0.9rem"; toast.style.zIndex = "10000";
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function updateGlobalProgressRing() {
    const circle = document.getElementById("global-progress-circle");
    if (!circle) return;
    const circumference = 52 * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const total = Object.keys(AppState.progress).length;
    const acquis = Object.values(AppState.progress).filter(v => v === "acquis").length;
    const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;
    circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    document.getElementById("global-progress-percent").innerText = pct;
}

function renderProfileUI() {
    if (document.getElementById("display-username")) document.getElementById("display-username").innerText = AppState.profile.username;
    if (document.getElementById("welcome-name")) document.getElementById("welcome-name").innerText = AppState.profile.username;
    if (document.getElementById("display-avatar")) document.getElementById("display-avatar").innerText = AppState.profile.avatar;
    if (document.getElementById("display-streak")) document.getElementById("display-streak").innerText = AppState.profile.streak;
}

function setupEventListeners() {
    const toggle = () => document.body.classList.toggle("dark-mode");
    if (document.getElementById("theme-toggle")) document.getElementById("theme-toggle").addEventListener("click", toggle);
    if (document.getElementById("theme-toggle-mobile")) document.getElementById("theme-toggle-mobile").addEventListener("click", toggle);
    
    const closeBtn = document.getElementById("quiz-close-btn");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("quiz-modal").classList.remove("active");
            renderDashboardHome();
        });
    }
}
