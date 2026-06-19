// ==========================================================================
// RévisBrevet 2026 — app.js (SOFT UI EVOLUTION EDITION — FULL MECHANICAL LOGIC)
// ==========================================================================

const AppState = {
  data: null,
  progress: {},
  adaptive: {}, 
  historiqueQuestions: [],
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

const DATA_SECOURS = {
  matieres: [
    {
      id: "maths",
      label: "Mathématiques",
      emoji: "📐",
      categorie: "Sciences",
      chapitres: [
        {
          id: "fractions",
          titre: "Calculs avec des fractions",
          theme: "Nombres",
          cours: "Pour additionner ou soustraire deux fractions, il faut les mettre au même dénominateur. Pour multiplier, on multiplie les numérateurs entre eux et les dénominateurs entre eux.",
          piege: "Oublier la priorité opératoire de la multiplication sur l'addition !"
        }
      ]
    }
  ]
};

// Dictionnaire des SVG de secours pour remplacer complètement les émojis dans l'interface graphique
const SVGMappings = {
  "maths": `<svg viewBox="0 0 24 24"><path d="M22 10v4h-6v6h-4v-6H6v-4h6V4h4v6h6z"/></svg>`,
  "francais": `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  "histoire": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>`,
  "svt": `<svg viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2.5 3.19-2.5 5.5h20c0-2.31-1-4.24-2.5-5.5M12 2a5 5 0 1 0 0 10 5 5 0 1 0 0-10z"/></svg>`,
  "physique": `<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
};

function obtenirQuestionsFiltrees(pool, quantite) {
  let questionsDisponibles = pool.filter(q => !AppState.historiqueQuestions.includes(q.enonce));
  if (questionsDisponibles.length < quantite) {
    AppState.historiqueQuestions = AppState.historiqueQuestions.filter(enonce => !pool.some(q => q.enonce === enonce));
    questionsDisponibles = pool;
  }
  const selectionnees = shuffleArr(questionsDisponibles).slice(0, quantite);
  selectionnees.forEach(q => AppState.historiqueQuestions.push(q.enonce));
  if (AppState.historiqueQuestions.length > 50) AppState.historiqueQuestions.shift();
  localStorage.setItem('dnb_history_anti_repeat', JSON.stringify(AppState.historiqueQuestions));
  return selectionnees;
}

function genererQuestionMutationMaths() {
  const pList = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75];
  const vList = [30, 40, 50, 60, 80, 100, 120, 150, 200, 300, 400, 500];
  const p = pList[Math.floor(Math.random() * pList.length)];
  const v = vList[Math.floor(Math.random() * vList.length)];
  const res = parseFloat(((p * v) / 100).toFixed(2));
  
  const enonce = `Calculer ${p}% de ${v} €.`;
  const bonneReponse = `${res} €`;
  const explication = `Prendre ${p}%, revient à calculer (${p} × ${v}) / 100 = ${res} €.`;
  
  const options = [bonneReponse, `${parseFloat((res + (v * 0.05)).toFixed(2))} €`, `${res - 2 > 0 ? parseFloat((res - 2).toFixed(2)) : parseFloat((res + 10).toFixed(2))} €`, `${parseFloat((res * 1.5).toFixed(2))} €`];
  const shuffled = shuffleArr([...new Set(options)]);
  return { enonce, options: shuffled, bonne_reponse: shuffled.indexOf(bonneReponse), explication };
}

let timerInterval = null;
let tempsRestant = 45;

function lancerTimer() {
  clearInterval(timerInterval);
  tempsRestant = 45;
  $('quiz-timer').style.display = 'inline-flex';
  $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
  $('quiz-timer').style.background = '#E2E8F0';
  $('quiz-timer').style.color = 'var(--text-primary)';

  timerInterval = setInterval(() => {
    tempsRestant--;
    $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
    if (tempsRestant <= 10) {
      $('quiz-timer').style.background = '#FEE2E2';
      $('quiz-timer').style.color = 'var(--color-danger)';
    }
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
  $('explanation-text').textContent = "Les 45 secondes maximales pour cet automatisme sont passées.";
  $('quiz-next').disabled = false;
  enregistrerLacune("Automatismes");
}

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
    if (stat.echecs > maxEchecs && (stat.echecs / stat.total) >= 0.35) {
      maxEchecs = stat.echecs;
      pireTheme = theme;
    }
  }
  if (pireTheme) {
    $('lacunes-box').classList.remove('hidden');
    $('lacunes-text').innerHTML = `💡 <b>Focus Révision :</b> Tes statistiques signalent des erreurs fréquentes sur le thème <b>${pireTheme}</b>. Passe par l'onglet Flashcards pour consolider tes connaissances !`;
  } else {
    $('lacunes-box').classList.add('hidden');
  }
}

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
      AppState.data = DATA_SECOURS;
    }
  } catch (e) {
    AppState.data = DATA_SECOURS;
  }
  
  if (!AppState.data || !AppState.data.matieres) {
    AppState.data = DATA_SECOURS;
  }
  
  construireMenuMatieres();
  analyserLacunes();
  configurerFlashcardsMenu();
}

function construireMenuMatieres() {
  const container = $('matieres-container');
  if (!container) return;
  container.innerHTML = "";
  
  const dataToUse = AppState.data || DATA_SECOURS;
  const groupes = {};
  
  dataToUse.matieres.forEach(m => {
    const cat = m.categorie || "Enseignement Général";
    if (!groupes[cat]) groupes[cat] = [];
    groupes[cat].push(m);
  });

  for (const [nomCategorie, listeMatieres] of Object.entries(groupes)) {
    const titreCategorie = document.createElement('div');
    titreCategorie.className = 'category-group-title';
    titreCategorie.textContent = nomCategorie;
    container.appendChild(titreCategorie);

    listeMatieres.forEach(m => {
      if (!m.chapitres) return;
      
      const card = document.createElement('div');
      card.className = 'card matiere-card-wrapper';
      
      const header = document.createElement('div');
      header.className = 'matiere-trigger-header';
      
      const defaultIcon = `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
      const svgIcon = SVGMappings[m.id] || defaultIcon;

      header.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="header-icon-box">${svgIcon}</div>
          <h3 style="margin:0; font-size:1rem; font-weight:700; color:var(--text-primary); letter-spacing:-0.01em;">${m.label || m.id}</h3>
        </div>
        <svg class="arrow-indicator" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      `;
      
      const bodyContent = document.createElement('div');
      bodyContent.className = 'matiere-chapters-body';
      
      m.chapitres.forEach(c => {
        const row = document.createElement('div');
        row.className = 'chapitre-item';
        row.style.cssText = "padding:16px 14px; margin-top:12px; background:var(--bg-card); border-radius:12px; display:flex; justify-content:space-between; align-items:center; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);";
        row.onclick = (e) => ouvrirPreQuiz(m.id, c.id, e);
        row.innerHTML = `
          <span style="font-weight:600; font-size:.88rem; padding-right:12px; text-align:left; color:var(--text-primary); line-height:1.4;">${c.titre}</span>
          <span style="font-size:.68rem; font-weight:700; color:var(--color-primary); background:#EEF2FF; padding:5px 10px; border-radius:8px; white-space:nowrap; text-transform:uppercase; letter-spacing:0.03em;">${c.theme || 'DNB'}</span>
        `;
        bodyContent.appendChild(row);
      });

      header.onclick = () => {
        const estOuvert = bodyContent.classList.contains('is-open');
        
        document.querySelectorAll('.matiere-chapters-body').forEach(b => b.classList.remove('is-open'));
        document.querySelectorAll('.arrow-indicator').forEach(a => a.classList.remove('rotated'));
        document.querySelectorAll('.matiere-card-wrapper').forEach(w => w.classList.remove('is-expanded'));
        
        if (!estOuvert) {
          bodyContent.classList.add('is-open');
          card.classList.add('is-expanded');
          header.querySelector('.arrow-indicator').classList.add('rotated');
        }
      };

      card.appendChild(header);
      card.appendChild(bodyContent);
      container.appendChild(card);
    });
  }
}

let currentMatiereSelected = null;
let currentChapitreSelected = null;

function ouvrirPreQuiz(matiereId, chapitreId, event) {
  if (event) event.stopPropagation();
  
  const dataToUse = AppState.data || DATA_SECOURS;
  currentMatiereSelected = dataToUse.matieres.find(m => m.id === matiereId);
  currentChapitreSelected = currentMatiereSelected.chapitres.find(c => c.id === chapitreId);
  
  $('home-screen').classList.add('hidden');
  $('pre-quiz-screen').classList.remove('hidden');
  
  $('pre-quiz-title').textContent = currentChapitreSelected.titre;
  $('pre-quiz-theme').textContent = currentChapitreSelected.theme || "Général";
  $('pre-quiz-cours-text').textContent = currentChapitreSelected.cours || "Résumé de cours non spécifié.";
  $('pre-quiz-piege-text').textContent = currentChapitreSelected.piege || "Pas de vigilance particulière recensée.";

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
    // Mode infini adaptatif pour les mathématiques
    AppState.quiz.questions = Array.from({length: 5}, () => genererQuestionMutationMaths());
  } else {
    let pool = currentChapitreSelected.questions ? currentChapitreSelected.questions.filter(q => q.niveau === niveau) : [];
    AppState.quiz.questions = obtenirQuestionsFiltrees(pool, 3);
  }
  
  if(AppState.quiz.questions.length === 0) {
    alert("Aucune question de ce niveau n'est disponible pour ce chapitre.");
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
  AppState.quiz.questions = Array.from({length: 10}, () => genererQuestionMutationMaths());
  
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
    boutonClique.style.borderColor = "var(--color-success)";
    boutonClique.style.color = "#15803D";
    $('quiz-explanation-box').className = "explanation-box visible good";
    $('explanation-status').textContent = "✅ EXCELLENT";
  } else {
    boutonClique.style.background = "#FEE2E2";
    boutonClique.style.borderColor = "var(--color-danger)";
    boutonClique.style.color = "#B91C1C";
    if (boutons[currentQ.bonne_reponse]) {
      boutons[currentQ.bonne_reponse].style.background = "#DCFCE7";
      boutons[currentQ.bonne_reponse].style.borderColor = "var(--color-success)";
      boutons[currentQ.bonne_reponse].style.color = "#15803D";
    }
    $('quiz-explanation-box').className = "explanation-box visible bad";
    $('explanation-status').textContent = "❌ COMPLÉMENT DE COURS";
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
    alert(`🏁 Fin de session ! Score : ${AppState.quiz.score} / ${AppState.quiz.questions.length}`);
    goHome();
  }
};

$('quiz-close').onclick = () => { 
  if (confirm("Voulez-vous quitter l'entraînement en cours ?")) goHome(); 
};

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
      alert("Saisissez votre réflexion au brouillon avant d'afficher les critères de validation.");
      return;
    }
    $('btn-validate-open-ex').classList.add('hidden');
    $('open-ex-correction-box').classList.remove('hidden');
    
    const containerCriteres = $('open-ex-critere-list');
    containerCriteres.innerHTML = "";
    if(currentChapitreSelected.exercice_ouvert.criteres) {
      currentChapitreSelected.exercice_ouvert.criteres.forEach((critere, index) => {
        const label = document.createElement('label');
        label.style.cssText = "display:flex; align-items:start; gap:10px; font-size:.85rem; background:white; padding:12px; border-radius:10px; cursor:pointer; border:1px solid var(--border-color); font-weight:500;";
        label.innerHTML = `<input type="checkbox" class="critere-cb" value="${index}" style="margin-top:2px;"> <span>${critere}</span>`;
        containerCriteres.appendChild(label);
      });
    }
  };

  $('btn-finish-open-ex').onclick = () => {
    const total = document.querySelectorAll('.critere-cb').length;
    const coches = document.querySelectorAll('.critere-cb:checked').length;
    alert(`Auto-évaluation enregistrée.`);
    enregistrerLacune(currentChapitreSelected.theme, total > 0 ? (coches / total) >= 0.6 : true);
    goHome();
  };
}

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
        alert("Ajoutez des fiches de cours ou pièges dans votre catalogue pour générer les flashcards.");
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
        alert("🎉 Bravo ! Toutes les flashcards actives ont été consultées.");
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
  const dataToUse = AppState.data || DATA_SECOURS;
  
  dataToUse.matieres.forEach(m => {
    if (!m.chapitres) return;
    m.chapitres.forEach(c => {
      if (c.cours && c.cours.trim() !== "") {
        flashcardsPool.push({
          matiere: m.label || m.id,
          chapitre: c.titre,
          recto: `Que faut-il impérativement retenir sur le chapitre :\n\n"${c.titre}" ?`,
          verso: c.cours
        });
      }
      if (c.piege && c.piege.trim() !== "") {
        flashcardsPool.push({
          matiere: m.label || m.id,
          chapitre: c.titre,
          recto: `Quel piège classique les correcteurs du Brevet cachent-ils sur :\n\n"${c.titre}" ?`,
          verso: c.piege
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
