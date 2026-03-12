// src/pages/PlayingBoard.jsx
import React, { useState, useEffect } from 'react';
import { Music,EarOff, VolumeX, Volume2, Hand, HelpCircle, Eye as EyeIcon, Sun, Moon, RefreshCcw, Check } from 'lucide-react';
import Card from '../components/Card';
import CarnetBoard from '../components/CarnetBoard';
import PlayerHand from '../components/PlayerHand';
import { LiveDrawingPad } from '../components/ui/LiveDrawingPad';
import DrawingModal from '../components/ui/DrawingModal';
import { useGameAudio } from '../hooks/useGameAudio';

const PlayingBoard = ({ game, socket, myProfile }) => {
    const isMedium = myProfile.role === 'MEDIUM';
    const isSpirit = myProfile.role === 'SPIRIT';
    const turnState = game.turnState;

    const activeTeam = myProfile.team === 'BOTH' ? game.currentTurn : myProfile.team;
    const isMyTurn = game.currentTurn === activeTeam;
    const teamData = game.teams[activeTeam.toLowerCase()];

    const [guessInput, setGuessInput] = useState("");
    const [showMulliganModal, setShowMulliganModal] = useState(false);
    const [selections, setSelections] = useState([]);
    const [historyModal, setHistoryModal] = useState(null);

    const [liveImage, setLiveImage] = useState(null);
    const uniqueSelectedCardIds = [...new Set(selections.map(s => s.cardId))];

    // GESTION EFFETS SONORES
    const { volume, setVolume, bgmMuted, setBgmMuted, sfxMuted, setSfxMuted, playTap, playShhh, toggleBgm } = useGameAudio();

    useEffect(() => {
        if (toggleBgm) {
            toggleBgm(true);
        }
        return () => {
            if (toggleBgm) toggleBgm(false);
        };
    }, [toggleBgm]);

    // 🌟 3. On écoute les ordres sonores du serveur
    useEffect(() => {
        const handlePlaySound = ({ sound }) => {
            if (sound === 'TAP') playTap();
            if (sound === 'SHHH') playShhh();
        };

        socket.on('play_sound', handlePlaySound);
        return () => socket.off('play_sound', handlePlaySound);
    }, [socket, playTap, playShhh]);

    // --- ACTIONS ---
    const handleProposeQuestions = () => {
        if (uniqueSelectedCardIds.length !== 2) return;
        socket.emit('propose_questions', {
            gameId: game.gameId,
            team: activeTeam,
            cardId1: uniqueSelectedCardIds[0],
            cardId2: uniqueSelectedCardIds[1]
        });
        setSelections([]);
        socket.emit('update_selections', { gameId: game.gameId, team: activeTeam, remoteSelections: [] });
    };

    const handleSelectQuestion = () => {
        if (uniqueSelectedCardIds.length !== 1) return;
        socket.emit('select_question', {
            gameId: game.gameId,
            team: activeTeam,
            qId: uniqueSelectedCardIds[0]
        });
        setSelections([]);
        socket.emit('update_selections', { gameId: game.gameId, team: activeTeam, remoteSelections: [] });
    }

    const handleEyeClick = (targetTeam, targetIndex) => {
        socket.emit('use_eye_power', { gameId: game.gameId, team: activeTeam, targetTeam, targetIndex });
    };

    const handleEndWord = () => {
        socket.emit('end_word', { gameId: game.gameId, team: activeTeam });
    };

    const handleMulliganClick = () => setShowMulliganModal(true);
    const confirmMulligan = () => {
        socket.emit('use_mulligan', { gameId: game.gameId, team: activeTeam });
        setShowMulliganModal(false);
    };

    useEffect(() => {
        const handleSelectionSync = ({ team, remoteSelections }) => {
            if (team === activeTeam) setSelections(remoteSelections);
        };
        socket.on('selections_synced', handleSelectionSync);
        return () => socket.off('selections_synced', handleSelectionSync);
    }, [socket, activeTeam]);

    // 🌟 NOUVEAU : Écouteur pour capter le dessin en cours (si on ne dessine pas)
    useEffect(() => {
        const handleSyncLiveImage = ({ team, imageBase64 }) => {
            // On affiche l'image live si elle correspond à l'action en cours
            setLiveImage(imageBase64);
        };

        const handleClearPad = () => {
            setLiveImage(null);
        };

        socket.on('sync_live_image', handleSyncLiveImage);
        socket.on('clear_live_pad', handleClearPad);

        // On nettoie quand le tour change
        setLiveImage(null);

        return () => {
            socket.off('sync_live_image', handleSyncLiveImage);
            socket.off('clear_live_pad', handleClearPad);
        };
    }, [socket, turnState.action]);

    const toggleCardSelection = (cardId) => {
        if (!isMyTurn) return;
        if (isMedium && turnState.action) return;
        if (isSpirit && turnState.action !== 'ASK_QUESTION') return;

        let newSelections = [...selections];
        const myId = myProfile.id || socket.id;
        const mySelectionIndex = newSelections.findIndex(s => s.userId === myId && s.cardId === cardId);

        if (mySelectionIndex !== -1) {
            newSelections.splice(mySelectionIndex, 1);
        } else {
            if (isSpirit) {
                const oldIndex = newSelections.findIndex(s => s.userId === myId);
                if (oldIndex !== -1) newSelections.splice(oldIndex, 1);
            } else {
                const myCardsCount = newSelections.filter(s => s.userId === myId).length;
                if (myCardsCount >= 2) return;
            }
            newSelections.push({
                cardId: cardId, userId: myId, userName: myProfile.username, color: myProfile.color || 'var(--primary)'
            });
        }
        setSelections(newSelections);
        socket.emit('update_selections', { gameId: game.gameId, team: activeTeam, remoteSelections: newSelections });
    };

    // --- LE MENU LATÉRAL DE CHAQUE ÉQUIPE ---
    const renderTeamMenu = (teamName, specificTeamData) => {
        if (!specificTeamData) return <div className="team-sidebar">Chargement...</div>;
        const isSun = teamName === 'SUN';
        const teamKeyLower = teamName.toLowerCase();
        const isThisTeamTurn = game.currentTurn === teamName;
        const isMyTeam = myProfile.team === teamName;
        const teamClues = specificTeamData.clues?.filter(c => !c.isGuess) || [];

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
                <div className="players-list" style={{ width: '100%', marginBottom: '20px' }}>
                    {allPlayers.map(p => {
                        const isMe = p.id === myProfile.id;
                        const roleLabel = p.role === 'SPIRIT' ? 'ESPRIT' : 'MÉDIUM';
                        return (
                            <div key={p.id} className={`player-item ${isMe ? 'is-me' : ''}`}>
                                <div className="player-info">
                                    <span className={`role-badge ${p.role === 'SPIRIT' ? 'ghost-role' : 'medium-role'}`}>{roleLabel}</span>
                                    <span className="player-name" style={{ color: p.color }}>{p.username} {isMe && "(Vous)"}</span>
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
                    <p style={{ opacity: isThisTeamTurn ? 1 : 0.6, fontStyle: 'italic', color: isThisTeamTurn ? (isSun ? '#fcd34d' : '#a78bfa') : 'inherit', fontSize: '0.85rem' }}>
                        {isThisTeamTurn ? (isMyTeam ? "C'est à nous de jouer" : "C'est leur tour...") : "En attente..."}
                    </p>
                </div>
            </div>
        );
    };

    const isEyeRevealPhase = turnState.action === 'EYE_POWER_REVEAL';
    const amITargetSpirit = isEyeRevealPhase && isSpirit && (activeTeam.toLowerCase() === turnState.eyeTarget?.team || myProfile.team === 'BOTH');

    // 🌟 CONDITIONS D'AFFICHAGE DU PAD (Uniquement pour le dessinateur)
    const showPadForAskQuestion = isMyTurn && isSpirit && turnState.action === 'ASK_QUESTION' && turnState.selectedQuestion;
    const showPadForGuess = isMyTurn && isMedium && turnState.action === 'GUESS_OBJECT';
    const showPadForEye = isEyeRevealPhase && amITargetSpirit;

    // Détermine de quel côté le Pad doit s'afficher
    const getPadAlignment = () => {
        if (showPadForAskQuestion || showPadForGuess) return activeTeam === 'SUN' ? 'flex-end' : 'flex-start';
        if (showPadForEye) return turnState.eyeTarget.team.toUpperCase() === 'SUN' ? 'flex-end' : 'flex-start';
        return 'center';
    };

    return (
        <div className="game-container">
            <DrawingModal
                socket={socket}
                game={game}
                turnState={turnState}
                activeTeam={activeTeam}
                showPadForAskQuestion={showPadForAskQuestion}
                showPadForGuess={showPadForGuess}
                showPadForEye={showPadForEye}
            />


            <div className="game-top-section-wrapper">
                <div className="game-logo-banner" style={{ position: 'relative' }}>
                    <span className="logo-spark">✦</span>
                    <h1 className="game-main-title">SPIRIT LINK</h1>
                    <span className="logo-spark">✦</span>

                    <div className="buttons-music-div">
                        {/* Bouton Musique */}
                        <button
                            onClick={() => setBgmMuted(!bgmMuted)}
                            style={{ background: 'transparent', border: 'none', color: bgmMuted ? '#ef4444' : 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                            title="Couper la musique"
                        >
                            <Music size={22} />
                        </button>

                        {/* Bouton Bruitages */}
                        <button
                            onClick={() => setSfxMuted(!sfxMuted)}
                            style={{ background: 'transparent', border: 'none', color: sfxMuted ? '#ef4444' : 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                            title="Couper les bruitages"
                        >
                            {sfxMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                        </button>

                        {/* Curseur de volume global */}
                        <input
                            type="range"
                            min="0" max="1" step="0.05"
                            value={volume}
                            onChange={(e) => {
                                if (bgmMuted) setBgmMuted(false);
                                if (sfxMuted) setSfxMuted(false);
                                setVolume(parseFloat(e.target.value));
                            }}
                            style={{ width: '80px', accentColor: 'var(--primary)', marginLeft: '5px' }}
                        />
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", position: 'relative' }}>
                    <div className="game-top-section" style={{ width: "100%" }}>
                        {renderTeamMenu('SUN', game.teams?.sun)}

                        {/* 🌟 On passe liveImage au CarnetBoard pour qu'il l'affiche en temps réel */}
                        <CarnetBoard
                            game={game}
                            turnState={turnState}
                            isMyTurn={isMyTurn}
                            isMedium={isMedium}
                            activeTeam={activeTeam}
                            onEyeClick={handleEyeClick}
                            liveImage={liveImage}
                            socket={socket}
                        />

                        {renderTeamMenu('MOON', game.teams?.moon)}
                    </div>
                </div>
            </div>

            {/* --- ACTIONS DU BAS --- */}
            {!(isMedium && isMyTurn && showPadForGuess) &&
                !(isSpirit && isMyTurn && showPadForEye) && (
                    <div className="game-bottom-section">
                        {isSpirit && (
                            <div className='secret-object-spirit'>
                                <span> OBJET SECRET : </span>
                                <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'anchor-center' }}><span className="logo-spark">✦</span> {game.secretObject}.<span className="logo-spark">✦</span></span>
                            </div>
                        )}

                        {/* ÉTAT 0 : Médium choisit de Proposer ou Deviner */}
                        {isMedium && isMyTurn && !turnState.action && (
                            <div className="triple-actions">
                                <button className="ghost-button btn-primary" onClick={handleProposeQuestions} disabled={uniqueSelectedCardIds.length !== 2}>
                                    <HelpCircle size={18} /> PROPOSER ({uniqueSelectedCardIds.length}/2)
                                </button>
                                <button className="ghost-button btn-primary" onClick={() => socket.emit('guess_letter', { gameId: game.gameId, team: activeTeam, letter: '' })}>
                                    <EyeIcon size={18} /> DEVINER L'OBJET
                                </button>
                                {!teamData.mulliganUsed && (
                                    <button className="mulligan-btn" onClick={handleMulliganClick} title="Mulligan (Repiocher 7 cartes)">
                                        <RefreshCcw size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', marginLeft: '8px' }} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ÉTAT 1 : L'Esprit choisit une question */}
                        {/* ÉTAT 1 : L'Esprit choisit une question */}
                        {isSpirit && isMyTurn && turnState.action === 'ASK_QUESTION' && !turnState.selectedQuestion && (
                            <div className="bottom-action-panel active-turn" style={{ padding: '5px 50px', background: 'linear-gradient(to top, rgba(15,23,42,0.95), rgba(30,27,75,0.8))' }}>
                                <h4 style={{ color: '#a78bfa', marginBottom: '15px', marginTop: '10px', fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 'normal', letterSpacing: '1px' }}>
                                    ✧ Quelle interrogation vous inspire  ? ✧
                                </h4>

                                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                    <button
                                        className="ghost-button btn-primary"
                                        onClick={handleSelectQuestion}
                                        disabled={uniqueSelectedCardIds.length !== 1}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            maxWidth: '115px',
                                            marginRight: '50px',
                                            fontSize: '1rem',
                                            background: uniqueSelectedCardIds.length === 1 ? '' : 'rgba(20, 184, 166, 0.1)',
                                            boxShadow: uniqueSelectedCardIds.length === 1 ? '0 0 20px rgba(20, 184, 166, 0.6)' : 'none',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <Check size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                        REPONDRE A CETTE CARTE
                                        <Check size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                    </button>

                                    {turnState.pendingQuestions?.map(q => {
                                        const cardBadges = selections.filter(s => s.cardId === q.id);
                                        const isSelected = cardBadges.length > 0;
                                        return (
                                            <Card key={q.id} card={q} isFaceUp={true} isSelected={isSelected} selectionBadges={cardBadges} onClick={() => toggleCardSelection(q.id)} />
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ÉTAT 2 : Bouton Silencio pour le Médium (Le pad est en haut) */}
                        {/* ÉTAT 2 : Bouton Silencio pour le Médium (Le pad est en haut) */}
                        {isMyTurn && turnState.action === 'ASK_QUESTION' && turnState.selectedQuestion && isMedium && (
                            <div
                                className="bottom-action-panel active-turn"
                                style={{
                                    padding: '25px 40px',
                                    width: '100%',
                                    maxWidth: '550px', // 🌟 Plus large pour que le texte respire
                                    minHeight: '160px', // 🌟 Hauteur fixe pour un bloc bien proportionné
                                    justifyContent: 'center',
                                    background: 'linear-gradient(to top, rgba(15,23,42,0.95), rgba(49,27,75,0.8))' // Teinte légèrement pourpre
                                }}
                            >
                                <h4 style={{
                                    color: '#a78bfa',
                                    marginBottom: '25px',
                                    marginTop: '0',
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: '1.25rem',
                                    fontWeight: 'normal',
                                    letterSpacing: '1px',
                                    textAlign: 'center', // 🌟 Centrage parfait
                                    lineHeight: '1.5'
                                }}>
                                    ✧ L'Esprit trace son message... ✧<br />
                                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Interrompez-le dès que le sens vous apparaît.</span>
                                </h4>

                                <button
                                    className="ghost-button giant-btn"
                                    style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        borderColor: '#ef4444',
                                        boxShadow: '0 0 25px rgba(239, 68, 68, 0.4)', // 🌟 Lueur rouge magique
                                        textTransform: 'uppercase',
                                        letterSpacing: '3px',
                                        transition: 'all 0.2s ease-in-out'
                                    }}
                                    onClick={() => socket.emit('silencio', { gameId: game.gameId, team: activeTeam })}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <Hand size={26} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '12px', marginBottom: '4px' }} />
                                    SILENCIO !
                                </button>
                            </div>
                        )}

                        {isMyTurn && isSpirit && turnState.action === 'GUESS_OBJECT' && (
                            <div
                                className="bottom-action-panel active-turn"
                                style={{
                                    padding: '25px 40px',
                                    width: '100%',
                                    maxWidth: '550px',
                                    minHeight: '160px',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(to top, rgba(15,23,42,0.95), rgba(30,27,75,0.8))'
                                }}
                            >
                                <h4 style={{
                                    color: '#a78bfa',
                                    margin: '0',
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: '1.25rem',
                                    fontWeight: 'normal',
                                    letterSpacing: '1px',
                                    textAlign: 'center',
                                    lineHeight: '1.5'
                                }}>
                                    ✧ Vos Médiums établissent le lien ... ✧<br />
                                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                                        Ils essayent de trouver votre Objet Secret.
                                    </span>
                                </h4>

                                {/* Petite animation de points de suspension pour marquer l'attente */}
                                <div className="loading-dots" style={{ fontSize: '2rem', color: 'var(--primary)', marginTop: '10px', letterSpacing: '8px' }}>
                                    ...
                                </div>
                            </div>
                        )}

                        {/* ÉTAT 5 : L'Esprit Juge la lettre proposée */}
                {isMyTurn && turnState.action === 'JUDGE_GUESS' && (
                    <div 
                        className="bottom-action-panel active-turn" 
                        style={{ 
                            width: '100%',
                            maxWidth: '450px', 
                            justifyContent: 'center',
                            background: 'linear-gradient(to top, rgba(15,23,42,0.95), rgba(30,27,75,0.8))' 
                        }}
                    >
                        <h4 style={{ 
                            color: '#a78bfa', 
                            marginBottom: isSpirit ? '15px' : '0', 
                            marginTop: '0', 
                            fontFamily: 'var(--font-serif)', 
                            fontSize: '1.25rem', 
                            fontWeight: 'normal', 
                            letterSpacing: '1px',
                            textAlign: 'center',
                            lineHeight: '1.5'
                        }}>
                            {isSpirit ? (
                                <>✧ Est-ce la bonne lettre ? ✧</>
                            ) : (
                                <>✧ En attente du jugement de votre Esprit... ✧</>
                            )}
                        </h4>

                        {!isSpirit && (
                             <div className="loading-dots" style={{ fontSize: '2rem', color: 'var(--primary)', marginTop: '10px', letterSpacing: '8px' }}>...</div>
                        )}

                        {isSpirit && (
                            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '25px' }}>
                                
                                {/* Cadre stylisé pour le dessin de la lettre */}
                                <div style={{ 
                                    padding: '10px', 
                                    background: 'var(--bg-card)', 
                                    border: '1px solid var(--primary)', 
                                    borderRadius: '8px',
                                    boxShadow: '0 0 15px rgba(20, 184, 166, 0.2)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minWidth: '100px',
                                    minHeight: '100px'
                                }}>
                                    {turnState.pendingGuessLetter?.isDot ? (
                                        <span style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: '1', color: 'var(--text-main)' }}>.</span>
                                    ) : (
                                        <img src={turnState.pendingGuessLetter?.imageBase64} alt="Tentative" style={{ height: '80px', filter: 'drop-shadow(0px 0px 5px rgba(255,255,255,0.5))' }} />
                                    )}
                                </div>

                                {/* Les boutons d'action */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    
                                    {/* Bouton OUI (Coup sur la table) */}
                                    <button
                                        className="ghost-button"
                                        style={{ 
                                            background: 'rgba(20, 184, 166, 0.15)', 
                                            color: 'var(--primary)', 
                                            borderColor: 'var(--primary)', 
                                            padding: '12px 25px',
                                            fontSize: '1.1rem',
                                            letterSpacing: '2px',
                                            textTransform: 'uppercase',
                                            boxShadow: '0 0 10px rgba(20, 184, 166, 0.2)',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'var(--bg-main)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20, 184, 166, 0.15)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                        onClick={() => socket.emit('judge_guess_letter', { gameId: game.gameId, team: activeTeam, isCorrect: true })}
                                    >
                                        <Hand size={20} /> TAPPER (Oui)
                                    </button>
                                    
                                    {/* Bouton NON (Chuuut) */}
                                    <button
                                        className="ghost-button"
                                        style={{ 
                                            background: 'rgba(156, 163, 175, 0.1)', 
                                            color: 'var(--text-muted)', 
                                            borderColor: 'var(--text-muted)', 
                                            padding: '12px 25px',
                                            fontSize: '1.1rem',
                                            letterSpacing: '2px',
                                            textTransform: 'uppercase',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(156, 163, 175, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                        onClick={() => socket.emit('judge_guess_letter', { gameId: game.gameId, team: activeTeam, isCorrect: false })}
                                    >
                                         <EarOff size={20} /> CHUUUT... (Non)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                        {/* ÉTAT 5 : Le Médium utilise l'Oeil (Bouton Passer) */}
                        {isMedium && isMyTurn && turnState.action === 'EYE_POWER_SELECTION' && (
                            <div className="bottom-action-panel active-turn">
                                <p style={{ color: '#fcd34d', fontSize: '1.3rem', marginBottom: '10px' }}><EyeIcon size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Pouvoir de l'Œil</p>
                                <span style={{ marginBottom: '20px' }}>Choisissez un indice <span style={{ color: '#fcd34d' }}>jaune</span> pour révéler une lettre</span>
                                <button className="ghost-button btn-primary" onClick={() => socket.emit('skip_eye_power', { gameId: game.gameId, team: activeTeam })}>
                                    Passer ce pouvoir
                                </button>
                            </div>
                        )}

                        {/* TOUJOURS VISIBLE : La main du Médium */}
                        {isMedium && !(isMyTurn && turnState.action === 'ASK_QUESTION' && turnState.selectedQuestion)
                            && !(isMyTurn && turnState.action === 'EYE_POWER_SELECTION')
                            && !(isMyTurn && turnState.action === 'GUESS_OBJECT') && (
                                <PlayerHand
                                    hand={teamData.hand}
                                    isMyTurn={isMyTurn}
                                    actionState={turnState.action}
                                    selectedCards={selections}
                                    onToggleCard={toggleCardSelection}
                                    onMulligan={handleMulliganClick}
                                    mulliganUsed={teamData.mulliganUsed}
                                />
                            )}

                        {isSpirit && !(isMyTurn && turnState.action === 'ASK_QUESTION')
                            && !(isMyTurn && turnState.action === 'JUDGE_GUESS')
                            && !(isMyTurn && turnState.action === 'GUESS_OBJECT')
                            && !(isEyeRevealPhase) && (
                                <div className="spirit-memory-zone">
                                    <PlayerHand
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
                )}

            {/* --- MODALES --- */}
            {historyModal && (
                <div className="history-modal-overlay" onClick={() => setHistoryModal(null)}>
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
                        </div>
                    </div>
                </div>
            )}

            {showMulliganModal && (
                <div className="centered-modal-overlay" onClick={() => setShowMulliganModal(false)}>
                    <div className="custom-confirm-modal" onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: '#f59e0b', marginBottom: '15px' }}><RefreshCcw size={24} /> Pouvoir du Mulligan</h3>
                        <p style={{ color: '#e2e8f0', marginBottom: '10px' }}>Défausser votre main pour piocher <strong>7 nouvelles cartes questions</strong> ?</p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button className="ghost-button" onClick={() => setShowMulliganModal(false)}>Annuler</button>
                            <button className="ghost-button" style={{ background: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b', color: '#f59e0b', fontWeight: 'bold' }} onClick={confirmMulligan}>Confirmer</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default PlayingBoard;