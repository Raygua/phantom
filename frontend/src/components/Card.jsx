// src/components/Card.jsx
import React from 'react';
import './Card.css'; // On importe le CSS qu'on vient de créer

const Card = ({ card, isFaceUp = true, isSelected = false, onClick, style }) => {
    
    // Si la carte n'a pas de données et est face cachée (pour la pioche par ex)
    const displayCard = card || { id: "???", text: "" };

    return (
        <div 
            className={`phantom-card-container ${isFaceUp ? '' : 'face-down'} ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            style={style}
        >
            <div className="phantom-card-inner">
                {/* RECTO (Face visible) */}
                <div className="phantom-card-face phantom-card-front">
                    <div className="card-decoration">{displayCard.id}</div>
                    <div className="card-text">{displayCard.text}</div>
                    <div className="card-decoration card-decoration-bottom">{displayCard.id}</div>
                </div>

                {/* VERSO (Face cachée) */}
                <div className="phantom-card-face phantom-card-back">
                    <div className="card-logo">
                        ✦<br/>Phantom<br/>Ink<br/>✦
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Card;