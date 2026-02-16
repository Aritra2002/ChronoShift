import { COLORS, LEVELS } from '../constants.js';
import { Enemy, Tower, Projectile, Particle, FloatingText } from './Entities.js';

export class GameEngine {
    constructor(canvas, levelIdx, initialState, onStateUpdate, onGameOver, onLevelComplete) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.levelIdx = levelIdx;
        this.level = LEVELS[levelIdx];
        this.onStateUpdate = onStateUpdate;
        this.onGameOver = onGameOver;
        this.onLevelComplete = onLevelComplete;
        
        this.state = { 
            ...initialState,
            castleMaxHealth: this.level.castleMaxHealth
        };
        
        // LOGICAL COORDINATE SYSTEM (Fixed 1600x900 reference)
        this.logicalWidth = 1600;
        this.logicalHeight = 900;
        
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.bgElements = []; 
        this.shakeTimer = 0;
        
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.toSpawn = 0;
        this.isRunning = false;
        this.paused = false;
        
        this.dpr = window.devicePixelRatio || 1;
        this.resize();
        this.initBackgroundElements(); 
    }

    initBackgroundElements() {
        this.bgElements = [];
        const r = 120; // Fixed logical radius
        const k = 20; 
        const cellSize = r / Math.sqrt(2);
        const cols = Math.floor(this.logicalWidth / cellSize) + 1;
        const rows = Math.floor(this.logicalHeight / cellSize) + 1;
        const grid = new Array(cols * rows).fill(-1);
        const active = [];

        const isTooCloseToRoad = (x, y) => {
            return this.pathPoints.some((p, j) => {
                if (j === 0) return false;
                const p1 = this.pathPoints[j-1];
                const p2 = p;
                const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
                if (l2 === 0) return false;
                const t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / l2));
                const projection = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
                const dx = x - projection.x;
                const dy = y - projection.y;
                return (dx * dx + dy * dy) < 6400; // 80px fixed logical distance
            });
        };

        // Seed logical points
        for (let i = 0; i < 15; i++) {
            let x0 = Math.random() * this.logicalWidth;
            let y0 = Math.random() * this.logicalHeight;
            if (!isTooCloseToRoad(x0, y0)) {
                const col = Math.floor(x0 / cellSize);
                const row = Math.floor(y0 / cellSize);
                const pos = { x: x0, y: y0, seed: Math.random() * 1000 };
                if (grid[col + row * cols] === -1) {
                    grid[col + row * cols] = pos;
                    active.push(pos);
                }
            }
        }

        if (active.length === 0) return;

        while (active.length > 0) {
            const randIndex = Math.floor(Math.random() * active.length);
            const pos = active[randIndex];
            let found = false;

            for (let n = 0; n < k; n++) {
                const theta = Math.random() * Math.PI * 2;
                const radius = r * (1 + Math.random());
                const pX = pos.x + radius * Math.cos(theta);
                const pY = pos.y + radius * Math.sin(theta);

                if (pX > 0 && pX < this.logicalWidth && pY > 0 && pY < this.logicalHeight && !isTooCloseToRoad(pX, pY)) {
                    const col = Math.floor(pX / cellSize);
                    const row = Math.floor(pY / cellSize);
                    let ok = true;

                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            const idx = (col + i) + (row + j) * cols;
                            if (col + i >= 0 && col + i < cols && row + j >= 0 && row + j < rows) {
                                const neighbor = grid[idx];
                                if (neighbor !== -1) {
                                    const dx = pX - neighbor.x;
                                    const dy = pY - neighbor.y;
                                    if ((dx * dx + dy * dy) < r * r) ok = false;
                                }
                            }
                        }
                    }

                    if (ok) {
                        let minPathDist = Infinity;
                        this.pathPoints.forEach((p, j) => {
                            if (j === 0) return;
                            const p1 = this.pathPoints[j-1];
                            const p2 = p;
                            const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
                            if (l2 === 0) return;
                            const t = Math.max(0, Math.min(1, ((pX - p1.x) * (p2.x - p1.x) + (pY - p1.y) * (p2.y - p1.y)) / l2));
                            const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
                            const d = Math.hypot(pX - proj.x, pY - proj.y);
                            if (d < minPathDist) minPathDist = d;
                        });

                        const distFactor = Math.max(0.5, Math.min(1.5, (minPathDist - 50) / 100));
                        const baseSize = 15 + Math.random() * 20;

                        const newPos = { 
                            x: pX, y: pY,
                            type: Math.random() > 0.5 ? 'NATURAL' : 'MAN_MADE',
                            variant: Math.floor(Math.random() * 3), 
                            size: baseSize * distFactor,
                            seed: Math.random() * 1000,
                            depth: 0.4 + (pY / this.logicalHeight) * 0.6
                        };
                        grid[col + row * cols] = newPos;
                        active.push(newPos);
                        this.bgElements.push(newPos);
                        found = true;
                        break;
                    }
                }
            }
            if (!found) active.splice(randIndex, 1);
        }
        this.bgElements.sort((a, b) => a.y - b.y);
    }

    drawBackgroundElements(ctx) {
        const time = performance.now() * 0.001;
        this.bgElements.forEach(el => {
            ctx.save();
            ctx.translate(el.x, el.y);
            ctx.scale(el.depth, el.depth);
            
            const aoGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, el.size);
            aoGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
            aoGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = aoGrad;
            ctx.beginPath(); ctx.ellipse(0, 0, el.size, el.size/3, 0, 0, Math.PI*2); ctx.fill();

            if (el.type === 'NATURAL') {
                const pulse = 0.8 + Math.sin(time + el.seed) * 0.2;
                if (el.variant === 0) {
                    ctx.save();
                    const grad = ctx.createLinearGradient(-10, 0, 10, 0);
                    grad.addColorStop(0, '#1a1a2e');
                    grad.addColorStop(0.5, '#16213e');
                    grad.addColorStop(1, '#0f3460');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.moveTo(-8, 0);
                    ctx.bezierCurveTo(-12, -el.size*0.5, -5, -el.size, 0, -el.size*0.8);
                    ctx.bezierCurveTo(5, -el.size, 12, -el.size*0.5, 8, 0);
                    ctx.fill();
                    ctx.strokeStyle = COLORS.secondary;
                    ctx.globalAlpha = 0.4 + pulse * 0.4;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = COLORS.secondary;
                    ctx.lineWidth = 1.5;
                    for(let i=0; i<2; i++) {
                        ctx.beginPath();
                        ctx.moveTo(-3 + i*6, 0);
                        ctx.quadraticCurveTo(0, -el.size*0.5, -2 + i*4, -el.size*0.7);
                        ctx.stroke();
                    }
                    ctx.restore();
                } else if (el.variant === 1) {
                    ctx.save();
                    for(let i=0; i<3; i++) {
                        ctx.rotate(el.seed + i*2);
                        const h = el.size * (0.6 + i*0.2);
                        const w = 6 + i*2;
                        const cGrad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
                        cGrad.addColorStop(0, '#2a0e36');
                        cGrad.addColorStop(0.4, '#7c4dff');
                        cGrad.addColorStop(0.6, '#e0ccff');
                        cGrad.addColorStop(1, '#2a0e36');
                        ctx.fillStyle = cGrad;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = COLORS.primary;
                        ctx.beginPath();
                        ctx.moveTo(-w/2, 0); ctx.lineTo(0, -h); ctx.lineTo(w/2, 0); ctx.fill();
                    }
                    ctx.restore();
                } else {
                    const stalkGrad = ctx.createLinearGradient(-2, 0, 2, 0);
                    stalkGrad.addColorStop(0, '#000');
                    stalkGrad.addColorStop(1, '#333');
                    ctx.fillStyle = stalkGrad;
                    ctx.fillRect(-1.5, 0, 3, -el.size);
                    ctx.save();
                    ctx.translate(0, -el.size);
                    for(let i=0; i<3; i++) {
                        const r = (el.size * 0.5) * (1 - i*0.2);
                        const op = 0.2 + (i*0.3);
                        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                        g.addColorStop(0, '#fff');
                        g.addColorStop(0.5, COLORS.secondary);
                        g.addColorStop(1, 'transparent');
                        ctx.fillStyle = g;
                        ctx.globalAlpha = op * pulse;
                        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
                    }
                    ctx.restore();
                }
            } else {
                if (el.variant === 0) {
                    const w = el.size * 0.6;
                    const h = el.size * 2.5;
                    const mGrad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
                    mGrad.addColorStop(0, '#101015'); mGrad.addColorStop(0.1, '#485460'); 
                    mGrad.addColorStop(0.5, '#1e272e'); mGrad.addColorStop(0.9, '#485460'); 
                    mGrad.addColorStop(1, '#101015');
                    ctx.fillStyle = mGrad;
                    ctx.fillRect(-w/2, 0, w, -h);
                    ctx.fillStyle = COLORS.primary;
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = COLORS.primary;
                    ctx.globalAlpha = 0.2 + Math.sin(time*1.5 + el.seed)*0.3;
                    const rows = 8;
                    for(let r=1; r<rows; r++) {
                        ctx.fillRect(-w/4, -r*(h/rows), w/2, 1);
                    }
                    ctx.globalAlpha = 1.0;
                } else if (el.variant === 1) {
                    const w = el.size * 1.1;
                    const h = el.size * 1.4;
                    ctx.fillStyle = '#1a1a2e';
                    ctx.fillRect(-w/2, 0, w, -h);
                    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-w/2, 0, w, -h);
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
                    ctx.strokeStyle = COLORS.primary;
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath(); ctx.moveTo(-w/2, -h); ctx.lineTo(w/2, -h); ctx.stroke();
                } else {
                    ctx.strokeStyle = '#2d3436';
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -el.size*2.2); ctx.stroke();
                    const beaconY = -el.size*2.2;
                    const sweep = (time * 10 + el.seed) % (Math.PI*2);
                    const bx = Math.cos(sweep) * 8;
                    const bGrad = ctx.createRadialGradient(bx, beaconY, 0, bx, beaconY, 15);
                    bGrad.addColorStop(0, COLORS.error);
                    bGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = bGrad;
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath(); ctx.arc(bx, beaconY, 15, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.globalAlpha = 1.0;
                    ctx.beginPath(); ctx.arc(bx, beaconY, 2, 0, Math.PI*2); ctx.fill();
                }
            }
            ctx.restore();
        });
    }

    drawCastle(ctx, x, y) {
        const time = performance.now() * 0.001;
        const hpPct = this.state.castleHealth / this.state.castleMaxHealth;
        const isCritical = hpPct < 0.3;
        
        ctx.save();
        ctx.translate(x, y);
        
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.ellipse(0, 25, 70, 30, 0, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#263238'; 
        ctx.beginPath();
        for(let i=0; i<8; i++) {
            const ang = (i/8)*Math.PI*2 - Math.PI/8;
            const r = 55;
            ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r*0.6 + 10);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#546e7a'; ctx.lineWidth = 2; ctx.stroke();

        const wallGrad = ctx.createLinearGradient(-40, -50, 40, 50);
        wallGrad.addColorStop(0, '#37474f');
        wallGrad.addColorStop(0.5, '#455a64');
        wallGrad.addColorStop(1, '#263238');
        ctx.fillStyle = wallGrad;
        
        ctx.beginPath();
        ctx.moveTo(-45, 10);
        ctx.lineTo(-30, -50); 
        ctx.lineTo(30, -50);  
        ctx.lineTo(45, 10);   
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 10); ctx.lineTo(0, -50); 
        ctx.moveTo(-25, 10); ctx.lineTo(-15, -50);
        ctx.moveTo(25, 10); ctx.lineTo(15, -50);
        ctx.stroke();

        ctx.fillStyle = '#cfd8dc';
        ctx.fillRect(-15, -80, 30, 30);
        
        ctx.save();
        ctx.translate(0, -85);
        ctx.rotate(time * 1.5);
        ctx.fillStyle = '#90a4ae';
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = isCritical ? COLORS.error : COLORS.primary;
        ctx.beginPath(); ctx.arc(0, -2, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        ctx.fillStyle = isCritical ? `rgba(255, 0, 0, ${0.5 + Math.sin(time*10)*0.5})` : '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(-10, -75, 20, 4);
        ctx.fillRect(-10, -65, 20, 4);
        ctx.shadowBlur = 0;

        [-35, 35].forEach(tx => {
            ctx.save();
            ctx.translate(tx, -15);
            ctx.fillStyle = '#546e7a';
            ctx.beginPath(); ctx.arc(0,0, 8, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, -12); ctx.stroke();
            ctx.restore();
        });

        if (this.state.castleHealth > 0) {
            ctx.save();
            const shieldOp = 0.1 + (hpPct * 0.2);
            const shieldCol = hpPct > 0.3 ? `rgba(0, 229, 255, ${shieldOp})` : `rgba(255, 50, 50, ${shieldOp})`;
            ctx.setLineDash([5, 15]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = shieldCol;
            ctx.save();
            ctx.scale(1, 0.8);
            ctx.rotate(time * 0.2);
            ctx.beginPath(); ctx.arc(0, -30, 80, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
            const sGrad = ctx.createRadialGradient(0, -30, 40, 0, -30, 90);
            sGrad.addColorStop(0, 'transparent');
            sGrad.addColorStop(1, shieldCol);
            ctx.fillStyle = sGrad;
            ctx.beginPath(); ctx.ellipse(0, -30, 85, 70, 0, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        const barW = 90;
        const barY = -110;
        ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
        ctx.fillRect(-barW/2, barY, barW, 6);
        const segs = 15;
        const segW = (barW - (segs)) / segs;
        for(let i=0; i<segs; i++) {
            if ((i/segs) < hpPct) {
                ctx.fillStyle = hpPct > 0.5 ? '#00e676' : (hpPct > 0.2 ? '#ffea00' : '#ff1744');
                ctx.fillRect(-barW/2 + i*(segW+1) + 1, barY+1, segW, 4);
            }
        }
        ctx.restore();
    }

    checkCastleClick(lx, ly) {
        if (this.pathPoints.length === 0) return false;
        const endP = this.pathPoints[this.pathPoints.length - 1];
        return Math.hypot(lx - endP.x, ly - endP.y) < 70;
    }

    repairCastle() {
        const missing = this.state.castleMaxHealth - this.state.castleHealth;
        if (missing <= 0 || this.state.gold < 10) return false;
        const affordableRepair = this.state.gold * 2;
        const repairAmount = Math.min(missing, affordableRepair, 500); 
        const cost = Math.ceil(repairAmount / 2);
        this.state.gold -= cost;
        this.state.castleHealth += repairAmount;
        const endP = this.pathPoints[this.pathPoints.length - 1];
        this.createFloatingText(endP.x, endP.y - 50, `REPAIRED +${repairAmount}`, COLORS.success, 18);
        this.onStateUpdate({...this.state});
        return true;
    }

    createFloatingText(x, y, text, color, size) {
        this.floatingTexts.push(new FloatingText(x, y, text, color, size || 16));
    }

    togglePause() {
        this.paused = !this.paused;
        return this.paused;
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        
        const scaleX = this.width / this.logicalWidth;
        const scaleY = this.height / this.logicalHeight;
        this.gameScale = Math.min(scaleX, scaleY);
        
        this.offsetX = (this.width - this.logicalWidth * this.gameScale) / 2;
        this.offsetY = (this.height - this.logicalHeight * this.gameScale) / 2;

        this.pathPoints = this.level.path.map(p => ({ x: p.x * this.logicalWidth, y: p.y * this.logicalHeight }));
    }

    screenToLogical(sx, sy) {
        const rect = this.canvas.getBoundingClientRect();
        const px = (sx - rect.left);
        const py = (sy - rect.top);
        return {
            x: (px - this.offsetX) / this.gameScale,
            y: (py - this.offsetY) / this.gameScale
        };
    }

    start() {
        this.isRunning = true;
        this.startWave();
        this.loop(0);
    }

    startWave() {
        this.toSpawn = 5 + (this.state.wave * 3);
        this.spawnTimer = 0;
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        const dt = this.paused ? 0 : Math.min((timestamp - this.lastTime), 100);
        this.lastTime = timestamp;

        if (!this.paused) this.update(dt);
        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        if (dt === 0) return;
        if (this.shakeTimer > 0) this.shakeTimer -= dt;
        this.state.mana = Math.min(100, this.state.mana + dt * 0.0004);
        if (Math.random() < 0.05) this.onStateUpdate({...this.state});

        if (this.toSpawn > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.toSpawn--;
                this.spawnTimer = 1000 - (this.state.wave * 30);
            }
        } else if (this.enemies.length === 0) {
            if (this.state.wave < this.level.waves) {
                this.state.wave++;
                this.startWave();
            } else {
                this.isRunning = false;
                this.onLevelComplete();
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt, this.pathPoints, this.enemies);
            if (e.reached) {
                const damage = e.isBoss ? 200 : 50;
                this.state.castleHealth -= damage;
                this.createFloatingText(e.x, e.y, `-${damage}`, "#FF0000", 20);
                this.enemies.splice(i, 1);
                this.onStateUpdate({...this.state});
                if (this.state.castleHealth <= 0) {
                    this.state.castleHealth = 0;
                    this.onGameOver(false);
                    this.isRunning = false;
                }
            } else if (e.hp <= 0) {
                this.state.gold += e.reward;
                this.createExplosion(e.x, e.y, e.color);
                this.createFloatingText(e.x, e.y, `+${Math.floor(e.reward)}`, "#FFD700", 14);
                this.enemies.splice(i, 1);
                this.onStateUpdate({...this.state});
            }
        }

        this.towers.forEach(t => t.update(dt, this.enemies, this.projectiles, this.createFloatingText.bind(this)));

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (p.update(dt, this.enemies, this.createFloatingText.bind(this))) {
                this.projectiles.splice(i, 1);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].update(dt)) this.particles.splice(i, 1);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            if (this.floatingTexts[i].update(dt)) this.floatingTexts.splice(i, 1);
        }
    }

    draw() {
        const time = performance.now() * 0.001;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = COLORS.bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate and apply screen shake
        let shakeX = 0, shakeY = 0;
        if (this.shakeTimer > 0) {
            shakeX = (Math.random() - 0.5) * 20; // 20px intensity
            shakeY = (Math.random() - 0.5) * 20;
        }

        this.ctx.translate((this.offsetX + shakeX) * this.dpr, (this.offsetY + shakeY) * this.dpr);
        this.ctx.scale(this.gameScale * this.dpr, this.gameScale * this.dpr);

        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
        bgGrad.addColorStop(0, '#020205');
        bgGrad.addColorStop(1, '#0a0a1a');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(188, 19, 254, 0.15)';
        this.ctx.lineWidth = 1;
        const gridSize = 60;
        const offX = (time * 10) % gridSize;
        const offY = (time * 10) % gridSize;
        this.ctx.beginPath();
        for (let x = -gridSize; x < this.logicalWidth + gridSize; x += gridSize) {
            this.ctx.moveTo(x + offX, 0); this.ctx.lineTo(x + offX, this.logicalHeight);
        }
        for (let y = -gridSize; y < this.logicalHeight + gridSize; y += gridSize) {
            this.ctx.moveTo(0, y + offY); this.ctx.lineTo(this.logicalWidth, y + offY);
        }
        this.ctx.stroke();

        const bloomGrad = this.ctx.createRadialGradient(this.logicalWidth/2, this.logicalHeight/2, 100, this.logicalWidth/2, this.logicalHeight/2, this.logicalWidth);
        bloomGrad.addColorStop(0, 'rgba(0, 243, 255, 0.08)');
        bloomGrad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = bloomGrad;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        this.ctx.restore();

        this.drawBackgroundElements(this.ctx);

        if (this.pathPoints.length > 0) {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = COLORS.secondary;
            this.ctx.strokeStyle = 'rgba(188, 19, 254, 0.4)';
            this.ctx.lineWidth = 50;
            this.ctx.beginPath();
            this.ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
            this.pathPoints.forEach(p => this.ctx.lineTo(p.x, p.y));
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = 'rgba(10, 10, 20, 0.9)';
            this.ctx.lineWidth = 40;
            this.ctx.stroke();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = COLORS.primary;
            this.ctx.stroke();
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time * 5) * 0.3})`;
            this.ctx.setLineDash([10, 40]);
            this.ctx.lineDashOffset = -time * 100;
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        if (this.pathPoints.length > 0) {
            const endP = this.pathPoints[this.pathPoints.length - 1];
            this.drawCastle(this.ctx, endP.x, endP.y);
        }

        const renderList = [
            ...this.towers.map(t => ({type: 'tower', y: t.y, obj: t})),
            ...this.enemies.map(e => ({type: 'enemy', y: e.y, obj: e})),
            ...this.projectiles.map(p => ({type: 'projectile', y: p.y, obj: p})),
            ...this.particles.map(p => ({type: 'particle', y: p.y, obj: p})),
            ...this.floatingTexts.map(f => ({type: 'text', y: f.y, obj: f}))
        ];
        renderList.sort((a, b) => a.y - b.y);
        renderList.forEach(item => item.obj.draw(this.ctx));

        if (this.selectedTower) {
            this.selectedTower.drawRange(this.ctx);
        }
    }

    spawnEnemy() {
        const wave = this.state.wave;
        const sectorBonus = this.level.difficultyScale;
        const exponentialMultiplier = Math.pow(1.1, wave) * sectorBonus;
        const isBoss = wave % 5 === 0 && this.toSpawn === 1;
        const baseReward = isBoss ? 75 : 15;
        const sectorProgressionBonus = 1 + (this.levelIdx * 0.1);
        const reward = Math.floor(baseReward * Math.pow(1.15, wave) * sectorProgressionBonus);

        const hp = isBoss 
            ? (1000 + (wave * 200)) * exponentialMultiplier 
            : (50 + (wave * 20)) * exponentialMultiplier;
        
        const speed = isBoss 
            ? 0.05 + (wave * 0.03) + (this.levelIdx * 0.2)
            : 0.15 + (wave * 0.06) + (this.levelIdx * 0.4);

        this.enemies.push(new Enemy(
            hp, speed, isBoss ? COLORS.warning : COLORS.error,
            (isBoss ? 20 : 10), reward, isBoss
        ));
    }

    createExplosion(x, y, color) {
        for(let i=0; i<8; i++) {
            this.particles.push(new Particle(x, y, color, 3));
        }
    }

    placeTower(lx, ly, type) {
        const isOnRoad = this.pathPoints.some((p, i) => {
            if (i === 0) return false;
            const p1 = this.pathPoints[i-1]; const p2 = p;
            const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
            const t = Math.max(0, Math.min(1, ((lx - p1.x) * (p2.x - p1.x) + (ly - p1.y) * (p2.y - p1.y)) / l2));
            const projection = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
            const dist = Math.sqrt(Math.pow(lx - projection.x, 2) + Math.pow(ly - projection.y, 2));
            return dist < 35; // Threshold in logical pixels
        });

        if (isOnRoad) return false;

        // Check for overlap with existing towers
        const overlap = this.towers.some(t => Math.hypot(t.x - lx, t.y - ly) < 50);
        if (overlap) return false;

        if (this.state.gold >= type.cost) {
            this.state.gold -= type.cost;
            this.towers.push(new Tower(lx, ly, type, this.levelIdx));
            this.onStateUpdate({...this.state});
            this.createExplosion(lx, ly, COLORS.primary);
            return true;
        }
        return false;
    }

    findTowerAt(lx, ly) {
        return this.towers.find(t => Math.hypot(t.x - lx, t.y - ly) < 30);
    }

    sellTower(tower) {
        const index = this.towers.indexOf(tower);
        if (index > -1) {
            const refund = Math.floor(tower.type.cost * 0.5);
            this.state.gold += refund;
            this.towers.splice(index, 1);
            this.onStateUpdate({...this.state});
            return true;
        }
        return false;
    }

    castMeteor() {
        if (this.state.mana >= 50) {
            this.state.mana -= 50;
            
            // Dramatic impact on every enemy
            this.enemies.forEach(e => { 
                e.hp -= 500;
                // Large explosion for each enemy
                for(let i=0; i<30; i++) {
                    const p = new Particle(e.x, e.y, COLORS.error, 4 + Math.random() * 4);
                    p.vx *= 12; // Even faster
                    p.vy *= 12;
                    this.particles.push(p);
                }

                // Vertical strike "line"
                for(let i=0; i<15; i++) {
                    const p = new Particle(e.x, e.y - (i * 30), COLORS.primary, 4);
                    p.vx = 0; p.vy = 12; // Falling down fast
                    this.particles.push(p);
                }
            });

            // Shockwave particles (more dense)
            for(let i=0; i<200; i++) {
                const rx = Math.random() * this.logicalWidth;
                const ry = Math.random() * this.logicalHeight;
                const p = new Particle(rx, ry, COLORS.warning, 2);
                p.life = 0.5;
                p.vx = (Math.random() - 0.5) * 5;
                p.vy = (Math.random() - 0.5) * 5;
                this.particles.push(p);
            }

            this.shakeTimer = 800; // 800ms shake duration
            this.onStateUpdate({...this.state});
        }
    }
}
