// src/components/ActionZone.jsx
import React from 'react';
import { Send, Hand, HelpCircle, Eye as EyeIcon } from 'lucide-react';
import Card from './Card';

const ActionZone = ({
    gameId,
    turnState,
    isMyTurn,
    isMedium,
    isSpirit,
    activeTeam,
    myProfileTeam,
    teamData,
    socket, // On passe le socket pour faire les emits directement
    liveClue,
    handleTypeLetter,
    guessInput,
    setGuessInput,
    handleGuess,
    eyeInput,
    setEyeInput,
    selectedCards,
    toggleCardSelection,
    handleProposeQuestions,
    handleMulligan,
    handleSelectQuestion,
    handleSilencio
}) => {

    // 🌟 EXCEPTION POUR L'OEIL : On vérifie si je suis l'Esprit ciblé (même hors de mon tour)
    const isEyeRevealPhase = turnState.action === 'EYE_POWER_REVEAL';
    const amITargetSpirit = isEyeRevealPhase && isSpirit && (activeTeam.toLowerCase() === turnState.eyeTarget?.team || myProfileTeam === 'BOTH');

    // On bloque la vue SI ce n'est pas mon tour ET que je ne suis pas l'Esprit ciblé
    if (!isMyTurn && !amITargetSpirit) {
        return <p style={{ opacity: 0.7, textAlign: 'center' }}>L'équipe adverse est en pleine communication spirituelle...</p>;
    }

    // 1. DÉBUT DU TOUR : Le Médium doit choisir quoi faire (Les cartes ont été retirées d'ici pour aller dans PlayerHand)
    if (!turnState.action) {
        if (isMedium) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>
                        Sélectionnez <strong>2 questions</strong> dans votre main, ou tentez de deviner !
                    </p>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="ghost-button btn-primary" style={{ borderColor: 'var(--primary)' }} onClick={handleProposeQuestions} disabled={selectedCards.length !== 2}>
                            <HelpCircle size={18} /> PROPOSER ({selectedCards.length}/2)
                        </button>
                        <button className="ghost-button btn-primary" style={{ borderColor: 'var(--primary)' }} onClick={() => socket.emit('guess_letter', { gameId, team: activeTeam, letter: '' })}>
                            <EyeIcon size={18} /> DEVINER L'OBJET
                        </button>
                        {!teamData.mulliganUsed && (
                            <button className="ghost-button btn-orange" style={{ borderColor: '#f59e0b', color: '#ffcc88' }} onClick={handleMulligan}>
                                MULLIGAN
                            </button>
                        )}
                    </div>
                </div>
            );
        }
        return <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Attendez que votre Médium choisisse une action...</p>;
    }

    // 2. ACTION EN COURS : POSER UNE QUESTION
    if (turnState.action === 'ASK_QUESTION') {
        if (!turnState.selectedQuestion) {
            if (isSpirit) {
                return (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ marginBottom: '15px' }}>Choisissez la question à laquelle répondre :</p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }}>
                            {turnState?.pendingQuestions?.map((q, i) => (
                                <Card
                                    key={q.id}
                                    card={q}
                                    isFaceUp={true}
                                    onClick={() => handleSelectQuestion(q.id)}
                                />
                            ))}
                        </div>
                    </div>
                );
            } else {
                return <p style={{ textAlign: 'center' }}>L'Esprit choisit sa question...</p>;
            }
        } else {
            if (isSpirit) {
                return (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--primary)', marginBottom: '10px' }}>Question : {turnState.selectedQuestion}</p>
                        <input
                            type="text"
                            className="ghost-input"
                            placeholder="Tapez la lettre suivante..."
                            value={liveClue}
                            onChange={handleTypeLetter}
                            maxLength="15"
                            autoFocus
                        />
                    </div>
                );
            } else {
                return (
                    <div style={{ textAlign: 'center' }}>
                        <button className="ghost-button" style={{ background: '#ef4444', color: 'white', borderColor: '#ef4444', padding: '15px 30px', fontSize: '1.2rem' }} onClick={handleSilencio}>
                            <Hand size={20} /> SILENCIO !
                        </button>
                    </div>
                );
            }
        }
    }

    // 3. ACTION EN COURS : DEVINER L'OBJET
    if (turnState.action === 'GUESS_OBJECT') {
        if (isMedium) {
            return (
                <form onSubmit={handleGuess} style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '10px' }}>Devinez l'objet secret (<strong style={{ letterSpacing: '3px' }}>{turnState.currentGuessingWord}</strong>)</p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <input
                            type="text"
                            className="ghost-input"
                            maxLength="1"
                            value={guessInput}
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                if (val.match(/[A-Z.]/)) setGuessInput(val);
                            }}
                            style={{ width: '80px', textAlign: 'center', fontSize: '1.5rem' }}
                            autoFocus
                        />
                        <button type="submit" className="ghost-button btn-primary" disabled={!guessInput}>
                            <Send size={18} />
                        </button>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                        Épelez lettre par lettre. Quand vous avez fini, <strong>tapez un point "."</strong> pour valider la victoire.
                    </p>
                </form>
            );
        } else {
            return <p style={{ textAlign: 'center' }}>Votre Médium tente d'épeler le mot (<strong>{turnState.currentGuessingWord}</strong>)... Ne dites rien !</p>;
        }
    }

    // 4. POUVOIR DE L'OEIL : SELECTION
    if (turnState.action === 'EYE_POWER_SELECTION') {
        if (isMedium) {
            return (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                    <p style={{ color: '#fcd34d', fontSize: '1.2rem', marginBottom: '10px' }}>
                        <EyeIcon size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Case Œil atteinte !
                    </p>
                    <p style={{ marginBottom: '15px' }}>Cliquez sur n'importe quel indice du plateau (surligné en jaune) pour demander à l'Esprit qui l'a écrit d'y ajouter une lettre.</p>

                    <button
                        className="ghost-button"
                        style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
                        onClick={() => socket.emit('skip_eye_power', { gameId, team: activeTeam })}
                    >
                        Passer ce pouvoir
                    </button>
                </div>
            );
        } else {
            return <p style={{ textAlign: 'center' }}>Votre Médium inspecte le plateau grâce au Pouvoir de l'Œil...</p>;
        }
    }

    // 5. POUVOIR DE L'OEIL : REVELATION
    if (turnState.action === 'EYE_POWER_REVEAL') {
        if (amITargetSpirit) {
            return (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--primary)', marginBottom: '10px' }}>
                        <EyeIcon size={20} style={{ verticalAlign: 'middle' }} /> On fouille dans votre indice : <strong>{turnState.eyeTarget.questionId}</strong>
                    </p>
                    <p style={{ fontSize: '1.2rem', letterSpacing: '3px', marginBottom: '15px' }}>{turnState.eyeTarget.currentText}</p>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (eyeInput) {
                            socket.emit('reveal_eye_letter', {
                                gameId,
                                team: myProfileTeam,
                                letter: eyeInput
                            });
                            setEyeInput("");
                        }
                    }} style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                        <input
                            type="text"
                            className="ghost-input"
                            maxLength="1"
                            placeholder="1 lettre"
                            onChange={(e) => {
                                const val = e.target.value.slice(-1).toUpperCase();
                                if (val.match(/[A-Z \-_.]/)) {
                                    setEyeInput(val.replace(/ /g, '_'));
                                } else if (val === "") {
                                    setEyeInput("");
                                }
                            }}
                            value={eyeInput}
                            autoFocus
                            style={{ width: '80px', textAlign: 'center', fontSize: '1.5rem' }}
                        />
                        <button type="submit" className="ghost-button btn-primary" disabled={!eyeInput}>
                            <Send size={18} />
                        </button>
                    </form>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px' }}>Tapez la lettre et validez (ou un point '.' si le mot est déjà fini).</p>
                </div>
            );
        } else {
            return <p style={{ textAlign: 'center' }}>L'Esprit ciblé se concentre pour révéler une lettre supplémentaire...</p>;
        }
    }

    return null;
};

export default ActionZone;