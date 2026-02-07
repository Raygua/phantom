import { v4 as uuidv4 } from 'uuid';

const generateRoomId = () => uuidv4().slice(0, 4).toUpperCase();

export const createLobby = async (req, res) => {
  try {
    throw new Error("In progress 🦺");
    return res.status(200).json({
      status: 'success',
      data: {
        lobby
      }
    });
  } catch (err) {
    console.error('Lobby Error:', err);
    if (res) {
      res.status(500).json({ status: 'error', message: 'Impossible de créer un lobby pour le moment' });
    }
    return [];
  }
};

export const joinLobby = async (req, res) => {
  try {
    throw new Error("In progress 🦺");
    return res.status(200).json({
      status: 'success',
      data: {
        lobby
      }
    });
  } catch (err) {
    console.error('Lobby Error:', err);
    if (res) {
      res.status(500).json({ status: 'error', message: 'Impossible de rejoindre un lobby pour le moment' });
    }
    return [];
  }
};

export const getDefaultLobby = async (req, res) => {
  try {
    throw new Error("In progress 🦺");
    return res.status(200).json({
      status: 'success',
      data: {
        lobby
      }
    });
  } catch (err) {
    console.error('Lobby Error:', err);
    if (res) {
      res.status(500).json({ status: 'error', message: 'Impossible d\'avoir les infos du lobby pour le moment' });
    }
    return [];
  }
};

export const initLobbySocket = (io, redis) => {
    io.on('connection', async (socket) => {
        socket.on('multi:create_room', async () => {
            const roomId = generateRoomId();

            socket.join(roomId);
            socket.roomId = roomId;

            socket.emit('multi:room_joined', roomState);
            console.log(`🏠 Room créée : ${roomId} par ${userId}`);
        });
    });
};