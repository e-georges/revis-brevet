// --- MOTEUR ADAPTATIF ET DE DIFFICULTÉ PROGRESSIVE (v2.0) ---

const AdaptiveState = {
    chapters: {},
};

function getOrCreateChapterState(chapitreId) {
    if (!AdaptiveState.chapters[chapitreId]) {
        AdaptiveState.chapters[chapitreId] = {
            niveau: 1,
            historiqueCorrect: [],
            historiqueIds: []
        };
    }
    return AdaptiveState.chapters[chapitreId];
}

export function updateNiveauAdaptatif(chapitreId, isCorrect) {
    const state = getOrCreateChapterState(chapitreId);
    
    state.historiqueCorrect.push(isCorrect);
    if (state.historiqueCorrect.length > 3) {
        state.historiqueCorrect.shift();
    }

    let montee = false;
    let descente = false;

    if (state.historiqueCorrect.length === 3 && state.historiqueCorrect.every(res => res === true)) {
        if (state.niveau < 3) {
            state.niveau++;
            state.historiqueCorrect = [];
            montee = true;
        }
    }

    const mauvaises = state.historiqueCorrect.filter(res => res === false).length;
    if (mauvaises >= 2) {
        if (state.niveau > 1) {
            state.niveau--;
            state.historiqueCorrect = [];
            descente = true;
        }
    }

    return { niveauActuel: state.niveau, montee, descente };
}

export function selectionnerQuestionsAdaptatives(toutesLesQuestions, chapitreId, limite = 5) {
    const state = getOrCreateChapterState(chapitreId);
    const niveauCible = state.niveau;

    let questionsFiltrees = toutesLesQuestions.filter(q => (q.difficulte || 1) === niveauCible);

    if (questionsFiltrees.length === 0) {
        questionsFiltrees = toutesLesQuestions;
    }

    let questionsDisponibles = questionsFiltrees.filter(q => !state.historiqueIds.includes(q.id));

    if (questionsDisponibles.length === 0) {
        state.historiqueIds = [];
        questionsDisponibles = questionsFiltrees;
    }

    const selection = questionsDisponibles.sort(() => Math.random() - 0.5).slice(0, limite);

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
