// src/components/PlayerHand.jsx
import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // 🌟 NOUVEAU : Les flèches !
import Card from './Card';

const PlayerHand = ({ hand, isMyTurn, actionState, selectedCards, onToggleCard, isSpirit }) => {
    const scrollContainerRef = useRef(null);

    // Variables pour le glisser-déposer
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const dragDistance = useRef(0);

    // 🌟 NOUVEAU : État pour savoir où on en est dans le scroll
    const [scrollStatus, setScrollStatus] = useState({
        canScrollLeft: false,
        canScrollRight: false
    });

    // 🌟 NOUVEAU : Fonction qui calcule en temps réel si on touche un bord
    const updateScrollStatus = () => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const { scrollLeft, clientWidth, scrollWidth } = el;

        const isMobile = window.innerWidth <= 1200;
        let theoreticalWidth = 0;

        if (isMobile) {
            theoreticalWidth = hand.length * (140 + 15); // Largeur + Gap
        } else {
            theoreticalWidth = 140 + (hand.length - 1) * 90; // Largeur + (Reste * 90px de dépassement)
        }

        const canLeft = scrollLeft > 10;

        // 2. On compare la largeur théorique à la largeur de la fenêtre
        // On ajoute une marge de sécurité de 20px
        const canRight = theoreticalWidth > (clientWidth + 20);

        setScrollStatus({
            canScrollLeft: canLeft,
            canScrollRight: canRight
        });
    };

    useEffect(() => {
        // Un petit délai pour s'assurer que le DOM est à jour
        const timer = setTimeout(() => {
            updateScrollStatus();
        }, 50);

        window.addEventListener('resize', updateScrollStatus);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateScrollStatus);
        };
    }, [hand, isMyTurn]);

    // Écoute de la molette PC
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    // LOGIQUE DU CLIQUER-GLISSER
    const handleMouseDown = (e) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        isDragging.current = true;
        dragDistance.current = 0;
        container.style.cursor = 'grabbing';

        startX.current = e.pageX - container.offsetLeft;
        scrollLeft.current = container.scrollLeft;
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
        if (scrollContainerRef.current) scrollContainerRef.current.style.cursor = 'grab';
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        if (scrollContainerRef.current) scrollContainerRef.current.style.cursor = 'grab';
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        e.preventDefault();

        const container = scrollContainerRef.current;
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX.current) * 1.5;

        container.scrollLeft = scrollLeft.current - walk;
        dragDistance.current += Math.abs(walk);
    };

    const handleCardClick = (cardId) => {
        if (dragDistance.current > 15) return;
        if (canSelect) onToggleCard(cardId);
    };

    if (!hand || hand.length === 0) return null;
    const canSelect = (isMyTurn && !actionState) || isSpirit;

    return (
        <div className="bottom-hand-wrapper" style={{ position: 'relative' }}>

            {/* 🌟 NOUVEAU : Indicateur Visuel GAUCHE */}
            <div className={`scroll-indicator left ${scrollStatus.canScrollLeft ? 'visible' : ''}`}>
                <ChevronLeft size={36} />
            </div>

            <div
                className="player-hand-cards"
                ref={scrollContainerRef}
                onScroll={updateScrollStatus} /* 🌟 NOUVEAU : Met à jour quand on glisse */
                style={{
                    opacity: canSelect ? 1 : 0.6,
                    pointerEvents: 'auto',
                    cursor: 'grab'
                }}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                {hand.map(card => {
                    // On trouve toutes les sélections pour CETTE carte précise
                    const cardBadges = Array.isArray(selectedCards) 
                        ? selectedCards.filter(s => s.cardId === card.id) 
                        : [];
                    const isSelected = cardBadges.length > 0;

                    return (
                        <Card
                            key={card.id}
                            card={card}
                            isFaceUp={true}
                            isSelected={isSelected}
                            selectionBadges={cardBadges} // 🌟 On passe les badges ici
                            onClick={() => {
                                // On ne déclenche le clic que si on n'a pas "draggé" (glissé)
                                if (dragDistance.current < 10 && canSelect) {
                                    onToggleCard(card.id);
                                }
                            }}
                        />
                    );
                })}
            </div>

            {/* 🌟 NOUVEAU : Indicateur Visuel DROITE */}
            <div className={`scroll-indicator right ${scrollStatus.canScrollRight ? 'visible' : ''}`}>
                <ChevronRight size={36} />
            </div>
        </div>
    );
};

export default PlayerHand;