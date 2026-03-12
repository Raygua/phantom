import React from 'react';
import { Eye as EyeIcon } from 'lucide-react';
import { LiveDrawingPad } from './LiveDrawingPad';
import './DrawingModal.css'; // On importe le style dédié

const DrawingModal = ({ 
    socket, 
    game, 
    turnState, 
    activeTeam, 
    showPadForAskQuestion, 
    showPadForGuess, 
    showPadForEye 
}) => {
    // Si on n'a aucune raison de dessiner, on ne rend rien
    if (!showPadForAskQuestion && !showPadForGuess && !showPadForEye) return null;

    return (
        <div className="drawing-modal-overlay">
            <div className="notebook-page">
                {/* Petits détails visuels du carnet */}
                <div className="notebook-tape"></div>
                <div className="notebook-margin-line"></div>

                <div className="notebook-content">
                    {showPadForAskQuestion && (
                        <>
                            <p className="notebook-subtitle">Dessinez l'indice pour :</p>
                            <p className="notebook-title">{turnState.selectedQuestion}</p>
                            <LiveDrawingPad socket={socket} gameId={game.gameId} team={game.currentTurn} canDraw={true} padMode="NORMAL" />
                        </>
                    )}

                    {showPadForGuess && (
                        <>
                            <p className="notebook-subtitle">Proposez une lettre</p>
                            <p className="notebook-title">Tentative</p>
                            <LiveDrawingPad socket={socket} gameId={game.gameId} team={activeTeam} canDraw={true} padMode="GUESS" />
                        </>
                    )}

                    {showPadForEye && (
                        <>
                            <p className="notebook-subtitle">Pouvoir de l'Œil</p>
                            <p className="notebook-title">
                                <EyeIcon size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> 
                                {turnState.eyeTarget.questionId}
                            </p>
                            <LiveDrawingPad socket={socket} gameId={game.gameId} team={turnState.eyeTarget.team} canDraw={true} padMode={turnState.eyeTarget.step === 1 ? 'EYE_STEP_1' : 'EYE_STEP_2'} initialImage={turnState.eyeTarget.initialImage} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DrawingModal;