// src/components/Card.jsx
import './Card.css'; // On importe le CSS qu'on vient de créer

const Card = ({ card, isFaceUp, isSelected, onClick, style, selectionBadges = [], isSpirit }) => {
    const displayCard = card || { id: "???", text: "" };

    return (
        <div 
            className={`phantom-card-container ${isFaceUp ? '' : 'face-down'} ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            style={style}
        >
            {/* 🌟 NOUVEAU : Les badges de joueurs au-dessus de la carte */}
            <div className="selection-badges-container">
                {selectionBadges.map((badge, i) => (
                    <div 
                        key={i} 
                        className="player-selection-badge" 
                        style={{ backgroundColor: badge.color, '--index': i }}
                    >
                        {badge.userName}
                    </div>
                ))}
            </div>

            <div className="phantom-card-inner">
                {/* RECTO (Face visible) */}
                <div className={`phantom-card-face phantom-card-front ${isSpirit ? 'isSpirit' : ''}`}>
                    <div className={`card-decoration ${isSpirit ? 'isSpirit' : ''}`}>{displayCard.id}</div>
                    <div className={`card-text ${isSpirit ? 'isSpirit' : ''}`}>{displayCard.text}</div>
                    <div className={`card-decoration card-decoration-bottom ${isSpirit ? 'isSpirit' : ''}`}>{displayCard.id}</div>
                </div>

                {/* VERSO (Face cachée) */}
                <div className="phantom-card-face phantom-card-back">
                    <div className="card-logo">
                        ✦<br/>Spirit<br/>Link<br/>✦
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Card;