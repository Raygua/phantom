import phantomGame from '../models/phantomGame.js';
import { redis } from '../config/redisClient.js';

const gameManager = new phantomGame.GameManager();
const gameDeletionTimeouts = new Map();

export const initPhantomSocket = (io) => {
  // --- MIDDLEWARE D'AUTHENTIFICATION ---
  io.use(async (socket, next) => {
      const userId = socket.handshake.auth.userId;
      if (!userId) return next(new Error("Access denied"));
      
      socket.data.userId = userId;

      const globalProfileRaw = await redis.get(`user:${userId}:profile`);
      if (globalProfileRaw) {
          const profile = JSON.parse(globalProfileRaw);
          socket.data.username = profile.username;
          socket.data.color = profile.color;
      } else {
          socket.data.username = "Fantôme";
          socket.data.color = "#e2e8f0";
      }

      next();
  });

  io.on('connection', (socket) => {
    
    // --- REJOINDRE LA PARTIE ---
    socket.on('join_game', async ({ gameId }) => {
      try {
        socket.data.gameId = gameId;

        if (gameDeletionTimeouts.has(gameId)) {
            clearTimeout(gameDeletionTimeouts.get(gameId));
            gameDeletionTimeouts.delete(gameId);
            console.log(`[Game] Reconnection ${gameId} Deletion canceled`);
        }

        let game = gameManager.getGame(gameId);
        if (!game) {
          const settingsRaw = await redis.get(`lobby:${gameId}:settings`);
            if (!settingsRaw) {
                throw new Error("This room does not exist");
            }
            
            const settings = JSON.parse(settingsRaw);
            if (settings.status !== 'PLAYING') {
                throw new Error("Unable to start a room without a lobby");
            }

            // Création de l'instance si elle n'existe pas encore
            game = gameManager.createGame(gameId);
        }

        const lobbyPlayerRaw = await redis.hGet(`lobby:${gameId}:players`, socket.data.userId);
        
        // Vérifier que le joueur était bien dans le lobby
        if (!lobbyPlayerRaw) {
             throw new Error("Vous ne faisiez pas partie du rituel d'invocation !");
        }

        const isHost = lobbyPlayerRaw ? JSON.parse(lobbyPlayerRaw).isHost : false;

        // On l'ajoute SANS rôle au départ
        game.addPlayer(socket.data.userId, socket.data.username, socket.data.color, isHost);
        
        const roomName = `game:${gameId}`;
        socket.join(roomName);

        io.to(roomName).emit('game_state_update', game);
      } catch (error) {
        socket.emit('fatal_error', error.message);
      }
    });

    // --- ASSIGNATION DES RÔLES ---
    socket.on('assign_role', ({ gameId, team, role }) => {
      try {
        const game = gameManager.getGame(gameId);
        game.assignRole(socket.data.userId, team, role);
        io.to(`game:${gameId}`).emit('game_state_update', game);
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    // --- VERROUILLAGE DES ÉQUIPES ---
    socket.on('lock_teams', ({ gameId }) => {
      try {
        const game = gameManager.getGame(gameId);
        
        if (!game.players[socket.data.userId].isHost) {
            throw new Error("Seul le maître du rituel peut démarrer la partie.");
        }

        game.lockTeams(); // Valide les règles et distribue les mains de départ !
        io.to(`game:${gameId}`).emit('game_state_update', game);
        io.to(`game:${gameId}`).emit('notification', "Les équipes sont formées. Esprits, choisissez l'Objet Secret !");
      } catch (error) {
        socket.emit('game_error', error.message); 
      }
    });

    // --- PHASE 1 : DÉFINIR L'OBJET SECRET ---
    socket.on('set_secret_object', ({ gameId, word }) => {
      try {
        const game = gameManager.getGame(gameId);
        game.setSecretObject(word);
        
        io.to(`game:${gameId}`).emit('game_state_update', game);
        io.to(`game:${gameId}`).emit('notification', "L'Objet Secret a été scellé par les Esprits.");
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    // --- PHASE 2 : LE MÉDIUM PROPOSE 2 QUESTIONS ---
    socket.on('propose_questions', ({ gameId, team, cardId1, cardId2 }) => {
      try {
        const game = gameManager.getGame(gameId);
        game.proposeQuestions(team, cardId1, cardId2);
        
        // On notifie tout le monde que l'état a changé (Action passe à ASK_QUESTION)
        io.to(`game:${gameId}`).emit('game_state_update', game);
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    // --- L'ESPRIT CHOISIT 1 QUESTION ---
    socket.on('select_question', ({ gameId, team, qId }) => {
      try {
        const game = gameManager.getGame(gameId);
        game.selectQuestion(team, qId);
        
        // Mise à jour de l'état (la question est choisie, on attend la frappe)
        io.to(`game:${gameId}`).emit('game_state_update', game);
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    // --- LA MAGIE DU TEMPS RÉEL : L'ESPRIT TAPE UNE LETTRE ---
    socket.on('write_word', ({ gameId, team, text }) => {
      try {
        const game = gameManager.getGame(gameId);
        
        // On met à jour le mot complet
        const currentWord = game.writeWord(team, text);
        
        // On diffuse le mot mis à jour très rapidement pour éviter le lag
        io.to(`game:${gameId}`).emit('clue_updated', { team, currentWord });
        
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    // --- LE MÉDIUM DIT SILENCIO ---
    socket.on('silencio', ({ gameId, team }) => {
      try {
        const game = gameManager.getGame(gameId);
        game.silencio(team); // Arrête le tour et passe à l'autre équipe
        
        io.to(`game:${gameId}`).emit('silencio_called', { team });
        io.to(`game:${gameId}`).emit('game_state_update', game); // MAJ globale pour changer de tour
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    // --- TENTER DE DEVINER L'OBJET SECRET ---
    socket.on('guess_letter', ({ gameId, team, letter }) => {
      try {
        const game = gameManager.getGame(gameId);
        
        if (letter === "") {
            // Le joueur a juste cliqué sur "Deviner l'objet" pour ouvrir la zone de saisie
            game.startGuessing(team);
            io.to(`game:${gameId}`).emit('game_state_update', game);
        } else {
            // C'est une vraie tentative de lettre
            const result = game.guessLetter(team, letter);

            // On informe les clients du résultat (Vrai ou Faux) pour un éventuel effet visuel
            io.to(`game:${gameId}`).emit('guess_result', { team, result, letter });

            // On met systématiquement à jour l'état (soit la lettre est ajoutée, soit le tour est passé, soit on a un gagnant)
            io.to(`game:${gameId}`).emit('game_state_update', game);
        }

      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    // --- LE MÉDIUM UTILISE SON MULLIGAN ---
    socket.on('use_mulligan', ({ gameId, team }) => {
      try {
        const game = gameManager.getGame(gameId);
        game.useMulligan(team);
        io.to(`game:${gameId}`).emit('game_state_update', game);
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    socket.on('use_eye_power', ({ gameId, team, targetTeam, targetIndex }) => {
      try {
        const game = gameManager.getGame(gameId);
        game.useEyePower(team, targetTeam, targetIndex);
        io.to(`game:${gameId}`).emit('game_state_update', game);
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    // --- POUVOIR DE L'OEIL : REVELATION DE LETTRE ---
    socket.on('reveal_eye_letter', ({ gameId, team, letter }) => {
      try {
        const game = gameManager.getGame(gameId);
        game.revealEyeLetter(team, letter);
        io.to(`game:${gameId}`).emit('game_state_update', game);
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });

    socket.on('skip_eye_power', ({ gameId, team }) => {
      try {
        const game = gameManager.getGame(gameId);
        game.skipEyePower(team);
        io.to(`game:${gameId}`).emit('game_state_update', game);
      } catch (error) {
        socket.emit('game_error', error.message);
      }
    });
    
    // --- GESTION DE LA DÉCONNEXION ET DU NETTOYAGE ---
    socket.on('disconnect', () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;

      console.log(`[Game] Déconnexion de ${socket.data.username} de la partie ${gameId}`);

      const roomName = `game:${gameId}`;
      const socketsInRoom = io.sockets.adapter.rooms.get(roomName);

      // Si le salon est totalement vide (0 joueur connecté)
      if (!socketsInRoom || socketsInRoom.size === 0) {
          console.log(`[Game] La partie ${gameId} est vide. Suppression dans 10 minutes...`);

          const timeout = setTimeout(() => {
              console.log(`[Game] Suppression définitive de la partie ${gameId} (inactivité).`);
              gameManager.deleteGame(gameId); 
              gameDeletionTimeouts.delete(gameId); 
          }, 60 * 1000 * 10);

          gameDeletionTimeouts.set(gameId, timeout);
      }
    });
  });
};