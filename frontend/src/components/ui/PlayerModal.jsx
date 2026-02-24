import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import './PlayerModal.css'; 
import { GhostInput, GhostButton } from './GhostUI'; 

const GHOST_COLORS = [
    '#14b8a6', // Teal (Défaut)
    '#a855f7', // Purple
    '#f43f5e', // Rose
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#e2e8f0'  // White Ghost
];

export const PlayerModal = ({ isOpen, onClose, defaultName, defaultColor, onSave }) => {
    const [nickname, setNickname] = useState('');
    const [color, setColor] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNickname(defaultName || '');
            setColor(defaultColor || GHOST_COLORS[0]);
        }
    }, [isOpen, defaultName, defaultColor]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!nickname.trim()) return;
        onSave({ nickname: nickname.trim(), color });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <h2 className="ghost-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                    Personnaliser l'Âme
                </h2>

                <div className="form-group">
                    <label className="label" style={{ marginBottom: '8px' }}>Nouveau Pseudo</label>
                    <GhostInput 
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Ex: Fantôme Sombre"
                        maxLength={20}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label className="label" style={{ justifyContent: 'center' }}>Aura Spectrale</label>
                    <div className="color-picker-grid">
                        {GHOST_COLORS.map(c => (
                            <button 
                                key={c}
                                className={`color-btn ${color === c ? 'active' : ''}`}
                                style={{ 
                                    backgroundColor: c, 
                                    boxShadow: color === c ? `0 0 15px ${c}` : 'none' 
                                }}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>
                </div>

                <GhostButton onClick={handleSave} style={{ marginTop: '1rem' }}>
                    <Check size={18} /> VALIDER
                </GhostButton>

            </div>
        </div>
    );
};