import { useUser } from '../hooks/useUser';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChooseObjectScreen from './ChooseObjectScreen';
import PlayingBoard from './PlayingBoard';
import GameOverScreen from './GameOverScreen';
import './GameBoard.css';

function GameBoard({ game, socket }) {
    const userId = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        const handleRedirect = () => {
            navigate(`/lobby/${game.gameId}`); 
        };

        socket.on('redirect_to_lobby', handleRedirect);
        return () => socket.off('redirect_to_lobby', handleRedirect);
    }, [socket, navigate, game.gameId]);

    const myProfile = Object.values(game.players).find(p => p.id === userId);

    if (!myProfile) return <div className="ghost-card">Chargement de votre esprit...</div>;

    if (game.status === 'CHOOSE_OBJECT') {
        return <ChooseObjectScreen game={game} socket={socket} myProfile={myProfile} />;
    }

    if (game.status === 'PLAYING') {
        return <PlayingBoard game={game} socket={socket} myProfile={myProfile} />;
    }

    if (game.status === 'FINISHED') {
        return <GameOverScreen game={game} socket={socket} myProfile={myProfile} />;
    }

    return null;
};

export default GameBoard;