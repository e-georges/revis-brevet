// ============================================================
// adaptive-engine.js — Moteur adaptatif RévisBrevet v2.1
// CORRECTIF : filtre sur q.niveau (pas q.difficulte)
// CORRECTIF : persistance localStorage du niveau par chapitre
// ============================================================

// ── PERSISTANCE LOCALSTORAGE ──────────────────────────────────
function loadAdaptiveState() {
    try {
        return JSON.parse(localStorage.getItem("rb_adaptive") || "{}");
    } catch(e) { return {}; }
}

function saveAdaptiveState(state) {
    localStorage.setItem("rb_adaptive", JSON.stringify(state));
}

function getOrCreateChapterState(chapitreId) {
    const allState = loadAdaptiveState();
    if (!allState[chapitreId]) {
        allState[chapitreId] = {
            niveau: 1,
            historiqueCorrect: [],
            historiqueIds: []
        };
        saveAdaptiveState(allState);
    }
    return { allState, chapterState: allState[chapitreId] };
}

// ── MISE À JOUR DU NIVEAU APRÈS UNE RÉPONSE ──────────────────
// Règles :
//   Montée  : 3 bonnes consécutives → niveau + 1 (max 3)
//   Descente : 2 mauvaises sur les 3 dernières → niveau - 1 (min 1)
export function updateNiveauAdaptatif(chapitreId, isCorrect) {
    const { allState, chapterState: state } = getOrCreateChapterState(chapitreId);

    state.historiqueCorrect.push(isCorrect);
    if (state.historiqueCorrect.length > 3) {
        state.historiqueCorrect.shift();
    }

    let montee = false;
    let descente = false;

    // Montée : 3 bonnes d'affilée
    if (
        state.historiqueCorrect.length === 3 &&
        state.historiqueCorrect.every(r => r === true)
    ) {
        if (state.niveau < 3) {
            state.niveau++;
            state.historiqueCorrect = [];
            montee = true;
        }
    }

    // Descente : 2 mauvaises sur les 3 dernières
    const mauvaises = state.historiqueCorrect.filter(r => r === false).length;
    if (mauvaises >= 2) {
        if (state.niveau > 1) {
            state.niveau--;
            state.historiqueCorrect = [];
            descente = true;
        }
    }

    allState[chapitreId] = state;
    saveAdaptiveState(allState);

    return { niveauActuel: state.niveau, montee, descente };
}

// ── SÉLECTION ADAPTATIVE DES QUESTIONS ───────────────────────
// CORRECTIF : filtre sur q.niveau (et non q.difficulte)
export function selectionnerQuestionsAdaptatives(toutesLesQuestions, chapitreId, limite = 5) {
    const { allState, chapterState: state } = getOrCreateChapterState(chapitreId);
    const niveauCible = state.niveau;

    // Filtrer par niveau (champ "niveau" dans le JSON)
    let questionsFiltrees = toutesLesQuestions.filter(q => (q.niveau || 1) === niveauCible);

    // Fallback : si aucune question à ce niveau exact, prendre toutes les questions
    if (questionsFiltrees.length === 0) {
        questionsFiltrees = [...toutesLesQuestions];
    }

    // Anti-répétition : exclure les questions vues récemment
    let questionsDisponibles = questionsFiltrees.filter(q => !state.historiqueIds.includes(q.id));

    // Si toutes déjà vues : reset et recommencer
    if (questionsDisponibles.length === 0) {
        state.historiqueIds = [];
        questionsDisponibles = [...questionsFiltrees];
    }

    // Mélanger et prendre le nombre demandé
    const selection = questionsDisponibles.sort(() => Math.random() - 0.5).slice(0, limite);

    // Mémoriser les questions vues (max 10 en mémoire)
    selection.forEach(q => {
        if (q.id && !state.historiqueIds.includes(q.id)) {
            state.historiqueIds.push(q.id);
        }
    });
    if (state.historiqueIds.length > 10) {
        state.historiqueIds = state.historiqueIds.slice(-10);
    }

    allState[chapitreId] = state;
    saveAdaptiveState(allState);

    return selection;
}

// ── LECTURE DU NIVEAU ACTUEL ──────────────────────────────────
export function getNiveauActuel(chapitreId) {
    const { chapterState } = getOrCreateChapterState(chapitreId);
    return chapterState.niveau;
}

// ── MESSAGE MOTIVATION PAR NIVEAU ────────────────────────────
export function getMessageMotivation(niveau) {
    const messages = {
        1: "🟢 Consolidation — on sécurise les bases !",
        2: "🟡 Standard — tu montes en puissance !",
        3: "🔴 Niveau Brevet — questions type examen réel !"
    };
    return messages[niveau] || "";
}
