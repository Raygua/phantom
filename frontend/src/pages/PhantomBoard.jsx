import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useUser } from '../hooks/useUser';
import { TeamSelectionScreen } from './TeamSelectionScreen';
import GameBoard from './GameBoard.jsx';

function PhantomInkBoard() {
    const { gameId } = useParams();
    const userId = useUser();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const [gameState, setGameState] = useState(null);

    useEffect(() => {
        if (!userId) return;

        socketRef.current = io('/', {
            path: '/socket.io/game/',
            transports: ['websocket'],
            auth: { userId: userId }
        });

        socketRef.current.on('connect', () => {
            console.log("Connecté au serveur de jeu !");

            socketRef.current.emit('join_game', {
                gameId: gameId,
            });
        });

        socketRef.current.on('game_state_update', (game) => {
            setGameState(game);
        });

        socketRef.current.on('fatal_error', (msg) => {
            alert("Error : " + msg);
            socketRef.current.disconnect();
            navigate('/', { replace: true });
        });

        socketRef.current.on('game_error', (msg) => {
            console.log("Attention : " + msg);
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [gameId, userId, navigate]);

    if (!gameState) return <div className="ghost-card">Connexion au jeu en cours...</div>;

    if (gameState.status === 'TEAM_SELECTION') {
        return <TeamSelectionScreen game={gameState} socket={socketRef.current} />;
    }

    return <GameBoard game={gameState} socket={socketRef.current} />;
}

export default PhantomInkBoard;