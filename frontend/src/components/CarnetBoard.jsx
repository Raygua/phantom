import React from 'react';
import { Eye as EyeIcon, Sun, Moon } from 'lucide-react';
import { LiveSpectatorCanvas } from './ui/LiveSpectatorCanvas'; // 🌟 IMPORT

// 🌟 AJOUTE `socket` AUX PROPS ICI
const CarnetBoard = ({ game, turnState, isMyTurn, isMedium, activeTeam, onEyeClick, socket }) => {

    const renderColumn = (teamKey, eyeRows, title, Icon) => {
        const clues = game.teams[teamKey.toLowerCase()]?.clues || [];
        const isWritingHere = game.currentTurn === teamKey && turnState.action === 'ASK_QUESTION' && turnState.selectedQuestion;
        const isGuessingHere = game.currentTurn === teamKey && turnState.action === 'GUESS_OBJECT';
        
        // 🌟 NOUVEAU : On détecte la phase de jugement
        const isJudgingHere = game.currentTurn === teamKey && turnState.action === 'JUDGE_GUESS';
        
        const canSelectEye = isMyTurn && isMedium && turnState.action === 'EYE_POWER_SELECTION';

        return (
            <div className={`board-page page-${teamKey.toLowerCase()}`}>
                <div className="page-header">
                    <Icon size={24} /> {title}
                </div>
                {[...Array(8)].map((_, i) => {
                    const rowNum = i + 1;
                    const hasEye = eyeRows.includes(rowNum);
                    const clue = clues[i]; 
                    
                    // 🌟 MODIFIÉ : La ligne reste active même pendant le jugement
                    const isRowActive = (isWritingHere || isGuessingHere || isJudgingHere) && i === clues.length - 1; 
                    
                    const isEyeTarget = turnState.action === 'EYE_POWER_REVEAL' && turnState.eyeTarget?.team === teamKey.toLowerCase() && turnState.eyeTarget?.index === i;

                    const renderClueContent = () => {
                        if (!clue) return null;

                        return (
                            // 🌟 MODIFICATION 1 : La gestion du Wrap et du Gap vertical
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px 4px', // 8px d'espace vertical (si ça wrap) et 4px d'espace horizontal
                                flexWrap: 'wrap', // Autorise le retour à la ligne
                                width: '100%', // S'assure qu'on utilise tout l'espace avant de wrap
                                padding: '6px 0' // Un peu de marge pour ne pas toucher les bords
                            }}>
                                
                                {/* 1. Les lettres déjà validées */}
                                {clue.letters?.map((letter, idx) => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                                            <div style={{ width: '80%', height: '3px', background: '#ef4444', borderRadius: '2px', marginTop: '2px' }} />
                                        )}
                                    </div>
                                ))}

                                {/* 🌟 NOUVEAU : 1b. La lettre en attente de jugement (Transparente et dorée) */}
                                {isJudgingHere && isRowActive && turnState.pendingGuessLetter && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.7 }}>
                                        {turnState.pendingGuessLetter.isDot ? (
                                            <span style={{ fontWeight: 'bold', fontSize: '24px', lineHeight: '35px', color: '#fcd34d' }}>.</span>
                                        ) : (
                                            <img 
                                                src={turnState.pendingGuessLetter.imageBase64} 
                                                alt="pending" 
                                                style={{ 
                                                    height: '35px', width: 'auto', aspectRatio: '140 / 200', objectFit: 'contain',
                                                    filter: 'drop-shadow(0 0 5px rgba(252, 211, 77, 0.8))'
                                                }} 
                                            />
                                        )}
                                    </div>
                                )}

                                {/* 2. LE CANVAS TEMPS RÉEL ! */}
                                {(isRowActive || isEyeTarget) ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <LiveSpectatorCanvas socket={socket} team={teamKey} />
                                    </div>
                                ) : (
                                    // 3. La ponctuation de fin 
                                    <>
                                        {clue.isSealed && <span style={{ fontWeight: 'bold', fontSize: '24px', lineHeight: '35px', marginLeft: '4px' }}>.</span>}
                                        {clue.isComplete && !clue.isSealed && !clue.isGuess && <span className="silencio-mark" style={{ marginLeft: '4px' }}>/</span>}
                                    </>
                                )}
                                
                            </div>
                        );
                    };

                    const isClickable = canSelectEye && clue && !clue.isGuess && !clue.isSealed;

                    return (
                        <div 
                            key={i} 
                            className="board-row"
                            onClick={() => isClickable && onEyeClick(teamKey.toLowerCase(), i)}
                            style={{
                                cursor: isClickable ? 'pointer' : 'default',
                                backgroundColor: isClickable ? 'rgba(252, 211, 77, 0.1)' : (isEyeTarget ? 'rgba(20, 184, 166, 0.2)' : 'transparent'),
                                outline: isEyeTarget ? '1px solid var(--primary)' : 'none',
                                transition: 'all 0.2s',
                                
                                // 🌟 MODIFICATION 2 : La ligne devient élastique !
                                minHeight: '48px', // Une base de taille minimale confortable
                                height: 'auto', // Permet à la ligne de s'agrandir à l'infini si le mot wrap
                                padding: '4px 8px', // Garde le contenu loin des bords quand la ligne grossit
                                boxSizing: 'border-box',
                                
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <span className="row-number" style={{ flexShrink: 0 }}>{rowNum}</span>
                            <span className="row-text" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                {renderClueContent()}
                            </span>
                            {hasEye && <EyeIcon className="row-eye" size={20} color={canSelectEye && isClickable ? '#fcd34d' : 'currentColor'} style={{ flexShrink: 0 }} />}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="board-book">
            {renderColumn('SUN', [4, 6, 7], 'Soleil', Sun)}
            {renderColumn('MOON', [3, 5, 6], 'Lune', Moon)}
        </div>
    );
};

export default CarnetBoard;