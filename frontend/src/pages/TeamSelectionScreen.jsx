import { Sun, Moon, Ghost, Eye, Play } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import './TeamSelection.css';

// Constantes correspondantes à ton backend
const TEAMS = { SUN: "SUN", MOON: "MOON", BOTH: "BOTH" };
const ROLES = { SPIRIT: "SPIRIT", MEDIUM: "MEDIUM" };

export const TeamSelectionScreen = ({ game, socket }) => {
    const userId = useUser();
    
    // Convertir l'objet des joueurs en tableau
    const playersList = Object.values(game.players || {});
    const playerCount = playersList.length;
    
    // Trouver le joueur actuel
    const myProfile = playersList.find(p => p.id === userId) || {};

    // Fonction pour demander un rôle
    const handleJoin = (team, role) => {
        socket.emit('assign_role', { gameId: game.gameId, team, role });
    };

    // Fonction pour lancer la partie (Host uniquement)
    const handleStart = () => {
        socket.emit('lock_teams', { gameId: game.gameId });
    };

    // Petit composant interne pour afficher un joueur
    const PlayerTag = ({ player }) => (
        <div className="player-tag">
            <div className="player-color-dot" style={{ background: player.color, boxShadow: `0 0 8px ${player.color}` }} />
            <span style={{ color: player.color }}>{player.username}</span>
            {player.id === userId && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(Moi)</span>}
        </div>
    );

    // Composant interne pour une "Boîte de rôle" (ex: "Esprits", "Médiums")
    const RoleBox = ({ title, icon: Icon, team, role, currentPlayers }) => (
        <div className="role-box">
            <div className="role-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={16} /> {title}
                </span>
                <button className="btn-join" onClick={() => handleJoin(team, role)}>
                    Rejoindre
                </button>
            </div>
            <div className="role-content">
                {currentPlayers.map(p => <PlayerTag key={p.id} player={p} />)}
                {currentPlayers.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '10px' }}>
                        Place libre...
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="team-selection-wrapper">
            <div className="text-center game-info">
                <h1 className="ghost-title">Formation des équipes</h1>
                <p className="ghost-subtitle">Choisissez vos rôles. Les Esprits connaîtront le secret, les Médiums devront le deviner</p>
            </div>

            {/* --- CAS SPÉCIAL 3 JOUEURS : L'ESPRIT PARTAGÉ --- */}
            {playerCount === 3 && (
                <div className="shared-spirit-zone">
                    <h3 style={{ color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <Ghost /> L'Esprit Omniscient (Commun aux deux équipes)
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                        À 3 joueurs, un seul Esprit répondra aux Médiums de l'équipe Soleil et Lune
                    </p>
                    <RoleBox 
                        title="Esprit Partagé" 
                        icon={Ghost} 
                        team={TEAMS.BOTH} 
                        role={ROLES.SPIRIT} 
                        currentPlayers={playersList.filter(p => p.team === TEAMS.BOTH && p.role === ROLES.SPIRIT)} 
                    />
                </div>
            )}

            <div className="teams-grid">
                {/* --- ÉQUIPE SOLEIL --- */}
                <div className="team-col team-sun">
                    <div className="team-header"><Sun /> Équipe Soleil</div>
                    
                    {/* On n'affiche la boîte Esprit Soleil que s'il y a 4 joueurs ou plus */}
                    {playerCount !== 3 && (
                        <RoleBox 
                            title="Esprit(s)" icon={Ghost} team={TEAMS.SUN} role={ROLES.SPIRIT} 
                            currentPlayers={game.teams.sun.spirits || []} 
                        />
                    )}
                    
                    <RoleBox 
                        title="Médium(s)" icon={Eye} team={TEAMS.SUN} role={ROLES.MEDIUM} 
                        currentPlayers={game.teams.sun.mediums || []} 
                    />
                </div>

                {/* --- ÉQUIPE LUNE --- */}
                <div className="team-col team-moon">
                    <div className="team-header"><Moon /> Équipe Lune</div>
                    
                    {/* On n'affiche la boîte Esprit Lune que s'il y a 4 joueurs ou plus */}
                    {playerCount !== 3 && (
                        <RoleBox 
                            title="Esprit(s)" icon={Ghost} team={TEAMS.MOON} role={ROLES.SPIRIT} 
                            currentPlayers={game.teams.moon.spirits || []} 
                        />
                    )}

                    <RoleBox 
                        title="Médium(s)" icon={Eye} team={TEAMS.MOON} role={ROLES.MEDIUM} 
                        currentPlayers={game.teams.moon.mediums || []} 
                    />
                </div>
            </div>

            {/* --- BOUTON DE LANCEMENT (Host Uniquement) --- */}
            {myProfile.isHost ? (
                <button 
                    className="ghost-button btn-primary" 
                    style={{ padding: '15px', fontSize: '1.1rem', marginTop: '1rem', background:"rgb(15, 42, 42)", borderWidth:"2px" }} 
                    onClick={handleStart}
                >
                    <Play /> LANCER LA PARTIE
                </button>
            ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
                    En attente que le chef de la partie valide les équipes...
                </div>
            )}
        </div>
    );
};