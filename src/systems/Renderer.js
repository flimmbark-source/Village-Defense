/**
 * Grimm Dominion - Renderer System
 * Handles all drawing operations including attacks, pickups, and effects
 */

import { CONFIG, COLORS } from '../config.js';

export class Renderer {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
        this.time = 0;
    }

    /**
     * Update renderer time (for animations)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        this.time += deltaTime;
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Begin camera transform
     */
    beginCamera() {
        this.ctx.save();
        // Apply zoom scaling
        const scale = this.camera.zoom;
        this.ctx.scale(scale, scale);
        this.ctx.translate(-this.camera.x, -this.camera.y);
    }

    /**
     * End camera transform
     */
    endCamera() {
        this.ctx.restore();
    }

    /**
     * Draw the ground
     */
    drawGround() {
        this.ctx.fillStyle = COLORS.GROUND;
        this.ctx.fillRect(0, 0, CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT);
    }

    /**
     * Draw forests
     * @param {Array} forests - Forest areas
     */
    drawForests(forests) {
        forests.forEach(f => {
            this.ctx.fillStyle = f.color;
            this.ctx.fillRect(f.x, f.y, f.width, f.height);
        });
    }

    /**
     * Draw the castle
     * @param {Object} castle - Castle object
     * @param {number} spawnTimer - Current spawn timer
     */
    drawCastle(castle, spawnTimer) {
        // Castle body
        this.ctx.fillStyle = CONFIG.CASTLE.COLOR;
        this.ctx.fillRect(castle.x, castle.y, castle.width, castle.height);

        // Border
        this.ctx.strokeStyle = CONFIG.CASTLE.BORDER_COLOR;
        this.ctx.lineWidth = 8;
        this.ctx.strokeRect(castle.x, castle.y, castle.width, castle.height);

        // Label
        this.ctx.fillStyle = '#4a2a2a';
        this.ctx.font = '32px MedievalSharp';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Castle', castle.x + castle.width / 2, castle.y + castle.height / 2 + 10);

        // Spawn bar
        const spawnRatio = spawnTimer / CONFIG.DARK_LORD_SPAWN_COOLDOWN;
        this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
        this.ctx.fillRect(castle.x, castle.y - 20, castle.width, 10);
        this.ctx.fillStyle = COLORS.SPAWN_BAR;
        this.ctx.fillRect(castle.x, castle.y - 20, castle.width * spawnRatio, 10);
    }

    /**
     * Draw villages
     * @param {Array} villages - Village entities
     */
    drawVillages(villages) {
        villages.forEach(v => {
            // Ground
            this.ctx.fillStyle = COLORS.VILLAGE_GROUND;
            this.ctx.beginPath();
            this.ctx.arc(v.x, v.y, 100, 0, Math.PI * 2);
            this.ctx.fill();

            // Huts
            v.huts.forEach(h => {
                this.ctx.fillStyle = COLORS.HUT;
                this.ctx.fillRect(h.x, h.y, h.width, h.height);
            });

            // Villagers
            v.villagers.forEach(p => {
                this.ctx.fillStyle = COLORS.VILLAGER;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            });

            // Militia
            v.militia.forEach(m => {
                this.ctx.fillStyle = m.color;
                this.ctx.fillRect(m.x, m.y, m.width, m.height);
            });
        });
    }

    /**
     * Draw the hero
     * @param {Object} hero - Hero entity
     */
    drawHero(hero) {
        const ctx = this.ctx;
        const center = hero.getCenter();

        // Draw hero body
        ctx.fillStyle = hero.color;
        ctx.fillRect(hero.x, hero.y, hero.width, hero.height);

        // Draw pickup range indicator (subtle)
        ctx.beginPath();
        ctx.arc(center.x, center.y, hero.getPickupMagnetRange(), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(127, 255, 127, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    /**
     * Draw pickups
     * @param {Array} pickups - Pickup entities
     */
    drawPickups(pickups) {
        const ctx = this.ctx;

        pickups.forEach(pickup => {
            const alpha = pickup.getAlpha();

            // Glow
            ctx.beginPath();
            ctx.arc(pickup.x, pickup.y, pickup.radius * 1.5, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(
                pickup.x, pickup.y, 0,
                pickup.x, pickup.y, pickup.radius * 1.5
            );
            gradient.addColorStop(0, pickup.glowColor.replace(')', `, ${alpha * 0.5})`).replace('rgb', 'rgba'));
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();

            // Body
            ctx.beginPath();
            ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);
            ctx.fillStyle = pickup.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.globalAlpha = 1;

            // Shine
            ctx.beginPath();
            ctx.arc(pickup.x - pickup.radius * 0.3, pickup.y - pickup.radius * 0.3, pickup.radius * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.fill();
        });
    }

    /**
     * Draw scouts
     * @param {Array} scouts - Scout entities
     */
    drawScouts(scouts) {
        scouts.forEach(scout => {
            // Sight range (only when patrolling)
            if (scout.state === 'PATROLLING') {
                this.ctx.beginPath();
                this.ctx.arc(scout.x, scout.y, CONFIG.SCOUT.SIGHT_RANGE, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(scout.x, scout.y, CONFIG.SCOUT.CRITICAL_SIGHT_RANGE, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                this.ctx.fill();
            }

            // Body
            this.ctx.beginPath();
            this.ctx.arc(scout.x, scout.y, scout.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = scout.color;
            this.ctx.fill();

            // Health bar
            const barWidth = scout.radius * 2.5;
            this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
            this.ctx.fillRect(scout.x - barWidth / 2, scout.y - scout.radius - 10, barWidth, 5);
            this.ctx.fillStyle = COLORS.HEALTH_BAR_ENEMY;
            this.ctx.fillRect(scout.x - barWidth / 2, scout.y - scout.radius - 10, barWidth * (scout.hp / scout.maxHp), 5);
        });
    }

    /**
     * Draw attacks
     * @param {Array} attacks - Attack instances
     */
    drawAttacks(attacks) {
        const ctx = this.ctx;

        attacks.forEach(attack => {
            const pattern = attack.weapon.attackPattern;
            const effects = attack.weapon.effects;

            switch (pattern) {
                case 'slash':
                    this.drawSlashAttack(attack, effects);
                    break;
                case 'projectile':
                case 'pierce':
                    this.drawProjectileAttack(attack, effects);
                    break;
                case 'homing':
                    this.drawHomingAttack(attack, effects);
                    break;
                case 'nova':
                    this.drawNovaAttack(attack, effects);
                    break;
                case 'whip':
                    this.drawWhipAttack(attack, effects);
                    break;
                case 'lightning':
                    this.drawLightningAttack(attack, effects);
                    break;
                case 'boomerang':
                    this.drawBoomerangAttack(attack, effects);
                    break;
            }
        });
    }

    drawSlashAttack(attack, effects) {
        const ctx = this.ctx;
        const progress = attack.slashProgress;

        ctx.save();
        ctx.translate(attack.startX, attack.startY);

        // Draw arc
        const currentAngle = attack.startAngle + (attack.endAngle - attack.startAngle) * progress;
        const arcLength = 0.5; // Visible arc length

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, attack.weapon.range, currentAngle - arcLength, currentAngle);
        ctx.closePath();

        // Gradient fill
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, attack.weapon.range);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, effects.trailColor);
        gradient.addColorStop(1, effects.color);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }

    drawProjectileAttack(attack, effects) {
        const ctx = this.ctx;

        // Draw trail
        if (attack.trail && attack.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(attack.trail[0].x, attack.trail[0].y);
            for (let i = 1; i < attack.trail.length; i++) {
                ctx.lineTo(attack.trail[i].x, attack.trail[i].y);
            }
            ctx.strokeStyle = effects.trailColor || 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = effects.size * 0.6;
            ctx.stroke();
        }

        // Draw projectile
        ctx.save();
        ctx.translate(attack.x, attack.y);
        if (effects.rotation) {
            ctx.rotate(attack.rotation);
        }

        ctx.beginPath();
        if (effects.length) {
            // Elongated shard
            ctx.ellipse(0, 0, effects.size, effects.length / 2, attack.angle, 0, Math.PI * 2);
        } else {
            ctx.arc(0, 0, effects.size, 0, Math.PI * 2);
        }
        ctx.fillStyle = effects.color;
        ctx.fill();

        ctx.restore();
    }

    drawHomingAttack(attack, effects) {
        const ctx = this.ctx;
        const pulse = Math.sin(this.time * effects.pulseSpeed) * 0.3 + 0.7;

        // Draw trail
        if (attack.trail && attack.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(attack.trail[0].x, attack.trail[0].y);
            for (let i = 1; i < attack.trail.length; i++) {
                ctx.lineTo(attack.trail[i].x, attack.trail[i].y);
            }
            ctx.strokeStyle = effects.glowColor;
            ctx.lineWidth = effects.size * 0.4;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Glow
        ctx.beginPath();
        ctx.arc(attack.x, attack.y, effects.size * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = effects.glowColor;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Body
        ctx.beginPath();
        ctx.arc(attack.x, attack.y, effects.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = effects.color;
        ctx.fill();
    }

    drawNovaAttack(attack, effects) {
        const ctx = this.ctx;
        const alpha = 1 - attack.time / attack.duration;

        // Draw expanding ring
        ctx.beginPath();
        ctx.arc(attack.startX, attack.startY, attack.radius, 0, Math.PI * 2);
        ctx.strokeStyle = effects.color;
        ctx.lineWidth = 10;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Draw particles
        attack.particles.forEach(p => {
            const x = attack.startX + Math.cos(p.angle) * p.dist;
            const y = attack.startY + Math.sin(p.angle) * p.dist;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = effects.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }

    drawWhipAttack(attack, effects) {
        const ctx = this.ctx;

        if (attack.segments.length < 2) return;

        // Draw chain
        ctx.beginPath();
        ctx.moveTo(attack.startX, attack.startY);
        for (const seg of attack.segments) {
            ctx.lineTo(seg.x, seg.y);
        }
        ctx.strokeStyle = effects.color;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw tip
        const tip = attack.segments[attack.segments.length - 1];
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = effects.hitColor;
        ctx.fill();
    }

    drawLightningAttack(attack, effects) {
        const ctx = this.ctx;
        const alpha = 1 - attack.time / attack.duration;

        attack.chains.forEach(chain => {
            // Draw jagged line
            ctx.beginPath();
            ctx.moveTo(chain.startX, chain.startY);

            // Add some randomness for lightning effect
            const segments = 5;
            const dx = (chain.endX - chain.startX) / segments;
            const dy = (chain.endY - chain.startY) / segments;

            for (let i = 1; i < segments; i++) {
                const x = chain.startX + dx * i + (Math.random() - 0.5) * 20;
                const y = chain.startY + dy * i + (Math.random() - 0.5) * 20;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(chain.endX, chain.endY);

            // Glow
            ctx.strokeStyle = effects.glowColor;
            ctx.lineWidth = effects.thickness * 3;
            ctx.globalAlpha = alpha * 0.5;
            ctx.stroke();

            // Core
            ctx.strokeStyle = effects.color;
            ctx.lineWidth = effects.thickness;
            ctx.globalAlpha = alpha;
            ctx.stroke();
            ctx.globalAlpha = 1;
        });
    }

    drawBoomerangAttack(attack, effects) {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(attack.x, attack.y);
        ctx.rotate(attack.rotation);

        // Draw boomerang shape
        ctx.beginPath();
        ctx.moveTo(-effects.size, 0);
        ctx.quadraticCurveTo(0, -effects.size * 0.5, effects.size, 0);
        ctx.quadraticCurveTo(0, effects.size * 0.5, -effects.size, 0);
        ctx.fillStyle = effects.color;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Draw particles
     * @param {Array} particles - Particle array
     */
    drawParticles(particles) {
        const ctx = this.ctx;

        particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.alpha;

            ctx.beginPath();
            if (p.shape === 'square') {
                ctx.fillRect(-p.currentSize / 2, -p.currentSize / 2, p.currentSize, p.currentSize);
            } else {
                ctx.arc(0, 0, p.currentSize, 0, Math.PI * 2);
            }
            ctx.fillStyle = p.color;
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.restore();
        });
    }

    /**
     * Draw floating texts
     * @param {Array} texts - Floating text array
     */
    drawFloatingTexts(texts) {
        const ctx = this.ctx;

        texts.forEach(t => {
            ctx.font = t.font;
            ctx.fillStyle = t.color;
            ctx.globalAlpha = t.alpha;
            ctx.textAlign = 'center';
            ctx.fillText(t.text, t.x, t.y);
            ctx.globalAlpha = 1;
        });
    }

    /**
     * Draw village attack indicators (screen space)
     * @param {Array} villages - Village entities
     */
    drawAttackIndicators(villages) {
        villages.forEach(v => {
            if (!v.isUnderAttack) return;

            const screenPos = this.camera.worldToScreen(v.x, v.y);
            const remainingAttackers = v.attackers.size;

            // Help text
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 16px Inter';
            this.ctx.textAlign = 'center';
            if (remainingAttackers > 0) {
                this.ctx.fillText('Help Needed!', screenPos.x * this.camera.zoom, screenPos.y * this.camera.zoom - 50);
            }

            // Off-screen indicator
            if (!this.camera.isVisible(v.x, v.y)) {
                const scaledWidth = this.canvas.width / this.camera.zoom;
                const scaledHeight = this.canvas.height / this.camera.zoom;

                const angle = Math.atan2(
                    screenPos.y - scaledHeight / 2,
                    screenPos.x - scaledWidth / 2
                );
                const distFromCenter = Math.min(this.canvas.width / 2 - 30, this.canvas.height / 2 - 30);
                const indicatorX = this.canvas.width / 2 + distFromCenter * Math.cos(angle);
                const indicatorY = this.canvas.height / 2 + distFromCenter * Math.sin(angle);

                this.ctx.save();
                this.ctx.translate(indicatorX, indicatorY);
                this.ctx.rotate(angle + Math.PI / 2);
                this.ctx.font = '30px Inter';
                this.ctx.fillStyle = 'red';
                this.ctx.fillText('!', 0, 0);
                this.ctx.restore();
            }
        });
    }

    /**
     * Draw HUD elements (screen space)
     * @param {Object} hero - Hero entity
     * @param {Object} levelUpSystem - Level up system
     */
    drawHUD(hero, levelUpSystem) {
        const ctx = this.ctx;
        const padding = 20;

        // XP Bar at top
        const xpBarWidth = 400;
        const xpBarHeight = 12;
        const xpBarX = (this.canvas.width - xpBarWidth) / 2;
        const xpBarY = padding;

        // Background
        ctx.fillStyle = COLORS.XP_BAR_BG;
        ctx.fillRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);

        // Fill
        ctx.fillStyle = COLORS.XP_BAR_FILL;
        ctx.fillRect(xpBarX, xpBarY, xpBarWidth * levelUpSystem.getXPProgress(), xpBarHeight);

        // Border
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);

        // Level text
        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${levelUpSystem.level}`, this.canvas.width / 2, xpBarY + xpBarHeight + 16);

        // Weapon icons (bottom right)
        const iconSize = 40;
        const iconPadding = 8;
        const startX = this.canvas.width - padding - iconSize;
        const startY = this.canvas.height - padding - iconSize;

        hero.weapons.forEach((weapon, i) => {
            const x = startX - i * (iconSize + iconPadding);
            const y = startY;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y, iconSize, iconSize);

            // Border
            ctx.strokeStyle = '#5a3d2b';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, iconSize, iconSize);

            // Icon
            ctx.font = '24px serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(weapon.icon, x + iconSize / 2, y + iconSize / 2 + 8);

            // Level badge
            if (weapon.level > 1) {
                ctx.font = 'bold 10px Inter';
                ctx.fillStyle = '#ffd700';
                ctx.fillText(`+${weapon.level - 1}`, x + iconSize - 8, y + 12);
            }

            // Cooldown overlay
            if (weapon.cooldownTimer > 0) {
                const cooldownRatio = weapon.cooldownTimer / weapon.getCooldown();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(x, y + iconSize * (1 - cooldownRatio), iconSize, iconSize * cooldownRatio);
            }
        });
    }
}
