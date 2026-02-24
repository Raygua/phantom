import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useUser } from '../hooks/useUser';
import { Ghost, Send, Copy, Play, LogOut, Settings } from 'lucide-react'; // Ajout de LogOut
import { PlayerModal } from '../components/ui/PlayerModal';

function Lobby() {
    const { gameId } = useParams();
    const { state } = useLocation();
    const [searchParams] = useSearchParams();
    const effectivePassword = searchParams.get('password') || state?.password || '';

    const userId = useUser();
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const messagesEndRef = useRef(null);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [players, setPlayers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const myProfile = players.find(p => p.id === userId) || {};

    const handleJoin = async () => {
        let url = `/api/lobby/joinLobby?code=${gameId}`;
        if (effectivePassword) url += `&password=${effectivePassword}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            return response.ok;
        } catch (error) {
            console.error("Erreur de vérification", error);
            return false;
        }
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!userId) return;
        const initLobby = async () => {
            const isAuthorized = await handleJoin();

            if (!isAuthorized) {
                navigate('/', { state: { needPassword: true, code: gameId } });
                return;
            }

            socketRef.current = io('/', {
                path: '/socket.io/lobby/',
                transports: ['websocket'],
                auth: {
                    userId: userId,
                    nickname: "Spectre " + userId.slice(0, 4),
                    password: effectivePassword
                }
            });

            socketRef.current.on('connect_error', (err) => {
                console.error("Erreur connexion Socket:", err);
            });

            socketRef.current.on('error_join', (msg) => {
                alert(msg);
                navigate('/');
            });

            socketRef.current.emit('join_room', gameId);

            socketRef.current.on('player_list_update', (list) => {
                setPlayers(list);
            });

            socketRef.current.on('receive_message', (msg) => {
                setMessages((prev) => [...prev, msg]);
            });
        }

        initLobby();

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [gameId, userId, navigate, state]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        socketRef.current.emit('send_message', {
            room: gameId,
            text: inputText
        });
        setInputText("");
    };

    const handleLeave = () => {
        if (confirm("Voulez-vous vraiment quitter la partie ?")) {
            navigate('/');
        }
    };

    const copyInviteLink = () => {
        const baseUrl = `${window.location.origin}/lobby/${gameId}`;
        const finalUrl = effectivePassword ? `${baseUrl}?password=${effectivePassword}` : baseUrl;

        navigator.clipboard.writeText(finalUrl);
        console.log("Lien copié :", finalUrl);
    };

    const handleSaveProfile = (newProfile) => {
        socketRef.current.emit('update_player_profile', newProfile);
    };

    // --- Styles Inline ---
    const containerStyle = {
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: '20px',
        maxWidth: '1200px',
        width: '100%',
        height: '60vh',
        margin: '0 auto'
    };

    if (window.innerWidth < 768) {
        containerStyle.gridTemplateColumns = '1fr';
        containerStyle.gridTemplateRows = 'auto 1fr';
    }

    return (
        <>
            <button
                onClick={handleLeave}
                className="btn-floating"
            >
                <LogOut size={20} />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>QUITTER</span>
            </button>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>



                {/* --- Header --- */}
                <div className="ghost-card" style={{ maxWidth: '1200px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px' }}>
                    <div>
                        <h2 className="ghost-title" style={{ fontSize: '1.5rem', textAlign: 'left', margin: 0 }}>Phantom Ink</h2>
                        <div style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: '1.2rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            Lien: {gameId} -{'>'}
                            <Copy size={16} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={copyInviteLink} />
                        </div>
                    </div>
                    <button className="ghost-button btn-primary" style={{ width: 'auto' }} onClick={() => console.log("Start")}>
                        <Play size={16} /> LANCER LA PARTIE
                    </button>
                </div>

                {/* --- Main Content Grid --- */}
                <div style={containerStyle}>

                    {/* Colonne Gauche */}
                    <div className="ghost-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', width: "auto" }}>
                        <h3 className="label" style={{ marginBottom: '15px' }}>
                            <Ghost size={16} /> Nombre de joueurs ({players.length})
                        </h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="label"
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '5px' }}
                            title="Personnaliser"
                        >
                            Personnalisation <Settings size={18} />
                        </button>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {players.length === 0 && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>En attente de joueurs...</p>}
                            {players.map((p, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px', marginBottom: '8px',
                                    background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-glass)'
                                }}>
                                    <div style={{
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: p.color || 'var(--primary)',
                                        boxShadow: `0 0 8px ${p.color || 'var(--primary)'}`
                                    }}></div>

                                    <span style={{ color: p.color || 'var(--text-main)', fontWeight: p.id === userId ? 'bold' : 'normal' }}>
                                        {p.nickname || `Spectre #${i + 1}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Colonne Droite */}
                    <div className="ghost-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', width: "auto" }}>
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {messages.map((msg, i) => {
                                const isMe = msg.sender === (socketRef.current?.auth?.nickname || 'Moi') || msg.isMe;
                                return (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{msg.sender}</span>
                                        <div style={{
                                            padding: '8px 16px', borderRadius: '12px', maxWidth: '80%',
                                            background: isMe ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255,255,255,0.1)',
                                            border: isMe ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid var(--border-glass)',
                                            color: isMe ? '#ccfbf1' : 'var(--text-main)',
                                            borderTopRightRadius: isMe ? '0' : '12px',
                                            borderTopLeftRadius: isMe ? '12px' : '0',
                                            wordBreak: 'break-word',    // Coupe les mots trop longs
                                            overflowWrap: 'break-word', // Standard moderne
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })}

                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={sendMessage} style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="ghost-input"
                                style={{ paddingRight: '40px', textAlign: 'left' }}
                                placeholder="..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            />
                            <button type="submit" style={{
                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                            }}>
                                <Send size={18} />
                            </button>
                        </form>
                    </div>

                </div>
            </div>

            <PlayerModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                defaultName={myProfile.nickname}
                defaultColor={myProfile.color}
                onSave={handleSaveProfile}
            />
        </>
    );
}

export default Lobby;