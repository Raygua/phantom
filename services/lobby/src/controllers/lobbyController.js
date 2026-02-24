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

    await redis.set(`lobby:${lobbyId}:settings`, JSON.stringify(settings), { EX: 86400 });

    return res.status(201).json({
      status: 'success',
      data: { lobbyId }
    });
  } catch (err) {
    console.error('Create Lobby Error:', err);
    return res.status(500).json({ status: 'error', message: 'Impossible d\'invoquer le lobby.' });
  }
};

export const joinLobby = async (req, res) => {
  try {
    const { code, password } = req.query;
    const lobbyId = code?.toUpperCase();

    const settingsRaw = await redis.get(`lobby:${lobbyId}:settings`);
    if (!settingsRaw) {
      return res.status(404).json({ status: 'error', message: 'Ce rituel n\'existe pas.' });
    }

    const settings = JSON.parse(settingsRaw);
    if (settings.isPrivate && settings.password !== password) {
      return res.status(403).json({ status: 'error', message: 'Mot de passe incorrect.' });
    }

    const currentPlayers = await redis.hLen(`lobby:${lobbyId}:players`);

    if (currentPlayers >= settings.maxPlayers) {
      return res.status(409).json({ status: 'error', message: 'Le cercle est complet.' });
    }

    return res.status(200).json({ status: 'success', data: { lobbyId } });

  } catch (err) {
    console.error('Join Lobby Error:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur de connexion.' });
  }
};

export const getDefaultLobby = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    data: { maxPlayers: 4, isPrivate: false, password: "" }
  });
};

export const initLobbySocket = (io) => {
  io.on('connection', async (socket) => {
    const userId = socket.handshake.auth.userId;
    const nickname = socket.handshake.auth.nickname || 'Âme errante';

    socket.data.userId = userId;
    socket.data.nickname = nickname;

    console.log(`[Lobby] Connexion socket: ${socket.id} | UserID: ${userId}`);

    socket.on('join_room', async (lobbyId) => {
      const roomKey = `lobby:${lobbyId}`;

      if (disconnectTimeouts.has(userId)) {
        clearTimeout(disconnectTimeouts.get(userId));
        disconnectTimeouts.delete(userId);
        console.log(`[Lobby] Reconnexion de ${userId}. Suppression annulée.`);
      }

      const settingsRaw = await redis.get(`${roomKey}:settings`);
      if (!settingsRaw) return socket.emit('error_join', 'Lobby introuvable');

      const settings = JSON.parse(settingsRaw);

      const globalProfileRaw = await redis.get(`user:${userId}:profile`);
      const globalProfile = globalProfileRaw ? JSON.parse(globalProfileRaw) : null;
      const existingPlayerRaw = await redis.hGet(`${roomKey}:players`, userId);

      let playerObj;

      if (existingPlayerRaw) {
        playerObj = JSON.parse(existingPlayerRaw);
        playerObj.socketId = socket.id;

        if (globalProfile) {
          playerObj.nickname = globalProfile.nickname;
          playerObj.color = globalProfile.color;
        }
      } else {
        const currentPlayers = await redis.hLen(`${roomKey}:players`);
        if (currentPlayers >= settings.maxPlayers) {
          return socket.emit('error_join', 'Le rituel est complet (Complet).');
        }

        playerObj = {
          id: userId,
          nickname: globalProfile?.nickname || nickname,
          color: globalProfile?.color || '#e2e8f0',
          socketId: socket.id,
          isReady: false
        };
      }

      socket.data.nickname = playerObj.nickname;

      await redis.hSet(`${roomKey}:players`, userId, JSON.stringify(playerObj));
      await redis.expire(`${roomKey}:players`, 86400);

      socket.join(lobbyId);
      socket.data.lobbyId = lobbyId;

      const playersMap = await redis.hGetAll(`${roomKey}:players`);
      const playersList = Object.values(playersMap).map(p => JSON.parse(p));
      io.to(lobbyId).emit('player_list_update', playersList);
    });

    socket.on('disconnect', async () => {
      const { lobbyId, userId } = socket.data;
      if (lobbyId && userId) {
        const timeout = setTimeout(async () => {
          console.log(`[Lobby] Suppression définitive de ${userId}`);
          await redis.hDel(`lobby:${lobbyId}:players`, userId);

          const playersMap = await redis.hGetAll(`lobby:${lobbyId}:players`);
          const playersList = Object.values(playersMap).map(p => JSON.parse(p));
          io.to(lobbyId).emit('player_list_update', playersList);

          disconnectTimeouts.delete(userId);
        }, 60 * 1000);

        disconnectTimeouts.set(userId, timeout);
      }
    });

    socket.on('send_message', ({ room, text }) => {
      io.to(room).emit('receive_message', {
        sender: socket.data.nickname,
        text: text,
        isMe: false
      });
    });

    socket.on('update_player_profile', async (data) => {
      const { lobbyId, userId } = socket.data;
      if (!lobbyId || !userId) return;

      const newProfile = {
        nickname: data.nickname,
        color: data.color
      };

      await redis.set(`user:${userId}:profile`, JSON.stringify(newProfile), { EX: 2592000 });

      if (lobbyId) {
        const roomKey = `lobby:${lobbyId}`;
        const playerRaw = await redis.hGet(`${roomKey}:players`, userId);

        if (playerRaw) {
          const player = JSON.parse(playerRaw);

          player.nickname = newProfile.nickname || player.nickname;
          player.color = newProfile.color || player.color;

          await redis.hSet(`${roomKey}:players`, userId, JSON.stringify(player));
          socket.data.nickname = player.nickname;

          const playersMap = await redis.hGetAll(`${roomKey}:players`);
          const playersList = Object.values(playersMap).map(p => JSON.parse(p));
          io.to(lobbyId).emit('player_list_update', playersList);
        }
      }
      
    });
  });
};