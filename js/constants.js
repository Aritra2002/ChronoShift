// --- CONFIGURATION ---
export const COLORS = {
    primary: '#00f3ff', // Cyber Cyan
    secondary: '#bc13fe', // Neon Purple
    bg: '#050510', // Deep Space
    surface: 'rgba(20, 20, 40, 0.85)', // Glassy Dark
    error: '#ff0055', // Laser Red
    success: '#00ff9d', // Matrix Green
    warning: '#ffae00', // Solar Orange
    text: '#e0e0ff' // Soft Hologram
};

export const TOWER_TYPES = {
    ARCHER: { id: 'ARCHER', name: 'Railgun', cost: 60, range: 120, damage: 15, cooldown: 600, color: '#00d4ff', icon: '📡', unlockLevel: 0 },
    CANNON: { id: 'CANNON', name: 'Howitzer', cost: 150, range: 100, damage: 50, cooldown: 2000, color: '#ff9100', icon: '💣', unlockLevel: 0 },
    FROST: { id: 'FROST', name: 'Cryo', cost: 120, range: 140, damage: 5, cooldown: 100, color: '#45a29e', icon: '❄️', unlockLevel: 0 },
    TESLA: { id: 'TESLA', name: 'Ion Coil', cost: 220, range: 110, damage: 25, cooldown: 800, color: '#00ff41', icon: '⚡', unlockLevel: 0 },
    SNIPER: { id: 'SNIPER', name: 'Ghost Rail', cost: 200, range: 250, damage: 80, cooldown: 2500, color: '#E1F5FE', icon: '🎯', critChance: 0.2, unlockLevel: 1 },
    MORTAR: { id: 'MORTAR', name: 'Plasma Rain', cost: 250, range: 180, damage: 40, cooldown: 3000, color: '#D500F9', icon: '🌋', splashRadius: 60, unlockLevel: 1 },
    LASER: { id: 'LASER', name: 'Void Beam', cost: 300, range: 130, damage: 2, cooldown: 50, color: '#FF1744', icon: '🚨', unlockLevel: 2 },
    OMEGA: { id: 'OMEGA', name: 'Titan Core', cost: 500, range: 200, damage: 150, cooldown: 4000, color: '#FFFF00', icon: '⚛️', splashRadius: 100, unlockLevel: 2 }
};

export const LEVELS = [
    { name: "Sector Alpha", waves: 5, difficultyScale: 1.0, castleMaxHealth: 500, path: [{x:0,y:0.2}, {x:0.3,y:0.2}, {x:0.3,y:0.7}, {x:0.7,y:0.7}, {x:0.7,y:0.3}, {x:1,y:0.3}] },
    { name: "Sector Beta", waves: 8, difficultyScale: 1.5, castleMaxHealth: 1500, path: [{x:0,y:0.5}, {x:0.2,y:0.5}, {x:0.2,y:0.2}, {x:0.5,y:0.2}, {x:0.5,y:0.8}, {x:0.8,y:0.8}, {x:0.8,y:0.5}, {x:1,y:0.5}] },
    { name: "Sector Gamma", waves: 12, difficultyScale: 2.2, castleMaxHealth: 3000, path: [{x:0.1,y:0}, {x:0.1,y:0.4}, {x:0.9,y:0.4}, {x:0.9,y:0.1}, {x:0.5,y:0.1}, {x:0.5,y:0.9}, {x:1,y:0.9}] }
];
