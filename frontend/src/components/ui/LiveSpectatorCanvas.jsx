import React, { useRef, useEffect } from 'react';

export function LiveSpectatorCanvas({ socket, team }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#fcd34d'; // Couleur "en cours" (dorée)

        const handleReceiveStroke = (data) => {
            if (data.team === team) {
                ctx.beginPath();
                ctx.moveTo(data.x0, data.y0);
                ctx.lineTo(data.x1, data.y1);
                ctx.stroke();
            }
        };

        const handleClearPad = (data) => {
            if (data.team === team) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };

        const handleSyncLiveImage = (data) => {
            if (data.team === team && data.imageBase64) {
                const img = new window.Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = data.imageBase64;
            }
        };

        socket.on('receive_draw_stroke', handleReceiveStroke);
        socket.on('clear_live_pad', handleClearPad);
        socket.on('sync_live_image', handleSyncLiveImage);

        return () => {
            socket.off('receive_draw_stroke', handleReceiveStroke);
            socket.off('clear_live_pad', handleClearPad);
            socket.off('sync_live_image', handleSyncLiveImage);
        };
    }, [socket, team]);

    return (
        <canvas
            ref={canvasRef}
            width={140}  // Taille de la grille de dessin (comme le Pad parent)
            height={200}
            style={{
                width: '24.5px', // 🌟 CORRECTION : Largeur exacte forcée
                height: '35px',  // 🌟 CORRECTION : Hauteur exacte forcée (identique aux autres lettres)
                filter: 'drop-shadow(0 0 5px rgba(252, 211, 77, 0.8))',
                display: 'block' // Évite l'espacement fantôme sous les balises inline
            }}
        />
    );
}