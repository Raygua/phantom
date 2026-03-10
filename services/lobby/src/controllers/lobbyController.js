import { v4 as uuidv4 } from 'uuid';
import { redis } from '../config/redisClient.js';

const generateLobbyId = () => uuidv4().slice(0, 5).toUpperCase();
const disconnectTimeouts = new Map();

export const createLobby = async (req, res) => {
  try {
    const { maxPlayers, isPrivate, password } = req.body;
    const lobbyId = generateLobbyId();

    const settings = {
      id: lobbyId,
      maxPlayers: maxPlayers || 4,
      isPrivate: isPrivate || false,
      password: password || '',
      createdAt: Date.now()
    };

    if (settings.maxPlayers < 3)
      settings.maxPlayers = 3;

    await redis.set(`lobby:${lobbyId}:settings`, JSON.stringify(settings), { EX: 86400 });

    return res.status(201).json({
      status: 'success',
      data: { lobbyId }
    });
  } catch (err) {
    console.error('Create Lobby Error:', err);
    return res.status(500).json({ status: 'error', message: 'Unable to create lobby' });
  }
};

export const joinLobby = async (req, res) => {
  try {
    const { code, password, userId } = req.query;
    const lobbyId = code?.toUpperCase();

    const settingsRaw = await redis.get(`lobby:${lobbyId}:settings`);
    if (!settingsRaw) {
      return res.status(404).json({ status: 'error', message: 'This lobby does not exist' });
    }

    const settings = JSON.parse(settingsRaw);

    if (settings.status === 'PLAYING') {
      if (userId) {
        const isAlreadyIn = await redis.hExists(`lobby:${lobbyId}:players`, userId);
        if (isAlreadyIn) {
          return res.status(200).json({ status: 'success', data: { lobbyId } });
        }
      }
      return res.status(403).json({ status: 'error', message: 'This lobby has already started' });
    }

    if (settings.isPrivate && settings.password !== password) {
      return res.status(403).json({ status: 'error', message: 'Incorrect Password' });
    }

    const currentPlayers = await redis.hLen(`lobby:${lobbyId}:players`);

    if (currentPlayers >= settings.maxPlayers) {
      return res.status(409).json({ status: 'error', message: 'This lobby is full' });
    }

    return res.status(200).json({ status: 'success', data: { lobbyId } });

  } catch (err) {
    console.error('Join Lobby Error:', err);
    return res.status(500).json({ status: 'error', message: 'Connexion error' });
  }
};

export const getDefaultLobby = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    data: { maxPlayers: 4, isPrivate: false, password: "" }
  });
};

export const initLobbySocket = (io) => {
  const lockLobbyAndStart = async (lobbyKey, lobbyId) => {
    const settingsRaw = await redis.get(`${lobbyKey}:settings`);
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      settings.status = 'PLAYING';
      await redis.set(`${lobbyKey}:settings`, JSON.stringify(settings), { EX: 86400 });
    }
    io.to(lobbyId).emit('game_starting', { gameType: 'spirit-link' });
  };

  io.on('connection', async (socket) => {
    const userId = socket.handshake.auth.userId;
    const username = socket.handshake.auth.username || 'Player';

    socket.data.userId = userId;
    socket.data.username = username;

    console.log(`[Lobby] Login socket: ${socket.id} | UserID: ${userId}`);

    socket.on('join_lobby', async (lobbyId) => {
      const lobbyKey = `lobby:${lobbyId}`;

      if (disconnectTimeouts.has(userId)) {
        clearTimeout(disconnectTimeouts.get(userId));
        disconnectTimeouts.delete(userId);
        console.log(`[Lobby] Reconnection ${userId} Deletion canceled`);
      }

      const settingsRaw = await redis.get(`${lobbyKey}:settings`);
      if (!settingsRaw) return socket.emit('error_join', 'Lobby not found');

      const settings = JSON.parse(settingsRaw);

      const globalProfileRaw = await redis.get(`user:${userId}:profile`);
      const globalProfile = globalProfileRaw ? JSON.parse(globalProfileRaw) : null;
      const existingPlayerRaw = await redis.hGet(`${lobbyKey}:players`, userId);

      if (settings.status === 'PLAYING') {
        if (existingPlayerRaw) {
          console.log(`[Lobby] Reconnection ${userId} to the game, automatically redirecting to the game`);
          return socket.emit('game_starting', {
            gameType: 'spirit-link',
          });
        } else {
          return socket.emit('error_join', 'This lobby has already started');
        }
      }

      let playerObj;

      if (existingPlayerRaw) {
        playerObj = JSON.parse(existingPlayerRaw);
        playerObj.socketId = socket.id;

        if (globalProfile) {
          playerObj.username = globalProfile.username;
          playerObj.color = globalProfile.color;
        }
      } else {
        const currentPlayers = await redis.hLen(`${lobbyKey}:players`);
        if (currentPlayers >= settings.maxPlayers) {
          return socket.emit('error_join', 'The lobby is already full');
        }

        const isHost = currentPlayers === 0;

        playerObj = {
          id: userId,
          username: globalProfile?.username || username,
          color: globalProfile?.color || '#e2e8f0',
          socketId: socket.id,
          isReady: false,
          isHost: isHost
        };
      }

      socket.data.username = playerObj.username;

      await redis.hSet(`${lobbyKey}:players`, userId, JSON.stringify(playerObj));
      await redis.expire(`${lobbyKey}:players`, 86400);

      socket.join(lobbyId);
      socket.data.lobbyId = lobbyId;

      const playersMap = await redis.hGetAll(`${lobbyKey}:players`);
      const playersList = Object.values(playersMap).map(p => JSON.parse(p));
      io.to(lobbyId).emit('player_list_update', playersList);
    });

    socket.on('disconnect', async () => {
      const { lobbyId, userId } = socket.data;
      if (lobbyId && userId) {
        const timeout = setTimeout(async () => {
          const lobbyKey = `lobby:${lobbyId}`;

          const settingsRaw = await redis.get(`${lobbyKey}:settings`);
          if (settingsRaw) {
            const settings = JSON.parse(settingsRaw);
            // Si la partie a commencé, on annule la suppression !
            if (settings.status === 'PLAYING') {
              console.log(`[Lobby] Le joueur ${userId} est dans le jeu, on le garde en mémoire.`);
              disconnectTimeouts.delete(userId);
              return;
            }
          }

          // 🌟 1. On vérifie si le joueur qui part était l'hôte
          const playerRaw = await redis.hGet(`${lobbyKey}:players`, userId);
          const wasHost = playerRaw ? JSON.parse(playerRaw).isHost : false;

          console.log(`[Lobby] Permanent deletion of ${userId}`);
          await redis.hDel(`${lobbyKey}:players`, userId);

          // 🌟 2. On récupère les joueurs restants
          const playersMap = await redis.hGetAll(`${lobbyKey}:players`);
          let playersList = Object.values(playersMap).map(p => JSON.parse(p));

          // 🌟 3. Si l'hôte est parti et qu'il reste du monde, on nomme un nouveau chef !
          if (wasHost && playersList.length > 0) {
            const newHost = playersList[0]; // On prend le premier joueur de la liste
            newHost.isHost = true;

            // On sauvegarde la promotion dans Redis
            await redis.hSet(`${lobbyKey}:players`, newHost.id, JSON.stringify(newHost));
            console.log(`[Lobby] Passation de pouvoir : ${newHost.username} devient l'hôte.`);

            // On met à jour notre liste locale pour l'envoi au client
            playersList[0] = newHost;
          }

          // On envoie la liste mise à jour à tout le monde
          io.to(lobbyId).emit('player_list_update', playersList);

          disconnectTimeouts.delete(userId);
        }, 5 * 1000);

        disconnectTimeouts.set(userId, timeout);
      }
    });

    socket.on('send_message', ({ lobby, text }) => {
      io.to(lobby).emit('receive_message', {
        sender: socket.data.username,
        text: text,
        isMe: false
      });
    });

    socket.on('update_player_profile', async (data) => {
      const { lobbyId, userId } = socket.data;
      if (!lobbyId || !userId) return;

      const newProfile = {
        username: data.username,
        color: data.color
      };

      await redis.set(`user:${userId}:profile`, JSON.stringify(newProfile), { EX: 2592000 });

      if (lobbyId) {
        const lobbyKey = `lobby:${lobbyId}`;
        const playerRaw = await redis.hGet(`${lobbyKey}:players`, userId);

        if (playerRaw) {
          const player = JSON.parse(playerRaw);

          player.username = newProfile.username || player.username;
          player.color = newProfile.color || player.color;

          await redis.hSet(`${lobbyKey}:players`, userId, JSON.stringify(player));
          socket.data.username = player.username;

          const playersMap = await redis.hGetAll(`${lobbyKey}:players`);
          const playersList = Object.values(playersMap).map(p => JSON.parse(p));
          io.to(lobbyId).emit('player_list_update', playersList);
        }
      }

    });

    socket.on('toggle_ready', async () => {
      const { lobbyId, userId } = socket.data;
      if (!lobbyId || !userId) return;

      const lobbyKey = `lobby:${lobbyId}`;
      const playerRaw = await redis.hGet(`${lobbyKey}:players`, userId);

      if (playerRaw) {
        const player = JSON.parse(playerRaw);
        player.isReady = !player.isReady;
        await redis.hSet(`${lobbyKey}:players`, userId, JSON.stringify(player));

        const playersMap = await redis.hGetAll(`${lobbyKey}:players`);
        const playersList = Object.values(playersMap).map(p => JSON.parse(p));

        io.to(lobbyId).emit('player_list_update', playersList);

        const allReady = playersList.length > 2 && playersList.every(p => p.isReady);
        if (allReady) {
          await lockLobbyAndStart(lobbyKey, lobbyId);
        }
      }
    });

    socket.on('force_start', async () => {
      const { lobbyId, userId } = socket.data;
      if (!lobbyId || !userId) return;

      const lobbyKey = `lobby:${lobbyId}`;
      const playersMap = await redis.hGetAll(`${lobbyKey}:players`);
      const playersList = Object.values(playersMap).map(p => JSON.parse(p));
      if (playersList.length <= 2) return;

      const playerRaw = await redis.hGet(`${lobbyKey}:players`, userId);

      if (playerRaw) {
        const player = JSON.parse(playerRaw);
        if (player.isHost) {
          await lockLobbyAndStart(lobbyKey, lobbyId);
        }
      }
    });
  });
};