import { useUser } from '../hooks/useUser';
import ChooseObjectScreen from './ChooseObjectScreen';
import PlayingBoard from './PlayingBoard';
import './GameBoard.css';

function GameBoard({ game, socket }) {
    const userId = useUser();

    const myProfile = Object.values(game.players).find(p => p.id === userId);

    if (!myProfile) return <div className="ghost-card">Chargement de votre esprit...</div>;

    if (game.status === 'CHOOSE_OBJECT') {
        return <ChooseObjectScreen game={game} socket={socket} myProfile={myProfile} />;
    }

    if (game.status === 'PLAYING') {
        return <PlayingBoard game={game} socket={socket} myProfile={myProfile} />;
    }

    if (game.status === 'FINISHED') {
        return (
            <div className="ghost-card text-center">
                <h1 className="ghost-title">LE RITUEL EST TERMINÉ</h1>
                <h2>Victoire : Équipe {game.winner}</h2>
                <p>Le mot secret était : {game.secretObject}</p>
            </div>
        );
    }

    return null;
};

export default GameBoard;