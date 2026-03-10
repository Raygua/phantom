import { useRef, useEffect, useState } from 'react';
import { Eraser, ArrowBigRightDash, Send, Disc, EyeClosed  } from 'lucide-react';

export function LiveDrawingPad({ socket, gameId, team, canDraw, initialImage, padMode = 'NORMAL' }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#ccfbf1';

        if (initialImage) {
            const img = new window.Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                setHasDrawn(true);
            };
            img.src = initialImage;
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasDrawn(false);
        }
    }, [initialImage, padMode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const handleReceiveStroke = (data) => {
            if (data.team === team) {
                ctx.beginPath();
                ctx.moveTo(data.x0, data.y0);
                ctx.lineTo(data.x1, data.y1);
                ctx.stroke();
            }
        };
        const handleClearPad = (data) => {
            if (data.team === team) ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        socket.on('receive_draw_stroke', handleReceiveStroke);
        socket.on('clear_live_pad', handleClearPad);

        return () => {
            socket.off('receive_draw_stroke', handleReceiveStroke);
            socket.off('clear_live_pad', handleClearPad);
        };
    }, [socket, team]);

    const getCoordinates = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    };

    const startDrawing = (e) => {
        if (!canDraw) return;
        const pos = getCoordinates(e);
        lastPos.current = pos;
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e) => {
        if (!isDrawing || !canDraw) return;
        e.preventDefault();
        const pos = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        socket.emit('send_draw_stroke', { gameId, team, x0: lastPos.current.x, y0: lastPos.current.y, x1: pos.x, y1: pos.y });
        lastPos.current = pos;
    };

    const stopDrawing = () => {
        if (!isDrawing || !canDraw) return;
        setIsDrawing(false);
        socket.emit('sync_live_image', { gameId, team, imageBase64: canvasRef.current.toDataURL('image/png') });
    };

    const clearCanvas = () => {
        if (!canDraw) return;
        const canvas = canvasRef.current;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
        socket.emit('request_clear_pad', { gameId, team });
        socket.emit('sync_live_image', { gameId, team, imageBase64: canvas.toDataURL('image/png') });
    };

    // Actions
    const commitLetter = () => {
        if (!canDraw || !hasDrawn) return;
        socket.emit('commit_letter', { gameId, team, imageBase64: canvasRef.current.toDataURL('image/png') });
        socket.emit('request_clear_pad', { gameId, team });
        setHasDrawn(false);
    };

    const commitAndEndWord = () => {
        if (!canDraw) return;
        if (hasDrawn) socket.emit('commit_letter', { gameId, team, imageBase64: canvasRef.current.toDataURL('image/png') });
        socket.emit('end_word', { gameId, team });
        socket.emit('request_clear_pad', { gameId, team });
        setHasDrawn(false);
    };

    const endEyePower = (isSealed) => {
        if (!canDraw) return;
        const imageBase64 = hasDrawn ? canvasRef.current.toDataURL('image/png') : null;
        socket.emit('end_eye_power', { gameId, team, imageBase64, isSealed });
        socket.emit('request_clear_pad', { gameId, team });
        setHasDrawn(false);
    };

    // 🌟 Actions spécifiques au Médium pour la tentative
    const submitGuess = (isDot) => {
        if (!canDraw || (!hasDrawn && !isDot)) return; // On autorise le point même sans dessin
        const imageBase64 = hasDrawn ? canvasRef.current.toDataURL('image/png') : null;
        socket.emit('submit_guess_letter', { gameId, team, imageBase64, isDot });
        socket.emit('request_clear_pad', { gameId, team });
        setHasDrawn(false);
    };

    let titleText = canDraw ? "Dessinez la lettre ici" : "Dessin en cours...";
    if (canDraw && padMode === 'EYE_STEP_1') titleText = "Complétez la lettre";
    if (canDraw && padMode === 'EYE_STEP_2') titleText = "Ajoutez une lettre";

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <div>
                    <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>{titleText}</h4>

                    <canvas
                        ref={canvasRef}
                        width={140}
                        height={240}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '2px dashed var(--primary)',
                            borderRadius: '8px',
                            cursor: canDraw ? 'crosshair' : 'default',
                            touchAction: 'none'
                        }}
                        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                    />
                </div>

                {canDraw && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button onClick={clearCanvas} title="Effacer" style={{ padding: '10px', background: 'rgb(155, 41, 41)', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                            <Eraser size={24} />
                        </button>

                        {padMode === 'NORMAL' && (
                            <>
                                <button onClick={commitLetter} disabled={!hasDrawn} style={{ display:'flex', alignItems:'center', padding: '10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', opacity: hasDrawn ? 1 : 0.5 }}>
                                    <ArrowBigRightDash size={24}/> Suivante
                                </button>
                                <button onClick={commitAndEndWord} title="Terminer le mot (.)" style={{ padding: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Point .
                                </button>
                            </>
                        )}

                        {padMode === 'EYE_STEP_1' && (
                            <button onClick={commitLetter} disabled={!hasDrawn} style={{ display:'flex', alignItems:'center', padding: '10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', opacity: hasDrawn ? 1 : 0.5 }}>
                                <ArrowBigRightDash size={24}/> Continuer
                            </button>
                        )}

                        {padMode === 'EYE_STEP_2' && (
                            <>
                                <button onClick={() => endEyePower(false)} style={{ display:'flex', alignItems:'center', padding: '10px', background: '#ce880f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                   <EyeClosed size={24}/> Terminer
                                </button>
                                <button onClick={() => endEyePower(true)} style={{ padding: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    Point .
                                </button>
                            </>
                        )}

                        {/* 🌟 NOUVEAU BOUTON : Mode Guess (Tentative) */}
                        {padMode === 'GUESS' && (
                            <>
                                <button onClick={() => submitGuess(false)} disabled={!hasDrawn} style={{ display:'flex', alignItems:'center', padding: '10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', opacity: hasDrawn ? 1 : 0.5 }}>
                                    <ArrowBigRightDash size={24}/> Proposer
                                </button>
                                <button onClick={() => submitGuess(true)} title="Proposer le point final" style={{ padding: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Point .
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}