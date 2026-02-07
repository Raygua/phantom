import { v4 as uuidv4 } from 'uuid';

const generateRoomId = () => uuidv4().slice(0, 4).toUpperCase();

export const initGameSocket = (io, redis) => {
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