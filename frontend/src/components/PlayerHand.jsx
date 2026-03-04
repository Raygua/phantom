import React from 'react';
import Card from './Card';

const PlayerHand = ({ hand, isMyTurn, actionState, selectedCards, onToggleCard }) => {
    
    if (!hand || hand.length === 0) return null;

    // Le Médium ne peut sélectionner des cartes que si c'est son tour ET qu'il n'a pas encore choisi d'action
    const canSelect = isMyTurn && !actionState;

    return (
        <div className="player-hand-container">
            <h4 style={{ textAlign: 'center', marginBottom: '10px', color: 'var(--text-muted)' }}>Vos Cartes Questions</h4>
            {/* 🌟 NOUVEAU : On remplace le style brut par cette classe */}
            <div 
                className="player-hand-cards" 
                style={{ 
                    opacity: canSelect ? 1 : 0.6,
                    pointerEvents: canSelect ? 'auto' : 'none' 
                }}
            >
                {hand.map(card => {
                    const isSelected = selectedCards.includes(card.id);
                    return (
                        <Card
                            key={card.id}
                            card={card}
                            isFaceUp={true}
                            isSelected={isSelected}
                            onClick={() => canSelect && onToggleCard(card.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default PlayerHand;