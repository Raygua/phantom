import React from 'react';
import { Trophy, Sun, Moon, RotateCcw, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';
import Card from '../components/Card';
import './GameOverScreen.css';

const GameOverScreen = ({ game, socket, myProfile }) => {
    const winningTeam = game.winner;
    const isDraw = winningTeam === 'DRAW'; // 🌟 NOUVEAU : Détection de l'égalité
    const isSun = winningTeam === 'SUN';

    const handleBackToLobby = () => {
        socket.emit('return_to_lobby', { gameId: game.gameId });
    };

    // Fonction pour générer la timeline d'une équipe avec les dessins
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
                        const isWinGuess = clue.isGuess && isTeamWinner && idx === clues.length - 1;
                        const isWrongGuess = clue.isGuess && clue.wrongGuess;

                        return (
                            <div key={idx} className="debrief-timeline-item">
                                <div className="debrief-card-wrapper">
                                    <Card 
                                        card={{ id: clue.isGuess ? `Tentative` : `Tour ${idx + 1}`, text: clue.questionId }} 
                                        isFaceUp={true} 
                                    />
                                </div>
                                <div className={`debrief-result ${clue.isGuess ? 'guess-result' : ''}`}>
                                    <div className="debrief-answer" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        
                                        {/* Affichage de la suite de lettres dessinées */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                            {clue.letters?.map((letter, lIdx) => (
                                                <div key={lIdx} style={{ 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    alignItems: 'center' 
                                                }}>
                                                    <img 
                                                        src={letter.image} 
                                                        alt="lettre" 
                                                        style={{ 
                                                            height: '35px', 
                                                            objectFit: 'contain',
                                                            filter: 'drop-shadow(0 0 2px rgba(204, 251, 241, 0.5))',
                                                            opacity: letter.isWrong ? 0.5 : 1
                                                        }} 
                                                    />
                                                    
                                                    {/* Barre de soulignement rouge façon correcteur */}
                                                    {letter.isWrong && (
                                                        <div style={{ 
                                                            width: '80%', 
                                                            height: '3px', 
                                                            background: '#ef4444', 
                                                            borderRadius: '2px',
                                                            marginTop: '2px'
                                                        }} />
                                                    )}
                                                </div>
                                            ))}
                                            
                                            {/* Ajout du Point ou du Silencio selon l'état */}
                                            {clue.isSealed && <span style={{ fontWeight: 'bold', fontSize: '24px', lineHeight: '35px', marginLeft: '4px' }}>.</span>}
                                            {clue.isComplete && !clue.isSealed && !clue.isGuess && <span className="silencio-mark" style={{ marginLeft: '4px' }}>/</span>}
                                        </div>

                                        {/* Ajout des icônes de Succès ou d'Erreur uniquement pour les tentatives */}
                                        {isWinGuess && <CheckCircle2 size={28} color="#10b981" style={{ marginLeft: '10px' }} />}
                                        {isWrongGuess && <XCircle size={28} color="#ef4444" style={{ marginLeft: '10px' }} />}
                                        
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
                
                {/* 1. EN-TÊTE VICTOIRE OU ÉGALITÉ */}
                <div className={`victory-header ${isDraw ? 'draw-game' : (isSun ? 'sun-win' : 'moon-win')}`} style={isDraw ? { background: 'linear-gradient(135deg, rgba(252, 211, 77, 0.2), rgba(167, 139, 250, 0.2))', border: '1px solid rgba(255,255,255,0.2)' } : {}}>
                    
                    {isDraw ? (
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <Sun size={48} color="#fcd34d" />
                            <Moon size={48} color="#a78bfa" />
                        </div>
                    ) : (
                        <Trophy size={64} className="trophy-icon" />
                    )}

                    <h1 className="victory-title" style={isDraw ? { color: '#ffffff' } : {}}>
                        {isDraw ? "ÉGALITÉ !" : `VICTOIRE DE L'ÉQUIPE ${isSun ? 'SOLEIL' : 'LUNE'}`}
                    </h1>
                    
                    {isDraw && (
                        <p style={{ marginTop: '10px', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                            Le carnet est plein, les esprits s'évanouissent...
                        </p>
                    )}
                </div>

                <div className="secret-reveal-box">
                    <p>L'Objet Secret était :</p>
                    <div className="giant-secret-word">
                        {game.secretObject}
                    </div>
                </div>

                {/* 2. ZONE DE DEBRIEFING */}
                <div className="debriefing-section">
                    <h2 className="debriefing-title">
                        <MessageCircle size={28} /> Debriefing de la partie
                    </h2>
                    <p className="debriefing-subtitle">
                        Révélation des questions posées et des œuvres d'art des esprits !
                    </p>
                    
                    <div className="debriefing-grid">
                        {/* En cas d'égalité, isTeamWinner sera `false` pour les deux équipes, donc aucun trophée affiché */}
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