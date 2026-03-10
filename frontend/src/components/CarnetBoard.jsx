import React from 'react';
import { Eye as EyeIcon, Sun, Moon } from 'lucide-react';

const CarnetBoard = ({ game, turnState, isMyTurn, isMedium, activeTeam, onEyeClick }) => {

    const renderColumn = (teamKey, eyeRows, title, Icon) => {
        const clues = game.teams[teamKey.toLowerCase()]?.clues || [];
        const isWritingHere = game.currentTurn === teamKey && turnState.action === 'ASK_QUESTION' && turnState.selectedQuestion;
        
        // Est-ce que le Médium a le droit de cliquer sur un indice ?
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
                    const isRowActive = isWritingHere && i === clues.length - 1; 

                    // --- Rendu mixte (Images pour le dessin) ---
                    const renderClueContent = () => {
                        if (!clue) return null;

                        // Si c'est un indice normal ou une tentative (Tableau d'images dessinées)
                        return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                {clue.letters?.map((letter, idx) => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <img 
                                            src={letter.image} 
                                            alt="lettre" 
                                            style={{ 
                                                height: '35px', // Adapté pour le format vertical
                                                objectFit: 'contain',
                                                filter: 'drop-shadow(0 0 2px rgba(204, 251, 241, 0.5))',
                                                opacity: letter.isWrong ? 0.5 : 1 // On estompe légèrement si c'est faux
                                            }} 
                                        />
                                        {/* 🌟 Option 2 : Barre de soulignement rouge façon correcteur */}
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
                                
                                {clue.isSealed && <span style={{ fontWeight: 'bold', fontSize: '24px', lineHeight: '35px', marginLeft: '4px' }}>.</span>}
                                {clue.isComplete && !clue.isSealed && <span className="silencio-mark" style={{ marginLeft: '4px' }}>/</span>}
                                {(isRowActive || isEyeTarget) && <span className="blinking-cursor" style={{ color: 'var(--primary)', marginLeft: '4px' }}>_</span>}
                            </div>
                        );
                    };

                    // On vérifie si la ligne est la cible actuelle du Pouvoir de l'Oeil
                    const isEyeTarget = turnState.action === 'EYE_POWER_REVEAL' && turnState.eyeTarget?.team === teamKey.toLowerCase() && turnState.eyeTarget?.index === i;
                    
                    // La ligne est cliquable si c'est la phase de l'Oeil, que l'indice n'est pas une tentative, et qu'il n'est pas scellé
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
                                minHeight: '40px', // S'assure que la ligne ne s'écrase pas même si l'image est un peu grande
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <span className="row-number">{rowNum}</span>
                            <span className="row-text" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                {renderClueContent()}
                            </span>
                            {hasEye && <EyeIcon className="row-eye" size={20} color={canSelectEye && isClickable ? '#fcd34d' : 'currentColor'} />}
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