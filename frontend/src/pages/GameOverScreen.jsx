import React from 'react';
import { Trophy, Sun, Moon, RotateCcw, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';
import Card from '../components/Card'; // 🌟 Ne pas oublier l'import de la carte !
import './GameOverScreen.css';

const GameOverScreen = ({ game, socket, myProfile }) => {
    const winningTeam = game.winner;
    const isWinner = myProfile.team === winningTeam || (myProfile.team === 'BOTH' && winningTeam);
    const isSun = winningTeam === 'SUN';

    const handleBackToLobby = () => {
        socket.emit('return_to_lobby', { gameId: game.gameId });
    };

    // 🌟 Fonction pour générer la timeline d'une équipe
const renderTeamDebrief = (teamName, teamData, isTeamWinner) => {
    const isSunTeam = teamName === 'SUN';
    const clues = teamData.clues || [];
    
    return (
        <div className={`debrief-card ${isTeamWinner ? 'winner-card' : ''}`}>
            <h3 className={`debrief-team-title ${isSunTeam ? 'sun' : 'moon'}`}>
                {isSunTeam ? <Sun size={24} /> : <Moon size={24} />}
                {isSunTeam ? 'SOLEIL' : 'LUNE'} {isTeamWinner && "🏆"}
            </h3>
            
            <div className="debrief-timeline">
                {clues.map((clue, idx) => {
                    // 1. SI C'EST UNE DEVINETTE
                    if (clue.isGuess) {
                        // Si c'est la dernière action de l'équipe gagnante, c'est la victoire
                        const isWinGuess = isTeamWinner && idx === clues.length - 1;
                        const isCorrect = clue.result === true || clue.isCorrect === true || isWinGuess;
                        
                        // On récupère le mot complet tapé (ex: "HAR" ou "HACHE.")
                        const attemptedWord = clue.currentWord || clue.word || clue.text || clue.letter || "?";
                        // On isole la lettre qui a causé l'erreur
                        const lastLetter = clue.letter || attemptedWord.slice(-1);
                        
                        return (
                            <div key={idx} className="debrief-timeline-item">
                                <div className="debrief-card-wrapper">
                                    <Card 
                                        card={{ id: `Tentative`, text: attemptedWord }} 
                                        isFaceUp={true} 
                                    />
                                </div>
                                <div className="debrief-result guess-result">
                                    {isCorrect ? (
                                        <span className="success-text">{attemptedWord}<CheckCircle2 size={24} /></span>
                                    ) : (
                                        <span className="success-text" style={{display:'inline-flex'}}>{attemptedWord.slice(0, attemptedWord.length-1)}<span className="error-text">{lastLetter} <XCircle size={24} /></span></span>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // 2. SI C'EST UNE QUESTION CLASSIQUE (L'Esprit donne un indice)
                    const answerText = clue.text || clue.currentWord || clue.currentText || clue.word || "...";
                    
                    return (
                        <div key={idx} className="debrief-timeline-item">
                            <div className="debrief-card-wrapper">
                                <Card 
                                    card={{ id: `Tour ${idx + 1}`, text: clue.questionId }} 
                                    isFaceUp={true} 
                                />
                            </div>
                            <div className="debrief-result">
                                <div className="debrief-answer">
                                    {answerText}
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {clues.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucune action effectuée.</p>}
            </div>
        </div>
    );
};

    return (
        <div className="game-container scrollable-container">
            <div className="game-over-wrapper expanded-wrapper">
                
                {/* 1. EN-TÊTE VICTOIRE */}
                <div className={`victory-header ${isSun ? 'sun-win' : 'moon-win'}`}>
                    <Trophy size={64} className="trophy-icon" />
                    <h1 className="victory-title">
                        VICTOIRE DE L'ÉQUIPE {isSun ? 'SOLEIL' : 'LUNE'}
                    </h1>
                </div>

                <div className="secret-reveal-box">
                    <p>L'Objet Secret était :</p>
                    <div className="giant-secret-word">
                        {game.secretObject}
                    </div>
                </div>

                {/* 2. ZONE DE DEBRIEFING (Cartes + Résultats) */}
                <div className="debriefing-section">
                    <h2 className="debriefing-title">
                        <MessageCircle size={28} /> Debriefing de la partie
                    </h2>
                    <p className="debriefing-subtitle">
                        Révélation des questions posées et des tentatives de devinette !
                    </p>
                    
                    <div className="debriefing-grid">
                        {renderTeamDebrief('SUN', game.teams.sun, winningTeam === 'SUN')}
                        {renderTeamDebrief('MOON', game.teams.moon, winningTeam === 'MOON')}
                    </div>
                </div>

                {/* 3. ACTIONS */}
                <div className="victory-actions" style={{ marginTop: '50px' }}>
                    {myProfile.isHost ? (
                        <button className="ghost-button btn-primary giant-btn" onClick={handleBackToLobby}>
                            <RotateCcw size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                            RETOURNER AU LOBBY
                        </button>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '1.2rem' }}>
                            En attente du maître du rituel pour relancer une partie...
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
};

export default GameOverScreen;