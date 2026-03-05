// src/pages/PlayingBoard.jsx
import React, { useState, useEffect } from 'react';
import { Send, Hand, HelpCircle, Eye as EyeIcon, Sun, Moon, RefreshCcw } from 'lucide-react';
import Card from '../components/Card';
import CarnetBoard from '../components/CarnetBoard';
import PlayerHand from '../components/PlayerHand';

const PlayingBoard = ({ game, socket, myProfile }) => {
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
    const [showMulliganModal, setShowMulliganModal] = useState(false);

    // 🌟 NOUVEAU : État pour ouvrir la modale d'historique ('SUN', 'MOON', ou null)
    const [historyModal, setHistoryModal] = useState(null);

    useEffect(() => { setLiveClue(turnState.currentWritingClue || ""); }, [turnState.currentWritingClue, game.currentTurn, turnState.selectedQuestion]);
    useEffect(() => {
        const handleClueUpdated = ({ team, currentWord }) => { if (team === game.currentTurn) setLiveClue(currentWord); };
        socket.on('clue_updated', handleClueUpdated);
        return () => socket.off('clue_updated', handleClueUpdated);
    }, [socket, game.currentTurn]);
    useEffect(() => {
        if (!isMyTurn || turnState.action === 'GUESS_OBJECT') setSelectedCards([]);
        if (!isMyTurn) setEyeInput("");
    }, [isMyTurn, turnState.action]);

    // --- ACTIONS --- (les mêmes qu'avant)
    const toggleCardSelection = (cardId) => {
        if (selectedCards.includes(cardId)) setSelectedCards(selectedCards.filter(id => id !== cardId));
        else if (selectedCards.length < 2) setSelectedCards([...selectedCards, cardId]);
    };
    const handleProposeQuestions = () => {
        if (selectedCards.length !== 2) return;
        socket.emit('propose_questions', { gameId: game.gameId, team: activeTeam, cardId1: selectedCards[0], cardId2: selectedCards[1] });
        setSelectedCards([]);
    };

    const handleGuess = (e) => {
        e.preventDefault();
        if (!guessInput.trim() || guessInput.length > 1) return;
        socket.emit('guess_letter', { gameId: game.gameId, team: activeTeam, letter: guessInput.trim().charAt(0) });
        setGuessInput("");
    };
    const handleEyeClick = (targetTeam, targetIndex) => { socket.emit('use_eye_power', { gameId: game.gameId, team: activeTeam, targetTeam, targetIndex }); };
    const handleTypeLetter = (e) => {
        const sanitizedText = e.target.value.replace(/[^a-zA-Z _.]/g, '').toUpperCase().replace(/ /g, '_');
        setLiveClue(sanitizedText);
        socket.emit('write_word', { gameId: game.gameId, team: activeTeam, text: sanitizedText });
        if (sanitizedText.endsWith('.')) socket.emit('silencio', { gameId: game.gameId, team: activeTeam });
    };

    const handleMulliganClick = () => {
        setShowMulliganModal(true);
    };

    // Valide vraiment l'action vers le serveur
    const confirmMulligan = () => {
        socket.emit('use_mulligan', { gameId: game.gameId, team: activeTeam });
        setSelectedCards([]);
        setShowMulliganModal(false);
    };

    const getPlayerRole = (playerId) => {
        if (game.teamSun.ghost === playerId || game.teamMoon.ghost === playerId) return "ESPRIT";
        return "MÉDIUM";
    };

    // --- LE MENU LATÉRAL DE CHAQUE ÉQUIPE ---
    const renderTeamMenu = (teamName, specificTeamData) => {
        if (!specificTeamData) return <div className="team-sidebar">Chargement...</div>;

        const isSun = teamName === 'SUN';
        const teamKeyLower = teamName.toLowerCase();
        const isThisTeamTurn = game.currentTurn === teamName;
        const isMyTeam = myProfile.team === teamName;

        // Filtrer les indices
        const teamClues = specificTeamData.clues?.filter(c => !c.isGuess) || [];

        // On crée une liste unique pour l'affichage à partir de tes deux tableaux
        const allPlayers = [
            ...(specificTeamData.spirits || []),
            ...(specificTeamData.mediums || [])
        ];

        return (
            <div className={`team-sidebar ${isThisTeamTurn ? 'active-turn-' + teamKeyLower : ''}`}>
                <h3 className={`team-title ${teamKeyLower}`}>
                    {isSun ? <Sun size={24} /> : <Moon size={24} />}
                    {isSun ? 'Soleil' : 'Lune'}
                </h3>

                {/* LISTE DES JOUEURS RE-SYNCHRONISÉE */}
                <div className="players-list" style={{ width: '100%', marginBottom: '20px' }}>
                    {allPlayers.map(p => {
                        const isMe = p.id === myProfile.id;
                        // On utilise p.role qui est déjà dans ton objet spirit/medium
                        const roleLabel = p.role === 'SPIRIT' ? 'ESPRIT' : 'MÉDIUM';

                        return (
                            <div key={p.id} className={`player-item ${isMe ? 'is-me' : ''}`}>
                                <div className="player-info">
                                    <span className={`role-badge ${p.role === 'SPIRIT' ? 'ghost-role' : 'medium-role'}`}>
                                        {roleLabel}
                                    </span>
                                    <span className="player-name" style={{ color: p.color }}>
                                        {p.username} {isMe && "(Vous)"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="history-stack-btn" onClick={() => setHistoryModal(teamName)}>
                    <span className="history-badge">Voir {teamClues.length} indices</span>
                    <div style={{ marginTop: '10px' }}>
                        <Card isFaceUp={false} style={{ transform: 'scale(0.6)', margin: '-45px 0' }} />
                    </div>
                </div>

                <hr className="menu-divider" />

                <div className="sidebar-actions">
                    <p style={{
                        opacity: isThisTeamTurn ? 1 : 0.6,
                        fontStyle: 'italic',
                        color: isThisTeamTurn ? (isSun ? '#fcd34d' : '#a78bfa') : 'inherit',
                        fontSize: '0.85rem'
                    }}>
                        {isThisTeamTurn ? (isMyTeam ? "C'est à nous de jouer" : "C'est leur tour...") : "En attente..."}
                    </p>
                </div>
            </div>
        );
    };

    const isEyeRevealPhase = turnState.action === 'EYE_POWER_REVEAL';
    const amITargetSpirit = isEyeRevealPhase && isSpirit && (activeTeam.toLowerCase() === turnState.eyeTarget?.team || myProfile.team === 'BOTH');

    return (
        <div className="game-container">

            {/* 1. HAUT : LE JEU et TITRE*/}
            <div className="game-top-section-wrapper">
                <div className="game-logo-banner">
                    <span className="logo-spark">✦</span>
                    <h1 className="game-main-title">PHANTOM INK</h1>
                    <span className="logo-spark">✦</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                    <div className="game-top-section" style={{ width: "100%" }}>
                        {renderTeamMenu('SUN', game.teams?.sun)}
                        <CarnetBoard game={game} turnState={turnState} isMyTurn={isMyTurn} isMedium={isMedium} liveClue={liveClue} activeTeam={activeTeam} onEyeClick={handleEyeClick} />
                        {renderTeamMenu('MOON', game.teams?.moon)}
                    </div>
                </div>
            </div>

            {/* 2. BAS : LE CENTRE DE CONTRÔLE & LA MAIN DU JOUEUR */}
            <div className="game-bottom-section" style={{ flexDirection: 'column', alignItems: 'center' }}>

                {isSpirit && (
                    <div style={{
                        color: '#ffffff',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                        marginBottom: '15px'
                    }}>
                        OBJET SECRET : {game.secretObject}.
                    </div>
                )}

                {/* ÉTAT 0 : Médium choisit de Proposer ou Deviner */}
                {isMedium && isMyTurn && !turnState.action && (
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        <button className="ghost-button btn-primary" onClick={handleProposeQuestions} disabled={selectedCards.length !== 2}>
                            <HelpCircle size={18} /> PROPOSER ({selectedCards.length}/2)
                        </button>
                        <button className="ghost-button btn-primary" onClick={() => socket.emit('guess_letter', { gameId: game.gameId, team: activeTeam, letter: '' })}>
                            <EyeIcon size={18} /> DEVINER L'OBJET
                        </button>

                        {/* Le bouton Mulligan Carré à côté des cartes */}
                        {!teamData.mulliganUsed && (
                            <button className="mulligan-btn" onClick={handleMulliganClick} title="Mulligan (Repiocher 7 cartes)">
                                <RefreshCcw size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', marginLeft: '8px' }} />
                            </button>
                        )}
                    </div>
                )}

                {/* ÉTAT 1 : L'Esprit choisit une question */}
                {isSpirit && isMyTurn && turnState.action === 'ASK_QUESTION' && !turnState.selectedQuestion && (
                    <div className="bottom-action-panel active-turn">
                        <h4 style={{ color: 'var(--primary)', marginBottom: '20px' }}>Vos Médiums vous propose ces deux questions :</h4>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            {turnState.pendingQuestions?.map(q => (
                                <Card key={q.id} card={q} isFaceUp={true} onClick={() => socket.emit('select_question', { gameId: game.gameId, team: activeTeam, qId: q.id })} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ÉTAT 2 : L'Esprit écrit son indice */}
                {isSpirit && isMyTurn && turnState.action === 'ASK_QUESTION' && turnState.selectedQuestion && (
                    <div className="bottom-action-panel active-turn">
                        <p style={{ color: 'var(--primary)', fontSize: '1.2rem', marginBottom: '15px' }}>Question : {turnState.selectedQuestion}</p>
                        <input type="text" className="ghost-input giant-input" value={liveClue} onChange={handleTypeLetter} autoFocus />
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '10px' }}>Tapez un point '.' pour terminer votre indice.</p>
                    </div>
                )}

                {/* ÉTAT 3 : Le Médium surveille l'Esprit et dit SILENCIO */}
                {isMedium && isMyTurn && turnState.action === 'ASK_QUESTION' && turnState.selectedQuestion && (
                    <div className="bottom-action-panel active-turn">
                        <p style={{ fontSize: '1.1rem', marginBottom: '15px' }}>L'Esprit rédige l'indice...</p>
                        <p style={{ marginBottom: '10px' }}>Appuyez quand vous avez trouvé l'indice</p>
                        <button className="ghost-button giant-btn" style={{ background: '#ef4444', color: 'white', borderColor: '#ef4444' }} onClick={() => socket.emit('silencio', { gameId: game.gameId, team: activeTeam })}>
                            <Hand size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px' }} /> SILENCIO !
                        </button>
                    </div>
                )}

                {/* ÉTAT 4 : Le Médium devine l'objet */}
                {isMedium && isMyTurn && turnState.action === 'GUESS_OBJECT' && (
                    <form onSubmit={handleGuess} className="bottom-action-panel">
                        <p style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Devinez l'objet secret :</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span className="current-guess-word giant-text">{turnState.currentGuessingWord || ""}</span>
                            <input type="text" maxLength="1" className="ghost-input giant-input" style={{ width: '60px' }} value={guessInput} onChange={(e) => {
                                // 🌟 NOUVEAU : On transforme l'espace tapé en underscore
                                let val = e.target.value.toUpperCase().replace(/ /g, '_');

                                // On autorise les lettres, le point, le underscore, ou le vide !
                                if (val.match(/[A-Z._]/) || val === "") {
                                    setGuessInput(val);
                                }
                            }} autoFocus />
                            <button type="submit" className="ghost-button btn-primary giant-btn" disabled={!guessInput} style={{ padding: '0 20px' }}><Send size={24} /></button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '15px' }}>Tapez un point '.' pour valider la victoire.</p>
                    </form>
                )}

                {/* ÉTAT 5 : Le Médium utilise l'Oeil (Bouton Passer) */}
                {isMedium && isMyTurn && turnState.action === 'EYE_POWER_SELECTION' && (
                    <div className="bottom-action-panel active-turn">
                        <p style={{ color: '#fcd34d', fontSize: '1.3rem', marginBottom: '10px' }}><EyeIcon size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Pouvoir de l'Œil</p>
                        <span style={{ marginBottom: '20px' }}>Choisissez un indice <span style={{color:'#fcd34d'}}>jaune</span> pour révéler une lettre</span>
                        <button className="ghost-button btn-primary" onClick={() => socket.emit('skip_eye_power', { gameId: game.gameId, team: activeTeam })}>
                            Passer ce pouvoir
                        </button>
                    </div>
                )}

                {/* ÉTAT 6 : L'Esprit ciblé révèle la lettre de l'Oeil */}
                {amITargetSpirit && turnState.action === 'EYE_POWER_REVEAL' && (
                    <form onSubmit={(e) => { e.preventDefault(); if (eyeInput) { socket.emit('reveal_eye_letter', { gameId: game.gameId, team: myProfile.team, letter: eyeInput }); setEyeInput(""); } }} className="bottom-action-panel">
                        <p style={{ color: 'var(--primary)', marginBottom: '15px', fontSize: '1.1rem' }}><EyeIcon size={20} style={{ verticalAlign: 'middle' }} /> Révélez une lettre de : <strong>{turnState.eyeTarget.questionId}</strong></p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span className="current-guess-word giant-text">{turnState.eyeTarget.currentText}</span>
                            <input type="text" maxLength="1" className="ghost-input giant-input" value={eyeInput} onChange={(e) => { const val = e.target.value.slice(-1).toUpperCase(); if (val.match(/[A-Z \-_.]/)) setEyeInput(val.replace(/ /g, '_')); else if (val === "") setEyeInput(""); }} autoFocus />
                            <button type="submit" className="ghost-button btn-primary giant-btn" disabled={!eyeInput} style={{ padding: '0 20px' }}><Send size={24} /></button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '15px' }}>Tapez la lettre et validez (ou un point '.' si le mot est déjà fini).</p>
                    </form>
                )}

                {/* TOUJOURS VISIBLE : La main du Médium */}
                {isMedium && !(isMyTurn && turnState.action === 'ASK_QUESTION' && turnState.selectedQuestion)
                    && !(isMyTurn && turnState.action === 'EYE_POWER_SELECTION')
                    && !(isMyTurn && turnState.action === 'GUESS_OBJECT') && (
                        <PlayerHand
                            hand={teamData.hand}
                            isMyTurn={isMyTurn}
                            actionState={turnState.action}
                            selectedCards={selectedCards}
                            onToggleCard={toggleCardSelection}
                            onMulligan={handleMulliganClick}
                            mulliganUsed={teamData.mulliganUsed}
                        />
                    )}

                {isSpirit && !(isMyTurn && turnState.action === 'ASK_QUESTION') && (
                    <div className="spirit-memory-zone">
                        <PlayerHand
                            /* On transforme les indices passés en format "Carte" */
                            hand={teamData.clues
                                .filter(c => c.isComplete && !c.isGuess)
                                .map((clue, idx) => ({
                                    id: `Indice ${idx + 1}`,
                                    text: `${clue.questionId}`
                                }))
                            }
                            selectedCards={[]}
                            isSpirit={true}
                        />
                    </div>
                )}
            </div>

            {/* 3. MODALE D'HISTORIQUE (Tiroir du bas) */}
            {
                historyModal && (
                    <div className="history-modal-overlay" onClick={() => setHistoryModal(null)}>

                        {/* Le conteneur du tiroir (On empêche le clic de fermer si on clique pile sur les cartes) */}
                        <div className="history-drawer">

                            <h2 style={{ color: historyModal === 'SUN' ? '#fcd34d' : '#a78bfa', marginBottom: '40px', fontFamily: 'var(--font-serif)' }}>
                                Historique d'indice : {historyModal === 'SUN' ? 'Soleil' : 'Lune'}
                            </h2>

                            <div className="history-modal-content">
                                {game.teams[historyModal.toLowerCase()].clues.filter(c => !c.isGuess).map((clue, i) => {
                                    const canSee = isSpirit || (isMedium && myProfile.team === historyModal);
                                    const cardObj = { id: `Tour ${i + 1}`, text: clue.questionId };
                                    return <Card key={i} card={cardObj} isFaceUp={canSee} />;
                                })}

                                {game.teams[historyModal.toLowerCase()].clues.filter(c => !c.isGuess).length === 0 && (
                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun indice n'a encore été posé.</p>
                                )}
                            </div>

                            {/* Une petite indication visuelle pour fermer */}
                            <p
                                style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', opacity: 0.6 }}
                                onClick={() => setHistoryModal(null)}
                            >
                                (Cliquez n'importe où pour fermer)
                            </p>

                        </div>
                    </div>
                )
            }

            {/* 4. MODALE MULLIGAN */}
            {
                showMulliganModal && (
                    <div className="centered-modal-overlay" onClick={() => setShowMulliganModal(false)}>
                        <div className="custom-confirm-modal" onClick={e => e.stopPropagation()}>

                            <h3 style={{ color: '#f59e0b', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1.4rem' }}>
                                <RefreshCcw size={24} /> Pouvoir du Mulligan
                            </h3>

                            <p style={{ color: '#e2e8f0', marginBottom: '10px', fontSize: '1.1rem', lineHeight: '1.5' }}>
                                Voulez-vous vraiment défausser vos cartes actuelles pour piocher <strong>7 nouvelles questions</strong> ?
                            </p>

                            <p style={{ color: '#ef4444', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '25px' }}>
                                Attention : Ce pouvoir n'est utilisable qu'<strong>une seule fois</strong> dans toute la partie !
                            </p>

                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                <button className="ghost-button" onClick={() => setShowMulliganModal(false)}>
                                    Annuler
                                </button>
                                <button className="ghost-button" style={{ background: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b', color: '#f59e0b', fontWeight: 'bold' }} onClick={confirmMulligan}>
                                    Confirmer
                                </button>
                            </div>

                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default PlayingBoard;