import { COLORS, TOWER_TYPES, LEVELS } from './constants.js';
import { GameEngine } from './engine/GameEngine.js';

// htm is loaded globally in index.html
const html = window.htm.bind(React.createElement);
const { useState, useEffect, useRef } = React;
const { 
    Button, Typography, Box, Paper, IconButton, Dialog, 
    Fab
} = MaterialUI;

export default function App() {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const [gameState, setGameState] = useState({ gold: 450, castleHealth: 500, castleMaxHealth: 500, wave: 1, mana: 0 });
    const [menuOpen, setMenuOpen] = useState(true);
    const [paused, setPaused] = useState(false);
    const [levelIndex, setLevelIndex] = useState(0);
    const [selectedTower, setSelectedTower] = useState('ARCHER');
    const [selectedTowerInstance, setSelectedTowerInstance] = useState(null);
    const [selectedCastle, setSelectedCastle] = useState(false);
    const [gameOver, setGameOver] = useState(null); 
    const [levelComplete, setLevelComplete] = useState(false);

    useEffect(() => {
        if (menuOpen || levelComplete || gameOver) return;

        const canvas = canvasRef.current;
        const engine = new GameEngine(
            canvas, 
            levelIndex, 
            gameState,
            (state) => setGameState(state),
            (win) => setGameOver(win ? 'win' : 'lose'),
            () => setLevelComplete(true)
        );
        engineRef.current = engine;

        const handleResize = () => engine.resize();
        window.addEventListener('resize', handleResize);
        engine.start();

        return () => {
            engine.isRunning = false;
            window.removeEventListener('resize', handleResize);
        };
    }, [menuOpen, levelIndex, levelComplete, gameOver]);

    const handleStart = () => {
        setMenuOpen(false);
        setLevelComplete(false);
        setGameOver(null);
        setPaused(false);
    };

    const handleToggleFullScreen = () => {
        if (!document.fullscreenElement) {
            const docEl = document.documentElement;
            const requestFull = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
            if (requestFull) requestFull.call(docEl).catch(() => {});
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const handleTogglePause = () => {
        if (engineRef.current) {
            const newState = engineRef.current.togglePause();
            setPaused(newState);
        }
    };

    const handleNextLevel = () => {
        if (levelIndex < LEVELS.length - 1) {
            const nextLevelIdx = levelIndex + 1;
            setLevelIndex(nextLevelIdx);
            setLevelComplete(false);
            setGameState(prev => ({ 
                ...prev, 
                gold: prev.gold + 300,
                mana: 0,
                wave: 1, 
                castleHealth: LEVELS[nextLevelIdx].castleMaxHealth,
                castleMaxHealth: LEVELS[nextLevelIdx].castleMaxHealth
            }));
            setSelectedTowerInstance(null);
        } else {
            setGameOver('win');
        }
    };

    const handleCanvasClick = (e) => {
        if (menuOpen || gameOver || levelComplete || paused) return;
        
        if (engineRef.current) {
            const { x, y } = engineRef.current.screenToLogical(e.clientX, e.clientY);
            
            if (engineRef.current.checkCastleClick(x, y)) {
                setSelectedCastle(prev => !prev);
                setSelectedTowerInstance(null);
                engineRef.current.selectedTower = null;
                return;
            }

            const clickedTower = engineRef.current.findTowerAt(x, y);
            if (clickedTower) {
                setSelectedTowerInstance(prev => {
                    const isSame = prev && prev.x === clickedTower.x && prev.y === clickedTower.y;
                    const next = isSame ? null : clickedTower;
                    engineRef.current.selectedTower = next;
                    return next;
                });
                setSelectedCastle(false);
                return;
            } 

            if (selectedTowerInstance || selectedCastle) {
                setSelectedTowerInstance(null);
                setSelectedCastle(false);
                engineRef.current.selectedTower = null;
                return;
            }

            if (selectedTower) {
                const type = TOWER_TYPES[selectedTower];
                if (engineRef.current.placeTower(x, y, type)) {
                    setSelectedTowerInstance(null);
                    setSelectedCastle(false);
                    engineRef.current.selectedTower = null;
                }
            }
        }
    };

    const handleSellTower = () => {
        if (engineRef.current && selectedTowerInstance) {
            engineRef.current.sellTower(selectedTowerInstance);
            setSelectedTowerInstance(null);
        }
    };

    const handleCastSpell = () => {
        if (engineRef.current && !paused) engineRef.current.castMeteor();
    };

    return html`
        <${Box} sx=${{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', bgcolor: COLORS.bg, overflow: 'hidden' }}>
            
            ${!menuOpen && html`
                <${Box} sx=${{ p: { xs: 0.2, sm: 0.5 }, bgcolor: COLORS.bg, borderBottom: '1px solid ' + COLORS.secondary + '44', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, minHeight: { xs: '45px', sm: '60px' } }}>
                    <${Paper} elevation=${3} sx=${{ p: 0.3, px: { xs: 1, sm: 3 }, borderRadius: 4, display: 'flex', gap: { xs: 1, sm: 3 }, bgcolor: COLORS.surface, border: '1px solid ' + COLORS.secondary, alignItems: 'center' }}>
                        <${IconButton} onClick=${handleTogglePause} sx=${{ color: COLORS.primary, p: { xs: 0.2, sm: 0.5 } }}>
                            ${paused ? '▶️' : '⏸️'}
                        <//>
                        <${IconButton} onClick=${handleToggleFullScreen} sx=${{ color: COLORS.primary, p: { xs: 0.2, sm: 0.5 } }}>
                            🖥️
                        <//>
                        <${Box} sx=${{ textAlign: 'center' }}>
                            <${Typography} variant="caption" sx=${{ fontSize: { xs: '0.55rem', sm: '0.7rem' } }} color=${COLORS.text}>CREDITS<//>
                            <${Typography} variant="h6" sx=${{ color: COLORS.primary, fontSize: { xs: '0.8rem', sm: '1.1rem' }, lineHeight: 1 }} fontWeight="bold">${Math.floor(gameState.gold)}<//>
                        <//>
                        <${Box} sx=${{ textAlign: 'center' }}>
                            <${Typography} variant="caption" sx=${{ fontSize: { xs: '0.55rem', sm: '0.7rem' } }} color=${COLORS.text}>CASTLE HP<//>
                            <${Typography} variant="h6" sx=${{ color: COLORS.error, fontSize: { xs: '0.8rem', sm: '1.1rem' }, lineHeight: 1 }} fontWeight="bold">${gameState.castleHealth}<//>
                        <//>
                        <${Box} sx=${{ textAlign: 'center' }}>
                            <${Typography} variant="caption" sx=${{ fontSize: { xs: '0.55rem', sm: '0.7rem' } }} color=${COLORS.text}>WAVE<//>
                            <${Typography} variant="h6" sx=${{ color: COLORS.text, fontSize: { xs: '0.8rem', sm: '1.1rem' }, lineHeight: 1 }} fontWeight="bold">${gameState.wave}/${LEVELS[levelIndex].waves}<//>
                        <//>
                    <//>
                    
                    <${Paper} elevation=${3} sx=${{ p: 0.3, px: { xs: 1, sm: 2 }, borderRadius: 4, bgcolor: COLORS.surface, border: '1px solid ' + COLORS.secondary, display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                         <${Box}>
                            <${Typography} variant="caption" sx=${{ fontSize: { xs: '0.55rem', sm: '0.7rem' } }} color=${COLORS.text}>ENERGY<//>
                            <${Typography} variant="h6" sx=${{ color: COLORS.success, fontSize: { xs: '0.8rem', sm: '1.1rem' }, lineHeight: 1 }} fontWeight="bold">${Math.floor(gameState.mana)}<//>
                         <//>
                         <${IconButton} color="secondary" onClick=${handleCastSpell} disabled=${gameState.mana < 50 || paused} size="small" sx=${{ p: 0.2 }}>☄️<//>
                    <//>
                <//>
            `}

            <${Box} sx=${{ flexGrow: 1, position: 'relative', overflow: 'hidden', bgcolor: '#000' }}>
                <canvas 
                    ref=${canvasRef} 
                    onClick=${handleCanvasClick}
                    style=${{ width: '100%', height: '100%', display: 'block' }}
                />

                ${paused && !gameOver && !levelComplete && html`
                    <${Box} sx=${{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <${Paper} sx=${{ p: 4, bgcolor: COLORS.surface, border: '2px solid ' + COLORS.primary, textAlign: 'center' }}>
                            <${Typography} variant="h4" color=${COLORS.primary} gutterBottom>SYSTEM PAUSED<//>
                            <${Button} variant="contained" onClick=${handleTogglePause} fullWidth sx=${{ mt: 2 }}>RESUME<//>
                        <//>
                    <//>
                `}

                ${selectedCastle && !menuOpen && !gameOver && !levelComplete && html`
                    <${Paper} elevation=${6} sx=${{ position: 'absolute', top: 20, right: 20, p: 2, width: { xs: 150, sm: 200 }, bgcolor: COLORS.surface, border: '2px solid ' + COLORS.success, borderRadius: 3, zIndex: 15, textAlign: 'center' }}>
                        <${Typography} variant="subtitle2" color=${COLORS.success} fontWeight="bold" sx=${{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>TITAN FORTRESS<//>
                        <${Typography} variant="caption" sx=${{ display: 'block', mb: 1, color: COLORS.text, fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>HP: ${gameState.castleHealth}<//>
                        <${Button} variant="contained" color="success" size="small" fullWidth onClick=${() => engineRef.current.repairCastle()} disabled=${gameState.gold < 10 || gameState.castleHealth >= gameState.castleMaxHealth} sx=${{ mb: 1, borderRadius: 2, fontWeight: 'bold', fontSize: { xs: '0.6rem', sm: '0.8rem' } }}>Repair<//>
                        <${IconButton} size="small" onClick=${() => setSelectedCastle(false)} sx=${{ position: 'absolute', top: 5, right: 5, color: COLORS.text }}>✕<//>
                    <//>
                `}

                ${selectedTowerInstance && !menuOpen && !gameOver && !levelComplete && html`
                    <${Paper} elevation=${6} sx=${{ position: 'absolute', top: 20, right: 20, p: 2, width: { xs: 140, sm: 180 }, bgcolor: COLORS.surface, border: '2px solid ' + COLORS.primary, borderRadius: 3, zIndex: 15, textAlign: 'center' }}>
                        <${Typography} variant="subtitle2" color=${COLORS.primary} fontWeight="bold" sx=${{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>${selectedTowerInstance.type.name}<//>
                        <${Button} variant="outlined" color="error" size="small" fullWidth onClick=${handleSellTower} sx=${{ borderRadius: 2, fontWeight: 'bold', fontSize: { xs: '0.6rem', sm: '0.8rem' } }}>Sell (+${Math.floor(selectedTowerInstance.type.cost * 0.5)})<//>
                        <${IconButton} size="small" onClick=${() => setSelectedTowerInstance(null)} sx=${{ position: 'absolute', top: 5, right: 5, color: COLORS.text }}>✕<//>
                    <//>
                `}
            <//>

            ${!menuOpen && !gameOver && !levelComplete && html`
                <${Box} sx=${{ p: { xs: 0.5, sm: 1 }, bgcolor: COLORS.surface, borderTop: '1px solid ' + COLORS.secondary + '44', display: 'flex', justifyContent: 'center', minHeight: { xs: '65px', sm: '85px' }, zIndex: 10 }}>
                    <${Box} sx=${{ display: 'flex', gap: { xs: 0.5, sm: 1 }, overflowX: 'auto', pb: 0.2, width: '100%', justifyContent: { xs: 'flex-start', sm: 'center' } }}>
                        ${Object.values(TOWER_TYPES).filter(t => t.unlockLevel <= levelIndex).sort((a, b) => a.cost - b.cost).map(t => {
                            const canAfford = gameState.gold >= t.cost;
                            return html`
                                <${Paper} key=${t.id} elevation=${selectedTower === t.id ? 8 : 2} onClick=${() => setSelectedTower(prev => prev === t.id ? null : t.id)} sx=${{ p: 0.3, minWidth: { xs: 45, sm: 60 }, height: { xs: 50, sm: 70 }, borderRadius: 2, cursor: 'pointer', bgcolor: selectedTower === t.id ? COLORS.primary : COLORS.bg, color: selectedTower === t.id ? COLORS.bg : COLORS.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', border: selectedTower === t.id ? '2px solid #FFF' : '1px solid ' + COLORS.secondary, opacity: canAfford ? 1 : 0.4, flexShrink: 0 }}>
                                    <${Typography} variant="h6" sx=${{ fontSize: { xs: '1rem', sm: '1.3rem' }, lineHeight: 1 }}>${t.icon}<//>
                                    <${Typography} variant="caption" fontWeight="bold" sx=${{ fontSize: { xs: '0.55rem', sm: '0.7rem' } }}>${t.cost}<//>
                                <//>
                            `;
                        })}
                    <//>
                <//>
            `}
            
            ${!menuOpen && !gameOver && !levelComplete && html`
                <${Fab} color="secondary" aria-label="meteor" onClick=${handleCastSpell} disabled=${gameState.mana < 50} size=${window.innerWidth < 600 ? 'small' : 'large'} sx=${{ position: 'absolute', bottom: { xs: 90, sm: 30 }, right: { xs: 20, sm: 30 } }}>
                    ☄️
                <//>
            `}

            <${Dialog} open=${menuOpen} fullWidth maxWidth="xs" PaperProps=${{ sx: { borderRadius: 4, p: 2, bgcolor: COLORS.surface, color: COLORS.text, border: '2px solid ' + COLORS.primary } }}>
                <${Box} sx=${{ textAlign: 'center', py: 4 }}>
                    <${Typography} variant="h2" fontWeight="700" gutterBottom sx=${{ color: COLORS.primary, letterSpacing: 4, fontFamily: 'Rajdhani' }}>CHRONOSHIFT<//>
                    <${Typography} variant="body1" sx=${{ color: COLORS.text, opacity: 0.8 }} paragraph>Secure the sectors against the incoming swarm.<//>
                    <${Button} variant="contained" size="large" fullWidth sx=${{ mt: 2, py: 1.5, borderRadius: 3, fontSize: '1.1rem', fontWeight: 'bold', bgcolor: COLORS.primary, '&:hover': { bgcolor: COLORS.success } }} onClick=${handleStart}>Initialize Mission<//>
                <//>
            <//>

            <${Dialog} open=${levelComplete} fullWidth maxWidth="xs" PaperProps=${{ sx: { borderRadius: 4, p: 2, bgcolor: COLORS.surface, color: COLORS.text, border: '2px solid ' + COLORS.success } }}>
                <${Box} sx=${{ textAlign: 'center', py: 4 }}>
                    <${Typography} variant="h3" fontWeight="900" gutterBottom sx=${{ color: COLORS.success }}>SECTOR SECURED<//>
                    <${Typography} variant="body1" sx=${{ color: COLORS.text, opacity: 0.8 }} paragraph>Advance to the next sector. Enemy resistance is increasing exponentially.<//>
                    ${levelIndex < LEVELS.length - 1 && html`
                        <${Paper} variant="outlined" sx=${{ p: 2, mb: 3, bgcolor: 'rgba(0,255,65,0.05)', borderColor: COLORS.success }}>
                            <${Typography} variant="caption" sx=${{ color: COLORS.success, fontWeight: 'bold', textTransform: 'uppercase' }}>New Tech Unlocked<//>
                            <${Box} sx=${{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
                                ${Object.values(TOWER_TYPES).filter(t => t.unlockLevel === levelIndex + 1).map(t => html`
                                    <${Box} key=${t.id} sx=${{ textAlign: 'center' }}>
                                        <${Typography} variant="h5">${t.icon}<//>
                                        <${Typography} variant="caption" sx=${{ display: 'block', fontSize: '0.7rem' }}>${t.name}<//>
                                    <//>
                                `)}
                            <//>
                        <//>
                    `}
                    <${Button} variant="contained" size="large" fullWidth sx=${{ mt: 2, py: 1.5, borderRadius: 3, fontSize: '1.1rem', fontWeight: 'bold', bgcolor: COLORS.success }} onClick=${handleNextLevel}>Next Sector<//>
                <//>
            <//>

            <${Dialog} open=${!!gameOver} fullWidth maxWidth="xs" PaperProps=${{ sx: { borderRadius: 4, p: 2, bgcolor: COLORS.surface, color: COLORS.text, border: '2px solid ' + (gameOver === 'win' ? COLORS.success : COLORS.error) } }}>
                <${Box} sx=${{ textAlign: 'center', py: 4 }}>
                    <${Typography} variant="h2" gutterBottom>${gameOver === 'win' ? '🏆' : '💀'}<//>
                    <${Typography} variant="h4" fontWeight="bold" gutterBottom sx=${{ color: (gameOver === 'win' ? COLORS.success : COLORS.error) }}>${gameOver === 'win' ? 'WARFRONT SECURED' : 'SYSTEM FAILURE'}<//>
                    <${Button} variant="outlined" size="large" fullWidth sx=${{ mt: 3, py: 1.5, borderRadius: 3, color: COLORS.text, borderColor: COLORS.secondary }} onClick=${() => window.location.reload()}>Reboot System<//>
                <//>
            <//>
        <//>
    `;
}
