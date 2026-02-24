import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Lock, Unlock, Loader2, LogOut } from 'lucide-react'; // ArrowLeft retiré

function CreateGame() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [settings, setSettings] = useState({
        maxPlayers: 4,
        isPrivate: false,
        password: ''
    });

    useEffect(() => {
        const fetchDefaults = async () => {
            try {
                const res = await fetch('/api/lobby/getDefaultLobby');
                const data = await res.json();
                if (data.status === 'success') {
                    setSettings(prev => ({ ...prev, ...data.data }));
                }
            } catch (err) {
                console.error("Erreur fetch defaults");
            }
        };
        fetchDefaults();
    }, []);

    const handleCreate = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/lobby/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                navigate(`/lobby/${data.data.lobbyId}`);
            } else {
                setError(data.message || "Le rituel a échoué.");
            }
        } catch (err) {
            setError("Erreur de connexion aux esprits.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeave = () => {
        navigate('/');
    };

    return (
        <>
            <button
                onClick={handleLeave}
                className="btn-floating"
            >
                <LogOut size={20} />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>QUITTER</span>
            </button>
            <div className="ghost-card" style={{ minHeight: "450px" }}>

                {/* Titre (Le bouton Retour a été supprimé ici) */}
                <div className="text-center" style={{ marginTop: '10px' }}>
                    <h1 className="ghost-title">Paramètres</h1>
                    <p className="ghost-subtitle">Configurez les paramètres de la partie</p>
                </div>

                {/* --- Slider Joueurs --- */}
                <div className="form-group">
                    <div className="flex-between">
                        <span className="label"><Users size={18} /> Nombre de joueurs (max)</span>
                        <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontFamily: 'monospace' }}>{settings.maxPlayers}</span>
                    </div>
                    <input
                        type="range"
                        min="2"
                        max="10"
                        value={settings.maxPlayers}
                        onChange={(e) => setSettings({ ...settings, maxPlayers: parseInt(e.target.value) })}
                    />
                </div>

                <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />

                {/* --- Bouton Valider --- */}
                <button className="ghost-button btn-primary" onClick={handleCreate} disabled={isLoading}>
                    {isLoading ? (
                        <> <Loader2 size={18} className="animate-spin" /> Création... </>
                    ) : (
                        "CREER"
                    )}
                </button>

                {/* --- Toggle Privé --- */}
                <div className="form-group flex-between" style={{ marginTop: "2rem" }}>
                    <div>
                        <span className="label">
                            {settings.isPrivate ? <Lock size={18} /> : <Unlock size={18} />}
                            Confidentialité
                        </span>
                        <div className="hint">
                            {settings.isPrivate ? "Mot de passe requis." : "Ouvert à tous."}
                        </div>
                    </div>

                    <div
                        className={`toggle-switch ${settings.isPrivate ? 'active' : ''}`}
                        onClick={() => setSettings({ ...settings, isPrivate: !settings.isPrivate })}
                    >
                        <div className="toggle-knob"></div>
                    </div>
                </div>

                {/* --- Input Mot de Passe --- */}
                {settings.isPrivate && (
                    <div className="form-group animate-fade-in">
                        <input
                            type="text"
                            className="ghost-input"
                            placeholder="Insérez un mot de passe"
                            value={settings.password}
                            onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                            autoComplete="off"
                        />
                    </div>
                )}

                {/* --- Erreur --- */}
                {error && (
                    <div style={{ color: '#fca5a5', background: 'rgba(127, 29, 29, 0.3)', padding: '10px', borderRadius: '5px', textAlign: 'center', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        {error}
                    </div>
                )}
            </div>
        </>);
};

export default CreateGame;