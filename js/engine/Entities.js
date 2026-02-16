import { shadeColor } from '../utils.js';

export class Enemy {
    constructor(hp, speed, color, radius, reward, isBoss = false) {
        this.hp = hp; this.maxHp = hp;
        this.speed = speed; this.baseSpeed = speed;
        this.color = color; this.radius = radius;
        this.reward = reward;
        this.isBoss = isBoss;
        this.progress = 0;
        this.reached = false;
        this.x = 0; this.y = 0;
        this.offX = 0; this.offY = 0; 
        this.slowTimer = 0;
        this.pulse = 0;
    }
    update(dt, path, allEnemies) {
        this.pulse += dt * 0.005;
        this.speed = (this.slowTimer > 0) ? this.baseSpeed * 0.5 : this.baseSpeed;
        if (this.slowTimer > 0) this.slowTimer -= dt;

        let targetOffX = 0, targetOffY = 0;
        const minDist = (this.radius * 2.5);
        const minDistSq = minDist * minDist;

        for (let i = 0; i < allEnemies.length; i++) {
            const other = allEnemies[i];
            if (other === this) continue;
            const dx = this.x - other.x; const dy = this.y - other.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const force = Math.pow((minDist - dist) / minDist, 2);
                targetOffX += (dx / dist) * force * 30;
                targetOffY += (dy / dist) * force * 30;
            }
        }
        this.offX += (targetOffX - this.offX) * 0.15;
        this.offY += (targetOffY - this.offY) * 0.15;

        this.progress += (this.speed * dt) / 10000;
        if (this.progress >= 1) { this.reached = true; return; }

        const totalSegments = path.length - 1;
        const segmentLen = 1 / totalSegments;
        const currentSegment = Math.floor(this.progress / segmentLen);
        const segmentProgress = (this.progress % segmentLen) / segmentLen;

        if (currentSegment < totalSegments) {
            const p1 = path[currentSegment]; const p2 = path[currentSegment + 1];
            this.x = p1.x + (p2.x - p1.x) * segmentProgress + this.offX;
            this.y = p1.y + (p2.y - p1.y) * segmentProgress + this.offY;
        }
    }
    draw(ctx) {
        const pulseScale = 1 + Math.sin(this.pulse * 5) * 0.05;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y + 10, this.radius * 0.8, this.radius * 0.4, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = shadeColor(this.color, -30);
        ctx.beginPath(); ctx.arc(this.x, this.y + 4, this.radius, 0, Math.PI, false);
        ctx.lineTo(this.x - this.radius, this.y); ctx.arc(this.x, this.y, this.radius, Math.PI, 0, false); ctx.fill();
        const grad = ctx.createRadialGradient(this.x - 5, this.y - 5, 2, this.x, this.y, this.radius);
        grad.addColorStop(0, '#fff'); grad.addColorStop(0.3, this.color); grad.addColorStop(1, shadeColor(this.color, -20));
        ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * pulseScale, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 0.6, -0.5, 1.0); ctx.stroke();
        ctx.restore();
        const hpPct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(this.x - 12, this.y - this.radius - 12, 24, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#00ff41' : (hpPct > 0.2 ? '#ff9100' : '#ff0044');
        ctx.fillRect(this.x - 12, this.y - this.radius - 12, 24 * hpPct, 4);
    }
}

export class FloatingText {
    constructor(x, y, text, color, size = 16) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.size = size; this.life = 1.0; this.vy = -0.05 * (size / 16);
    }
    update(dt) {
        this.y += this.vy * dt; this.life -= dt * 0.0015; return this.life <= 0;
    }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px Rajdhani`; ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y); ctx.restore();
    }
}

export class Tower {
    constructor(x, y, type, levelIdx) {
        this.x = x; this.y = y;
        this.type = type; this.levelIdx = levelIdx;
        this.cooldownTimer = 0; this.angle = 0;
        this.baseRotation = Math.random() * Math.PI; this.recoil = 0;
        const damageMult = 1 + (levelIdx * 0.15);
        this.damage = type.damage * damageMult;
    }
    drawRange(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.type.range, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 243, 255, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.restore();
    }
    update(dt, enemies, projectiles, createText) {
        this.baseRotation += dt * 0.001; this.cooldownTimer -= dt;
        this.recoil = Math.max(0, this.recoil - dt * 5);
        if (this.cooldownTimer <= 0) {
            const rangeSq = this.type.range * this.type.range;
            const target = enemies.find(e => {
                const dx = e.x - this.x; const dy = e.y - this.y;
                return (dx * dx + dy * dy) <= rangeSq;
            });
            if (target) {
                this.angle = Math.atan2(target.y - this.y, target.x - this.x);
                this.recoil = (this.type.id === 'SNIPER' || this.type.id === 'CANNON') ? 10 : 4;
                if (this.type.id === 'FROST') {
                    target.hp -= this.damage; target.slowTimer = 2000;
                    projectiles.push(new Projectile(this.x, this.y, target, this.type, true, this.damage, false));
                } else if (this.type.id === 'TESLA' || this.type.id === 'LASER') {
                    target.hp -= this.damage;
                    projectiles.push(new Projectile(this.x, this.y, target, this.type, true, this.damage, false));
                } else {
                    let finalDamage = this.damage; let isCrit = false;
                    if (this.type.critChance && Math.random() < this.type.critChance) { finalDamage *= 3; isCrit = true; }
                    const barrelLen = 22;
                    const px = this.x + Math.cos(this.angle) * barrelLen;
                    const py = this.y + Math.sin(this.angle) * barrelLen;
                    projectiles.push(new Projectile(px, py, target, this.type, false, finalDamage, isCrit));
                }
                this.cooldownTimer = this.type.cooldown;
            }
        }
    }
    draw(ctx) {
        const time = performance.now() * 0.001;
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.ellipse(0, 15, 25, 12, 0, 0, Math.PI*2); ctx.fill();
        ctx.rotate(this.baseRotation);
        const baseSize = 18;
        ctx.fillStyle = shadeColor(this.type.color, -50);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const px = Math.cos(ang) * baseSize; const py = Math.sin(ang) * baseSize;
            if (i === 0) ctx.moveTo(px, py + 8); else ctx.lineTo(px, py + 8);
        }
        ctx.closePath(); ctx.fill();
        const baseGrad = ctx.createLinearGradient(-baseSize, -baseSize, baseSize, baseSize);
        baseGrad.addColorStop(0, shadeColor(this.type.color, -20));
        baseGrad.addColorStop(0.5, shadeColor(this.type.color, 10));
        baseGrad.addColorStop(1, shadeColor(this.type.color, -30));
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const px = Math.cos(ang) * baseSize; const py = Math.sin(ang) * baseSize;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.rotate(-this.baseRotation); ctx.rotate(this.angle); ctx.translate(-this.recoil, 0);
        ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
        if (this.type.id === 'ARCHER' || this.type.id === 'SNIPER') {
            ctx.fillStyle = '#546e7a'; ctx.fillRect(0, -6, 28, 4); ctx.fillRect(0, 2, 28, 4);
            const pulse = 0.5 + Math.sin(time*10)*0.5; ctx.fillStyle = this.type.color;
            ctx.shadowBlur = 10 * pulse; ctx.shadowColor = this.type.color; ctx.fillRect(5, -2, 20, 4); 
        } else if (this.type.id === 'CANNON' || this.type.id === 'MORTAR') {
            const bGrad = ctx.createLinearGradient(0, -8, 0, 8);
            bGrad.addColorStop(0, '#263238'); bGrad.addColorStop(0.5, '#78909c'); bGrad.addColorStop(1, '#263238');
            ctx.fillStyle = bGrad; ctx.fillRect(0, -8, 24, 16);
            ctx.fillStyle = shadeColor(this.type.color, -20);
            ctx.beginPath(); ctx.moveTo(5, -12); ctx.lineTo(15, -8); ctx.lineTo(15, 8); ctx.lineTo(5, 12); ctx.fill();
        } else if (this.type.id === 'TESLA' || this.type.id === 'LASER') {
            const spin = time * 5; ctx.fillStyle = '#455a64'; ctx.fillRect(0, -4, 15, 8);
            ctx.save(); ctx.translate(12, 0); ctx.rotate(spin); ctx.fillStyle = this.type.color;
            ctx.shadowBlur = 15; ctx.shadowColor = this.type.color;
            for(let k=0; k<3; k++) { ctx.rotate(Math.PI*2/3); ctx.fillRect(4, -2, 8, 4); }
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0, 4, 0, Math.PI*2); ctx.fill(); ctx.restore();
        } else if (this.type.id === 'OMEGA') {
            ctx.translate(5, 0); ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI*2); ctx.stroke();
            ctx.save(); ctx.rotate(time); ctx.strokeStyle = this.type.color;
            ctx.beginPath(); ctx.ellipse(0, 0, 14, 14, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 20; ctx.shadowColor = this.type.color;
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillStyle = '#b0bec5'; ctx.fillRect(0, -5, 20, 10);
            ctx.fillStyle = this.type.color; ctx.fillRect(5, -2, 10, 4);
        }
        ctx.shadowBlur = 0; ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = this.type.color; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

export class Projectile {
    constructor(x, y, target, type, instant = false, damageOverride = null, isCrit = false) {
        this.x = x; this.y = y; this.target = target;
        this.type = type; this.instant = instant;
        this.damage = damageOverride || type.damage;
        this.isCrit = isCrit; this.life = instant ? 200 : 1000;
        this.speed = 0.6;
    }
    update(dt, allEnemies, createText) {
        this.life -= dt;
        if (this.instant) return this.life <= 0;
        const dx = this.target.x - this.x; const dy = this.target.y - this.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 144 || this.life <= 0) {
            this.hit(allEnemies, createText); return true;
        }
        const dist = Math.sqrt(distSq);
        this.x += (dx/dist) * this.speed * dt; this.y += (dy/dist) * this.speed * dt;
        return false;
    }
    hit(allEnemies, createText) {
        this.target.hp -= this.damage;
        if (this.isCrit) { createText(this.target.x, this.target.y - 20, "CRIT!!", "#FFD700", 24); }
        const radius = (this.type.splashRadius || (this.type.id === 'CANNON' ? 40 : 0));
        if (radius > 0) {
            const radiusSq = radius * radius;
            allEnemies.forEach(e => {
                if (e === this.target) return;
                const sdx = e.x - this.x; const sdy = e.y - this.y;
                if (sdx * sdx + sdy * sdy < radiusSq) { e.hp -= this.damage * 0.5; }
            });
        }
    }
    draw(ctx) {
        if (this.instant) {
            ctx.save(); ctx.strokeStyle = this.type.color; ctx.lineWidth = (this.isCrit ? 4 : 2);
            if (this.isCrit) { ctx.shadowBlur = 15; ctx.shadowColor = "#FFD700"; }
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.target.x, this.target.y); ctx.stroke(); ctx.restore();
        } else {
            ctx.save(); ctx.fillStyle = this.isCrit ? "#FFD700" : this.type.color;
            ctx.shadowBlur = (this.isCrit ? 10 : 5); ctx.shadowColor = this.isCrit ? "#FFD700" : this.type.color;
            ctx.beginPath(); ctx.arc(this.x, this.y, (this.isCrit ? 6 : 4), 0, Math.PI*2); ctx.fill(); ctx.restore();
        }
    }
}

export class Particle {
    constructor(x, y, color, size = 3) {
        this.x = x; this.y = y; this.color = color; this.size = size;
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        this.life = 1.0;
    }
    update(dt) {
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.vx *= 0.95; this.vy *= 0.95; // Friction
        this.life -= dt * 0.002; return this.life <= 0;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0;
    }
}
