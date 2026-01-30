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
        this.pickupSpriteCache = new Map();
        this.fastForwardButtonBounds = null;
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

    toRGBA(color, alpha) {
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const bigint = parseInt(hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
        }
        if (color.startsWith('rgba(')) {
            return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, `rgba($1,$2,$3,${alpha})`);
        }
        return color;
    }

    getPickupSprite(pickup) {
        const key = `${pickup.type}-${pickup.radius}-${pickup.color}-${pickup.glowColor}`;
        if (this.pickupSpriteCache.has(key)) {
            return this.pickupSpriteCache.get(key);
        }

        const size = Math.ceil(pickup.radius * 4);
        const center = size / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const glowRadius = pickup.radius * 1.5;
        const gradient = ctx.createRadialGradient(center, center, 0, center, center, glowRadius);
        gradient.addColorStop(0, this.toRGBA(pickup.glowColor, 0.5));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pickup.color;
        ctx.beginPath();
        ctx.arc(center, center, pickup.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(center - pickup.radius * 0.3, center - pickup.radius * 0.3, pickup.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        this.pickupSpriteCache.set(key, canvas);
        return canvas;
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
        this.ctx.fillStyle = COLORS.HEALTH_BAR_HERO;
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

            // Arrow Towers
            v.arrowTowers.forEach(tower => {
                if (tower.isDead()) {
                    // Draw destroyed tower (rubble)
                    this.ctx.fillStyle = '#4a4a4a';
                    this.ctx.fillRect(tower.x + 5, tower.y + 10, tower.width - 10, tower.height - 10);
                } else {
                    // Draw tower base (stone)
                    this.ctx.fillStyle = '#6a6a6a';
                    this.ctx.fillRect(tower.x, tower.y + tower.height * 0.4, tower.width, tower.height * 0.6);

                    // Draw tower top (wooden platform)
                    this.ctx.fillStyle = '#8B4513';
                    this.ctx.fillRect(tower.x - 3, tower.y, tower.width + 6, tower.height * 0.4);

                    // Draw arrow slit
                    this.ctx.fillStyle = '#2a2a2a';
                    this.ctx.fillRect(tower.x + tower.width / 2 - 3, tower.y + tower.height * 0.5, 6, 8);

                    // Health bar (only show if damaged)
                    if (tower.hp < tower.maxHp) {
                        const barWidth = tower.width;
                        const barHeight = 4;
                        const barX = tower.x;
                        const barY = tower.y - 8;

                        this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
                        this.ctx.fillRect(barX, barY, barWidth, barHeight);

                        const hpPercent = tower.hp / tower.maxHp;
                        this.ctx.fillStyle = hpPercent > 0.5 ? '#4cd44c' : hpPercent > 0.25 ? '#d4a44c' : '#d44c4c';
                        this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
                    }
                }
            });

            // Barracks
            v.barracks.forEach(barracks => {
                if (barracks.isDead()) {
                    // Draw destroyed barracks (rubble)
                    this.ctx.fillStyle = '#4a3020';
                    this.ctx.fillRect(barracks.x + 5, barracks.y + 10, barracks.width - 10, barracks.height - 10);
                } else {
                    // Draw barracks building
                    this.ctx.fillStyle = '#5a4a3a';
                    this.ctx.fillRect(barracks.x, barracks.y, barracks.width, barracks.height);

                    // Draw roof
                    this.ctx.fillStyle = '#4a3a2a';
                    this.ctx.beginPath();
                    this.ctx.moveTo(barracks.x - 3, barracks.y);
                    this.ctx.lineTo(barracks.x + barracks.width / 2, barracks.y - 12);
                    this.ctx.lineTo(barracks.x + barracks.width + 3, barracks.y);
                    this.ctx.closePath();
                    this.ctx.fill();

                    // Draw door
                    this.ctx.fillStyle = '#2a1a1a';
                    this.ctx.fillRect(barracks.x + barracks.width / 2 - 8, barracks.y + barracks.height - 15, 16, 15);

                    // Draw shield icon
                    this.ctx.fillStyle = '#228B22';
                    this.ctx.beginPath();
                    this.ctx.arc(barracks.x + barracks.width / 2, barracks.y + barracks.height / 2 - 3, 6, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Health bar (only show if damaged)
                    if (barracks.hp < barracks.maxHp) {
                        const barWidth = barracks.width;
                        const barHeight = 4;
                        const barX = barracks.x;
                        const barY = barracks.y - 18;

                        this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
                        this.ctx.fillRect(barX, barY, barWidth, barHeight);

                        const hpPercent = barracks.hp / barracks.maxHp;
                        this.ctx.fillStyle = hpPercent > 0.5 ? '#4cd44c' : hpPercent > 0.25 ? '#d4a44c' : '#d44c4c';
                        this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
                    }
                }
            });

            // Save nodes (displayed above village)
            if (v.maxSaveNodes > 0) {
                const nodeSize = 12;
                const nodeSpacing = 18;
                const totalWidth = (v.maxSaveNodes * nodeSpacing) - 6;
                const startX = v.x - totalWidth / 2;
                const nodeY = v.y - 130;

                for (let i = 0; i < v.maxSaveNodes; i++) {
                    const nodeX = startX + (i * nodeSpacing);
                    const filled = i < v.filledSaveNodes;

                    // Draw node circle
                    this.ctx.beginPath();
                    this.ctx.arc(nodeX, nodeY, nodeSize / 2, 0, Math.PI * 2);

                    if (filled) {
                        // Filled node (gold)
                        this.ctx.fillStyle = '#ffd700';
                        this.ctx.fill();
                        this.ctx.strokeStyle = '#cc9900';
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    } else {
                        // Empty node (dark outline)
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                        this.ctx.fill();
                        this.ctx.strokeStyle = '#666';
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                }
            }
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
            const sprite = this.getPickupSprite(pickup);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.drawImage(sprite, pickup.x - sprite.width / 2, pickup.y - sprite.height / 2);
            ctx.restore();
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
            if (CONFIG.DEBUG.DRAW_SCOUT_SIGHT && scout.state === 'PATROLLING') {
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

            if (scout.attackPhase === 'ACTIVE') {
                const swipeProgress = scout.attackProgress;
                const swipeRadius = scout.radius + 6;
                const swipeArc = Math.PI / 2;
                const swipeStart = scout.attackAngle - swipeArc / 2;
                const swipeEnd = swipeStart + swipeArc * swipeProgress;

                this.ctx.beginPath();
                this.ctx.arc(scout.x, scout.y, swipeRadius, swipeStart, swipeEnd);
                this.ctx.strokeStyle = `rgba(255, 180, 180, ${0.7 * (1 - swipeProgress)})`;
                this.ctx.lineWidth = 3;
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
     * Draw militia sword swipe attacks
     * @param {Array} militiaAttacks - Militia attack events
     * @param {Object} viewBounds - View bounds for culling
     */
    drawMilitiaAttacks(militiaAttacks, viewBounds = null) {
        const ctx = this.ctx;

        for (const attack of militiaAttacks) {
            if (!this.isCircleVisible(viewBounds, attack.x, attack.y, 40)) {
                continue;
            }

            const progress = attack.timer / attack.duration;
            const swipeArc = (CONFIG.MILITIA.SWIPE_ARC * Math.PI) / 180;
            const startAngle = attack.angle - swipeArc / 2;
            const currentAngle = startAngle + swipeArc * progress;

            // Sword swipe arc
            ctx.save();
            ctx.translate(attack.x, attack.y);

            // Draw arc trail
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 30, startAngle, currentAngle);
            ctx.closePath();
            ctx.fillStyle = 'rgba(192, 192, 192, 0.4)';
            ctx.fill();

            // Draw sword line at current angle
            const swordLength = 25;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(
                Math.cos(currentAngle) * swordLength,
                Math.sin(currentAngle) * swordLength
            );
            ctx.strokeStyle = '#c0c0c0';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Sword tip
            ctx.beginPath();
            ctx.arc(
                Math.cos(currentAngle) * swordLength,
                Math.sin(currentAngle) * swordLength,
                3, 0, Math.PI * 2
            );
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            ctx.restore();
        }
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

            const segments = 5;
            const dx = (chain.endX - chain.startX) / segments;
            const dy = (chain.endY - chain.startY) / segments;
            const jitter = chain.jitter || [];

            for (let i = 1; i < segments; i++) {
                const offset = jitter[i - 1] || { x: 0, y: 0 };
                const x = chain.startX + dx * i + offset.x;
                const y = chain.startY + dy * i + offset.y;
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
     * Draw wave announcement in center of screen
     * @param {number} waveNumber - Current wave number
     */
    drawWaveAnnouncement(waveNumber) {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw big "Wave X" text
        ctx.font = 'bold 72px Inter';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add text shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.fillText(`Wave ${waveNumber}`, centerX, centerY);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.textBaseline = 'alphabetic';
    }

    /**
     * Draw HUD elements (screen space)
     * @param {Object} hero - Hero entity
     * @param {Object} levelUpSystem - Level up system
     * @param {Object} castle - Castle entity
     * @param {Array} villages - Village entities
     * @param {number} gameTime - Current game time
     * @param {Object} waveInfo - Wave info {waveNumber, waveTimer}
     * @param {number} speedMultiplier - Current speed multiplier
     */
    drawHUD(hero, levelUpSystem, castle, villages, gameTime, waveInfo, speedMultiplier) {
        const ctx = this.ctx;
        const padding = 20;
        this.fastForwardButtonBounds = null;
        const isPortrait = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
        let uiWidth = this.canvas.width;
        let uiHeight = this.canvas.height;
        let toCanvasPoint = null;

        if (isPortrait) {
            const canvasCenterX = this.canvas.width / 2;
            const canvasCenterY = this.canvas.height / 2;
            uiWidth = this.canvas.height;
            uiHeight = this.canvas.width;
            const uiCenterX = uiWidth / 2;
            const uiCenterY = uiHeight / 2;

            toCanvasPoint = (x, y) => ({
                x: (y - uiCenterY) + canvasCenterX,
                y: -(x - uiCenterX) + canvasCenterY
            });

            ctx.save();
            ctx.translate(canvasCenterX, canvasCenterY);
            ctx.rotate(-Math.PI / 2);
            ctx.translate(-uiCenterX, -uiCenterY);
        }

        // XP Bar at top
        const xpBarWidth = 400;
        const xpBarHeight = 12;
        const xpBarX = (uiWidth - xpBarWidth) / 2;
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
        const healthBarX = (uiWidth - healthBarWidth) / 2;
        const healthBarY = xpBarY + xpBarHeight + 10;
        const healthProgress = hero.maxHp > 0 ? hero.hp / hero.maxHp : 0;

        // Level text
        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${levelUpSystem.level}`, uiWidth / 2, healthBarY + healthBarHeight - 32);

        ctx.fillStyle = COLORS.XP_BAR_BG;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = COLORS.HEALTH_BAR_HERO;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthProgress, healthBarHeight);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

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
            ctx.fillText(`Villages: ${villagesAlive}/${villages.length}`, statusX, statusY);
            ctx.fillText(`Buildings: ${totalHuts}`, statusX, statusY + lineHeight);
        }

        // Wave info (top right)
        if (waveInfo) {
            // Wave number
            ctx.font = 'bold 18px Inter';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'right';
            ctx.fillText(`Wave ${waveInfo.waveNumber}`, uiWidth - padding, padding + 16);

            // Wave timer (countdown)
            const minutes = Math.floor(waveInfo.waveTimer / 60);
            const seconds = Math.floor(waveInfo.waveTimer % 60);
            const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            ctx.font = 'bold 16px Inter';
            ctx.fillStyle = waveInfo.waveTimer <= 10 ? '#ff4444' : '#fff';
            ctx.fillText(timeStr, uiWidth - padding, padding + 38);

            const buttonWidth = 96;
            const buttonHeight = 22;
            const buttonX = uiWidth - padding - buttonWidth;
            const buttonY = padding + 46;
            const buttonRadius = 4;
            const speedLabel = `Speed x${speedMultiplier}`;

            ctx.fillStyle = '#2d2d44';
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(buttonX + buttonRadius, buttonY);
            ctx.lineTo(buttonX + buttonWidth - buttonRadius, buttonY);
            ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY, buttonX + buttonWidth, buttonY + buttonRadius);
            ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - buttonRadius);
            ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY + buttonHeight, buttonX + buttonWidth - buttonRadius, buttonY + buttonHeight);
            ctx.lineTo(buttonX + buttonRadius, buttonY + buttonHeight);
            ctx.quadraticCurveTo(buttonX, buttonY + buttonHeight, buttonX, buttonY + buttonHeight - buttonRadius);
            ctx.lineTo(buttonX, buttonY + buttonRadius);
            ctx.quadraticCurveTo(buttonX, buttonY, buttonX + buttonRadius, buttonY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 12px Inter';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(speedLabel, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
            ctx.textBaseline = 'alphabetic';

            if (isPortrait && toCanvasPoint) {
                const topLeft = toCanvasPoint(buttonX, buttonY);
                const topRight = toCanvasPoint(buttonX + buttonWidth, buttonY);
                const bottomLeft = toCanvasPoint(buttonX, buttonY + buttonHeight);
                const bottomRight = toCanvasPoint(buttonX + buttonWidth, buttonY + buttonHeight);
                const xs = [topLeft.x, topRight.x, bottomLeft.x, bottomRight.x];
                const ys = [topLeft.y, topRight.y, bottomLeft.y, bottomRight.y];
                this.fastForwardButtonBounds = {
                    x: Math.min(...xs),
                    y: Math.min(...ys),
                    width: Math.max(...xs) - Math.min(...xs),
                    height: Math.max(...ys) - Math.min(...ys)
                };
            } else {
                this.fastForwardButtonBounds = {
                    x: buttonX,
                    y: buttonY,
                    width: buttonWidth,
                    height: buttonHeight
                };
            }
        }

        // Weapon inventory (bottom center)
        const iconSize = 40;
        const iconPadding = 8;
        const slotCount = CONFIG.INVENTORY_SIZE;
        const totalWidth = iconSize * slotCount + iconPadding * (slotCount - 1);
        const startX = (uiWidth - totalWidth) / 2;
        const startY = uiHeight - padding - iconSize;

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

        if (isPortrait) {
            ctx.restore();
        }
    }
}
