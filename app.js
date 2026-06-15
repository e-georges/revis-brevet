const AppState = {
    data: null,
    profile: { username: "Élève de 3e", avatar: "🦊", streak: 0, lastActivity: null },
    progress: {},
    currentQuiz: { chapitreId: null, questions: [], currentIndex: 0, score: 0, modeInfini: false }
};

// Banque de secours pour le mode Quiz Infini (Garantit que ce n'est JAMAIS vide)
const BanqueSecours = [
    { enonce: "Calcul mental : Combien vaut 20% de 60 ?", options: ["A) 10", "B) 12", "C) 15", "D) 8"], bonne_reponse: 1, explication: "10% de 60 = 6, donc 20% = 6 × 2 = 12.", math: true },
    { enonce: "Quelle figure de style est utilisée dans : 'La Terre est bleue comme une orange' ?", options: ["A) Une métaphore", "B) Une personnification", "C) Une comparaison", "D) Une hyperbole"], bonne_reponse: 2, explication: "Il y a l'outil de comparaison 'comme'." },
    { enonce: "En quelle année l'ONU a-t-elle été fondée ?", options: ["A) 1918", "B) 1939", "C) 1945", "D) 1962"], bonne_reponse: 2, explication: "L'ONU a été créée en 1945 juste après la Seconde Guerre mondiale." },
    { enonce: "Si f(x) = 3x - 5, quelle est l'image de 4 ?", options: ["A) 7", "B) 12", "C) 2", "D) -1"], bonne_reponse: 0, explication: "f(4) = 3 × 4 - 5 = 12 - 5 = 7.", math: true },
    { enonce: "Trouve la bonne orthographe : 'Ils ont ___ leurs devoirs.'", options: ["A) fini", "B) finis", "C) finie", "D) finis-t"], bonne_reponse: 0, explication: "Avec l'auxiliaire avoir, le participe passé ne s'accorde pas si le COD est placé après." }
];

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
        const textData = await response.text();
        
        // Nettoyage au cas où le JSON se termine mal
        let cleanText = textData.trim();
        if (!cleanText.endsWith("}")) {
            console.warn("JSON tronqué détecté, tentative de réparation...");
            cleanText = cleanText.substring(0, cleanText.lastIndexOf("}")) + "}]}]}"; 
        }
        
        AppState.data = JSON.parse(cleanText);
        
        // Initialise la progression
        AppState.data.matieres.forEach(mat => {
            mat.chapitres.forEach(chap => {
                if (!AppState.progress[chap.id]) AppState.progress[chap.id] = "a_reviser";
            });
        });
    } catch (error) {
        console.error("Erreur JSON, chargement de la banque de secours...", error);
        // Création d'une structure par défaut pour que l'écran ne soit pas blanc
        AppState.data = {
            matieres: [
                {
                    id: "maths", label: "Mathématiques", emoji: "📐", couleur: "#3D5A99",
                    chapitres: [{ id: "maths_01", titre: "Automatismes (Secours)", priorite: "haute", fiche: "Entraîne-toi sur le calcul mental.", quiz: BanqueSecours.filter(q => q.math) }]
                },
                {
                    id: "francais", label: "Français", emoji: "📖", couleur: "#9B5DE5",
                    chapitres: [{ id: "fr_01", titre: "Langue et Style (Secours)", priorite: "haute", fiche: "Grammaire et figures de style.", quiz: BanqueSecours.filter(q => !q.math) }]
                }
            ]
        };
    }
    
    buildNavigationMenu();
    renderDashboardHome();
    updateGlobalProgressRing();
}

function buildNavigationMenu() {
    const menu = document.getElementById("sidebar-menu");
    menu.innerHTML = `
        <li><a class="nav-item active" id="btn-home"><span>🏠</span><span>Accueil</span></a></li>
        <li><a class="nav-item" id="btn-infini" style="background: linear-gradient(135deg, #ff007f, #7928ca); color: white; border-radius: 6px; font-weight: bold; margin-top: 10px;"><span>🔥</span><span>QUIZ INFINI</span></a></li>
    `;
    
    document.getElementById("btn-home").addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
        document.getElementById("btn-home").classList.add("active");
        renderDashboardHome();
    });

    document.getElementById("btn-infini").addEventListener("click", () => {
        startQuizInfini();
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
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>Mes Matières</h2>
            <button id="main-infini-btn" class="btn" style="background: linear-gradient(135deg, #2ec4b6, #3d5a99); color: white; font-weight: bold; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; shadow: 0 4px 6px rgba(0,0,0,0.1);">🚀 Lancer un Quiz Infini</button>
        </div>
        <div class="matieres-grid" id="matieres-grid"></div>
    `;
    
    document.getElementById("main-infini-btn").addEventListener("click", startQuizInfini);
    const grid = document.getElementById("matieres-grid");
    
    AppState.data.matieres.forEach(mat => {
        const total = mat.chapitres ? mat.chapitres.length : 0;
        const acquis = mat.chapitres ? mat.chapitres.filter(c => AppState.progress[c.id] === "acquis").length : 0;
        const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;

        const card = document.createElement("div");
        card.className = "card";
        card.style.borderLeft = `5px solid ${mat.couleur || '#3d5a99'}`;
        card.style.cursor = "pointer";
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
    container.innerHTML = `<div style="margin-bottom:24px;"><button id="back-btn" class="btn" style="padding:6px 12px; background:none; border:1px solid var(--border-color); border-radius:4px; cursor:pointer; color:var(--text-primary);">← Retour</button><h2 style="margin-top:16px;">${mat.emoji || "📚"} ${mat.label}</h2></div><div class="chapitres-list" style="display:grid; gap:16px;"></div>`;
    document.getElementById("back-btn").addEventListener("click", renderDashboardHome);

    const list = container.querySelector(".chapitres-list");
    if(!mat.chapitres) return;
    
    mat.chapitres.forEach(chap => {
        const stat = AppState.progress[chap.id] || "a_reviser";
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span class="status-badge status-${stat}">${stat === "acquis" ? "🟢 Acquis" : "⚪ À réviser"}</span>
                <span style="font-size:0.8rem; padding:2px 6px; background:#F3F4F6; border-radius:4px; font-weight:bold; color:#333;">⚠️ Priorité ${chap.priorite || "moyenne"}</span>
            </div>
            <h4>${chap.titre}</h4>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:8px; line-height:1.4;">${chap.fiche}</p>
            <div style="margin-top:16px; display:flex; gap:8px;">
                <button class="btn-quiz" style="padding:8px 16px; font-size:0.85rem; cursor:pointer; background:#3D5A99; color:white; border:none; border-radius:4px; font-weight:600;">🎯 Lancer le Quiz</button>
            </div>
        `;
        card.querySelector(".btn-quiz").addEventListener("click", () => startQuiz(chap));
        list.appendChild(card);
    });
}

// --- LOGIQUE MAGIQUE DES QUIZ INFINIS ---
function getAllQuestions() {
    let list = [...BanqueSecours];
    if (AppState.data && AppState.data.matieres) {
        AppState.data.matieres.forEach(m => {
            if(m.chapitres) {
                m.chapitres.forEach(c => {
                    if (c.quiz) list = list.concat(c.quiz);
                });
            }
        });
    }
    // Mélange aléatoire des questions
    return list.sort(() => Math.random() - 0.5);
}

function startQuizInfini() {
    const qList = getAllQuestions();
    AppState.currentQuiz = { chapitreId: "infini", questions: qList, currentIndex: 0, score: 0, modeInfini: true };
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function startQuiz(chapitre) {
    if (!chapitre.quiz || chapitre.quiz.length === 0) return alert("Pas de questions dispo.");
    AppState.currentQuiz = { chapitreId: chapitre.id, questions: chapitre.quiz, currentIndex: 0, score: 0, modeInfini: false };
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function showQuestion() {
    const q = AppState.currentQuiz.questions[AppState.currentQuiz.currentIndex];
    const totalQ = AppState.currentQuiz.modeInfini ? "∞" : AppState.currentQuiz.questions.length;
    
    document.getElementById("quiz-progress").innerText = AppState.currentQuiz.modeInfini 
        ? `🔥 Mode Infini — Question ${AppState.currentQuiz.currentIndex + 1} (Score: ${AppState.currentQuiz.score})`
        : `Question ${AppState.currentQuiz.currentIndex + 1}/${totalQ}`;
        
    document.getElementById("quiz-question-text").innerText = q.enonce;
    document.getElementById("quiz-explanation").classList.add("hidden");
    document.getElementById("quiz-next-btn").classList.add("hidden");

    const container = document.getElementById("quiz-options-container");
    container.innerHTML = "";
    q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.style.width = "100%"; btn.style.padding = "12px"; btn.style.textAlign = "left"; btn.style.cursor = "pointer";
        btn.style.margin = "6px 0"; btn.style.border = "1px solid #E5E7EB"; btn.style.borderRadius = "6px";
        btn.style.background = "white"; btn.style.color = "#1F2937"; btn.style.fontWeight = "500";
        btn.innerText = opt;
        
        btn.addEventListener("click", () => {
            Array.from(container.children).forEach(b => b.disabled = true);
            if (idx === q.bonne_reponse) { 
                btn.style.background = "#D1FAE5"; btn.style.borderColor = "#10B981"; 
                AppState.currentQuiz.score++; 
            } else { 
                btn.style.background = "#FEE2E2"; btn.style.borderColor = "#EF4444"; 
                container.children[q.bonne_reponse].style.background = "#D1FAE5";
                container.children[q.bonne_reponse].style.borderColor = "#10B981";
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
    
    // En mode infini, on enchaîne indéfiniment
    if (AppState.currentQuiz.modeInfini) {
        if (AppState.currentQuiz.currentIndex >= AppState.currentQuiz.questions.length) {
            // Si on arrive au bout du stock, on re-mélange
            AppState.currentQuiz.questions = getAllQuestions();
            AppState.currentQuiz.currentIndex = 0;
        }
        showQuestion();
    } else {
        // Mode normal par chapitre
        if (AppState.currentQuiz.currentIndex < AppState.currentQuiz.questions.length) {
            showQuestion();
        } else {
            alert(`Quiz terminé ! Score : ${AppState.currentQuiz.score}/${AppState.currentQuiz.questions.length}`);
            document.getElementById("quiz-modal").classList.remove("active");
            renderDashboardHome();
        }
    }
});

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
    document.getElementById("display-username").innerText = AppState.profile.username;
    document.getElementById("welcome-name").innerText = AppState.profile.username;
    document.getElementById("display-avatar").innerText = AppState.profile.avatar;
    document.getElementById("display-streak").innerText = AppState.profile.streak;
}

function setupEventListeners() {
    const toggle = () => document.body.classList.toggle("dark-mode");
    document.getElementById("theme-toggle").addEventListener("click", toggle);
    document.getElementById("theme-toggle-mobile").addEventListener("click", toggle);
}
