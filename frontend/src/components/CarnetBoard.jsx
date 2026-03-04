import React from 'react';
import { Eye as EyeIcon, Sun, Moon } from 'lucide-react';

const CarnetBoard = ({ game, turnState, isMyTurn, isMedium, liveClue, activeTeam, onEyeClick }) => {

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

                    // Formatage du texte pour barrer l'erreur de la tentative
                    const renderClueText = () => {
                        if (!clue) return "";
                        if (isRowActive) return <>{liveClue}<span className="blinking-cursor">_</span></>;
                        if (clue.isGuess) {
                            if (clue.wrongGuess) {
                                return (
                                    <>
                                        {clue.text.slice(0, -1)}
                                        <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>{clue.text.slice(-1)}</span>
                                    </>
                                );
                            }
                            return clue.text;
                        }
                        return clue.text;
                    };

                    const isEyeTarget = turnState.action === 'EYE_POWER_REVEAL' && turnState.eyeTarget?.team === teamKey.toLowerCase() && turnState.eyeTarget?.index === i;
                    const isClickable = canSelectEye && clue && !clue.isGuess && !clue.text.endsWith('.');

                    return (
                        <div 
                            key={i} 
                            className="board-row"
                            onClick={() => isClickable && onEyeClick(teamKey.toLowerCase(), i)}
                            style={{
                                cursor: isClickable ? 'pointer' : 'default',
                                backgroundColor: isClickable ? 'rgba(252, 211, 77, 0.1)' : (isEyeTarget ? 'rgba(20, 184, 166, 0.2)' : 'transparent'),
                                outline: isEyeTarget ? '1px solid var(--primary)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span className="row-number">{rowNum}</span>
                            <span className="row-text">
                                {renderClueText()}
                                {clue?.isComplete && !clue?.isGuess && <span className="silencio-mark">/</span>}
                                {isEyeTarget && <span className="blinking-cursor" style={{ color: 'var(--primary)' }}>_</span>}
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