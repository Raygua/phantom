import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Sparkles, Lock, ArrowRight } from 'lucide-react';

function Home() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleJoin = async () => {
        if (!code) return;
        setError('');
        setIsLoading(true);

        try {
            let url = `/api/lobby/joinLobby?code=${code}`;
            if (password) url += `&password=${password}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (response.ok) {
                if (password)
                    navigate(`/lobby/${code}?password=${password}`, { state: { password } });
                else
                    navigate(`/lobby/${code}`);
            } else if (response.status === 403) {
                setShowPasswordInput(true);
                setError("Cette partie est protégée par un mot de passe");
            } else {
                setError(data.message || "Cette partie n'existe pas");
            }
        } catch (err) {
            console.error(err);
            setError("Les esprits ne répondent pas.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (state && state.needPassword) {
            setCode(state.code)
            setShowPasswordInput(true);
            setError("Cette partie est protégée par un mot de passe");
            window.history.replaceState({}, '');
        }
    }, [state]);

    return (
        <div className="ghost-card" style={{ maxWidth: '450px' }}>

            <div className="text-center" style={{ marginBottom: '2rem' }}>
                <h1 className="ghost-title" style={{ fontSize: '3rem', margin: 0 }}>Phantom Ink</h1>
                <p className="ghost-subtitle" style={{ letterSpacing: '0.3em', marginTop: '0.5rem' }}>
                    Inspiré du jeu de société
                </p>
            </div>

            {/* --- Formulaire Rejoindre --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                <div className="form-group">
                    <label className="label" style={{ justifyContent: 'center', marginBottom: '10px' }}>
                        REJOINDRE UNE PARTIE
                    </label>

                    <input
                        className="ghost-input"
                        placeholder="#CODE"
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value.toUpperCase());
                            setError('');
                            setShowPasswordInput(false); // Reset si on change le code
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />
                </div>

                {showPasswordInput && (
                    <div className="form-group animate-fade-in">
                        <div className="label" style={{ color: '#fca5a5', marginBottom: '5px' }}>
                            <Lock size={14} /> Mot de passe requis
                        </div>
                        <input
                            type="password"
                            className="ghost-input"
                            placeholder="Mot de passe du rituel"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            autoFocus
                        />
                    </div>
                )}

                <button className="ghost-button btn-primary" onClick={handleJoin} disabled={isLoading}>
                    {isLoading ? 'Connexion...' : (
                        <> <User size={18} /> REJOINDRE </>
                    )}
                </button>

                {error && (
                    <p style={{ color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
                        {error}
                    </p>
                )}
            </div>

            {/* --- Séparateur --- */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0', opacity: 0.5 }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--text-muted)' }}></div>
                <span style={{ padding: '0 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>OU</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--text-muted)' }}></div>
            </div>

            {/* --- Bouton Créer --- */}
            <button className="ghost-button btn-primary" onClick={() => navigate('/create')}>
                <Sparkles size={18} /> CRÉER UNE PARTIE
            </button>

        </div>
    );
}

export default Home;