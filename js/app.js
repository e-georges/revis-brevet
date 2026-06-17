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

import {
    selectionnerQuestionsVariees,
    genererEtCacherQuestions,
    getQuestionsCache,
    getCacheStats,
    viderCache,
    shuffleAllOptions
} from './question-engine.js';

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
    // Essayer plusieurs chemins selon la structure GitHub
    const chemins = [
        'data/troisieme.json',
        'troisieme.json',
        './data/troisieme.json',
        './troisieme.json'
    ];

    let chargé = false;
    for (const chemin of chemins) {
        try {
            const detail = document.getElementById("loading-detail");
            if (detail) detail.textContent = `Recherche : ${chemin}`;

            const res = await fetch(chemin);
            if (!res.ok) continue; // Essayer le chemin suivant

            const text = await res.text();
            AppState.data = JSON.parse(text);
            chargé = true;
            console.log(`✅ JSON chargé depuis : ${chemin}`);
            break;
        } catch(e) {
            console.warn(`❌ Chemin échoué : ${chemin}`, e.message);
        }
    }

    if (!chargé) {
        // Afficher une erreur claire dans l'UI
        const container = document.getElementById("app-view-container");
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px 20px;max-width:500px;margin:0 auto;">
                    <div style="font-size:3rem;margin-bottom:16px;">❌</div>
                    <h2 style="color:var(--text-primary);margin-bottom:12px;">Fichier de données introuvable</h2>
                    <p style="color:var(--text-secondary);margin-bottom:20px;line-height:1.6;">
                        Le fichier <code style="background:var(--bg-card-hover);padding:2px 6px;border-radius:4px;">troisieme.json</code> 
                        est introuvable. Vérifie la structure de ton dépôt GitHub.
                    </p>
                    <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:16px;text-align:left;font-size:0.85rem;color:var(--text-secondary);line-height:2;">
                        <strong style="color:var(--text-primary);">Structure attendue :</strong><br>
                        📁 ton-repo/<br>
                        &nbsp;&nbsp;📄 index.html<br>
                        &nbsp;&nbsp;📄 style.css<br>
                        &nbsp;&nbsp;📁 js/<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;📄 app.js<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;📄 adaptive-engine.js<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;📄 question-engine.js<br>
                        &nbsp;&nbsp;📁 <strong>data/</strong><br>
                        &nbsp;&nbsp;&nbsp;&nbsp;📄 <strong>troisieme.json</strong> ← ici
                    </div>
                    <button onclick="location.reload()" 
                        style="margin-top:20px;background:#3D5A99;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;">
                        🔄 Réessayer
                    </button>
                </div>
            `;
        }
        return;
    }

    // Initialiser la progression pour tous les chapitres
    AppState.data.matieres.forEach(mat => {
        mat.chapitres.forEach(chap => {
            if (!AppState.progress[chap.id]) AppState.progress[chap.id] = "a_reviser";
        });
    });
    saveProgress();

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
        <li style="margin-top:auto;padding-top:12px;border-top:1px solid var(--border-color,#E5E7EB);">
            <a class="nav-item" id="btn-settings"><span>⚙️</span><span>Paramètres IA</span></a>
        </li>
    `;

    document.getElementById("btn-home").addEventListener("click", () => { setActiveNav("btn-home"); renderDashboardHome(); });
    document.getElementById("btn-programme").addEventListener("click", () => { setActiveNav("btn-programme"); renderProgrammeProgression(); });
    document.getElementById("btn-auto").addEventListener("click", () => { setActiveNav("btn-auto"); renderAutomatismes(); });
    document.getElementById("btn-infini").addEventListener("click", startExamenBlanc);
    document.getElementById("btn-settings").addEventListener("click", () => {
        setActiveNav("btn-settings");
        renderSettings();
    });

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

        <div id="cache-ia-section" style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;padding:14px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div>
                    <strong style="color:#166534;font-size:0.9rem;">🤖 Questions IA illimitées</strong>
                    <p style="font-size:0.8rem;color:#166534;margin-top:2px;" id="cache-status">Chargement du cache...</p>
                </div>
                <button id="btn-generer-ia-auto" style="background:#166534;color:white;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:600;">✨ Générer 15 questions IA</button>
            </div>
            <div id="ia-key-zone" hidden style="margin-top:10px;">
                <input type="password" id="ia-api-key-auto" placeholder="Clé API Claude (sk-ant-...)" style="width:100%;padding:8px;border:1px solid #86EFAC;border-radius:6px;font-size:0.85rem;background:white;">
                <button id="btn-confirmer-ia-auto" style="margin-top:8px;background:#166534;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:0.85rem;">Générer →</button>
            </div>
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

    // Afficher les stats du cache IA
    const stats = getCacheStats();
    const statusEl = document.getElementById("cache-status");
    if (statusEl) {
        const cacheAuto = getQuestionsCache('maths_auto');
        statusEl.textContent = cacheAuto.length > 0
            ? `✅ ${cacheAuto.length} questions IA en cache — variété maximale garantie`
            : `Aucune question IA en cache. Génère-en pour des questions illimitées !`;
    }

    document.getElementById("btn-generer-ia-auto").addEventListener("click", () => {
        const apiKey = localStorage.getItem("rb_claude_key") || "";
        if (apiKey) {
            lancerGenerationIA(apiKey);
        } else {
            document.getElementById("ia-key-zone").hidden = false;
        }
    });

    document.getElementById("btn-confirmer-ia-auto")?.addEventListener("click", () => {
        const key = document.getElementById("ia-api-key-auto").value.trim();
        if (!key) return alert("Entre ta clé API Claude.");
        localStorage.setItem("rb_claude_key", key);
        document.getElementById("ia-key-zone").hidden = true;
        lancerGenerationIA(key);
    });

    async function lancerGenerationIA(apiKey) {
        const btn = document.getElementById("btn-generer-ia-auto");
        const statusEl = document.getElementById("cache-status");
        btn.disabled = true;
        btn.textContent = "⏳ Génération en cours...";
        try {
            const qs = await genererEtCacherQuestions('maths_auto', 'Automatismes mathématiques DNB 2026', 'Mathématiques', 2, apiKey, 15);
            statusEl.textContent = `✅ ${qs.length} questions générées et mises en cache !`;
            btn.textContent = "✅ Questions générées !";
        } catch(e) {
            statusEl.textContent = `❌ Erreur : ${e.message}`;
            btn.textContent = "✨ Réessayer";
            btn.disabled = false;
        }
    }
}

function startQuizAutomatismes(nb) {
    const maths = AppState.data.matieres.find(m => m.id === 'maths');
    const chapAuto = maths?.chapitres.find(c => c.id === 'maths_auto');
    if (!chapAuto) return;
    const niveau = getNiveauActuel('maths_auto');

    // Pour les automatismes : PRIORITÉ aux questions mutées (illimitées)
    const questions = selectionnerQuestionsVariees('maths_auto', chapAuto.quiz, niveau, nb);

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
                <button class="btn-enrichir" data-chap="${chap.id}" data-titre="${chap.titre.replace(/"/g,'')}" data-mat="${mat.label}" title="Générer 15 nouvelles questions avec Claude IA" style="background:none;border:1px solid #7C3AED;color:#7C3AED;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.8rem;">🤖 +IA</button>
                ${stat !== "acquis" ? `<button class="btn-acquis" style="background:none;border:1px solid #2EC4B6;color:#2EC4B6;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.8rem;">✓ Acquis</button>` : ''}
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

        const btnEnrichir = card.querySelector(".btn-enrichir");
        if (btnEnrichir) btnEnrichir.addEventListener("click", async (e) => {
            e.stopPropagation();
            // Utiliser la clé en cache ou ouvrir la modale de configuration
            const apiKey = localStorage.getItem("rb_claude_key");
            if (apiKey) {
                btnEnrichir.textContent = "⏳...";
                btnEnrichir.disabled = true;
                try {
                    const niveau = getNiveauActuel(chap.id);
                    const qs = await genererEtCacherQuestions(
                        chap.id, chap.titre, mat.label, niveau, apiKey, 15
                    );
                    showToast(`✅ ${qs.length} nouvelles questions IA ajoutées !`);
                    btnEnrichir.textContent = `🤖 +${qs.length}`;
                } catch(err) {
                    if (err.message.includes('401') || err.message.includes('auth') || err.message.includes('API')) {
                        // Clé invalide → ouvrir la modale
                        localStorage.removeItem("rb_claude_key");
                        ouvrirModaleApiKey(chap.id, chap.titre, mat.label, btnEnrichir);
                    } else {
                        showToast(`❌ ${err.message}`);
                        btnEnrichir.textContent = "🤖 +IA";
                        btnEnrichir.disabled = false;
                    }
                }
            } else {
                ouvrirModaleApiKey(chap.id, chap.titre, mat.label, btnEnrichir);
            }
        });

        list.appendChild(card);
    });
}

// ── MOTEUR QUIZ ───────────────────────────────────────────────
function startQuizAdaptatif(chap) {
    if (!chap.quiz?.length) return alert("Aucune question disponible.");
    const niveau = getNiveauActuel(chap.id);

    // Moteur de diversification :
    // 1. Questions JSON de base avec rotation des options
    // 2. Questions mutées (nombres aléatoires pour les maths)
    // 3. Questions en cache Claude API (si disponibles)
    const questions = selectionnerQuestionsVariees(chap.id, chap.quiz, niveau, 5);

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
    if (elWelcome) elWelcome.innerText = "Révision Brevet des Collèges";
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



// ── PAGE PARAMÈTRES ───────────────────────────────────────────
function renderSettings() {
    const container = document.getElementById("app-view-container");
    const hasKey = !!localStorage.getItem("rb_claude_key");
    const stats = getCacheStats();
    const key = localStorage.getItem("rb_claude_key") || "";
    const keyMasked = key ? key.substring(0,8) + "••••••••••••" + key.slice(-4) : "Aucune clé enregistrée";

    container.innerHTML = `
        <h2 style="color:var(--text-primary);margin-bottom:6px;">⚙️ Paramètres</h2>
        <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:24px;">Configuration de l'IA et de la progression</p>

        <!-- Section Clé API -->
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:20px;margin-bottom:16px;">
            <h3 style="color:var(--text-primary);font-size:0.95rem;margin-bottom:4px;">🤖 Clé API Claude (Anthropic)</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px;line-height:1.5;">
                Permet de générer des questions illimitées et variées via l'IA. 
                Stockée uniquement sur cet appareil.
            </p>
            <div style="background:var(--bg-app);border-radius:8px;padding:10px 14px;font-size:0.85rem;font-family:monospace;color:${hasKey ? '#166534' : 'var(--text-secondary)'};margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                <span>${hasKey ? '✅' : '❌'}</span>
                <span>${keyMasked}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button id="btn-config-cle" style="background:#3D5A99;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;">
                    ${hasKey ? '✏️ Modifier la clé' : '➕ Ajouter une clé'}
                </button>
                ${hasKey ? '<button id="btn-suppr-cle" style="background:none;border:1.5px solid #DC2626;color:#DC2626;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;">🗑️ Supprimer</button>' : ''}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener"
                   style="padding:8px 14px;border-radius:8px;border:1.5px solid var(--border-color);color:var(--text-secondary);font-size:0.85rem;text-decoration:none;display:inline-flex;align-items:center;">
                    Créer un compte →
                </a>
            </div>
        </div>

        <!-- Section Cache IA -->
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:20px;margin-bottom:16px;">
            <h3 style="color:var(--text-primary);font-size:0.95rem;margin-bottom:4px;">💾 Cache de questions IA</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px;">
                Questions générées par l'IA et sauvegardées sur cet appareil pour éviter de recharger.
            </p>
            <div style="background:var(--bg-app);border-radius:8px;padding:10px 14px;font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;">
                📚 <strong style="color:var(--text-primary);">${stats.questions}</strong> questions en cache 
                sur <strong style="color:var(--text-primary);">${stats.chapitres}</strong> chapitres
            </div>
            <button id="btn-vider-cache" style="background:none;border:1.5px solid var(--border-color);color:var(--text-secondary);padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;">
                🗑️ Vider le cache (forcer régénération)
            </button>
        </div>

        <!-- Section Progression -->
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:20px;margin-bottom:16px;">
            <h3 style="color:var(--text-primary);font-size:0.95rem;margin-bottom:4px;">📊 Progression</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px;">
                Réinitialise tous les statuts de chapitres et l'historique de niveau adaptatif.
            </p>
            <button id="btn-reset-progress" style="background:none;border:1.5px solid #DC2626;color:#DC2626;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;">
                ⚠️ Remettre la progression à zéro
            </button>
        </div>

        <!-- Sans IA -->
        <div style="background:#FEF9C3;border:1px solid #FCD34D;border-radius:12px;padding:16px;">
            <p style="font-size:0.82rem;color:#713F12;line-height:1.6;">
                <strong>💡 Sans clé API, l'application fonctionne à 100%</strong> avec les questions 
                intégrées (JSON) + les mutations automatiques (nombres aléatoires pour les maths). 
                La clé API n'ajoute que des questions supplémentaires générées par l'IA.
            </p>
        </div>
    `;

    document.getElementById("btn-config-cle").addEventListener("click", () => {
        ouvrirModaleApiKey();
    });

    document.getElementById("btn-suppr-cle")?.addEventListener("click", () => {
        if (confirm("Supprimer la clé API ? Elle ne sera plus utilisée pour générer des questions.")) {
            localStorage.removeItem("rb_claude_key");
            renderSettings();
            showToast("Clé API supprimée.");
        }
    });

    document.getElementById("btn-vider-cache").addEventListener("click", () => {
        if (confirm("Vider le cache ? Les questions IA seront regénérées au prochain clic +IA.")) {
            viderCache();
            renderSettings();
            showToast("✅ Cache vidé.");
        }
    });

    document.getElementById("btn-reset-progress").addEventListener("click", () => {
        if (confirm("⚠️ Remettre TOUTE la progression à zéro ? Cette action est irréversible.")) {
            localStorage.removeItem("rb_progress");
            localStorage.removeItem("rb_adaptive");
            AppState.progress = {};
            loadPedagogicalData();
            showToast("Progression réinitialisée.");
        }
    });
}

// ── MODALE CLÉ API ────────────────────────────────────────────
// Appelée quand aucune clé n'est en cache ou qu'elle est invalide
function ouvrirModaleApiKey(chapId = null, chapTitre = null, matLabel = null, btnOrigine = null) {
    // Créer la modale si elle n'existe pas encore
    let modale = document.getElementById("modale-api-key");
    if (!modale) {
        modale = document.createElement("div");
        modale.id = "modale-api-key";
        modale.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;backdrop-filter:blur(4px);";
        modale.innerHTML = `
            <div style="background:var(--bg-card,#fff);border-radius:16px;padding:28px;width:100%;max-width:460px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h3 style="color:var(--text-primary);font-size:1.1rem;">🤖 Activer les questions IA</h3>
                    <button id="close-api-modale" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-secondary);line-height:1;">×</button>
                </div>

                <div style="background:#EEF2FF;border-radius:10px;padding:14px;margin-bottom:18px;font-size:0.85rem;color:#3730A3;line-height:1.6;">
                    <strong>Pourquoi une clé API ?</strong><br>
                    Claude génère des questions uniques et illimitées pour chaque chapitre. 
                    La clé est <strong>stockée uniquement sur cet appareil</strong> (localStorage), 
                    jamais envoyée ailleurs.
                </div>

                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.85rem;font-weight:600;color:var(--text-primary);margin-bottom:6px;">
                        Clé API Claude (Anthropic)
                    </label>
                    <input 
                        type="password" 
                        id="input-api-key-modale"
                        placeholder="sk-ant-api03-..."
                        autocomplete="off"
                        style="width:100%;padding:10px 12px;border:1.5px solid var(--border-color,#E5E7EB);border-radius:8px;font-size:0.9rem;background:var(--bg-app,#F4F6FB);color:var(--text-primary);font-family:monospace;outline:none;"
                    >
                    <div style="margin-top:6px;display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" id="toggle-show-key" style="cursor:pointer;">
                        <label for="toggle-show-key" style="font-size:0.78rem;color:var(--text-secondary);cursor:pointer;">Afficher la clé</label>
                        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" 
                           style="margin-left:auto;font-size:0.78rem;color:#3D5A99;text-decoration:none;">
                            Obtenir une clé gratuite →
                        </a>
                    </div>
                </div>

                <div style="background:#FEF9C3;border-radius:8px;padding:10px 14px;font-size:0.78rem;color:#713F12;margin-bottom:18px;line-height:1.5;">
                    💡 <strong>Sans clé API</strong>, l'app fonctionne normalement avec les questions JSON + mutations automatiques. La clé n'est nécessaire que pour générer des questions supplémentaires.
                </div>

                <p id="api-key-error" style="color:#DC2626;font-size:0.82rem;margin-bottom:10px;display:none;"></p>

                <div style="display:flex;gap:10px;">
                    <button id="btn-valider-api-key" 
                        style="flex:1;background:#3D5A99;color:white;border:none;padding:11px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;">
                        ✅ Enregistrer et générer
                    </button>
                    <button id="btn-sans-ia"
                        style="background:none;border:1.5px solid var(--border-color,#E5E7EB);color:var(--text-secondary);padding:11px 16px;border-radius:8px;cursor:pointer;font-size:0.85rem;white-space:nowrap;">
                        Continuer sans IA
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modale);

        // Toggle affichage clé
        document.getElementById("toggle-show-key").addEventListener("change", (e) => {
            document.getElementById("input-api-key-modale").type = e.target.checked ? "text" : "password";
        });

        // Fermeture
        document.getElementById("close-api-modale").addEventListener("click", () => fermerModaleApiKey());
        document.getElementById("btn-sans-ia").addEventListener("click", () => fermerModaleApiKey());
        modale.addEventListener("click", (e) => { if (e.target === modale) fermerModaleApiKey(); });
    }

    // Pré-remplir si une ancienne clé existe (probablement expirée)
    const oldKey = localStorage.getItem("rb_claude_key") || "";
    const input = document.getElementById("input-api-key-modale");
    if (oldKey) input.value = oldKey;
    input.focus();

    // Stocker le contexte pour l'action de validation
    modale._chapId    = chapId;
    modale._chapTitre = chapTitre;
    modale._matLabel  = matLabel;
    modale._btnOrigine = btnOrigine;

    // Bouton valider
    const btnValider = document.getElementById("btn-valider-api-key");
    // Supprimer l'ancien listener avant d'en ajouter un nouveau
    btnValider.replaceWith(btnValider.cloneNode(true));
    document.getElementById("btn-valider-api-key").addEventListener("click", async () => {
        const key = document.getElementById("input-api-key-modale").value.trim();
        const errEl = document.getElementById("api-key-error");
        const btn = document.getElementById("btn-valider-api-key");

        if (!key || !key.startsWith("sk-")) {
            errEl.textContent = "La clé doit commencer par "sk-".";
            errEl.style.display = "block";
            return;
        }
        errEl.style.display = "none";

        // Sauvegarder la clé
        localStorage.setItem("rb_claude_key", key);

        const m = document.getElementById("modale-api-key");
        if (m._chapId) {
            // Lancer la génération pour le chapitre demandé
            btn.textContent = "⏳ Génération en cours...";
            btn.disabled = true;
            try {
                const niveau = getNiveauActuel(m._chapId);
                const qs = await genererEtCacherQuestions(
                    m._chapId, m._chapTitre, m._matLabel, niveau, key, 15
                );
                fermerModaleApiKey();
                showToast(`✅ ${qs.length} nouvelles questions IA ajoutées !`);
                if (m._btnOrigine) {
                    m._btnOrigine.textContent = `🤖 +${qs.length}`;
                    m._btnOrigine.disabled = false;
                }
            } catch(err) {
                btn.textContent = "✅ Enregistrer et générer";
                btn.disabled = false;
                errEl.textContent = `Erreur : ${err.message}`;
                errEl.style.display = "block";
            }
        } else {
            fermerModaleApiKey();
            showToast("✅ Clé API enregistrée sur cet appareil.");
        }
    });

    // Entrée clavier
    document.getElementById("input-api-key-modale").addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.getElementById("btn-valider-api-key").click();
    });

    modale.style.display = "flex";
}

function fermerModaleApiKey() {
    const m = document.getElementById("modale-api-key");
    if (m) m.style.display = "none";
}

// Exposer renderDashboardHome pour les onclick inline
window.renderDashboardHome = renderDashboardHome;
window.setActiveNav = setActiveNav;
window.renderProgrammeProgression = renderProgrammeProgression;
