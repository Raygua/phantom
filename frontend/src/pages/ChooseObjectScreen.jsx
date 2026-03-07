// src/pages/ChooseObjectScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Ghost, Check } from 'lucide-react';

const ChooseObjectScreen = ({ game, socket, myProfile }) => {
    const [secretWord, setSecretWord] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSpirit = myProfile.role === 'SPIRIT';

    const editableRef = useRef(null);

    useEffect(() => {
        if (!isSpirit) return;

        const handleSecretUpdate = ({ word }) => {
            setSecretWord(word);

            if (editableRef.current && editableRef.current.innerText !== word) {
                editableRef.current.innerText = word;
                
                if (document.activeElement === editableRef.current) {
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(editableRef.current);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        };

        socket.on('secret_object_typing', handleSecretUpdate);
        return () => socket.off('secret_object_typing', handleSecretUpdate);
    }, [socket, isSpirit]);

    const handleInput = (e) => {
        // On récupère le texte brut
        const rawText = e.target.innerText;
        
        // On nettoie
        const sanitizedWord = rawText
            .replace(/[^a-zA-Z _]/g, '')
            .toUpperCase()
            .replace(/ /g, '_');
        
        // On met à jour l'état local
        setSecretWord(sanitizedWord);

        // On émet vers le serveur
        socket.emit('typing_secret_object', { 
            gameId: game.gameId, 
            word: sanitizedWord 
        });
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!secretWord.trim() || isSubmitting) return;
        
        setIsSubmitting(true);
        socket.emit('set_secret_object', { 
            gameId: game.gameId, 
            word: secretWord.trim() 
        });
    };

    return (
        <div className="ghost-card choose-object-wrapper">
            <Ghost size={64} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '20px' }} />
            
            {isSpirit ? (
                <>
                    <h2 className="ghost-title">Le Secret des Esprits</h2>
                    <p className="ghost-subtitle">Définissez l'objet que les Médiums devront deviner.</p>
                    
                    <div className="secret-input-wrapper">
                        <div
                            ref={editableRef}
                            contentEditable={!isSubmitting}
                            // 🌟 CORRECTION 2 : Empêche React de râler
                            suppressContentEditableWarning={true} 
                            onInput={handleInput}
                            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            className="ghost-input-editable"
                            data-placeholder="OBJET SECRET..."
                        >
                            {/* On laisse vide au rendu initial, ou on gère via innerText dans un useEffect de montage */}
                        </div>

                        <button 
                            onClick={handleSubmit}
                            className="ghost-button btn-primary"
                            disabled={!secretWord.trim() || isSubmitting}
                            style={{ marginTop: '30px' }}
                        >
                            <Check size={20} /> SCELLER L'OBJET
                        </button>
                    </div>
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