// ============================================================
// RévisBrevet 2026 — app.js
// Moteur adaptatif + Programme de progression + Automatismes MEN
// ============================================================
import {
    updateNiveauAdaptatif,
    selectionnerQuestionsAdaptatives,
    getNiveauActuel,
    getMessageMotivation
} from './adaptive-engine.js';

// ── ÉTAT GLOBAL ──────────────────────────────────────────────
const AppState = {
    data: null,
    progress: {},
    currentQuiz: {
        chapitreId: null, questions: [], currentIndex: 0,
        score: 0, modeInfini: false, historique: []
    }
};

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    loadProgress();
    loadPedagogicalData();
    setupEventListeners();
});

function loadProgress() {
    try {
        const saved = localStorage.getItem("rb_progress");
        if (saved) AppState.progress = JSON.parse(saved);
    } catch(e) { AppState.progress = {}; }
    renderProfileUI();
}

function saveProgress() {
    localStorage.setItem("rb_progress", JSON.stringify(AppState.progress));
}

async function loadPedagogicalData() {
    try {
        const res = await fetch('data/troisieme.json');
        if (!res.ok) throw new Error("Fichier introuvable");
        AppState.data = await res.json();

        // Initialiser la progression pour tous les chapitres
        AppState.data.matieres.forEach(mat => {
            mat.chapitres.forEach(chap => {
                if (!AppState.progress[chap.id]) AppState.progress[chap.id] = "a_reviser";
            });
        });
        saveProgress();
    } catch(e) {
        console.error("Erreur chargement JSON:", e);
        AppState.data = { matieres: [], programme_progression: null };
    }
    buildNavigationMenu();
    renderDashboardHome();
    updateGlobalProgressRing();
}

// ── NAVIGATION SIDEBAR ────────────────────────────────────────
function buildNavigationMenu() {
    const menu = document.getElementById("sidebar-menu");
    if (!menu) return;
    menu.innerHTML = `
        <li><a class="nav-item active" id="btn-home"><span>🏠</span><span>Tableau de bord</span></a></li>
        <li><a class="nav-item" id="btn-programme"><span>📅</span><span>Programme de révision</span></a></li>
        <li><a class="nav-item" id="btn-auto"><span>⚡</span><span>Automatismes MEN</span></a></li>
        <li><a class="nav-item" id="btn-infini" style="background:linear-gradient(135deg,#E84855,#3D5A99);color:white;border-radius:6px;font-weight:bold;margin-top:10px;">
            <span>🔥</span><span>EXAMEN BLANC</span></a></li>
    `;

    document.getElementById("btn-home").addEventListener("click", () => { setActiveNav("btn-home"); renderDashboardHome(); });
    document.getElementById("btn-programme").addEventListener("click", () => { setActiveNav("btn-programme"); renderProgrammeProgression(); });
    document.getElementById("btn-auto").addEventListener("click", () => { setActiveNav("btn-auto"); renderAutomatismes(); });
    document.getElementById("btn-infini").addEventListener("click", startExamenBlanc);

    AppState.data.matieres.forEach(mat => {
        const li = document.createElement("li");
        li.innerHTML = `<a class="nav-item" data-mat="${mat.id}"><span>${mat.emoji}</span><span>${mat.label.split(' — ')[0]}</span></a>`;
        li.querySelector("a").addEventListener("click", (e) => {
            setActiveNav(null, e.currentTarget);
            renderMatiereView(mat.id);
        });
        menu.appendChild(li);
    });
}

function setActiveNav(id, el) {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    if (id) { const t = document.getElementById(id); if (t) t.classList.add("active"); }
    else if (el) el.classList.add("active");
}

// ── DASHBOARD HOME ────────────────────────────────────────────
function renderDashboardHome() {
    const container = document.getElementById("app-view-container");
    if (!container) return;

    const semaineActive = getSemaineActive();
    const prog = AppState.data.programme_progression;

    container.innerHTML = `
        ${prog ? `
        <div style="background:linear-gradient(135deg,#3D5A99,#5A78B5);color:white;padding:16px 20px;border-radius:12px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
                <div style="font-size:0.75rem;opacity:0.8;text-transform:uppercase;letter-spacing:0.05em;">Programme en cours</div>
                <div style="font-size:1rem;font-weight:700;margin-top:4px;">${semaineActive ? semaineActive.label : 'Programme terminé 🎉'}</div>
                ${semaineActive ? `<div style="font-size:0.8rem;opacity:0.9;margin-top:4px;">${semaineActive.conseil}</div>` : ''}
            </div>
            <button onclick="renderProgrammeProgression();setActiveNav('btn-programme')" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.4);padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">
                Voir le planning →
            </button>
        </div>` : ''}

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <h2 style="color:var(--text-primary);">Mes matières</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button onclick="renderAutomatismes();setActiveNav('btn-auto')" style="background:#EEF2FF;color:#3D5A99;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;">⚡ Automatismes MEN</button>
                <button id="main-infini-btn" style="background:linear-gradient(135deg,#E84855,#3D5A99);color:white;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;">🔥 Examen blanc</button>
            </div>
        </div>
        <div class="matieres-grid" id="matieres-grid"></div>
    `;

    document.getElementById("main-infini-btn").addEventListener("click", startExamenBlanc);
    const grid = document.getElementById("matieres-grid");

    AppState.data.matieres.forEach(mat => {
        const total = mat.chapitres?.length || 0;
        const acquis = mat.chapitres?.filter(c => AppState.progress[c.id] === "acquis").length || 0;
        const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;
        const estSemaineCourante = semaineActive?.chapitres_prioritaires?.some(id => mat.chapitres?.some(c => c.id === id));

        const card = document.createElement("div");
        card.className = "card";
        card.style.borderLeft = `5px solid ${mat.couleur}`;
        if (estSemaineCourante) card.style.boxShadow = `0 0 0 2px ${mat.couleur}40`;

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                <h3 style="color:var(--text-primary)">${mat.emoji} ${mat.label.split(' — ')[0]}</h3>
                ${estSemaineCourante ? '<span style="font-size:0.7rem;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:10px;font-weight:700;">📅 Cette semaine</span>' : ''}
            </div>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin:4px 0 12px;">${total} chapitres · ${acquis} acquis</p>
            <div style="background:var(--border-color,#E5E7EB);height:6px;border-radius:3px;overflow:hidden;margin-bottom:8px;">
                <div style="background:${mat.couleur};width:${pct}%;height:100%;transition:width 0.5s;"></div>
            </div>
            <div style="font-size:0.75rem;color:var(--text-secondary);text-align:right;">${pct}%</div>
        `;
        card.addEventListener("click", () => renderMatiereView(mat.id));
        grid.appendChild(card);
    });
}

// ── PROGRAMME DE PROGRESSION ──────────────────────────────────
function getSemaineActive() {
    const prog = AppState.data?.programme_progression;
    if (!prog) return null;
    const examDate = new Date("2026-06-30");
    const today = new Date();
    const joursAvant = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

    if (joursAvant >= 14) return prog.semaines[0];
    if (joursAvant >= 10) return prog.semaines[1];
    if (joursAvant >= 7)  return prog.semaines[2];
    if (joursAvant >= 0)  return prog.semaines[3];
    return null;
}

function renderProgrammeProgression() {
    const container = document.getElementById("app-view-container");
    const prog = AppState.data?.programme_progression;
    if (!prog) { container.innerHTML = '<p>Programme non disponible.</p>'; return; }

    const semaineActive = getSemaineActive();
    const examDate = new Date("2026-06-30");
    const joursAvant = Math.max(0, Math.ceil((examDate - new Date()) / (1000*60*60*24)));

    container.innerHTML = `
        <div style="margin-bottom:24px;">
            <h2 style="color:var(--text-primary)">📅 Programme de révision DNB 2026</h2>
            <p style="color:var(--text-secondary);margin-top:4px;font-size:0.9rem;">${prog.description}</p>
            <div style="margin-top:12px;display:inline-block;background:#FDEAEA;border:1px solid #E84855;color:#E84855;padding:6px 14px;border-radius:20px;font-weight:700;font-size:0.85rem;">
                ⏳ J-${joursAvant} avant les épreuves de maths
            </div>
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;"><strong style="color:var(--text-primary)">Principe du moteur adaptatif :</strong> ${prog.principe}</p>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
            ${prog.semaines.map((sem, idx) => {
                const estActive = semaineActive?.numero === sem.numero;
                const chapitres = sem.chapitres_prioritaires.map(id => {
                    for (const mat of AppState.data.matieres) {
                        const chap = mat.chapitres.find(c => c.id === id);
                        if (chap) return `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-app);border-radius:6px;padding:2px 8px;font-size:0.75rem;color:var(--text-secondary);">${mat.emoji} ${chap.titre.split(' — ')[0].substring(0,30)}</span>`;
                    }
                    return '';
                }).join('');

                return `
                <div style="border:2px solid ${estActive ? '#3D5A99' : 'var(--border-color)'};border-radius:12px;padding:16px;background:${estActive ? '#EEF2FF' : 'var(--bg-card)'};">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
                        <div style="width:28px;height:28px;border-radius:50%;background:${estActive ? '#3D5A99' : '#E5E7EB'};color:${estActive ? 'white' : '#6B7280'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0;">${sem.numero}</div>
                        <h3 style="color:${estActive ? '#3D5A99' : 'var(--text-primary)'};font-size:0.95rem;">${sem.label}</h3>
                        ${estActive ? '<span style="font-size:0.7rem;background:#3D5A99;color:white;padding:2px 8px;border-radius:10px;font-weight:700;">EN COURS</span>' : ''}
                        <span style="font-size:0.75rem;color:var(--text-secondary);margin-left:auto;">Seuil : ${Math.round(sem.seuil_passage*100)}%</span>
                    </div>
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;">${sem.objectif}</p>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${chapitres}</div>
                    <div style="background:rgba(0,0,0,0.04);border-radius:8px;padding:10px;font-size:0.8rem;color:var(--text-secondary);">
                        💡 ${sem.conseil}
                    </div>
                    ${estActive ? `<button onclick="lancerSemaine(${idx})" style="margin-top:12px;background:#3D5A99;color:white;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;">🚀 Lancer la semaine ${sem.numero}</button>` : ''}
                </div>`;
            }).join('')}
        </div>
    `;
}

window.lancerSemaine = function(semaineIdx) {
    const prog = AppState.data?.programme_progression;
    if (!prog) return;
    const sem = prog.semaines[semaineIdx];
    const premierId = sem.chapitres_prioritaires[0];
    for (const mat of AppState.data.matieres) {
        const chap = mat.chapitres.find(c => c.id === premierId);
        if (chap) { startQuizAdaptatif(chap); return; }
    }
};

// ── VUE AUTOMATISMES OFFICIELS MEN ───────────────────────────
function renderAutomatismes() {
    const container = document.getElementById("app-view-container");
    const maths = AppState.data.matieres.find(m => m.id === 'maths');
    const chapAuto = maths?.chapitres.find(c => c.id === 'maths_auto');
    if (!chapAuto) { container.innerHTML = '<p>Chapitre automatismes introuvable.</p>'; return; }

    // Regrouper les questions par thème
    const parTheme = {};
    chapAuto.quiz.forEach(q => {
        const t = q.theme_auto || 'Autre';
        if (!parTheme[t]) parTheme[t] = [];
        parTheme[t].push(q);
    });

    container.innerHTML = `
        <button id="back-auto" style="background:none;border:1px solid var(--border-color);color:var(--text-primary);padding:6px 12px;border-radius:6px;cursor:pointer;margin-bottom:20px;">← Retour</button>
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:20px;flex-wrap:wrap;">
            <div style="font-size:2rem;">⚡</div>
            <div>
                <h2 style="color:var(--text-primary);">Automatismes officiels DNB 2026</h2>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px;">Liste publiée par le Ministère de l'Éducation Nationale — Octobre 2025</p>
                <a href="${chapAuto.source_officielle}" target="_blank" rel="noopener" style="font-size:0.75rem;color:#3D5A99;">📄 Voir le document officiel MEN →</a>
            </div>
        </div>

        <div style="background:#FFFBEB;border-left:4px solid #F59E0B;padding:14px;border-radius:0 8px 8px 0;margin-bottom:20px;font-size:0.85rem;color:#78350F;line-height:1.6;">
            <strong>⚠️ Format 2026 :</strong> 20 questions en 20 minutes, SANS calculatrice. 1 minute maximum par question. Si tu bloques → PASSE et reviens !
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;">
            <button id="btn-lancer-auto-5" style="background:#3D5A99;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;">🎯 Entraînement 5 questions</button>
            <button id="btn-lancer-auto-10" style="background:#2EC4B6;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;">🚀 Session 10 questions</button>
            <button id="btn-lancer-auto-20" style="background:#E84855;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;">🔥 Simulation complète (20 questions)</button>
        </div>

        <h3 style="color:var(--text-primary);margin-bottom:14px;font-size:0.95rem;">Les ${chapAuto.quiz.length} questions par thème :</h3>
        <div style="display:flex;flex-direction:column;gap:10px;">
            ${Object.entries(parTheme).map(([theme, qs]) => `
            <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <strong style="color:var(--text-primary);font-size:0.9rem;">${theme}</strong>
                    <span style="font-size:0.75rem;background:#EEF2FF;color:#3D5A99;padding:2px 8px;border-radius:10px;">${qs.length} question${qs.length>1?'s':''}</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${qs.map(q => `
                    <span style="font-size:0.75rem;background:${q.niveau===1?'#EAF6EA':q.niveau===2?'#FFF3E8':'#FDEAEA'};color:${q.niveau===1?'#166534':q.niveau===2?'#7C2D12':'#7F1D1D'};padding:3px 8px;border-radius:6px;">
                        N${q.niveau} — ${q.enonce.substring(0,40)}${q.enonce.length>40?'…':''}
                    </span>`).join('')}
                </div>
            </div>`).join('')}
        </div>
    `;

    document.getElementById("back-auto").addEventListener("click", () => { renderDashboardHome(); setActiveNav("btn-home"); });
    document.getElementById("btn-lancer-auto-5").addEventListener("click", () => startQuizAutomatismes(5));
    document.getElementById("btn-lancer-auto-10").addEventListener("click", () => startQuizAutomatismes(10));
    document.getElementById("btn-lancer-auto-20").addEventListener("click", () => startQuizAutomatismes(20));
}

function startQuizAutomatismes(nb) {
    const maths = AppState.data.matieres.find(m => m.id === 'maths');
    const chapAuto = maths?.chapitres.find(c => c.id === 'maths_auto');
    if (!chapAuto) return;
    const questions = selectionnerQuestionsAdaptatives(chapAuto.quiz, 'maths_auto', nb);
    AppState.currentQuiz = {
        chapitreId: 'maths_auto', questions, currentIndex: 0,
        score: 0, modeInfini: false, modeAuto: true, historique: []
    };
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

// ── VUE MATIÈRE ───────────────────────────────────────────────
function renderMatiereView(matId) {
    const mat = AppState.data.matieres.find(m => m.id === matId);
    if (!mat) return;

    const container = document.getElementById("app-view-container");
    const totalQ = mat.chapitres.reduce((s, c) => s + c.quiz.length, 0);

    container.innerHTML = `
        <button id="back-btn" style="background:none;border:1px solid var(--border-color);color:var(--text-primary);padding:6px 12px;border-radius:6px;cursor:pointer;margin-bottom:20px;">← Retour</button>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
            <span style="font-size:2rem;">${mat.emoji}</span>
            <div>
                <h2 style="color:var(--text-primary);">${mat.label}</h2>
                <p style="font-size:0.8rem;color:var(--text-secondary);">Durée épreuve : ${mat.duree_epreuve} · ${mat.chapitres.length} chapitres · ${totalQ} questions</p>
            </div>
        </div>
        ${mat.conseil_strategique ? `
        <div style="background:#EEF2FF;border-left:4px solid #3D5A99;padding:12px;border-radius:0 8px 8px 0;margin-bottom:20px;font-size:0.85rem;color:#1E3A8A;line-height:1.6;">
            <strong>💡 Stratégie examen :</strong> ${mat.conseil_strategique}
        </div>` : ''}
        <div class="chapitres-list"></div>
    `;

    document.getElementById("back-btn").addEventListener("click", renderDashboardHome);
    const list = container.querySelector(".chapitres-list");

    mat.chapitres.forEach(chap => {
        const stat = AppState.progress[chap.id] || "a_reviser";
        const niv = getNiveauActuel(chap.id);
        const nivLabel = ["", "🟢 Consolidation", "🟡 Standard", "🔴 Brevet"][niv];
        const estAuto = chap.id === 'maths_auto';

        const card = document.createElement("div");
        card.className = "card";
        if (estAuto) card.style.borderLeft = '5px solid #F59E0B';

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
                <span class="status-badge status-${stat}">${stat === "acquis" ? "🟢 Acquis" : "⚪ À réviser"}</span>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    ${estAuto ? '<span style="font-size:0.7rem;background:#FFFBEB;color:#92400E;padding:2px 8px;border-radius:10px;font-weight:700;">⚡ OFFICIEL MEN</span>' : ''}
                    <span style="font-size:0.75rem;padding:2px 8px;background:#F0F4FF;color:#4B6CD4;border-radius:10px;font-weight:600;">Niveau ${niv}/3 — ${nivLabel}</span>
                    <span style="font-size:0.75rem;color:var(--text-secondary);">${chap.quiz.length} QCM</span>
                </div>
            </div>
            <h4 style="color:var(--text-primary);margin-bottom:8px;">${chap.titre}</h4>
            <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:10px;">${chap.fiche}</p>
            ${chap.conseil_strategique ? `
            <div style="background:#F0FDF4;border-left:3px solid #22C55E;padding:8px 12px;border-radius:0 6px 6px 0;font-size:0.8rem;color:#166534;margin-bottom:12px;line-height:1.5;">
                💡 ${chap.conseil_strategique}
            </div>` : ''}
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn-quiz" style="background:#3D5A99;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;">
                    🎯 ${estAuto ? 'Entraînement automatismes' : 'Lancer le quiz adaptatif'}
                </button>
                ${stat !== "acquis" ? `<button class="btn-acquis" style="background:none;border:1px solid #2EC4B6;color:#2EC4B6;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.8rem;">✓ Marquer acquis</button>` : ''}
            </div>
        `;

        card.querySelector(".btn-quiz").addEventListener("click", () => startQuizAdaptatif(chap));
        const btnAcquis = card.querySelector(".btn-acquis");
        if (btnAcquis) btnAcquis.addEventListener("click", (e) => {
            e.stopPropagation();
            AppState.progress[chap.id] = "acquis";
            saveProgress();
            renderMatiereView(matId);
            updateGlobalProgressRing();
        });

        list.appendChild(card);
    });
}

// ── MOTEUR QUIZ ───────────────────────────────────────────────
function startQuizAdaptatif(chap) {
    if (!chap.quiz?.length) return alert("Aucune question disponible.");
    const questions = selectionnerQuestionsAdaptatives(chap.quiz, chap.id, 5);
    AppState.currentQuiz = {
        chapitreId: chap.id, questions,
        currentIndex: 0, score: 0, modeInfini: false, historique: []
    };
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function startExamenBlanc() {
    let toutes = [];
    AppState.data.matieres.forEach(m => m.chapitres.forEach(c => { if (c.quiz) toutes = toutes.concat(c.quiz); }));
    if (!toutes.length) return alert("Pas de questions.");
    AppState.currentQuiz = {
        chapitreId: "examen_blanc",
        questions: toutes.sort(() => Math.random() - 0.5).slice(0, 20),
        currentIndex: 0, score: 0, modeInfini: true, historique: []
    };
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function showQuestion() {
    const quiz = AppState.currentQuiz;
    const q = quiz.questions[quiz.currentIndex];
    const niv = getNiveauActuel(quiz.chapitreId);
    const nivLabel = ["", "🟢 Consolidation", "🟡 Standard", "🔴 Brevet"][q.niveau || niv];

    // Barre de progression
    const pct = Math.round((quiz.currentIndex / quiz.questions.length) * 100);
    const progBar = `<div style="height:4px;background:#E5E7EB;border-radius:2px;overflow:hidden;margin-bottom:12px;">
        <div style="width:${pct}%;height:4px;background:#3D5A99;transition:width 0.3s;"></div></div>`;

    document.getElementById("quiz-progress").innerHTML = quiz.modeInfini
        ? `${progBar}🔥 Examen blanc — Q${quiz.currentIndex + 1}/${quiz.questions.length} · Score : ${quiz.score}`
        : `${progBar}Question ${quiz.currentIndex + 1}/${quiz.questions.length} · ${nivLabel}<br>
           <small style="color:var(--text-secondary);font-weight:normal;">${getMessageMotivation(q.niveau || niv)}</small>`;

    let enonce = q.enonce;
    if (q.theme_auto) enonce = `<span style="font-size:0.72rem;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:6px;display:inline-block;margin-bottom:8px;">⚡ ${q.theme_auto}</span><br>${enonce}`;
    if (q.annale) enonce += `<br><span style="font-size:0.72rem;background:var(--bg-app);color:var(--text-secondary);padding:2px 8px;border-radius:6px;display:inline-block;margin-top:8px;">📋 ${q.annale}</span>`;

    document.getElementById("quiz-question-text").innerHTML = enonce;
    document.getElementById("quiz-explanation").classList.add("hidden");
    document.getElementById("quiz-next-btn").classList.add("hidden");

    const container = document.getElementById("quiz-options-container");
    container.innerHTML = "";
    q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "btn-option";
        btn.innerText = opt;
        btn.addEventListener("click", () => handleAnswer(btn, idx, q, container));
        container.appendChild(btn);
    });
}

function handleAnswer(btn, idx, q, container) {
    Array.from(container.children).forEach(b => b.disabled = true);
    const correct = idx === q.bonne_reponse;

    if (correct) {
        btn.style.cssText = "background:#D1FAE5;border-color:#10B981;color:#064E3B;width:100%;padding:12px;text-align:left;cursor:pointer;margin:6px 0;border:1px solid;border-radius:8px;font-weight:700;";
        AppState.currentQuiz.score++;
    } else {
        btn.style.cssText = "background:#FEE2E2;border-color:#EF4444;color:#7F1D1D;width:100%;padding:12px;text-align:left;cursor:pointer;margin:6px 0;border:1px solid;border-radius:8px;";
        const bonne = container.children[q.bonne_reponse];
        bonne.style.cssText = "background:#D1FAE5;border-color:#10B981;color:#064E3B;width:100%;padding:12px;text-align:left;cursor:pointer;margin:6px 0;border:1px solid;border-radius:8px;font-weight:700;";
    }

    AppState.currentQuiz.historique.push({ qId: q.id, correct });

    if (!AppState.currentQuiz.modeInfini) {
        const retour = updateNiveauAdaptatif(AppState.currentQuiz.chapitreId, correct);
        if (retour.montee)   showToast("🚀 Niveau supérieur débloqué !");
        if (retour.descente) showToast("📖 Retour en consolidation — révise la fiche !");
    }

    document.getElementById("explanation-text").innerText = q.explication;
    document.getElementById("quiz-explanation").classList.remove("hidden");
    document.getElementById("quiz-next-btn").classList.remove("hidden");
}

// ── BOUTON SUIVANT ────────────────────────────────────────────
document.getElementById("quiz-next-btn").addEventListener("click", () => {
    const quiz = AppState.currentQuiz;
    quiz.currentIndex++;

    if (quiz.currentIndex < quiz.questions.length) {
        showQuestion();
    } else {
        finQuiz();
    }
});

function finQuiz() {
    const quiz = AppState.currentQuiz;
    const total = quiz.questions.length;
    const pct = Math.round((quiz.score / total) * 100);

    if (!quiz.modeInfini) {
        // Seuil de maîtrise : 80% → acquis
        if (pct >= 80) {
            AppState.progress[quiz.chapitreId] = "acquis";
            saveProgress();
            showToast("🏆 Chapitre maîtrisé ! Statut mis à jour.");
        } else if (pct >= 50) {
            if (AppState.progress[quiz.chapitreId] !== "acquis") {
                AppState.progress[quiz.chapitreId] = "en_cours";
                saveProgress();
            }
        }
    }

    // Résultat détaillé
    const mention = pct >= 90 ? "🏆 Excellent !" : pct >= 70 ? "👍 Bien joué !" : pct >= 50 ? "💪 Continue !" : "📖 À retravailler";
    const couleur = pct >= 70 ? "#059669" : pct >= 50 ? "#D97706" : "#DC2626";

    document.getElementById("quiz-modal").classList.remove("active");

    // Afficher le résultat dans le container principal
    const container = document.getElementById("app-view-container");
    container.innerHTML = `
        <div style="max-width:500px;margin:0 auto;text-align:center;padding:20px 0;">
            <div style="font-size:4rem;margin-bottom:16px;">${pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '📖'}</div>
            <h2 style="color:var(--text-primary);margin-bottom:8px;">${mention}</h2>
            <div style="font-size:3rem;font-weight:800;color:${couleur};margin:16px 0;">${quiz.score} / ${total}</div>
            <div style="background:var(--border-color);height:8px;border-radius:4px;overflow:hidden;margin:16px 0;">
                <div style="width:${pct}%;height:8px;background:${couleur};border-radius:4px;transition:width 0.5s;"></div>
            </div>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:24px;">${pct}% de bonnes réponses</p>
            ${!quiz.modeInfini && pct >= 80 ? '<div style="background:#D1FAE5;color:#064E3B;padding:10px;border-radius:8px;margin-bottom:16px;font-weight:600;">✅ Chapitre marqué comme acquis !</div>' : ''}
            ${!quiz.modeInfini && pct < 50 ? '<div style="background:#FEF3C7;color:#78350F;padding:10px;border-radius:8px;margin-bottom:16px;font-size:0.85rem;">Relis la fiche de révision et réessaie. Le moteur adaptatif ajuste la difficulté.</div>' : ''}
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                <button onclick="renderDashboardHome()" style="background:#3D5A99;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;">🏠 Tableau de bord</button>
                <button onclick="relancerQuiz()" style="background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border-color);padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;">🔄 Recommencer</button>
            </div>
        </div>
    `;

    updateGlobalProgressRing();
}

window.relancerQuiz = function() {
    const chapId = AppState.currentQuiz.chapitreId;
    for (const mat of AppState.data.matieres) {
        const chap = mat.chapitres.find(c => c.id === chapId);
        if (chap) { startQuizAdaptatif(chap); return; }
    }
};

// ── TOAST NOTIFICATION ────────────────────────────────────────
function showToast(msg) {
    const t = document.createElement("div");
    t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:white;padding:10px 22px;border-radius:30px;font-size:0.85rem;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.3);";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── ANNEAU DE PROGRESSION GLOBAL ─────────────────────────────
function updateGlobalProgressRing() {
    const circle = document.getElementById("global-progress-circle");
    const pctEl  = document.getElementById("global-progress-percent");
    if (!circle || !pctEl) return;
    const prog = JSON.parse(localStorage.getItem("rb_progress") || "{}");
    const total = Object.keys(prog).length;
    const acquis = Object.values(prog).filter(v => v === "acquis").length;
    const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;
    const c = 52 * 2 * Math.PI;
    circle.style.strokeDasharray = `${c} ${c}`;
    circle.style.strokeDashoffset = c - (pct / 100) * c;
    pctEl.innerText = pct;
}

// ── PROFIL ────────────────────────────────────────────────────
function renderProfileUI() {
    const elName = document.getElementById("display-username");
    const elWelcome = document.getElementById("welcome-name");
    if (elName) elName.innerText = "Élève de 3e";
    if (elWelcome) elWelcome.innerText = "Réviseuse du Brevet";
}

// ── EVENTS ───────────────────────────────────────────────────
function setupEventListeners() {
    const toggle = () => document.body.classList.toggle("dark-mode");
    document.getElementById("theme-toggle")?.addEventListener("click", toggle);
    document.getElementById("theme-toggle-mobile")?.addEventListener("click", toggle);

    document.getElementById("quiz-close-btn")?.addEventListener("click", () => {
        document.getElementById("quiz-modal").classList.remove("active");
        renderDashboardHome();
        updateGlobalProgressRing();
    });
}

// Exposer renderDashboardHome pour les onclick inline
window.renderDashboardHome = renderDashboardHome;
window.setActiveNav = setActiveNav;
window.renderProgrammeProgression = renderProgrammeProgression;
