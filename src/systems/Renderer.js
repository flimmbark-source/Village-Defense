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

    isRectVisible(bounds, x, y, width, height) {
        if (!bounds) return true;
        return x + width >= bounds.left &&
               x <= bounds.right &&
               y + height >= bounds.top &&
               y <= bounds.bottom;
    }

    isCircleVisible(bounds, x, y, radius) {
        if (!bounds) return true;
        return x + radius >= bounds.left &&
               x - radius <= bounds.right &&
               y + radius >= bounds.top &&
               y - radius <= bounds.bottom;
    }

    isPointVisible(bounds, x, y, margin = 0) {
        if (!bounds) return true;
        return x >= bounds.left - margin &&
               x <= bounds.right + margin &&
               y >= bounds.top - margin &&
               y <= bounds.bottom + margin;
    }

    attackIsVisible(attack, viewBounds) {
        if (!viewBounds) return true;
        const pattern = attack.weapon.attackPattern;
        const range = attack.weapon.range || 0;

        if (pattern === 'lightning' && attack.chains && attack.chains.length > 0) {
            return attack.chains.some(chain =>
                this.isPointVisible(viewBounds, chain.startX, chain.startY, range) ||
                this.isPointVisible(viewBounds, chain.endX, chain.endY, range)
            );
        }

        if (pattern === 'whip' && attack.segments && attack.segments.length > 0) {
            const tip = attack.segments[attack.segments.length - 1];
            return this.isPointVisible(viewBounds, tip.x, tip.y, range);
        }

        const x = (pattern === 'projectile' || pattern === 'pierce' || pattern === 'homing' || pattern === 'boomerang')
            ? attack.x
            : attack.startX;
        const y = (pattern === 'projectile' || pattern === 'pierce' || pattern === 'homing' || pattern === 'boomerang')
            ? attack.y
            : attack.startY;

        return this.isPointVisible(viewBounds, x, y, range);
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
        // Reset any context state that might persist
        this.ctx.globalAlpha = 1;
        this.ctx.filter = 'none';
        this.ctx.globalCompositeOperation = 'source-over';
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
    drawGround(viewBounds = null) {
        this.ctx.fillStyle = COLORS.GROUND;
        if (!viewBounds) {
            this.ctx.fillRect(0, 0, CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT);
            return;
        }
        const width = viewBounds.right - viewBounds.left;
        const height = viewBounds.bottom - viewBounds.top;
        this.ctx.fillRect(viewBounds.left, viewBounds.top, width, height);
    }

    /**
     * Draw forests
     * @param {Array} forests - Forest areas
     */
    drawForests(forests, viewBounds = null) {
        forests.forEach(f => {
            if (!this.isRectVisible(viewBounds, f.x, f.y, f.width, f.height)) {
                return;
            }
            this.ctx.fillStyle = f.color;
            this.ctx.fillRect(f.x, f.y, f.width, f.height);
        });
    }

    /**
     * Draw the castle
     * @param {Object} castle - Castle object
     * @param {Object} viewBounds - View bounds for culling
     */
    drawCastle(castle, viewBounds = null) {
        if (!castle) return;
        if (viewBounds && !this.isRectVisible(viewBounds, castle.x, castle.y, castle.width, castle.height)) {
            return;
        }
        // Castle body
        this.ctx.fillStyle = CONFIG.CASTLE.COLOR;
        this.ctx.fillRect(castle.x, castle.y, castle.width, castle.height);

        // Border
        this.ctx.strokeStyle = CONFIG.CASTLE.BORDER_COLOR;
        this.ctx.lineWidth = 8;
        this.ctx.strokeRect(castle.x, castle.y, castle.width, castle.height);

        // Spawn progress bar (above castle)
        const barWidth = castle.width;
        const barHeight = 6;
        const spawnBarY = castle.y - 18;
        const spawnProgress = castle.getSpawnProgress();

        this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
        this.ctx.fillRect(castle.x, spawnBarY, barWidth, barHeight);
        this.ctx.fillStyle = COLORS.SPAWN_BAR;
        this.ctx.fillRect(castle.x, spawnBarY, barWidth * spawnProgress, barHeight);

        // Castle HP bar (below castle)
        const hpBarY = castle.y + castle.height + 12;
        const hpPercent = castle.getHPPercent();
        this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
        this.ctx.fillRect(castle.x, hpBarY, barWidth, barHeight);
        this.ctx.fillStyle = COLORS.SPAWN_BAR;
        this.ctx.fillRect(castle.x, hpBarY, barWidth * hpPercent, barHeight);
    }

    /**
     * Draw villages
     * @param {Array} villages - Village entities
     */
    drawVillages(villages, viewBounds = null) {
        villages.forEach(v => {
            if (!this.isCircleVisible(viewBounds, v.x, v.y, 120)) {
                return;
            }
            // Ground
            this.ctx.fillStyle = COLORS.VILLAGE_GROUND;
            this.ctx.beginPath();
            this.ctx.arc(v.x, v.y, 100, 0, Math.PI * 2);
            this.ctx.fill();

            // Huts with health bars
            v.huts.forEach(h => {
                if (h.isDead()) {
                    // Draw destroyed hut (rubble)
                    this.ctx.fillStyle = '#4a3020';
                    this.ctx.fillRect(h.x + 5, h.y + 10, h.width - 10, h.height - 10);
                    this.ctx.fillStyle = '#2a1a10';
                    this.ctx.fillRect(h.x + 10, h.y + 15, 15, 10);
                    this.ctx.fillRect(h.x + h.width - 25, h.y + 20, 10, 8);
                } else {
                    // Draw hut
                    this.ctx.fillStyle = COLORS.HUT;
                    this.ctx.fillRect(h.x, h.y, h.width, h.height);

                    // Draw roof
                    this.ctx.fillStyle = '#5a3420';
                    this.ctx.beginPath();
                    this.ctx.moveTo(h.x - 5, h.y);
                    this.ctx.lineTo(h.x + h.width / 2, h.y - 15);
                    this.ctx.lineTo(h.x + h.width + 5, h.y);
                    this.ctx.closePath();
                    this.ctx.fill();

                    // Health bar (only show if damaged)
                    if (h.hp < h.maxHp) {
                        const barWidth = h.width;
                        const barHeight = 5;
                        const barX = h.x;
                        const barY = h.y - 22;

                        this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
                        this.ctx.fillRect(barX, barY, barWidth, barHeight);

                        const hpPercent = h.hp / h.maxHp;
                        this.ctx.fillStyle = hpPercent > 0.5 ? '#4cd44c' : hpPercent > 0.25 ? '#d4a44c' : '#d44c4c';
                        this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
                    }
                }
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
    drawHero(hero, viewBounds = null) {
        if (!this.isRectVisible(viewBounds, hero.x, hero.y, hero.width, hero.height)) {
            return;
        }
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
    drawPickups(pickups, viewBounds = null) {
        const ctx = this.ctx;

        pickups.forEach(pickup => {
            if (!this.isCircleVisible(viewBounds, pickup.x, pickup.y, pickup.radius * 2)) {
                return;
            }
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
    drawScouts(scouts, viewBounds = null) {
        scouts.forEach(scout => {
            if (!this.isCircleVisible(viewBounds, scout.x, scout.y, scout.radius + 10)) {
                return;
            }
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

            // Attack windup indicator
            if (scout.attackPhase === 'WINDUP') {
                // Show a growing circle indicating attack is coming
                const windupProgress = scout.attackProgress;
                const indicatorRadius = scout.attackRange * windupProgress;

                this.ctx.beginPath();
                this.ctx.arc(scout.x, scout.y, indicatorRadius, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(255, 100, 100, ${0.5 * windupProgress})`;
                this.ctx.lineWidth = 3;
                this.ctx.stroke();

                // Direction indicator
                const dirX = scout.x + Math.cos(scout.attackAngle) * indicatorRadius;
                const dirY = scout.y + Math.sin(scout.attackAngle) * indicatorRadius;
                this.ctx.beginPath();
                this.ctx.moveTo(scout.x, scout.y);
                this.ctx.lineTo(dirX, dirY);
                this.ctx.strokeStyle = `rgba(255, 50, 50, ${windupProgress})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // Body
            this.ctx.beginPath();
            this.ctx.arc(scout.x, scout.y, scout.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = scout.color;
            this.ctx.fill();

            // Type indicator for special enemies
            if (scout.type === 'elite') {
                // Purple glow
                this.ctx.beginPath();
                this.ctx.arc(scout.x, scout.y, scout.radius + 4, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(153, 50, 204, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else if (scout.type === 'brute') {
                // Dark outline
                this.ctx.beginPath();
                this.ctx.arc(scout.x, scout.y, scout.radius + 3, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(74, 26, 26, 0.8)';
                this.ctx.lineWidth = 4;
                this.ctx.stroke();
            }

            // Health bar
            const barWidth = scout.radius * 2.5;
            this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
            this.ctx.fillRect(scout.x - barWidth / 2, scout.y - scout.radius - 10, barWidth, 5);
            this.ctx.fillStyle = COLORS.HEALTH_BAR_ENEMY;
            this.ctx.fillRect(scout.x - barWidth / 2, scout.y - scout.radius - 10, barWidth * (scout.hp / scout.maxHp), 5);
        });
    }

        /**
     * Draw militia/hero projectiles
     * @param {Array} projectiles - Projectile entities
     */
    drawProjectiles(projectiles) {
        const ctx = this.ctx;

        projectiles.forEach(projectile => {
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            ctx.fillStyle = projectile.color;
            ctx.fill();
        });
    }

    /**
     * Draw projectiles
     * @param {Array} projectiles - Projectile entities
     */
    drawProjectiles(projectiles, viewBounds = null) {
        const ctx = this.ctx;

        projectiles.forEach(projectile => {
            if (!this.isCircleVisible(viewBounds, projectile.x, projectile.y, projectile.radius * 2)) {
                return;
            }

            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            ctx.fillStyle = projectile.color;
            ctx.fill();
        });
    }

    /**
     * Draw enemy attack effects
     * @param {Array} enemyAttacks - Enemy attack visuals
     */
    drawEnemyAttacks(enemyAttacks, viewBounds = null) {
        const ctx = this.ctx;

        enemyAttacks.forEach(attack => {
            const progress = attack.timer / attack.duration;
            const alpha = 1 - progress;

            // Draw slash arc from enemy to target
            ctx.save();
            ctx.translate(attack.x, attack.y);
            ctx.rotate(attack.angle);

            // Slash effect
            const slashLength = attack.radius * (1 + progress * 0.5);
            const slashWidth = 20 * (1 - progress);

            ctx.beginPath();
            ctx.moveTo(0, -slashWidth / 2);
            ctx.lineTo(slashLength, 0);
            ctx.lineTo(0, slashWidth / 2);
            ctx.closePath();

            ctx.fillStyle = `rgba(255, 100, 100, ${alpha * 0.8})`;
            ctx.fill();

            // Bright edge
            ctx.beginPath();
            ctx.moveTo(slashLength * 0.3, 0);
            ctx.lineTo(slashLength, 0);
            ctx.strokeStyle = `rgba(255, 200, 200, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.restore();
        });
    }

    /**
     * Draw enemy projectiles (optimized - no gradients per frame)
     * @param {Array} enemyProjectiles - Enemy projectile entities
     */
    drawEnemyProjectiles(enemyProjectiles, viewBounds = null) {
        const ctx = this.ctx;

        for (let i = 0; i < enemyProjectiles.length; i++) {
            const proj = enemyProjectiles[i];

            if (!this.isCircleVisible(viewBounds, proj.x, proj.y, proj.radius * 2)) {
                continue;
            }

            // Simple trail using velocity (no gradients)
            const trailX = proj.x - proj.vx * 2;
            const trailY = proj.y - proj.vy * 2;

            ctx.beginPath();
            ctx.moveTo(trailX, trailY);
            ctx.lineTo(proj.x, proj.y);
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = proj.radius;
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Outer glow (simple circle, no gradient)
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius * 1.3, 0, Math.PI * 2);
            ctx.fillStyle = proj.color;
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;

            // Main projectile body
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            ctx.fillStyle = proj.color;
            ctx.fill();

            // Inner bright core
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Draw militia projectiles
     * @param {Array} projectiles - Projectile entities
     */
    drawProjectiles(projectiles) {
        const ctx = this.ctx;

        projectiles.forEach(proj => {
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#90EE90';
            ctx.fill();

            // Trail
            ctx.beginPath();
            ctx.moveTo(proj.x, proj.y);
            ctx.lineTo(proj.x - proj.vx * 3, proj.y - proj.vy * 3);
            ctx.strokeStyle = 'rgba(144, 238, 144, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();
        });
    }

    /**
     * Draw attacks
     * @param {Array} attacks - Attack instances
     */
    drawAttacks(attacks, viewBounds = null) {
        const ctx = this.ctx;

        attacks.forEach(attack => {
            if (!this.attackIsVisible(attack, viewBounds)) {
                return;
            }
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
    drawParticles(particles, viewBounds = null) {
        const ctx = this.ctx;

        particles.forEach(p => {
            if (!this.isPointVisible(viewBounds, p.x, p.y, p.currentSize || 0)) {
                return;
            }
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
    drawFloatingTexts(texts, viewBounds = null) {
        const ctx = this.ctx;

        texts.forEach(t => {
            if (!this.isPointVisible(viewBounds, t.x, t.y, 20)) {
                return;
            }
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
     * @param {Object} castle - Castle entity
     * @param {Array} villages - Village entities
     * @param {number} gameTime - Current game time
     */
    drawHUD(hero, levelUpSystem, castle, villages, gameTime) {
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

        // Hero health bar (below XP bar)
        const healthBarWidth = xpBarWidth / 2;
        const healthBarHeight = xpBarHeight;
        const healthBarX = (this.canvas.width - healthBarWidth) / 2;
        const healthBarY = xpBarY + xpBarHeight + 10;
        const healthProgress = hero.maxHp > 0 ? hero.hp / hero.maxHp : 0;

        ctx.fillStyle = COLORS.XP_BAR_BG;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = COLORS.HEALTH_BAR_HERO;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthProgress, healthBarHeight);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        // Level text
        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${levelUpSystem.level}`, this.canvas.width / 2, healthBarY + healthBarHeight + 16);

        // Villagers status (top left, below castle)
        if (villages) {
            const villagesAlive = villages.filter(v => !v.isDestroyed()).length;
            const totalHuts = villages.reduce((sum, v) => sum + v.getRemainingHuts(), 0);

            ctx.font = 'bold 12px Inter';
            ctx.fillStyle = villagesAlive > 0 ? '#4cd44c' : '#d44c4c';
            ctx.textAlign = 'left';
            const statusX = padding;
            const statusY = padding + 22;
            const lineHeight = 16;
            ctx.fillText(`Villagers: ${villagesAlive}/${villages.length}`, statusX, statusY);
            ctx.fillText(`Buildings: ${totalHuts}`, statusX, statusY + lineHeight);
        }

        // Game time (top right)
        if (gameTime !== undefined) {
            const minutes = Math.floor(gameTime / 60);
            const seconds = Math.floor(gameTime % 60);
            const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            ctx.font = 'bold 16px Inter';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.fillText(timeStr, this.canvas.width - padding, padding + 16);
        }

        // Weapon inventory (bottom center)
        const iconSize = 40;
        const iconPadding = 8;
        const slotCount = CONFIG.INVENTORY_SIZE;
        const totalWidth = iconSize * slotCount + iconPadding * (slotCount - 1);
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = this.canvas.height - padding - iconSize;

        for (let i = 0; i < slotCount; i++) {
            const x = startX + i * (iconSize + iconPadding);
            const y = startY;
            const weapon = hero.weapons[i];

            // Background
            ctx.fillStyle = weapon ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(x, y, iconSize, iconSize);

            // Border
            ctx.strokeStyle = '#5a3d2b';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, iconSize, iconSize);

            if (weapon) {
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
            }
        }

        // Controls hint (bottom left)
        ctx.font = '12px Inter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'left';
        ctx.fillText('Click to move | WASD to move | Scroll to zoom | Destroy the castle to win!', padding, this.canvas.height - padding);
    }
}
