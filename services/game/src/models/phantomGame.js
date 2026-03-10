import { BASE_QUESTION_CARDS } from "./cardsData.js"

const GAME_STATE = {
  WAITING: "WAITING", 
  TEAM_SELECTION: "TEAM_SELECTION", 
  CHOOSE_OBJECT: "CHOOSE_OBJECT", 
  PLAYING: "PLAYING", 
  FINISHED: "FINISHED"
}

const TURN_STATE = {
  ASK_QUESTION: "ASK_QUESTION", 
  GUESS_OBJECT: "GUESS_OBJECT",
  EYE_POWER_SELECTION: "EYE_POWER_SELECTION",
  EYE_POWER_REVEAL: "EYE_POWER_REVEAL"
}

const TEAMS = {
  SUN: "SUN", MOON: "MOON", BOTH: "BOTH"
}

const ROLES = {
  SPIRIT: "SPIRIT", MEDIUM: "MEDIUM"
}

class PhantomGame {
  constructor(gameId) {
    this.gameId = gameId;
    this.status = GAME_STATE.TEAM_SELECTION; // WAITING, CHOOSE_OBJECT, PLAYING, FINISHED
    this.secretObject = null;
    this.winner = null;
    this.currentTurn = TEAMS.SUN; // L'équipe Soleil commence toujours
    this.players = {};

    this.deck = [];
    this.discardPile = [];

    this.teams = {
      sun: {
        spirits: [],
        mediums: [],
        turnsTaken: 0,
        mulliganUsed: false,
        clues: [], // Historique des indices { questionId, currentWord, isComplete }
        guesses: [], // Historique des tentatives
        hand: []
      },
      moon: {
        spirits: [],
        mediums: [],
        turnsTaken: 0,
        mulliganUsed: false,
        clues: [],
        guesses: [],
        hand: []
      }
    };

    // État temporel du tour en cours
    this.turnState = {
      action: null, // 'ASK_QUESTION', 'GUESS_OBJECT'
      pendingQuestions: [], // Les 2 cartes proposées à l'Esprit
      selectedQuestion: null,
      currentWritingClue: "", // L'indice en cours d'écriture
      currentGuessingWord: "", // Le mot en cours de devinette
      currentLiveImage: null
    };
  }

  // --- GESTION DES JOUEURS ---
  addPlayer(userId, username, color, isHost) {
    if (!this.players[userId]) {
      this.players[userId] = {
        id: userId,
        username,
        color,
        isHost,
        team: null,
        role: null
      };
    }
  }

  assignRole(userId, team, role) {
    if (this.status !== GAME_STATE.TEAM_SELECTION) throw new Error("La sélection est terminée.");
    if (!this.players[userId]) throw new Error("Joueur introuvable.");

    this.players[userId].team = team;
    this.players[userId].role = role;
    this.rebuildTeams();
  }

  rebuildTeams() {
    this.teams.sun.spirits = [];
    this.teams.sun.mediums = [];
    this.teams.moon.spirits = [];
    this.teams.moon.mediums = [];

    for (const p of Object.values(this.players)) {
      if (!p.team || !p.role) continue;

      // Cas spécial : L'Esprit partagé (3 joueurs)
      if (p.team === TEAMS.BOTH && p.role === ROLES.SPIRIT) {
        this.teams.sun.spirits.push(p);
        this.teams.moon.spirits.push(p);
      } else if (p.team !== TEAMS.BOTH) {
        this.teams[p.team.toLowerCase()][p.role.toLowerCase() + 's'].push(p);
      }
    }
  }

  validateTeams() {
    const playerCount = Object.keys(this.players).length;
    const sunM = this.teams.sun.mediums.length;
    const moonM = this.teams.moon.mediums.length;
    const sunS = this.teams.sun.spirits.length;
    const moonS = this.teams.moon.spirits.length;

    // Règle 1 : Tous les joueurs doivent avoir choisi un rôle
    const unassigned = Object.values(this.players).filter(p => !p.team || !p.role);
    if (unassigned.length > 0) return { valid: false, msg: "Tous les joueurs doivent choisir un rôle." };

    // Règle 2 : Au moins un médium par équipe (dans tous les cas)
    if (sunM < 1 || moonM < 1) return { valid: false, msg: "Il faut au moins un Médium dans chaque équipe." };

    if (playerCount === 3) {
      // Règle 3 joueurs : Un Esprit qui joue dans les deux équipes
      const sharedSpirits = Object.values(this.players).filter(p => p.team === TEAMS.BOTH && p.role === ROLES.SPIRIT).length;
      if (sharedSpirits !== 1) return { valid: false, msg: "À 3 joueurs, un joueur doit être l'Esprit des deux équipes." };
    } else {
      // Règle 4+ joueurs : Au moins 1 Esprit par équipe
      if (sunS < 1 || moonS < 1) return { valid: false, msg: "Il faut au moins un Esprit dans chaque équipe." };
    }

    return { valid: true };
  }

  lockTeams() {
    const validation = this.validateTeams();
    if (!validation.valid) throw new Error(validation.msg);

    this.dealInitialHands();

    this.status = GAME_STATE.CHOOSE_OBJECT;
  }

  initDeck() {
    // On copie la liste de base pour ne pas modifier l'originale
    this.deck = [...BASE_QUESTION_CARDS];
    this.shuffleDeck();
  }

  shuffleDeck() {
    // Algorithme de Fisher-Yates pour mélanger parfaitement
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  drawCards(team, count) {
    const teamKey = team.toLowerCase();
    const drawnCards = [];
    for (let i = 0; i < count; i++) {
      // Si le paquet est vide, on remélange la défausse
      if (this.deck.length === 0) {
        if (this.discardPile.length === 0) break; // Plus aucune carte du tout !
        this.deck = [...this.discardPile];
        this.discardPile = [];
        this.shuffleDeck();
      }
      drawnCards.push(this.deck.pop());
    }

    // On ajoute les cartes tirées à la main de l'équipe
    this.teams[teamKey].hand.push(...drawnCards);
  }

  dealInitialHands() {
    this.initDeck();
    this.drawCards('sun', 7);  // 7 cartes pour le Soleil
    this.drawCards('moon', 7); // 7 cartes pour la Lune
  }

  // --- INITIALISATION ---
  setSecretObject(objectName) {
    this.secretObject = objectName.toUpperCase();
    this.status = GAME_STATE.PLAYING;
  }

  // --- ACTION : POSER UNE QUESTION ---
  proposeQuestions(team, cardId1, cardId2) {
    const teamKey = team.toLowerCase();
    this.verifyTurn(teamKey);

    // 1. On trouve les cartes dans la main de l'équipe
    const hand = this.teams[teamKey].hand;
    const card1Index = hand.findIndex(c => c.id === cardId1);
    const card2Index = hand.findIndex(c => c.id === cardId2);

    if (card1Index === -1 || card2Index === -1) {
      throw new Error("Ces cartes ne sont pas dans votre main.");
    }

    // 2. On récupère les objets Cartes complets
    const card1 = hand[card1Index];
    const card2 = hand[card2Index];

    // 3. On les retire de la main (en filtrant)
    this.teams[teamKey].hand = hand.filter(c => c.id !== cardId1 && c.id !== cardId2);

    // 4. On les met en attente pour l'Esprit
    this.turnState.action = TURN_STATE.ASK_QUESTION;
    this.turnState.pendingQuestions = [card1, card2]; // On stocke les objets complets
  }

  selectQuestion(team, selectedCardId) {
    const teamKey = team.toLowerCase();
    const selected = this.turnState.pendingQuestions.find(c => c.id === selectedCardId);
    const discarded = this.turnState.pendingQuestions.find(c => c.id !== selectedCardId);

    if (!selected) throw new Error("Carte invalide.");
    if (discarded) this.discardPile.push(discarded);

    this.turnState.selectedQuestion = selected.text;
    
    this.teams[teamKey].clues.push({
      questionId: selected.text,
      letters: [], // 🌟 NOUVEAU : Un tableau pour stocker les images des lettres
      isSealed: false, // 🌟 NOUVEAU : True uniquement si l'esprit met un "."
      isGuess: false
    });

    this.drawCards(teamKey, 2);
  }

  commitLetter(team, imageBase64) {
    // CAS 1 : On est dans le Pouvoir de l'Oeil (Étape 1)
    if (this.turnState.action === TURN_STATE.EYE_POWER_REVEAL) {
        const target = this.turnState.eyeTarget;
        if (team.toLowerCase() !== target.team && team !== 'BOTH') throw new Error("Non autorisé.");
        
        const targetClue = this.teams[target.team].clues[target.index];
        targetClue.letters.push({ image: imageBase64, isRevealed: true }); // On sauvegarde la lettre réparée
        
        this.turnState.currentLiveImage = null;
        
        if (target.step === 1) {
            // On passe à l'étape 2 : La nouvelle lettre !
            target.step = 2;
            target.initialImage = null; 
        }
        return;
    }

    // CAS 2 : C'est le tour normal de l'Esprit
    const teamKey = team.toLowerCase();
    this.verifyTurn(teamKey); 
    const activeClue = this.teams[teamKey].clues[this.teams[teamKey].clues.length - 1];
    
    if (!activeClue || activeClue.isSealed) throw new Error("Cet indice est déjà terminé.");

    activeClue.letters.push({ image: imageBase64, isRevealed: true });
    this.turnState.currentLiveImage = null;
  }
  
  finishWord(team) {
    const teamKey = team.toLowerCase();
    this.verifyTurn(teamKey);
    const activeClue = this.teams[teamKey].clues[this.teams[teamKey].clues.length - 1];
    
    if (!activeClue || activeClue.isSealed) throw new Error("Cet indice est déjà terminé.");

    activeClue.isSealed = true; // Le mot est verrouillé, l'Oeil ne pourra plus agir dessus
    this.endTurn();
  }

  silencio(team) {
    const teamKey = team.toLowerCase();
    this.verifyTurn(teamKey);
    const activeClue = this.teams[teamKey].clues[this.teams[teamKey].clues.length - 1];
    
    // 🌟 Si l'Esprit était en train de dessiner, on capture son dessin inachevé !
    if (this.turnState.currentLiveImage) {
        activeClue.letters.push({
            image: this.turnState.currentLiveImage,
            isRevealed: true
        });
        this.turnState.currentLiveImage = null;
    }

    activeClue.isComplete = true;
    this.endTurn();
  }

  // --- ACTION : DEVINER L'OBJET ---

  guessLetter(team, letter) {
    const teamKey = team.toLowerCase();
    const guessUpper = letter.toUpperCase();
    const activeClue = this.teams[teamKey].clues[this.teams[teamKey].clues.length - 1];
    
    // 🌟 CORRECTION 2 : Si le mot est déjà entièrement trouvé, on attend un point '.' pour la victoire
    if (this.turnState.currentGuessingWord === this.secretObject) {
        if (guessUpper === '.') {
            // C'est une victoire !
            this.turnState.currentGuessingWord += '.';
            activeClue.text = this.turnState.currentGuessingWord;
            this.status = GAME_STATE.FINISHED;
            this.winner = team;
            activeClue.isComplete = true;
            return { status: 'WIN', word: this.turnState.currentGuessingWord };
        } else {
            // Le Médium rajoute une lettre alors que le mot était fini (ex: il veut écrire CHATEAU, le mot est CHAT)
            this.turnState.currentGuessingWord += guessUpper;
            activeClue.text = this.turnState.currentGuessingWord;
            activeClue.isComplete = true;
            activeClue.wrongGuess = true;
            this.endTurn();
            return { status: 'INCORRECT' };
        }
    }
    
    // Sinon (le mot n'est pas encore fini), on compare la lettre à la lettre attendue
    const expectedLetter = this.secretObject[this.turnState.currentGuessingWord.length];
    
    if (guessUpper === expectedLetter) {
        this.turnState.currentGuessingWord += guessUpper;
        activeClue.text = this.turnState.currentGuessingWord;
        return { status: 'CORRECT', currentWord: this.turnState.currentGuessingWord };
    } else {
        this.turnState.currentGuessingWord += guessUpper;
        activeClue.text = this.turnState.currentGuessingWord;
        activeClue.isComplete = true;
        activeClue.wrongGuess = true;
        this.endTurn();
        return { status: 'INCORRECT' };
    }
  }

  // --- MÉCANIQUES GLOBALES ---
  endTurn() {
    const oldTeamKey = this.currentTurn.toLowerCase();
    this.teams[oldTeamKey].turnsTaken++;
    
    if (this.teams.sun.turnsTaken >= 8 && this.teams.moon.turnsTaken >= 8) {
        this.status = GAME_STATE.FINISHED;
        this.winner = 'DRAW'; 
        return;
    }

    this.currentTurn = this.currentTurn === TEAMS.SUN ? TEAMS.MOON : TEAMS.SUN;
    const newTeamKey = this.currentTurn.toLowerCase();
    const currentTurnIndex = this.teams[newTeamKey].turnsTaken; 
    
    const sunEyes = [3, 5, 6];
    const moonEyes = [2, 4, 5];
    
    const isEyeSpace = (newTeamKey === 'sun' && sunEyes.includes(currentTurnIndex)) || 
                       (newTeamKey === 'moon' && moonEyes.includes(currentTurnIndex));

    const allClues = [...this.teams.sun.clues, ...this.teams.moon.clues];
    // 🌟 CORRECTION : Une cible valide est un mot qui n'est pas une tentative et qui n'a pas été scellé par un "."
    const hasValidTarget = allClues.some(clue => !clue.isGuess && !clue.isSealed);

    this.turnState = {
      action: (isEyeSpace && hasValidTarget) ? TURN_STATE.EYE_POWER_SELECTION : null,
      pendingQuestions: [],
      selectedQuestion: null,
      eyeTarget: null,
      currentLiveImage: null
    };
  }

  // 🌟 NOUVELLE MÉTHODE À AJOUTER SOUS endTurn()
  skipEyePower(team) {
    const teamKey = team.toLowerCase();
    this.verifyTurn(teamKey);
    if (this.turnState.action !== TURN_STATE.EYE_POWER_SELECTION) throw new Error("Action invalide.");
    
    // On annule l'Oeil, le tour redevient un tour normal de Médium (null)
    this.turnState.action = null;
  }

  useEyePower(team, targetTeam, targetIndex) {
    const teamKey = team.toLowerCase();
    this.verifyTurn(teamKey);
    if (this.turnState.action !== TURN_STATE.EYE_POWER_SELECTION) throw new Error("Ce n'est pas le moment d'utiliser l'Oeil.");
    
    const targetClue = this.teams[targetTeam].clues[targetIndex];
    
    if (!targetClue || targetClue.isGuess || targetClue.isSealed) {
        throw new Error("Indice invalide ou déjà scellé par un point.");
    }

    // On "aspire" la toute dernière lettre (qui est potentiellement incomplète)
    const lastLetter = targetClue.letters.pop();

    this.turnState.action = TURN_STATE.EYE_POWER_REVEAL;
    this.turnState.eyeTarget = { 
        team: targetTeam, 
        index: targetIndex, 
        questionId: targetClue.questionId,
        initialImage: lastLetter ? lastLetter.image : null, // L'image à redessiner
        step: 1 // 🌟 ÉTAPE 1 : Compléter la lettre
    };
  }

  endEyePower(team, imageBase64, isSealed) {
    if (this.turnState.action !== TURN_STATE.EYE_POWER_REVEAL) throw new Error("Action invalide.");
    const target = this.turnState.eyeTarget;
    if (team.toLowerCase() !== target.team && team !== 'BOTH') throw new Error("Non autorisé.");

    const targetClue = this.teams[target.team].clues[target.index];
    
    // S'il a dessiné une nouvelle lettre, on l'ajoute
    if (imageBase64) {
        targetClue.letters.push({ image: imageBase64, isRevealed: true });
    }
    // S'il a mis un point, on verrouille le mot
    if (isSealed) {
        targetClue.isSealed = true;
    }

    // On nettoie et on clôture la phase
    this.turnState.action = null;
    this.turnState.eyeTarget = null;
    this.turnState.currentLiveImage = null;
  }

  revealEyeLetter(team, imageBase64) {
    const targetTeam = this.turnState.eyeTarget.team;
    
    if (team.toLowerCase() !== targetTeam && team !== 'BOTH') {
        throw new Error("Seul l'Esprit qui a écrit cet indice peut révéler une lettre.");
    }
    
    if (this.turnState.action !== TURN_STATE.EYE_POWER_REVEAL) throw new Error("Action invalide.");

    const targetClue = this.teams[targetTeam].clues[this.turnState.eyeTarget.index];
    // On ajoute la lettre dessinée à la suite du mot ciblé
    targetClue.letters.push({ image: imageBase64, isRevealed: true });
    
    this.turnState.action = null;
    this.turnState.eyeTarget = null;
  }

  useMulligan(team) {
    const teamKey = team.toLowerCase();
    if (this.teams[teamKey].mulliganUsed) throw new Error("Mulligan déjà utilisé.");
    this.teams[teamKey].mulliganUsed = true;

    // 1. On met l'ancienne main dans la défausse
    this.discardPile.push(...this.teams[teamKey].hand);

    // 2. On vide la main
    this.teams[teamKey].hand = [];

    // 3. On repioche 7 cartes !
    this.drawCards(teamKey, 7);
  }

    syncLiveImage(team, imageBase64) {
    if (this.turnState.action === TURN_STATE.EYE_POWER_REVEAL) {
        if (team.toLowerCase() === this.turnState.eyeTarget.team || team === 'BOTH') {
            this.turnState.currentLiveImage = imageBase64;
        }
    } else if (this.currentTurn.toLowerCase() === team.toLowerCase()) {
        this.turnState.currentLiveImage = imageBase64;
    }
  }

  startGuessing(team) {
    const teamKey = team.toLowerCase();
    this.verifyTurn(teamKey);
    this.turnState.action = TURN_STATE.GUESS_OBJECT;
    
    this.teams[teamKey].clues.push({
        questionId: "TENTATIVE",
        letters: [], // On stockera les Base64 ici aussi
        isComplete: false,
        isGuess: true,
        wrongGuess: false
    });
  }

  // 🌟 NOUVEAU : Le Médium envoie une lettre, on attend le juge
  submitGuessLetter(team, imageBase64, isDot) {
    this.verifyTurn(team);
    this.turnState.action = 'JUDGE_GUESS';
    this.turnState.pendingGuessLetter = { imageBase64, isDot };
    this.turnState.currentLiveImage = null; // Nettoie le live pad
  }

  // 🌟 NOUVEAU : L'Esprit juge la lettre !
  judgeGuessLetter(team, isCorrect) {
    const teamKey = team.toLowerCase();
    const activeClue = this.teams[teamKey].clues[this.teams[teamKey].clues.length - 1];
    const pending = this.turnState.pendingGuessLetter;

    if (isCorrect) {
        if (pending.isDot) {
            // Victoire !
            activeClue.isSealed = true;
            this.status = GAME_STATE.FINISHED;
            this.winner = team;
        } else {
            // Lettre validée, le Médium peut dessiner la suivante
            activeClue.letters.push({ image: pending.imageBase64, isRevealed: true, isWrong: false });
            this.turnState.action = TURN_STATE.GUESS_OBJECT;
            this.turnState.pendingGuessLetter = null;
        }
    } else {
        // Mauvaise lettre (Chuut !) -> Silencio forcé
        if (pending.imageBase64) {
            activeClue.letters.push({ image: pending.imageBase64, isRevealed: true, isWrong: true });
        }
        activeClue.isComplete = true;
        activeClue.wrongGuess = true;
        
        this.turnState.action = null;
        this.turnState.pendingGuessLetter = null;
        this.endTurn();
    }
  }

  verifyTurn(team) {
    if (this.status !== GAME_STATE.PLAYING) throw new Error("La partie n'est pas en cours.");
    if (this.currentTurn.toLowerCase() !== team.toLowerCase()) throw new Error("Ce n'est pas le tour de votre équipe.");
  }
}

// Gestionnaire global pour stocker toutes les parties en cours
class GameManager {
  constructor() {
    this.games = new Map();
  }

  createGame(gameId) {
    const game = new PhantomGame(gameId);
    this.games.set(gameId, game);
    return game;
  }

  getGame(gameId) {
    return this.games.get(gameId);
  }

  deleteGame(gameId) {
    this.games.delete(gameId);
  }
}

export default { PhantomGame, GameManager };