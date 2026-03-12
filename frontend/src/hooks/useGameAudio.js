import { useState, useEffect, useRef, useCallback } from 'react';

export const useGameAudio = () => {
    const [volume, setVolume] = useState(0.5); 
    const [bgmMuted, setBgmMuted] = useState(false); // 🌟 NOUVEAU
    const [sfxMuted, setSfxMuted] = useState(false); // 🌟 NOUVEAU

    const bgmRef = useRef(null);
    const hitsRef = useRef([]);
    const shhhsRef = useRef([]);

    if (!bgmRef.current) {
        // 🌟 1. On charge ton nouveau fichier
        bgmRef.current = new Audio('/sounds/loop-mysterious.mp3');
        
        // 🌟 2. C'est cette ligne magique qui active la boucle infinie !
        bgmRef.current.loop = true;

        // Préchargement des autres sons...
        hitsRef.current = [1, 2, 3, 4, 5, 6, 7].map(num => new Audio(`/sounds/hit-${num}.mp3`));
        shhhsRef.current = [
            new Audio('/sounds/sh-noise-short.mp3'),
            new Audio('/sounds/sh-noise-long.mp3')
        ];
    }

    useEffect(() => {
        // La musique se coupe si bgmMuted est true
        if (bgmRef.current) {
            bgmRef.current.volume = bgmMuted ? 0 : volume * 0.1; 
        }
        
        // Les SFX se coupent si sfxMuted est true
        const sfxVolume = sfxMuted ? 0 : volume;
        hitsRef.current.forEach(audio => audio.volume = sfxVolume);
        shhhsRef.current.forEach(audio => audio.volume = sfxVolume);
    }, [volume, bgmMuted, sfxMuted]);

    // 🌟 Nouvelle gestion des promesses (Évite les AbortError)
    const safePlay = (audioElement) => {
        audioElement.currentTime = 0;
        const playPromise = audioElement.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // On ignore l'erreur d'annulation due au montage/démontage rapide de React
                if (error.name === 'AbortError') return;
                // On ignore l'erreur d'autoplay (le joueur doit cliquer sur la page avant)
                if (error.name === 'NotAllowedError') return;
                
                console.warn("Erreur audio :", error.message);
            });
        }
    };

    const playTap = useCallback(() => {
        const randomIndex = Math.floor(Math.random() * hitsRef.current.length);
        safePlay(hitsRef.current[randomIndex]);
    }, []);

    const playShhh = useCallback(() => {
        const randomIndex = Math.floor(Math.random() * shhhsRef.current.length);
        safePlay(shhhsRef.current[randomIndex]);
    }, []);

    const toggleBgm = useCallback((play) => {
        if (play) {
            const playPromise = bgmRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
                        console.warn("Erreur BGM :", e.message);
                    }
                });
            }
        } else {
            bgmRef.current.pause();
        }
    }, []);

    return { 
        volume, setVolume, 
        bgmMuted, setBgmMuted, 
        sfxMuted, setSfxMuted, 
        playTap, playShhh, toggleBgm 
    };
};