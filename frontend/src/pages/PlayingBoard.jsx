// src/pages/PlayingBoard.jsx
import React, { useState, useEffect } from 'react';
import { Send, Hand, HelpCircle, Eye as EyeIcon } from 'lucide-react';
import ActionZone from '../components/ActionZone';
import Card from '../components/Card';
import CarnetBoard from '../components/CarnetBoard';
import PlayerHand from '../components/PlayerHand';

const PlayingBoard = ({ game, socket, myProfile }) => {
    // --- VARIABLES D'ÉTAT ---
    const isMedium = myProfile.role === 'MEDIUM';
    const isSpirit = myProfile.role === 'SPIRIT';
    const turnState = game.turnState;

    const activeTeam = myProfile.team === 'BOTH' ? game.currentTurn : myProfile.team;
    const isMyTurn = game.currentTurn === activeTeam;
    const teamData = game.teams[activeTeam.toLowerCase()];

    const [liveClue, setLiveClue] = useState("");
    const [guessInput, setGuessInput] = useState("");
    const [selectedCards, setSelectedCards] = useState([]);
    const [eyeInput, setEyeInput] = useState("");

    // --- SYNCHRONISATION TEMPS RÉEL ---
    useEffect(() => {
        setLiveClue(turnState.currentWritingClue || "");
    }, [turnState.currentWritingClue, game.currentTurn, turnState.selectedQuestion]);

    useEffect(() => {
        const handleClueUpdated = ({ team, currentWord }) => {
            if (team === game.currentTurn) setLiveClue(currentWord);
        };
        socket.on('clue_updated', handleClueUpdated);
        return () => socket.off('clue_updated', handleClueUpdated);
    }, [socket, game.currentTurn]);

    useEffect(() => {
        if (!isMyTurn || turnState.action === 'GUESS_OBJECT') setSelectedCards([]);
        if (!isMyTurn) setEyeInput("");
    }, [isMyTurn, turnState.action]);

    // --- ACTIONS --- 
    const toggleCardSelection = (cardId) => {
        if (selectedCards.includes(cardId)) {
            setSelectedCards(selectedCards.filter(id => id !== cardId));
        } else if (selectedCards.length < 2) {
            setSelectedCards([...selectedCards, cardId]);
        }
    };

    const handleProposeQuestions = () => {
        if (selectedCards.length !== 2) return;
        socket.emit('propose_questions', {
            gameId: game.gameId, team: activeTeam, 
            cardId1: selectedCards[0], cardId2: selectedCards[1]
        });
        setSelectedCards([]);
    };

    const handleMulligan = () => {
        if (confirm("Voulez-vous défausser votre main pour piocher 7 nouvelles cartes ?")) {
            socket.emit('use_mulligan', { gameId: game.gameId, team: activeTeam });
            setSelectedCards([]);
        }
    };

    const handleGuess = (e) => {
        e.preventDefault();
        if (!guessInput.trim() || guessInput.length > 1) return;
        socket.emit('guess_letter', { gameId: game.gameId, team: activeTeam, letter: guessInput.trim().charAt(0) });
        setGuessInput("");
    };

    const handleEyeClick = (targetTeam, targetIndex) => {
        socket.emit('use_eye_power', { gameId: game.gameId, team: activeTeam, targetTeam, targetIndex });
    };

    const handleTypeLetter = (e) => {
        const sanitizedText = e.target.value.replace(/[^a-zA-Z _.]/g, '').toUpperCase().replace(/ /g, '_');
        setLiveClue(sanitizedText);
        socket.emit('write_word', { gameId: game.gameId, team: activeTeam, text: sanitizedText });
        if (sanitizedText.endsWith('.')) socket.emit('silencio', { gameId: game.gameId, team: activeTeam });
    };

    const handleSilencio = () => socket.emit('silencio', { gameId: game.gameId, team: activeTeam });
    const handleSelectQuestion = (qId) => socket.emit('select_question', { gameId: game.gameId, team: activeTeam, qId });

    return (
        <div className="game-container">

            <div className="phantom-table">
                {/* --- 1. HISTORIQUE SOLEIL (Zone Gauche) --- */}
                <div className="cards-zone">
                    <h4 style={{ color: '#fcd34d', textAlign: 'center', marginBottom: '10px' }}>Soleil (Historique)</h4>
                    <div className="played-cards-stack">
                        {game.teams.sun.clues.map((clue, i) => {
                            // Seuls les Esprits ou les Médiums Soleil peuvent lire ces cartes
                            const canSee = isSpirit || (isMedium && myProfile.team === 'SUN');
                            
                            // On crée un objet "carte" à la volée pour l'affichage
                            const cardObj = { id: `Tour ${i + 1}`, text: clue.questionId };

                            return (
                                <div key={i} className="stacked-card" style={{ '--index': i, zIndex: i }}>
                                    {/* Si c'est une Tentative et pas une question, on cache la carte */}
                                    {!clue.isGuess && <Card card={cardObj} isFaceUp={canSee} />}
                                </div>
                            );
                        })}
                        {game.teams.sun.clues.filter(c => !c.isGuess).length === 0 && (
                            <div className="card-placeholder">Aucune carte</div>
                        )}
                    </div>
                </div>

                {/* --- 2. LE CARNET CENTRAL (Board) --- */}
                {/* N'oublie pas d'importer ton nouveau composant CarnetBoard si ce n'est pas fait ! */}
                <CarnetBoard 
                    game={game} 
                    turnState={turnState} 
                    isMyTurn={isMyTurn} 
                    isMedium={isMedium} 
                    liveClue={liveClue} 
                    activeTeam={activeTeam} 
                    onEyeClick={handleEyeClick} 
                />

                {/* --- 3. HISTORIQUE LUNE (Zone Droite) --- */}
                <div className="cards-zone">
                    <h4 style={{ color: '#a78bfa', textAlign: 'center', marginBottom: '10px' }}>Lune (Historique)</h4>
                    <div className="played-cards-stack">
                        {game.teams.moon.clues.map((clue, i) => {
                            // Seuls les Esprits ou les Médiums Lune peuvent lire ces cartes
                            const canSee = isSpirit || (isMedium && myProfile.team === 'MOON');
                            const cardObj = { id: `Tour ${i + 1}`, text: clue.questionId };

                            return (
                                <div key={i} className="stacked-card" style={{ '--index': i, zIndex: i }}>
                                    {!clue.isGuess && <Card card={cardObj} isFaceUp={canSee} />}
                                </div>
                            );
                        })}
                        {game.teams.moon.clues.filter(c => !c.isGuess).length === 0 && (
                            <div className="card-placeholder">Aucune carte</div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MAIN DU JOUEUR (Toujours visible grâce à ta restructuration précédente) --- */}
            {isMedium && (
                <PlayerHand 
                    hand={teamData.hand} 
                    isMyTurn={isMyTurn} 
                    actionState={turnState.action} 
                    selectedCards={selectedCards} 
                    onToggleCard={toggleCardSelection} 
                />
            )}

            {/* --- ZONE D'ACTION --- */}
            <div className="action-zone">
                {/* Ici ton composant <ActionZone /> avec toutes ses props */}
                <ActionZone 
                    gameId={game.gameId} turnState={turnState} isMyTurn={isMyTurn}
                    isMedium={isMedium} isSpirit={isSpirit} activeTeam={activeTeam}
                    myProfileTeam={myProfile.team} teamData={teamData} socket={socket}
                    liveClue={liveClue} handleTypeLetter={handleTypeLetter} guessInput={guessInput}
                    setGuessInput={setGuessInput} handleGuess={handleGuess} eyeInput={eyeInput}
                    setEyeInput={setEyeInput} selectedCards={selectedCards} 
                    handleProposeQuestions={handleProposeQuestions} handleMulligan={handleMulligan} 
                    handleSelectQuestion={handleSelectQuestion} handleSilencio={handleSilencio}
                />
            </div>

        </div>
    );
};

export default PlayingBoard;