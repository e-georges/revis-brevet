// ============================================================
// RévisBrevet 2026 — app.js (Version Mobile-Only Finale)
// ============================================================

const AppState = {
  data: null,
  progress: {},
  adaptive: {}, 
  historiqueQuestions: [], // Anti-Répétition persistant
  quiz: {
    chapitreId: null,
    questions: [],
    idx: 0,
    score: 0,
    isAutomatisme: false,
    niveauFiltre: 1
  }
};

const $ = id => document.getElementById(id);

// Banque de secours au cas où troisieme.json est absent, mal formaté ou lent à charger
const DATA_SECOURS = {
  matieres: [
    {
      id: "maths",
      label: "Mathématiques",
      emoji: "📐",
      chapitres: [
        {
          id: "fractions",
          titre: "Calculs avec des fractions",
          theme: "Nombres",
          cours: "Pour additionner ou soustraire deux fractions, il faut impérativement les mettre au même dénominateur.\nPour multiplier, on multiplie les numérateurs entre eux et les dénominateurs entre eux.\nPour diviser par une fraction, on multiplie par son inverse.",
          piege: "Oublier la priorité des opérations ! La multiplication et la division restent prioritaires sur l'addition et la soustraction, même au milieu de fractions."
        }
      ]
    },
    {
      id: "francais",
      label: "Français",
      emoji: "✍️",
      chapitres: [
        {
          id: "figures_style",
          titre: "Les Figures de Style incontournables",
          theme: "Grammaire",
          cours: "La Métaphore : compare deux éléments sans outil de comparaison.\nLa Comparaison : utilise un outil (comme, tel que, semblable à).\nLa Personnification : attribue des traits humains à un objet ou un animal.",
          piege: "Confondre la métaphore et la comparaison. S'il y a le mot 'comme', c'est TOUJOURS une comparaison !"
        }
      ]
    }
  ]
};

// ── TRAITEMENT ET CHARGEMENT DU POOL DE QUESTIONS TEXTUELLES (Anti-Répétition) ──
function obtenirQuestionsFiltrees(pool, quantite) {
  let questionsDisponibles = pool.filter(q => !AppState.historiqueQuestions.includes(q.enonce));
  
  if (questionsDisponibles.length < quantite) {
    AppState.historiqueQuestions = AppState.historiqueQuestions.filter(enonce => !pool.some(q => q.enonce === enonce));
    questionsDisponibles = pool;
  }
  
  const selectionnees = shuffleArr(questionsDisponibles).slice(0, quantite);
  
  selectionnees.forEach(q => AppState.historiqueQuestions.push(q.enonce));
  if (AppState.historiqueQuestions.length > 40) AppState.historiqueQuestions.shift();
  localStorage.setItem('dnb_history_anti_repeat', JSON.stringify(AppState.historiqueQuestions));
  
  return selectionnees;
}

// ── MUTATION NUMÉRIQUE DES MATHÉMATIQUES ──
function genererQuestionMutationMaths() {
  const pList = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90];
  const vList = [30, 40, 50, 60, 80, 100, 120, 150, 200, 300, 500];
  const hList = [0.5, 1, 1.25, 1.5, 1.75, 2, 2.5, 3.5];
  
  let enonce = "", bonneReponse = "", explication = "";
  const types = ['pourcentage', 'conversion', 'calcul_mental', 'fraction'];
  const randType = types[Math.floor(Math.random() * types.length)];
  
  if (randType === 'pourcentage') {
    const p = pList[Math.floor(Math.random() * pList.length)];
    const v = vList[Math.floor(Math.random() * vList.length)];
    const res = (p * v) / 100;
    enonce = `Calculer ${p}% de ${v} €.`;
    bonneReponse = `${res} €`;
    explication = `Prendre ${p}%, c'est faire (${p} × ${v}) / 100 = ${res} €.`;
  } else if (randType === 'conversion') {
    const h = hList[Math.floor(Math.random() * hList.length)];
    const res = h * 60;
    enonce = `Convertir ${h} heure(s) en minutes.`;
    bonneReponse = `${res} minutes`;
    explication = `1 heure = 60 min. Donc ${h}h × 60 = ${res} minutes.`;
  } else if (randType === 'fraction') {
    const num = [1, 3, 5, 7][Math.floor(Math.random() * 4)];
    enonce = `Quelle est la valeur décimale de la fraction ${num}/2 ?`;
    bonneReponse = `${num / 2}`;
    explication = `Diviser par 2 revient à prendre la moitié : ${num} ÷ 2 = ${num / 2}.`;
  } else {
    const a = Math.floor(Math.random() * 9) + 4;
    const b = [9, 11, 19, 21][Math.floor(Math.random() * 4)];
    const res = a * b;
    enonce = `Calculer rapidement de tête : ${a} × ${b}`;
    bonneReponse = `${res}`;
    explication = `Astuce de calcul mental : ${a} × ${b} = ${res}.`;
  }

  const valNum = parseFloat(bonneReponse);
  const options = [
    bonneReponse,
    isNaN(valNum) ? "Aucune" : `${valNum + 5} ${enonce.includes('€') ? '€' : enonce.includes('minutes') ? 'minutes' : ''}`.trim(),
    isNaN(valNum) ? "10" : `${valNum - 2 > 0 ? valNum - 2 : valNum + 12} ${enonce.includes('€') ? '€' : enonce.includes('minutes') ? 'minutes' : ''}`.trim(),
    isNaN(valNum) ? "42" : `${valNum * 2} ${enonce.includes('€') ? '€' : enonce.includes('minutes') ? 'minutes' : ''}`.trim()
  ];
  
  const shuffled = shuffleArr([...new Set(options)]);
  return { enonce, options: shuffled, bonne_reponse: shuffled.indexOf(bonneReponse), explication };
}

// ── SPRINT CHRONOMÉTRÉ DES AUTOMATISMES ──
let timerInterval = null;
let tempsRestant = 45;

function lancerTimer() {
  clearInterval(timerInterval);
  tempsRestant = 45;
  $('quiz-timer').style.display = 'block';
  $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
  $('quiz-timer').style.color = 'var(--text-primary)';

  timerInterval = setInterval(() => {
    tempsRestant--;
    $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
    if (tempsRestant <= 10) $('quiz-timer').style.color = 'var(--color-danger)';
    if (tempsRestant <= 0) {
      clearInterval(timerInterval);
      forcerEchecTimeout();
    }
  }, 1000);
}

function forcerEchecTimeout() {
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  $('quiz-explanation-box').className = "explanation-box visible bad";
  $('explanation-status').textContent = "⏰ TEMPS ÉCOULÉ !";
  $('explanation-text').textContent = "Les 45 secondes imparties pour cet automatisme sont écoulées.";
  $('quiz-next').disabled = false;
  enregistrerLacune("Automatismes");
}

// ── DIAGNOSTIC LOCALISÉ DES POINTS FAIBLES ──
function enregistrerLacune(theme, estSucces = false) {
  if (!AppState.adaptive[theme]) AppState.adaptive[theme] = { echecs: 0, total: 0 };
  AppState.adaptive[theme].total++;
  if (!estSucces) AppState.adaptive[theme].echecs++;
  localStorage.setItem('dnb_adaptive_analytics', JSON.stringify(AppState.adaptive));
  analyserLacunes();
}

function analyserLacunes() {
  let pireTheme = null;
  let maxEchecs = 0;
  for (const theme in AppState.adaptive) {
    const stat = AppState.adaptive[theme];
    if (stat.echecs > maxEchecs && (stat.echecs / stat.total) >= 0.4) {
      maxEchecs = stat.echecs;
      pireTheme = theme;
    }
  }
  if (pireTheme) {
    $('lacunes-box').classList.remove('hidden');
    $('lacunes-text').innerHTML = `🚨 **Alerte Révision :** Tu as des erreurs sur le thème **${pireTheme}**. Sers-toi des **Flashcards** pour mieux retenir !`;
  } else {
    $('lacunes-box').classList.add('hidden');
  }
}

// ── INITIALISATION ET CHARGEMENT DU JSON ──
async function initialiserApp() {
  const savedAdaptive = localStorage.getItem('dnb_adaptive_analytics');
  if (savedAdaptive) AppState.adaptive = JSON.parse(savedAdaptive);
  
  const savedHistory = localStorage.getItem('dnb_history_anti_repeat');
  if (savedHistory) AppState.historiqueQuestions = JSON.parse(savedHistory);
  
  try {
    const res = await fetch('troisieme.json');
    if (res.ok) {
      AppState.data = await res.json();
    } else {
      console.warn("Fichier troisieme.json introuvable, utilisation de la banque de secours.");
      AppState.data = DATA_SECOURS;
    }
  } catch (e) {
    console.error("Erreur réseau pour troisieme.json, bascule de secours actives.", e);
    AppState.data = DATA_SECOURS;
  }
  
  // Si le JSON chargé est vide ou invalide, on force la banque de secours
  if (!AppState.data || !AppState.data.matieres) {
    AppState.data = DATA_SECOURS;
  }
  
  construireMenuMatieres();
  analyserLacunes();
  configurerFlashcardsMenu();
}

function construirMenuMatieres() {
  const container = $('matieres-container');
  container.innerHTML = "";
  if (!AppState.data || !AppState.data.matieres) return;

  AppState.data.matieres.forEach(m => {
    if (!m.chapitres) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '14px';
    
    let chapitresHTML = m.chapitres.map(c => `
      <div class="chapitre-item" style="padding:10px; margin-top:8px; background:var(--bg-app); border-radius:10px; display:flex; justify-content:space-between; align-items:center;" onclick="ouvrirPreQuiz('${m.id}', '${c.id}', event)">
        <span style="font-weight:600; font-size:.85rem; padding-right:8px;">${c.titre}</span>
        <span style="font-size:.7rem; color:var(--text-secondary); background:white; padding:2px 6px; border-radius:8px; white-space:nowrap;">${c.theme || 'DNB'}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
        <span style="font-size:1.3rem;">${m.emoji || '📚'}</span>
        <h3 style="margin:0; font-size:1rem; font-weight:700;">${m.label || m.id}</h3>
      </div>
      <div style="display:flex; flex-direction:column;">${chapitresHTML}</div>
    `;
    container.appendChild(card);
  });
}

// ── NAVIGATION MOBILE ──
let currentMatiereSelected = null;
let currentChapitreSelected = null;

function ouvrirPreQuiz(matiereId, chapitreId, event) {
  if (event) event.stopPropagation();
  currentMatiereSelected = AppState.data.matieres.find(m => m.id === matiereId);
  currentChapitreSelected = currentMatiereSelected.chapitres.find(c => c.id === chapitreId);
  
  $('home-screen').classList.add('hidden');
  $('pre-quiz-screen').classList.remove('hidden');
  
  $('pre-quiz-title').textContent = currentChapitreSelected.titre;
  $('pre-quiz-theme').textContent = currentChapitreSelected.theme || "Général";
  $('pre-quiz-cours-text').textContent = currentChapitreSelected.cours || "Pas de fiche de cours associée.";
  $('pre-quiz-piege-text').textContent = currentChapitreSelected.piege || "Pas de piège listé.";

  $('btn-lvl-1').onclick = () => lancerQuiz(1);
  $('btn-lvl-2').onclick = () => lancerQuiz(2);
  $('btn-lvl-3').onclick = () => lancerQuiz(3);
  
  if (currentChapitreSelected.exercice_ouvert) {
    $('btn-open-exercice').classList.remove('hidden');
    $('btn-open-exercice').onclick = () => ouvrirExerciceOuvert();
  } else {
    $('btn-open-exercice').classList.add('hidden');
  }
}

function goHome() {
  $('pre-quiz-screen').classList.add('hidden');
  if($('open-exercise-screen')) $('open-exercise-screen').classList.add('hidden');
  $('quiz-screen').classList.add('hidden');
  $('flashcards-screen').classList.add('hidden');
  $('home-screen').classList.remove('hidden');
  clearInterval(timerInterval);
  $('quiz-timer').style.display = 'none';
}

function lancerQuiz(niveau) {
  AppState.quiz.chapitreId = currentChapitreSelected.id;
  AppState.quiz.idx = 0;
  AppState.quiz.score = 0;
  AppState.quiz.isAutomatisme = false;
  AppState.quiz.niveauFiltre = niveau;
  
  if (currentMatiereSelected.id === 'maths') {
    AppState.quiz.questions = [genererQuestionMutationMaths(), genererQuestionMutationMaths(), genererQuestionMutationMaths(), genererQuestionMutationMaths(), genererQuestionMutationMaths()];
  } else {
    let pool = currentChapitreSelected.questions ? currentChapitreSelected.questions.filter(q => q.niveau === niveau) : [];
    AppState.quiz.questions = obtenirQuestionsFiltrees(pool, 3);
  }
  
  if(AppState.quiz.questions.length === 0) {
    alert("Aucune question de ce niveau pour l'instant ! Bascule sur un autre niveau.");
    return;
  }

  $('pre-quiz-screen').classList.add('hidden');
  $('quiz-screen').classList.remove('hidden');
  afficherQuestion();
}

$('btn-mode-automatismes').onclick = () => {
  AppState.quiz.chapitreId = "automatismes_global";
  AppState.quiz.idx = 0;
  AppState.quiz.score = 0;
  AppState.quiz.isAutomatisme = true;
  AppState.quiz.questions = [];
  
  for (let i = 0; i < 10; i++) {
    AppState.quiz.questions.push(genererQuestionMutationMaths());
  }
  
  $('home-screen').classList.add('hidden');
  $('quiz-screen').classList.remove('hidden');
  afficherQuestion();
};

function afficherQuestion() {
  clearInterval(timerInterval);
  $('quiz-explanation-box').className = "explanation-box hidden";
  $('quiz-next').disabled = true;
  
  const totalQs = AppState.quiz.questions.length;
  const currentQ = AppState.quiz.questions[AppState.quiz.idx];
  
  $('quiz-progress-text').textContent = `Question ${AppState.quiz.idx + 1} / ${totalQs}`;
  $('quiz-progress-bar').style.width = `${((AppState.quiz.idx + 1) / totalQs) * 100}%`;
  $('quiz-question-text').textContent = currentQ.enonce;
  
  const optionsContainer = $('quiz-options-container');
  optionsContainer.innerHTML = "";
  
  currentQ.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.onclick = () => soumettreReponse(index, btn);
    optionsContainer.appendChild(btn);
  });

  if (AppState.quiz.isAutomatisme) lancerTimer();
  else $('quiz-timer').style.display = 'none';
}

function soumettreReponse(indexChoisi, boutonClique) {
  clearInterval(timerInterval);
  const currentQ = AppState.quiz.questions[AppState.quiz.idx];
  const boutons = document.querySelectorAll('.option-btn');
  boutons.forEach(b => b.disabled = true);
  
  const estCorrect = (indexChoisi === currentQ.bonne_reponse);
  if (estCorrect) {
    AppState.quiz.score++;
    boutonClique.style.background = "#DCFCE7";
    boutonClique.style.borderColor = "#22C55E";
    $('quiz-explanation-box').className = "explanation-box visible good";
    $('explanation-status').textContent = "✅ Super !";
  } else {
    boutonClique.style.background = "#FEE2E2";
    boutonClique.style.borderColor = "#EF4444";
    if (boutons[currentQ.bonne_reponse]) {
      boutons[currentQ.bonne_reponse].style.background = "#DCFCE7";
      boutons[currentQ.bonne_reponse].style.borderColor = "#22C55E";
    }
    $('quiz-explanation-box').className = "explanation-box visible bad";
    $('explanation-status').textContent = "❌ Attention";
  }
  
  $('explanation-text').textContent = currentQ.explication || "";
  $('quiz-next').disabled = false;
  
  const themeConcerne = currentChapitreSelected ? currentChapitreSelected.theme : "Automatismes";
  enregistrerLacune(themeConcerne, estCorrect);
}

$('quiz-next').onclick = () => {
  AppState.quiz.idx++;
  if (AppState.quiz.idx < AppState.quiz.questions.length) {
    afficherQuestion();
  } else {
    alert(`🏁 Session finie ! Score : ${AppState.quiz.score} / ${AppState.quiz.questions.length}`);
    goHome();
  }
};

$('quiz-close').onclick = () => { if (confirm("Quitter le quiz ?")) goHome(); };

// ── SUJETS DE RÉDACTION OUVERTS ──
function ouvrirExerciceOuvert() {
  $('pre-quiz-screen').classList.add('hidden');
  $('open-exercise-screen').classList.remove('hidden');
  
  $('open-ex-title').textContent = currentChapitreSelected.titre;
  $('open-ex-enonce').textContent = currentChapitreSelected.exercice_ouvert.enonce;
  $('open-ex-textarea').value = "";
  $('open-ex-correction-box').classList.add('hidden');
  $('btn-validate-open-ex').classList.remove('hidden');

  $('btn-close-exercise').onclick = () => {
    $('open-exercise-screen').classList.add('hidden');
    $('pre-quiz-screen').classList.remove('hidden');
  };

  $('btn-validate-open-ex').onclick = () => {
    if ($('open-ex-textarea').value.trim().length < 5) {
      alert("Écris un début de réponse avant de voir la correction.");
      return;
    }
    $('btn-validate-open-ex').classList.add('hidden');
    $('open-ex-correction-box').classList.remove('hidden');
    
    const containerCriteres = $('open-ex-critere-list');
    containerCriteres.innerHTML = "";
    if(currentChapitreSelected.exercice_ouvert.criteres) {
      currentChapitreSelected.exercice_ouvert.criteres.forEach((critere, index) => {
        const label = document.createElement('label');
        label.style.cssText = "display:flex; align-items:start; gap:8px; font-size:.8rem; background:var(--bg-app); padding:8px; border-radius:8px; cursor:pointer;";
        label.innerHTML = `<input type="checkbox" class="critere-cb" value="${index}"> <span>${critere}</span>`;
        containerCriteres.appendChild(label);
      });
    }
  };

  $('btn-finish-open-ex').onclick = () => {
    const total = document.querySelectorAll('.critere-cb').length;
    const coches = document.querySelectorAll('.critere-cb:checked').length;
    alert(`Résultats pris en compte : ${coches} / ${total} réussis.`);
    enregistrerLacune(currentChapitreSelected.theme, total > 0 ? (coches / total) >= 0.6 : true);
    goHome();
  };
}

// ── MODULE FLASHCARDS INTERACTIF PARFAIT ──
let flashcardsPool = [];
let currentFlashcardIdx = 0;

function configurerFlashcardsMenu() {
  if ($('nav-home')) {
    $('nav-home').onclick = () => {
      $('nav-home').classList.add('active');
      $('nav-flashcards').classList.remove('active');
      goHome();
    };
  }

  if ($('nav-flashcards')) {
    $('nav-flashcards').onclick = () => {
      $('nav-flashcards').classList.add('active');
      if ($('nav-home')) $('nav-home').classList.remove('active');
      
      genererFlashcardsPool();
      if (flashcardsPool.length === 0) {
        alert("Aucun cours ou piège trouvé pour les Flashcards.");
        return;
      }
      currentFlashcardIdx = 0;
      $('home-screen').classList.add('hidden');
      $('pre-quiz-screen').classList.add('hidden');
      $('quiz-screen').classList.add('hidden');
      if ($('open-exercise-screen')) $('open-exercise-screen').classList.add('hidden');
      $('flashcards-screen').classList.remove('hidden');
      afficherFlashcard();
    };
  }

  const cardBox = $('flashcard-card-box');
  if (cardBox) {
    cardBox.onclick = (e) => {
      e.stopPropagation();
      cardBox.classList.toggle('flipped');
    };
  }

  if ($('flashcard-next')) {
    $('flashcard-next').onclick = (e) => {
      e.stopPropagation();
      currentFlashcardIdx++;
      if (currentFlashcardIdx >= flashcardsPool.length) {
        alert("🎉 Bravo ! Tu as révisé toutes les cartes de mémorisation active !");
        if ($('nav-home')) $('nav-home').click();
        else goHome();
      } else {
        afficherFlashcard();
      }
    };
  }
}

function genererFlashcardsPool() {
  flashcardsPool = [];
  if (!AppState.data || !AppState.data.matieres) return;
  
  AppState.data.matieres.forEach(m => {
    if (!m.chapitres) return;
    m.chapitres.forEach(c => {
      if (c.cours && c.cours.trim() !== "") {
        flashcardsPool.push({
          matiere: m.label || m.id,
          chapitre: c.titre,
          recto: `Que faut-il retenir impérativement sur le chapitre :\n\n"${c.titre}" ?`,
          verso: c.cours
        });
      }
      if (c.piege && c.piege.trim() !== "") {
        flashcardsPool.push({
          matiere: m.label || m.id,
          chapitre: c.titre,
          recto: `Quel est le piège classique au Brevet concernant :\n\n"${c.titre}" ?`,
          verso: `⚠️ ATTENTION PIÈGE :\n\n${c.piege}`
        });
      }
    });
  });
  
  flashcardsPool = shuffleArr(flashcardsPool);
}

function afficherFlashcard() {
  if (flashcardsPool.length === 0) return;
  const card = flashcardsPool[currentFlashcardIdx];
  $('flashcard-card-box').classList.remove('flipped');
  
  $('flashcard-meta').textContent = `${card.matiere} • ${card.chapitre} (${currentFlashcardIdx + 1}/${flashcardsPool.length})`;
  $('flashcard-front-text').textContent = card.recto;
  $('flashcard-back-text').textContent = card.verso;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

document.addEventListener('DOMContentLoaded', initialiserApp);
