import React, { useState, useRef, useEffect } from 'react';
import { Ghost, Check, RefreshCw, Sparkles } from 'lucide-react';

// 🌟 Petite banque de mots par défaut (tu peux en ajouter autant que tu veux !)
const OBJECT_IDEAS = [
    // 🔮 Mystique & Antique
    "MIROIR", "GRIMOIRE", "PENDULE", "SABLIER", "CRÂNE", "PLUME", "BOUGIE", "POUPÉE", "ÉPÉE", "COURONNE", 
    "CLÉ", "BAGUE", "PARCHEMIN", "AMULETTE", "CALICE", "LANTERNE", "DAGUE", "CRISTAL", "MASQUE", "BOUCLIER",
    "FIOLE", "CERCUEIL", "MÉDAILLON", "SCEPTRE", "ARBALÈTE", "BOULE DE CRISTAL", "TRIDENT", "HELMET", "STATUE",
    
    // 🏠 Maison & Quotidien
    "PARAPLUIE", "TÉLÉPHONE", "LUNETTES", "TABLEAU", "APPAREIL PHOTO", "LIVRE", "LAMPE", "HORLOGE", "VALISE", 
    "THÉIÈRE", "CANAPÉ", "COUTEAU", "FOURCHETTE", "TASSE", "MACHINE À ÉCRIRE", "FAUTEUIL", "OREILLER", "RÉVEIL",
    "POÊLE", "TIRE-BOUCHON", "BROSSE", "PEIGNE", "MORTIER", "CENDRIER", "VASE", "ALLUMETTE", "ARROSOIR",

    // 🧭 Exploration & Science
    "BOUSSOLE", "JUMELLES", "LOUPE", "TÉLESCOPE", "MICROSCOPE", "GLOBE TERRESTRE", "AIMANT", "CARTE", "LONGUE-VUE",
    "ÉPROUVETTE", "BAROMÈTRE", "SABLIER", "CADRAN SOLAIRE", "THERMOMÈTRE",

    // 🧸 Loisirs & Objets hétéroclites
    "CERF-VOLANT", "BALLON", "DÉS", "DOMINO", "ÉCHIQUIER", "MARIONNETTE", "PIÈCE", "YOYO", "BOOMERANG", 
    "TIRELIRE", "GRELOT", "SIFFLET", "TROPHÉE", "RAQUETTE", "BILLET", "CARTE À JOUER", "PUZZLE", "DART",

    // 🎻 Instruments de Musique
    "PIANO", "GUITARE", "VIOLON", "TAMBOUR", "TROMPETTE", "FLÛTE", "HARPE", "ACCORDÉON", "SAXOPHONE", 
    "XYLOPHONE", "CIMBALES", "TRIANGLE", "CLOCHE", "CORNEMUSE",

    // 🔨 Outils & Travail
    "MARTEAU", "HACHE", "SCIE", "PERCEUSE", "PINCEAU", "PALETTE", "TOURNEVIS", "CLOU", "ENCLUME", 
    "PINCE", "PELLE", "RATEAU", "BROUETTE", "SÉCATEUR", "BURETTE", "PIOCHE",

    // 👗 Vêtements & Accessoires
    "CHAUSSURE", "CHAPEAU", "MANTEAU", "GANT", "BOTTES", "ÉCHARPE", "CRAVATE", "MONTRE", "COLLIER", 
    "BRACELET", "CEINTURE", "PARASOL", "NOEUD PAPILLON", "COURONNE", "DIADÈME", "SAC À MAIN",

    // 🚀 Véhicules (Souvent jouets ou maquettes)
    "BICYCLETTE", "TRAIN", "BATEAU", "AVION", "FUSÉE", "MONTGOLFIÈRE", "SOUS-MARIN", "VOITURE", "CAMION", 
    "MOTO", "TROTINETTE", "HÉLICOPTÈRE", "SATELLITE", "CHAR",

    // 🍔 Nourriture (Iconique)
    "GÂTEAU", "BONBON", "CHOCOLAT", "PIZZA", "FROMAGE", "POMME", "CITROUILLE", "CHAMPIGNON", "CROISSANT", 
    "HAMBURGER", "GLACE", "ANANAS", "CAROTTE", "POISSON",

    // 🌳 Nature (Objets naturels)
    "COQUILLAGE", "NID", "TOILE D'ARAIGNÉE", "RUCHE", "CACTUS", "BONSAÏ", "FOSSILE", "POMME DE PIN", "GALET"
];

const ChooseObjectScreen = ({ game, socket, myProfile }) => {
    const [secretWord, setSecretWord] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ideas, setIdeas] = useState([]);
    
    const isSpirit = myProfile.role === 'SPIRIT';
    const editableRef = useRef(null);

    // 🌟 Fonction pour générer 4 idées au hasard
    const refreshIdeas = () => {
        const shuffled = [...OBJECT_IDEAS].sort(() => 0.5 - Math.random());
        setIdeas(shuffled.slice(0, 4));
    };

    // Initialisation des idées au chargement (uniquement pour les esprits)
    useEffect(() => {
        if (isSpirit) {
            refreshIdeas();
        }
    }, [isSpirit]);

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
        const rawText = e.target.innerText;
        const sanitizedWord = rawText
            .replace(/[^a-zA-Z _]/g, '')
            .toUpperCase()
            .replace(/ /g, '_');
        
        setSecretWord(sanitizedWord);
        socket.emit('typing_secret_object', { gameId: game.gameId, word: sanitizedWord });
    };

    // 🌟 NOUVEAU : Fonction quand on clique sur une idée
    const handleIdeaClick = (word) => {
        if (isSubmitting) return;
        setSecretWord(word);
        
        // On met à jour l'affichage visuel
        if (editableRef.current) {
            editableRef.current.innerText = word;
        }
        
        // On prévient les autres esprits
        socket.emit('typing_secret_object', { gameId: game.gameId, word });
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!secretWord.trim() || isSubmitting) return;
        
        setIsSubmitting(true);
        socket.emit('set_secret_object', { gameId: game.gameId, word: secretWord.trim() });
    };

    return (
        <div className="ghost-card choose-object-wrapper">
            <Ghost size={64} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '20px' }} />
            
            {isSpirit ? (
                <>
                    <h2 className="ghost-title">Le Secret des Esprits</h2>
                    <p className="ghost-subtitle">Définissez l'objet que les Médiums devront deviner.</p>
                    
                    <div className="secret-input-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <div
                            ref={editableRef}
                            contentEditable={!isSubmitting}
                            suppressContentEditableWarning={true} 
                            onInput={handleInput}
                            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            className="ghost-input-editable"
                            data-placeholder="OBJET SECRET..."
                            style={{ width: '80%', textAlign: 'center' }}
                        />

                        {/* 🌟 NOUVELLE ZONE D'IDÉES */}
                        <div style={{ marginTop: '20px', width: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={16} /> Besoin d'inspiration ?
                            </p>

                            <button 
                                    onClick={refreshIdeas}
                                    disabled={isSubmitting}
                                    style={{
                                        background: 'transparent', border: 'none', color: 'var(--primary)',
                                        cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center',
                                        transition: 'transform 0.2s'
                                    }}
                                    title="Nouvelles idées"
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(180deg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(0deg)'}
                                >
                                    <RefreshCw size={20} />
                                </button>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', height:'120px', justifyContent: 'center' }}>
                                {ideas.map((idea, index) => (
                                    <button 
                                        key={index}
                                        onClick={() => handleIdeaClick(idea)}
                                        disabled={isSubmitting}
                                        style={{
                                            background: 'rgba(20, 184, 166, 0.1)',
                                            border: '1px solid rgba(20, 184, 166, 0.3)',
                                            color: 'var(--text-main)',
                                            padding: '8px 16px',
                                            borderRadius: '20px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontSize: '0.9rem'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(20, 184, 166, 0.2)';
                                            e.target.style.borderColor = 'var(--primary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(20, 184, 166, 0.1)';
                                            e.target.style.borderColor = 'rgba(20, 184, 166, 0.3)';
                                        }}
                                    >
                                        {idea}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmit}
                            className="ghost-button btn-primary"
                            disabled={!secretWord.trim() || isSubmitting}
                            style={{ marginTop: '40px' }}
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