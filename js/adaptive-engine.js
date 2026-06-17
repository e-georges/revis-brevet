// ============================================================
// question-engine.js — Moteur de diversification des questions
// 3 stratégies combinées :
//   1. Rotation des options (mélange A/B/C/D à chaque session)
//   2. Mutation des questions maths (nombres aléatoires)
//   3. Cache intelligent Claude API (génère + stocke en localStorage)
// ============================================================

const CACHE_KEY = 'rb_questions_cache';
const CACHE_VERSION = 1;
const CACHE_MAX_AGE_DAYS = 30;  // Regénérer après 30 jours
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

// ── 1. ROTATION DES OPTIONS ───────────────────────────────────
// Mélange l'ordre des options A/B/C/D à chaque appel
// La bonne réponse suit le mouvement → index recalculé
export function shuffleOptions(question) {
    const q = { ...question };
    const bonneReponseTexte = q.options[q.bonne_reponse];

    // Mélanger les options
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);

    // Retrouver le nouvel index de la bonne réponse
    const nouvelIndex = shuffled.indexOf(bonneReponseTexte);

    return {
        ...q,
        options: shuffled,
        bonne_reponse: nouvelIndex,
        _shuffled: true
    };
}

// Applique la rotation sur un tableau de questions
export function shuffleAllOptions(questions) {
    return questions.map(q => shuffleOptions(q));
}

// ── 2. MUTATION DES QUESTIONS MATHS ──────────────────────────
// Génère des variantes avec des nombres différents
// Couvre tous les types d'automatismes officiels MEN

const MUTATEURS = {

    // Fraction d'un nombre : "Le tiers de X vaut ?"
    'fraction_nombre': () => {
        const denominateurs = [2, 3, 4, 5, 6, 8, 10];
        const d = denominateurs[Math.floor(Math.random() * denominateurs.length)];
        const n = Math.floor(Math.random() * 4) + 1;
        const base = d * (Math.floor(Math.random() * 8) + 2);
        const reponse = (base / d) * n;
        const noms = { 2:'moitié', 3:'tiers', 4:'quart', 5:'cinquième', 6:'sixième', 8:'huitième', 10:'dixième' };
        const numNoms = { 1:'', 2:'deux ', 3:'trois ', 4:'quatre ' };
        const label = n === 1 ? `Le ${noms[d] || d+'ième'}` : `Les ${numNoms[n]}${d}ièmes`;
        const mauvaises = [reponse + d, reponse - n, base * n, Math.round(reponse * 0.5)].filter(v => v !== reponse && v > 0);
        const options = shuffle([reponse, ...mauvaises.slice(0, 3)]).map((v, i) => `${['A','B','C','D'][i]}) ${v}`);
        return {
            id: `mut_frac_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce: `${label} de ${base} vaut ?`,
            options,
            bonne_reponse: options.findIndex(o => o.includes(`) ${reponse}`)),
            explication: `${n}/${d} de ${base} = (${base} ÷ ${d}) × ${n} = ${base/d} × ${n} = ${reponse}. Méthode : diviser par le dénominateur, puis multiplier par le numérateur.`,
            niveau: 1, type_brevet: 'automatisme', theme_auto: 'Fraction d\'un nombre',
            annale: 'Liste officielle MEN oct. 2025 — Fractions d\'un nombre',
            _mute: true
        };
    },

    // Pourcentages : "X% de Y = ?"
    'pourcentage_simple': () => {
        const pcts = [10, 20, 25, 50, 5, 15];
        const pct = pcts[Math.floor(Math.random() * pcts.length)];
        const bases = [40, 60, 80, 100, 120, 150, 200, 240, 300, 360];
        const base = bases[Math.floor(Math.random() * bases.length)];
        const reponse = (base * pct) / 100;
        const mauvaises = [base * 2, reponse + pct, Math.round(reponse / 2), reponse + 10].filter(v => v !== reponse && v > 0);
        const options = shuffle([reponse, ...mauvaises.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) ${v}`);
        return {
            id: `mut_pct_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce: `Calculer ${pct}% de ${base} (sans calculatrice).`,
            options,
            bonne_reponse: options.findIndex(o => o.includes(`) ${reponse}`)),
            explication: pct === 10 ? `10% de ${base} = ${base} ÷ 10 = ${reponse}.`
                       : pct === 50 ? `50% = ÷ 2. ${base} ÷ 2 = ${reponse}.`
                       : pct === 25 ? `25% = ÷ 4. ${base} ÷ 4 = ${reponse}.`
                       : pct === 20 ? `20% = 2 × 10%. 10% de ${base} = ${base/10}, donc 20% = ${reponse}.`
                       : pct === 15 ? `15% = 10% + 5%. 10% de ${base} = ${base/10}, 5% = ${base/20}. Total = ${reponse}.`
                       : `5% = 10% ÷ 2. 10% de ${base} = ${base/10}, donc 5% = ${reponse}.`,
            niveau: 1, type_brevet: 'automatisme', theme_auto: 'Pourcentages simples',
            annale: 'Liste officielle MEN oct. 2025 — Pourcentages 100/50/25/10/1%',
            _mute: true
        };
    },

    // Addition de fractions
    'addition_fractions': () => {
        const paires = [
            [1,2,1,3],[1,3,1,4],[1,2,1,4],[2,3,1,6],[3,4,1,8],[1,3,2,9],[1,4,3,8],[2,5,1,10]
        ];
        const [n1,d1,n2,d2] = paires[Math.floor(Math.random() * paires.length)];
        const lcm = (a,b) => { let x=a,y=b; while(y){[x,y]=[y,x%y]}; return a*b/x; };
        const den = lcm(d1,d2);
        const numR = n1*(den/d1) + n2*(den/d2);
        const gcd = (a,b) => b===0?a:gcd(b,a%b);
        const g = gcd(numR,den);
        const numFin = numR/g, denFin = den/g;
        const reponseStr = denFin === 1 ? `${numFin}` : `${numFin}/${denFin}`;
        const mauvaisesStr = [`${n1+n2}/${d1+d2}`, `${numFin+1}/${denFin}`, `${n1*n2}/${d1*d2}`].filter(s => s !== reponseStr);
        const toutes = shuffle([reponseStr, ...mauvaisesStr.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) ${v}`);
        return {
            id: `mut_add_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce: `Sans calculatrice : ${n1}/${d1} + ${n2}/${d2} = ?`,
            options: toutes,
            bonne_reponse: toutes.findIndex(o => o.split(') ')[1] === reponseStr),
            explication: `Dénominateur commun = ${den}. ${n1}/${d1} = ${n1*(den/d1)}/${den} ; ${n2}/${d2} = ${n2*(den/d2)}/${den}. Somme = ${numR}/${den}${g>1?' = '+reponseStr+' (simplifié par '+g+')'  :''}. RÈGLE : même dénominateur avant d'additionner !`,
            niveau: 1, type_brevet: 'automatisme', theme_auto: 'Fractions décimales',
            annale: 'Liste officielle MEN oct. 2025 — Fractions simples',
            _mute: true
        };
    },

    // Pythagore avec triplets connus + variantes
    'pythagore': () => {
        const triplets = [[3,4,5],[5,12,13],[8,15,17],[7,24,25],[6,8,10],[9,12,15],[12,16,20]];
        const [a,b,c] = triplets[Math.floor(Math.random() * triplets.length)];
        const type = Math.random() > 0.5 ? 'hyp' : 'cat';
        if (type === 'hyp') {
            const mauvaises = [a+b, Math.round(Math.sqrt(a*a+b*b))+1, a*b/c].map(v => Math.round(v));
            const options = shuffle([c, ...mauvaises.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) ${v} cm`);
            return {
                id: `mut_pyth_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                enonce: `Triangle rectangle, cathètes ${a} cm et ${b} cm. Hypoténuse = ?`,
                options,
                bonne_reponse: options.findIndex(o => o.includes(`${c} cm`)),
                explication: `c² = ${a}² + ${b}² = ${a*a} + ${b*b} = ${a*a+b*b}. √${a*a+b*b} = ${c} cm. Triplet à mémoriser : ${a}-${b}-${c}.`,
                niveau: 2, type_brevet: 'automatisme', theme_auto: 'Automatisme Pythagore',
                annale: 'Liste officielle MEN oct. 2025 — Automatisme Pythagore',
                _mute: true
            };
        } else {
            const mauvaises = [c+a, c-1, Math.round(c*0.8)].filter(v => v !== b);
            const options = shuffle([b, ...mauvaises.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) ${v} cm`);
            return {
                id: `mut_pyth2_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                enonce: `Triangle rectangle, hypoténuse ${c} cm, une cathète ${a} cm. L'autre cathète = ?`,
                options,
                bonne_reponse: options.findIndex(o => o.includes(`${b} cm`)),
                explication: `b² = c² - a² = ${c*c} - ${a*a} = ${b*b}. √${b*b} = ${b} cm.`,
                niveau: 2, type_brevet: 'automatisme', theme_auto: 'Automatisme Pythagore',
                annale: 'Liste officielle MEN oct. 2025 — Automatisme Pythagore',
                _mute: true
            };
        }
    },

    // Angles dans un triangle
    'angles_triangle': () => {
        const a1 = Math.floor(Math.random() * 60) + 20;
        const a2 = Math.floor(Math.random() * (160 - a1 - 20)) + 10;
        const a3 = 180 - a1 - a2;
        const mauvaises = [a1+a2, 360-a1-a2, a3+10, a3-5].filter(v => v !== a3 && v > 0 && v < 180);
        const options = shuffle([a3, ...mauvaises.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) ${v}°`);
        return {
            id: `mut_ang_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce: `Un triangle a deux angles de ${a1}° et ${a2}°. Le troisième angle mesure ?`,
            options,
            bonne_reponse: options.findIndex(o => o.includes(`${a3}°`)),
            explication: `Somme des angles = 180°. 3e angle = 180 − ${a1} − ${a2} = ${a3}°.`,
            niveau: 1, type_brevet: 'automatisme', theme_auto: 'Angles dans un triangle',
            annale: 'Liste officielle MEN oct. 2025 — Somme des angles d\'un triangle',
            _mute: true
        };
    },

    // Conversions km/h → m/s
    'conversion_vitesse': () => {
        const kmh = [36, 54, 72, 90, 108, 126, 144, 18, 45];
        const v = kmh[Math.floor(Math.random() * kmh.length)];
        const ms = v / 3.6;
        const mauvaises = [v, ms * 2, ms + 5, Math.round(ms * 3.6 / 10)].filter(x => x !== ms);
        const options = shuffle([ms, ...mauvaises.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) ${v} m/s`);
        return {
            id: `mut_vit_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce: `Convertir ${v} km/h en m/s (sans calculatrice).`,
            options,
            bonne_reponse: options.findIndex(o => o.includes(`${ms} m/s`)),
            explication: `km/h → m/s : diviser par 3,6. ${v} ÷ 3,6 = ${ms} m/s. Mémo : 36 km/h = 10 m/s.`,
            niveau: 2, type_brevet: 'automatisme', theme_auto: 'Conversions longueur',
            annale: 'Liste officielle MEN oct. 2025 — Conversions mm, cm, m, km',
            _mute: true
        };
    },

    // Équations simples ax + b = c
    'equation_simple': () => {
        const a = Math.floor(Math.random() * 5) + 2;
        const x = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 15) + 1;
        const c = a * x + b;
        const mauvaises = [x+1, x-1, c/a, a+b].filter(v => v !== x && v > 0);
        const options = shuffle([x, ...mauvaises.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) x = ${v}`);
        return {
            id: `mut_eq_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce: `Résoudre : ${a}x + ${b} = ${c}`,
            options,
            bonne_reponse: options.findIndex(o => o.includes(`x = ${x}`)),
            explication: `${a}x = ${c} − ${b} = ${c-b} → x = ${c-b} ÷ ${a} = ${x}. Vérif : ${a}×${x}+${b} = ${c} ✓`,
            niveau: 2, type_brevet: 'automatisme', theme_auto: 'Équation ax + b = c',
            annale: 'Liste officielle MEN oct. 2025 — Résoudre ax + b = c',
            _mute: true
        };
    },

    // Moyenne simple
    'moyenne': () => {
        const nb = Math.floor(Math.random() * 3) + 4; // 4 à 6 valeurs
        const notes = Array.from({length: nb}, () => Math.floor(Math.random() * 15) + 3);
        const somme = notes.reduce((s,n) => s+n, 0);
        const moy = Math.round((somme / nb) * 10) / 10;
        const mauvaises = [moy + 1, moy - 0.5, somme, moy + 2].filter(v => v !== moy && v > 0);
        const options = shuffle([moy, ...mauvaises.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) ${v}`);
        return {
            id: `mut_moy_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce: `Notes : ${notes.join(', ')}. Quelle est la moyenne ?`,
            options,
            bonne_reponse: options.findIndex(o => o.split(') ')[1] === String(moy)),
            explication: `Somme = ${notes.join('+')} = ${somme}. Moyenne = ${somme} ÷ ${nb} = ${moy}.`,
            niveau: 1, type_brevet: 'calcul', theme_auto: 'Statistiques',
            annale: 'DNB — Statistiques descriptives',
            _mute: true
        };
    },

    // Volume cylindre
    'volume_cylindre': () => {
        const r = Math.floor(Math.random() * 8) + 2;
        const h = Math.floor(Math.random() * 15) + 3;
        const v = Math.round(3.14 * r * r * h * 10) / 10;
        const mauvaises = [Math.round(2*3.14*r*h*10)/10, r*r*h, Math.round(3.14*r*h*10)/10].filter(x => x !== v);
        const options = shuffle([v, ...mauvaises.slice(0,3)]).map((x,i) => `${['A','B','C','D'][i]}) ${x} cm³`);
        return {
            id: `mut_cyl_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce: `Cylindre : rayon ${r} cm, hauteur ${h} cm. Volume ? (π ≈ 3,14)`,
            options,
            bonne_reponse: options.findIndex(o => o.includes(`${v} cm³`)),
            explication: `V = π × r² × h = 3,14 × ${r}² × ${h} = 3,14 × ${r*r} × ${h} = ${v} cm³.`,
            niveau: 2, type_brevet: 'automatisme', theme_auto: 'Volume d\'un cylindre',
            annale: 'Liste officielle MEN oct. 2025 — Volume cylindre',
            _mute: true
        };
    },

    // Loi d'Ohm
    'loi_ohm': () => {
        const scenarios = [
            { R: 10, I: 2, ask: 'U', U: 20 },
            { R: 5,  I: 3, ask: 'U', U: 15 },
            { U: 12, R: 4,  ask: 'I', I: 3  },
            { U: 24, R: 8,  ask: 'I', I: 3  },
            { U: 15, I: 3,  ask: 'R', R: 5  },
            { U: 20, I: 4,  ask: 'R', R: 5  },
        ];
        const s = scenarios[Math.floor(Math.random() * scenarios.length)];
        let enonce, reponse, explication, unite;
        if (s.ask === 'U') {
            enonce = `Résistance R = ${s.R} Ω, intensité I = ${s.I} A. Tension U = ?`;
            reponse = s.U; unite = 'V';
            explication = `U = R × I = ${s.R} × ${s.I} = ${s.U} V. Triangle URI : U en haut.`;
        } else if (s.ask === 'I') {
            enonce = `Tension U = ${s.U} V, résistance R = ${s.R} Ω. Intensité I = ?`;
            reponse = s.I; unite = 'A';
            explication = `I = U ÷ R = ${s.U} ÷ ${s.R} = ${s.I} A. Triangle URI : cacher I.`;
        } else {
            enonce = `Tension U = ${s.U} V, intensité I = ${s.I} A. Résistance R = ?`;
            reponse = s.R; unite = 'Ω';
            explication = `R = U ÷ I = ${s.U} ÷ ${s.I} = ${s.R} Ω. Triangle URI : cacher R.`;
        }
        const mauvaises = [reponse+2, reponse*2, reponse-1].filter(v => v !== reponse && v > 0);
        const options = shuffle([reponse, ...mauvaises.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) ${v} ${unite}`);
        return {
            id: `mut_ohm_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce, options,
            bonne_reponse: options.findIndex(o => o.includes(`${reponse} ${unite}`)),
            explication,
            niveau: 1, type_brevet: 'calcul', theme_auto: 'Loi d\'Ohm',
            annale: 'DNB — Physique-Chimie / Électricité',
            _mute: true
        };
    },

    // Probabilité simple
    'probabilite': () => {
        const urnes = [
            { desc: '4 billes rouges et 6 bleues', tot: 10, fav: 4, evtLabel: 'une bille rouge' },
            { desc: '3 cartes rouges et 7 noires', tot: 10, fav: 3, evtLabel: 'une carte rouge' },
            { desc: '5 boules blanches et 5 noires', tot: 10, fav: 5, evtLabel: 'une boule blanche' },
            { desc: '2 billes vertes, 3 jaunes et 5 bleues', tot: 10, fav: 2, evtLabel: 'une bille verte' },
            { desc: '6 jetons rouges et 4 jaunes', tot: 10, fav: 6, evtLabel: 'un jeton rouge' },
        ];
        const u = urnes[Math.floor(Math.random() * urnes.length)];
        const num = u.fav, den = u.tot;
        const gcd = (a,b) => b===0?a:gcd(b,a%b);
        const g = gcd(num,den);
        const rs = `${num/g}/${den/g}`;
        const mauvaises = [`${den-num}/${den}`, `${num}/${den+num}`, `1/${num}`].filter(s => s !== rs);
        const options = shuffle([rs, ...mauvaises.slice(0,3)]).map((v,i) => `${['A','B','C','D'][i]}) ${v}`);
        return {
            id: `mut_proba_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            enonce: `Sac contenant ${u.desc}. On tire au hasard. P(${u.evtLabel}) = ?`,
            options,
            bonne_reponse: options.findIndex(o => o.split(') ')[1] === rs),
            explication: `P = cas favorables / cas possibles = ${num}/${den}${g>1?' = '+rs:''}.`,
            niveau: 1, type_brevet: 'calcul', theme_auto: 'Probabilité équiprobabilité',
            annale: 'Liste officielle MEN oct. 2025 — Probabilité équiprobabilité',
            _mute: true
        };
    }
};

// Génère N questions mutées pour un chapitre donné
export function genererQuestionsMutees(chapitreId, nbQuestions = 5) {
    const mutateursDispo = {
        maths_auto:  ['fraction_nombre','pourcentage_simple','addition_fractions','angles_triangle','conversion_vitesse','equation_simple','moyenne','volume_cylindre','pythagore'],
        maths_01:    ['fraction_nombre','pourcentage_simple','addition_fractions','angles_triangle','conversion_vitesse','equation_simple'],
        maths_02:    ['addition_fractions','equation_simple'],
        maths_03:    ['equation_simple'],
        maths_04:    ['pythagore','angles_triangle'],
        maths_06:    ['moyenne','probabilite'],
        maths_07:    ['volume_cylindre'],
        pc_01:       ['loi_ohm'],
        maths_06b:   ['probabilite'],
    };

    const disponibles = mutateursDispo[chapitreId] || [];
    if (!disponibles.length) return [];

    const questions = [];
    for (let i = 0; i < nbQuestions; i++) {
        const mutNom = disponibles[Math.floor(Math.random() * disponibles.length)];
        try {
            const q = MUTATEURS[mutNom]?.();
            if (q) questions.push(q);
        } catch(e) {
            console.warn(`Mutateur ${mutNom} échoué:`, e);
        }
    }
    return questions;
}

// ── 3. CACHE INTELLIGENT CLAUDE API ──────────────────────────
// Génère des questions via Claude et les stocke en localStorage
// Ne recharge pas si déjà en cache (économise les tokens)

function getCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{"v":1,"chapitres":{}}'); }
    catch { return { v: CACHE_VERSION, chapitres: {} }; }
}

function saveCache(cache) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function cacheEstValide(entry) {
    if (!entry?.date) return false;
    const age = (Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24);
    return age < CACHE_MAX_AGE_DAYS;
}

// Retourne les questions en cache pour un chapitre
export function getQuestionsCache(chapitreId) {
    const cache = getCache();
    const entry = cache.chapitres[chapitreId];
    if (!entry || !cacheEstValide(entry)) return [];
    return entry.questions || [];
}

// Taille du cache en localStorage (pour info)
export function getCacheStats() {
    const cache = getCache();
    const chapitres = Object.keys(cache.chapitres);
    const total = chapitres.reduce((s, id) => s + (cache.chapitres[id]?.questions?.length || 0), 0);
    return { chapitres: chapitres.length, questions: total };
}

// Vide le cache (forcer une régénération)
export function viderCache(chapitreId = null) {
    const cache = getCache();
    if (chapitreId) delete cache.chapitres[chapitreId];
    else cache.chapitres = {};
    saveCache(cache);
}

// Génère des questions via Claude API et les met en cache
export async function genererEtCacherQuestions(chapitreId, titreChapitre, matiere, niveau, apiKey, nbQuestions = 15) {
    if (!apiKey) throw new Error('Clé API Claude manquante');

    const prompt = `Tu es un professeur expert du DNB 2026 (Brevet des collèges français).

Génère exactement ${nbQuestions} questions QCM ORIGINALES et VARIÉES sur :
- Matière : ${matiere}
- Chapitre : ${titreChapitre}
- Niveau : ${niveau}/3 (${['','facile - définitions directes','moyen - application du cours','difficile - raisonnement type brevet'][niveau]})

RÈGLES ABSOLUES :
- Questions JAMAIS identiques entre elles (formulations différentes, angles différents)
- Chaque question teste un aspect légèrement différent du chapitre
- Niveau ${niveau} : ${niveau===1?'vocabulaire, définitions, connaissances directes':niveau===2?'application de formules, calculs simples, mise en situation':'raisonnement multi-étapes, problèmes contextualisés, type annale brevet'}
- 4 options par question, une seule bonne réponse
- L'explication doit expliquer POURQUOI c'est la bonne réponse ET l'erreur typique

Réponds UNIQUEMENT avec ce JSON valide (sans texte avant ni après, sans backticks) :
{"questions":[{"enonce":"...","options":["A) ...","B) ...","C) ...","D) ..."],"bonne_reponse":0,"explication":"...","niveau":${niveau},"type_brevet":"qcm"}]}`;

    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Erreur API (${response.status})`);
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const clean = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch { const m = clean.match(/\{[\s\S]*\}/); if (!m) throw new Error('Réponse IA invalide'); parsed = JSON.parse(m[0]); }

    if (!parsed.questions?.length) throw new Error('Aucune question générée');

    // Ajouter des IDs uniques
    const questions = parsed.questions.map((q, i) => ({
        ...q,
        id: `ia_${chapitreId}_n${niveau}_${Date.now()}_${i}`,
        _source: 'claude_api'
    }));

    // Mettre en cache
    const cache = getCache();
    if (!cache.chapitres[chapitreId]) cache.chapitres[chapitreId] = { questions: [] };
    // Ajouter aux questions existantes (ne pas écraser)
    cache.chapitres[chapitreId].questions.push(...questions);
    cache.chapitres[chapitreId].date = new Date().toISOString();
    saveCache(cache);

    return questions;
}

// ── SÉLECTEUR PRINCIPAL ───────────────────────────────────────
// Combine JSON de base + mutations + cache IA
// Retourne toujours un set de questions varié

export function selectionnerQuestionsVariees(chapitreId, questionsBase, niveau, nbVoulues = 5) {
    const toutes = [];

    // 1. Questions en cache IA (les meilleures — générées par Claude)
    const cache = getQuestionsCache(chapitreId);
    const cacheNiveau = cache.filter(q => (q.niveau || 2) === niveau);
    toutes.push(...cacheNiveau);

    // 2. Questions mutées (variantes générées dynamiquement)
    const mutees = genererQuestionsMutees(chapitreId, nbVoulues);
    toutes.push(...mutees);

    // 3. Questions de base (JSON) avec rotation des options
    const base = questionsBase
        .filter(q => (q.niveau || 2) === niveau)
        .map(q => shuffleOptions(q));
    toutes.push(...base);

    // 4. Si pas assez au niveau demandé : compléter avec tous niveaux
    if (toutes.length < nbVoulues) {
        const baseToutes = questionsBase.map(q => shuffleOptions(q));
        toutes.push(...baseToutes);
    }

    // Dédoublonner par id, mélanger, prendre le bon nombre
    const seen = new Set();
    const unique = toutes.filter(q => {
        if (seen.has(q.id)) return false;
        seen.add(q.id);
        return true;
    });

    return shuffle(unique).slice(0, nbVoulues);
}

// ── UTILS ─────────────────────────────────────────────────────
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
