import React, { useState } from 'react';
import { Ghost, Check } from 'lucide-react';

const ChooseObjectScreen = ({ game, socket, myProfile }) => {
    const [secretWord, setSecretWord] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSpirit = myProfile.role === 'SPIRIT';

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!secretWord.trim()) return;
        
        setIsSubmitting(true);
        socket.emit('set_secret_object', { 
            gameId: game.gameId, 
            word: secretWord.trim() 
        });
    };

    return (
        <div className="ghost-card choose-object-wrapper">
            <Ghost size={64} color="var(--primary)" style={{ opacity: 0.5 }} />
            
            {isSpirit ? (
                <>
                    <h2 className="ghost-title">Le Secret des Esprits</h2>
                    <p className="ghost-subtitle">
                        Mettez-vous d'accord (à l'oral ou via un chat tiers) et définissez l'Objet Secret que les Médiums devront deviner.
                    </p>
                    
                    <form onSubmit={handleSubmit} className="secret-input-container">
                        <input
                            type="text"
                            className="ghost-input"
                            style={{ textAlign: 'center', fontSize: '1.5rem', textTransform: 'uppercase' }}
                            placeholder="OBJET SECRET..."
                            value={secretWord}
                            onChange={(e) => {
                                const sanitizedWord = e.target.value
                                    .replace(/[^a-zA-Z _]/g, '') // On autorise les lettres et les espaces
                                    .toUpperCase()
                                    .replace(/ /g, '_');         // On remplace direct l'espace par _
                                setSecretWord(sanitizedWord);
                            }}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            className="ghost-button btn-primary"
                            disabled={!secretWord.trim() || isSubmitting}
                        >
                            <Check size={20} /> SCELLER L'OBJET
                        </button>
                    </form>
                </>
            ) : (
                <>
                    <h2 className="ghost-title">Connexion en cours...</h2>
                    <p className="ghost-subtitle" style={{ fontStyle: 'italic' }}>
                        Les Esprits sont en train de choisir l'Objet Secret. Préparez-vous à recevoir leurs visions.
                    </p>
                    <div className="loading-dots" style={{ fontSize: '2rem', color: 'var(--primary)' }}>...</div>
                </>
            )}
        </div>
    );
};

export default ChooseObjectScreen;