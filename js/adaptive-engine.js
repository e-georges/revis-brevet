// --- MOTEUR ADAPTATIF ET DE DIFFICULTÉ PROGRESSIVE (v2.0) ---

// Structure de mémoire pour stocker l'état adaptatif par chapitre
const AdaptiveState = {
    chapters: {}, // { chapitreId: { niveau: 1, historiqueCorrect: [], historiqueIds: [] } }
};

/**
 * Initialise ou récupère l'état d'un chapitre
 */
function getOrCreateChapterState(chapitreId) {
    if (!AdaptiveState.chapters[chapitreId]) {
        AdaptiveState.chapters[chapitreId] = {
            niveau: 1,            // Commence au Niveau 1
            historiqueCorrect: [], // Stocke des booleans (true/false) pour suivre la série
            historiqueIds: []     // Stocke les IDs des dernières questions pour l'anti-répétition
        };
    }
    return AdaptiveState.chapters[chapitreId];
}

/**
 * RÈGLE 1 & 2 : Met à jour le niveau de l'élève selon ses performances
 * @returns {Object} { niveauActuel, montee: boolean, descente: boolean }
 */
export function updateNiveauAdaptatif(chapitreId, isCorrect) {
    const state = getOrCreateChapterState(chapitreId);
    
    // Ajouter le résultat à l'historique récent
    state.historiqueCorrect.push(isCorrect);
    if (state.historiqueCorrect.length > 3) {
        state.historiqueCorrect.shift(); // Ne garder que les 3 derniers coups
    }

    let montee = false;
    let descente = false;

    // RÈGLE 1 : Montée de niveau -> 3 bonnes réponses consécutives au niveau actuel
    if (state.historiqueCorrect.length === 3 && state.historiqueCorrect.every(res => res === true)) {
        if (state.niveau < 3) {
            state.niveau++;
            state.historiqueCorrect = []; // Réinitialise la série après la montée
            montee = true;
        }
    }

    // RÈGLE 2 : Descente de niveau -> 2 mauvaises sur les 3 dernières réponses
    const mauvaises = state.historiqueCorrect.filter(res => res === false).length;
    if (mauvaises >= 2) {
        if (state.niveau > 1) {
            state.niveau--;
            state.historiqueCorrect = []; // Réinitialise la série après la descente
            descente = true;
        }
    }

    return { niveauActuel: state.niveau, montee, descente };
}

/**
 * RÈGLE 3 : Sélectionne les questions en fonction du niveau et évite les répétitions
 */
export function selectionnerQuestionsAdaptatives(toutesLesQuestions, chapitreId, limite = 5) {
    const state = getOrCreateChapterState(chapitreId);
    const niveauCible = state.niveau;

    // 1. Filtrer par niveau de difficulté (défaut à 1 si non spécifié dans le JSON)
    let questionsFiltrees = toutesLesQuestions.filter(q => (q.difficulte || 1) === niveauCible);

    // Si pas assez de questions dans ce niveau spécifique, on élargit pour ne pas bloquer l'application
    if (questionsFiltrees.length === 0) {
        questionsFiltrees = toutesLesQuestions;
    }

    // 2. Appliquer l'anti-répétition (éviter les dernières questions mémorisées)
    let questionsDisponibles = questionsFiltrees.filter(q => !state.historiqueIds.includes(q.id));

    // Si on a tout vidé à cause de l'anti-répétition, on purge la mémoire pour réapprovisionner
    if (questionsDisponibles.length === 0) {
        state.historiqueIds = [];
        questionsDisponibles = questionsFiltrees;
    }

    // 3. Mélanger aléatoirement les questions restantes
    const selection = questionsDisponibles.sort(() => Math.random() - 0.5).slice(0, limite);

    // 4. Mémoriser les questions sélectionnées dans l'historique anti-répétition (Max 10)
    selection.forEach(q => {
        if (q.id) {
            state.historiqueIds.push(q.id);
            if (state.historiqueIds.length > 10) state.historiqueIds.shift();
        }
    });

    return selection;
}

export function getNiveauActuel(chapitreId) {
    return getOrCreateChapterState(chapitreId).niveau;
}

export function getMessageMotivation(niveau) {
    const messages = {
        1: "Bases & Fondations 🎯 On sécurise les prérequis essentiels !",
        2: "Application & Maîtrise 🚀 Tu montes en puissance, le niveau s'élève !",
        3: "Expertise Annales 👑 Mode guerrier activé, tu es sur des questions réelles du Brevet !"
    };
    return messages[niveau] || "";
}