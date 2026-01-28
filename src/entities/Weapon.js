/**
 * Grimm Dominion - Weapon System
 * Handles weapon attacks and their visual effects
 */

import { CONFIG, WEAPONS } from '../config.js';
import { distance, generateId, normalize } from '../utils.js';

/**
 * Active attack instance - represents an ongoing attack animation/hitbox
 */
export class Attack {
    constructor(weapon, heroX, heroY, targetX, targetY, damageMultiplier = 1) {
        this.id = generateId();
        this.weapon = weapon;
        this.startX = heroX;
        this.startY = heroY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = weapon.damage * damageMultiplier;

        this.time = 0;
        this.finished = false;
        this.hitEnemies = new Set();

        // Direction to target
        const dx = targetX - heroX;
        const dy = targetY - heroY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.dirX = dist > 0 ? dx / dist : 1;
        this.dirY = dist > 0 ? dy / dist : 0;
        this.angle = Math.atan2(dy, dx);

        // Pattern-specific initialization
        this.initPattern();
    }

    initPattern() {
        const pattern = this.weapon.attackPattern;
        const effects = this.weapon.effects;

        switch (pattern) {
            case 'slash':
                this.duration = 0.25;
                this.slashProgress = 0;
                this.startAngle = this.angle - (effects.slashArc * Math.PI / 180) / 2;
                this.endAngle = this.angle + (effects.slashArc * Math.PI / 180) / 2;
                break;

            case 'projectile':
            case 'pierce':
                this.x = this.startX;
                this.y = this.startY;
                this.pierceCount = this.weapon.pierceCount || 1;
                this.rotation = 0;
                this.trail = [];
                break;

            case 'homing':
                this.x = this.startX;
                this.y = this.startY;
                this.targetId = null;
                this.trail = [];
                break;

            case 'nova':
                this.duration = effects.duration;
                this.radius = 0;
                this.maxRadius = this.weapon.range;
                this.particles = [];
                for (let i = 0; i < effects.particleCount; i++) {
                    const angle = (i / effects.particleCount) * Math.PI * 2;
                    this.particles.push({ angle, dist: 0 });
                }
                break;

            case 'whip':
                this.duration = 0.3;
                this.segments = [];
                for (let i = 0; i < effects.segments; i++) {
                    this.segments.push({ x: this.startX, y: this.startY });
                }
                break;

            case 'lightning':
                this.duration = effects.duration;
                this.chains = [];
                this.chainsRemaining = this.weapon.chainCount || 0;
                break;

            case 'boomerang':
                this.x = this.startX;
                this.y = this.startY;
                this.returning = false;
                this.maxDist = this.weapon.range;
                this.distTraveled = 0;
                this.rotation = 0;
                break;
        }
    }

    createLightningJitter(segments, magnitude) {
        const jitter = [];
        for (let i = 1; i < segments; i++) {
            jitter.push({
                x: (Math.random() - 0.5) * magnitude,
                y: (Math.random() - 0.5) * magnitude
            });
        }
        return jitter;
    }

    /**
     * Update attack
     * @param {number} deltaTime - Time since last frame
     * @param {Object} hero - Hero entity
     * @param {Array} enemies - Array of enemies
     * @returns {Array} Array of damage events { enemy, damage }
     */
    update(deltaTime, hero, enemies) {
        const speedMult = CONFIG.SPEED_MULTIPLIER;
        const scaledDelta = deltaTime * speedMult;
        this.time += scaledDelta;
        const damageEvents = [];
        const pattern = this.weapon.attackPattern;
        const effects = this.weapon.effects;

        switch (pattern) {
            case 'slash':
                this.updateSlash(scaledDelta, hero, enemies, damageEvents);
                break;

            case 'projectile':
                this.updateProjectile(scaledDelta, enemies, damageEvents, false);
                break;

            case 'pierce':
                this.updateProjectile(scaledDelta, enemies, damageEvents, true);
                break;

            case 'homing':
                this.updateHoming(scaledDelta, enemies, damageEvents);
                break;

            case 'nova':
                this.updateNova(scaledDelta, hero, enemies, damageEvents);
                break;

            case 'whip':
                this.updateWhip(scaledDelta, hero, enemies, damageEvents);
                break;

            case 'lightning':
                this.updateLightning(scaledDelta, hero, enemies, damageEvents);
                break;

            case 'boomerang':
                this.updateBoomerang(scaledDelta, hero, enemies, damageEvents);
                break;
        }

        return damageEvents;
    }

    updateSlash(deltaTime, hero, enemies, damageEvents) {
        this.slashProgress = this.time / this.duration;

        if (this.slashProgress >= 1) {
            this.finished = true;
            return;
        }

        // Check hits in slash arc
        const heroCenter = hero.getCenter();
        const currentAngle = this.startAngle + (this.endAngle - this.startAngle) * this.slashProgress;

        for (const enemy of enemies) {
            if (this.hitEnemies.has(enemy.id)) continue;

            const dx = enemy.x - heroCenter.x;
            const dy = enemy.y - heroCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const enemyAngle = Math.atan2(dy, dx);

            // Check if enemy is in range and within the arc
            if (dist <= this.weapon.range + enemy.radius) {
                let angleDiff = enemyAngle - currentAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (Math.abs(angleDiff) < 0.5) {
                    this.hitEnemies.add(enemy.id);
                    damageEvents.push({ enemy, damage: this.damage });
                }
            }
        }
    }

    updateProjectile(deltaTime, enemies, damageEvents, pierce) {
        const speed = this.weapon.projectileSpeed;
        const step = speed * deltaTime * 60;
        this.x += this.dirX * step;
        this.y += this.dirY * step;

        if (this.weapon.effects.rotation) {
            this.rotation += 15 * deltaTime;
        }

        // Add to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) this.trail.shift();

        // Check collision
        for (const enemy of enemies) {
            if (this.hitEnemies.has(enemy.id)) continue;

            const dist = distance(this.x, this.y, enemy.x, enemy.y);
            if (dist < enemy.radius + (this.weapon.effects.size || 5)) {
                this.hitEnemies.add(enemy.id);
                damageEvents.push({ enemy, damage: this.damage });

                if (!pierce) {
                    this.finished = true;
                    return;
                } else {
                    this.pierceCount--;
                    if (this.pierceCount <= 0) {
                        this.finished = true;
                        return;
                    }
                }
            }
        }

        // Check if out of range
        const distFromStart = distance(this.x, this.y, this.startX, this.startY);
        if (distFromStart > this.weapon.range) {
            this.finished = true;
        }
    }

    updateHoming(deltaTime, enemies, damageEvents) {
        const speed = this.weapon.projectileSpeed;
        const effects = this.weapon.effects;

        // Find target
        let target = null;
        if (this.targetId) {
            target = enemies.find(e => e.id === this.targetId);
        }
        if (!target) {
            // Find nearest enemy
            let nearest = null;
            let nearestDist = Infinity;
            for (const enemy of enemies) {
                const dist = distance(this.x, this.y, enemy.x, enemy.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = enemy;
                }
            }
            if (nearest) {
                this.targetId = nearest.id;
                target = nearest;
            }
        }

        // Home towards target
        if (target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const targetDirX = dx / dist;
                const targetDirY = dy / dist;
                this.dirX += (targetDirX - this.dirX) * effects.homingStrength;
                this.dirY += (targetDirY - this.dirY) * effects.homingStrength;
                // Normalize
                const len = Math.sqrt(this.dirX * this.dirX + this.dirY * this.dirY);
                this.dirX /= len;
                this.dirY /= len;
            }
        }

        const step = speed * deltaTime * 60;
        this.x += this.dirX * step;
        this.y += this.dirY * step;

        // Add to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 15) this.trail.shift();

        // Check collision
        for (const enemy of enemies) {
            if (this.hitEnemies.has(enemy.id)) continue;

            const dist = distance(this.x, this.y, enemy.x, enemy.y);
            if (dist < enemy.radius + effects.size) {
                this.hitEnemies.add(enemy.id);
                damageEvents.push({ enemy, damage: this.damage });
                this.finished = true;
                return;
            }
        }

        // Check if out of range
        const distFromStart = distance(this.x, this.y, this.startX, this.startY);
        if (distFromStart > this.weapon.range * 1.5) {
            this.finished = true;
        }
    }

    updateNova(deltaTime, hero, enemies, damageEvents) {
        const effects = this.weapon.effects;
        this.radius += effects.expandSpeed * 60 * deltaTime;

        const heroCenter = hero.getCenter();

        // Update particles
        for (const particle of this.particles) {
            particle.dist = this.radius;
        }

        // Check hits
        for (const enemy of enemies) {
            if (this.hitEnemies.has(enemy.id)) continue;

            const dist = distance(heroCenter.x, heroCenter.y, enemy.x, enemy.y);
            if (dist <= this.radius + enemy.radius && dist >= this.radius - 20) {
                this.hitEnemies.add(enemy.id);
                damageEvents.push({ enemy, damage: this.damage });
            }
        }

        if (this.time >= this.duration || this.radius >= this.maxRadius) {
            this.finished = true;
        }
    }

    updateWhip(deltaTime, hero, enemies, damageEvents) {
        const effects = this.weapon.effects;
        const progress = this.time / this.duration;

        if (progress >= 1) {
            this.finished = true;
            return;
        }

        const heroCenter = hero.getCenter();
        const sweepAngle = effects.sweepAngle * Math.PI / 180;
        const startAngle = this.angle - sweepAngle / 2;
        const currentAngle = startAngle + sweepAngle * progress;

        // Update segments
        for (let i = 0; i < this.segments.length; i++) {
            const segmentDist = (i + 1) / this.segments.length * this.weapon.range;
            this.segments[i].x = heroCenter.x + Math.cos(currentAngle) * segmentDist;
            this.segments[i].y = heroCenter.y + Math.sin(currentAngle) * segmentDist;
        }

        // Check hits from tip segment
        const tip = this.segments[this.segments.length - 1];
        for (const enemy of enemies) {
            if (this.hitEnemies.has(enemy.id)) continue;

            const dist = distance(tip.x, tip.y, enemy.x, enemy.y);
            if (dist < enemy.radius + 15) {
                this.hitEnemies.add(enemy.id);
                damageEvents.push({ enemy, damage: this.damage });
            }
        }
    }

    updateLightning(deltaTime, hero, enemies, damageEvents) {
        if (this.time >= this.duration) {
            this.finished = true;
            return;
        }

        // Initial strike
        if (this.chains.length === 0) {
            const heroCenter = hero.getCenter();

            // Find initial target
            let nearest = null;
            let nearestDist = Infinity;
            for (const enemy of enemies) {
                const dist = distance(heroCenter.x, heroCenter.y, enemy.x, enemy.y);
                if (dist < this.weapon.range && dist < nearestDist) {
                    nearestDist = dist;
                    nearest = enemy;
                }
            }

            if (nearest) {
                this.chains.push({
                    startX: heroCenter.x,
                    startY: heroCenter.y,
                    endX: nearest.x,
                    endY: nearest.y,
                    jitter: this.createLightningJitter(5, 20)
                });
                this.hitEnemies.add(nearest.id);
                damageEvents.push({ enemy: nearest, damage: this.damage });
                this.lastHit = nearest;
            } else {
                this.finished = true;
            }
        }

        // Chain to nearby enemies
        while (this.chainsRemaining > 0 && this.lastHit) {
            let nearest = null;
            let nearestDist = Infinity;

            for (const enemy of enemies) {
                if (this.hitEnemies.has(enemy.id)) continue;
                const dist = distance(this.lastHit.x, this.lastHit.y, enemy.x, enemy.y);
                if (dist < this.weapon.chainRange && dist < nearestDist) {
                    nearestDist = dist;
                    nearest = enemy;
                }
            }

            if (nearest) {
                this.chains.push({
                    startX: this.lastHit.x,
                    startY: this.lastHit.y,
                    endX: nearest.x,
                    endY: nearest.y,
                    jitter: this.createLightningJitter(5, 20)
                });
                this.hitEnemies.add(nearest.id);
                damageEvents.push({ enemy: nearest, damage: this.damage * 0.7 });
                this.lastHit = nearest;
                this.chainsRemaining--;
            } else {
                break;
            }
        }
    }

    updateBoomerang(deltaTime, hero, enemies, damageEvents) {
        const speed = this.weapon.projectileSpeed;
        const effects = this.weapon.effects;

        this.rotation += effects.rotationSpeed * deltaTime;

        const step = speed * deltaTime * 60;

        if (!this.returning) {
            this.x += this.dirX * step;
            this.y += this.dirY * step;
            this.distTraveled += step;

            if (this.distTraveled >= this.maxDist) {
                this.returning = true;
                this.hitEnemies.clear(); // Can hit enemies again on return
            }
        } else {
            const heroCenter = hero.getCenter();
            const dx = heroCenter.x - this.x;
            const dy = heroCenter.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > step) {
                const returnStep = step * 1.2;
                this.x += (dx / dist) * returnStep;
                this.y += (dy / dist) * returnStep;
            } else {
                this.finished = true;
                return;
            }
        }

        // Check collision
        for (const enemy of enemies) {
            if (this.hitEnemies.has(enemy.id)) continue;

            const dist = distance(this.x, this.y, enemy.x, enemy.y);
            if (dist < enemy.radius + effects.size) {
                this.hitEnemies.add(enemy.id);
                damageEvents.push({ enemy, damage: this.damage });
            }
        }
    }
}

/**
 * Weapon instance for hero inventory
 */
export class WeaponInstance {
    constructor(weaponId, level = 1) {
        const weaponDef = WEAPONS[weaponId];
        if (!weaponDef) throw new Error(`Unknown weapon: ${weaponId}`);

        this.id = weaponId;
        this.instanceId = generateId();
        this.definition = weaponDef;
        this.level = level;
        this.cooldownTimer = 0;
    }

    /**
     * Get the weapon name
     */
    get name() {
        return this.definition.name;
    }

    /**
     * Get the weapon icon
     */
    get icon() {
        return this.definition.icon;
    }

    /**
     * Get the weapon description
     */
    get description() {
        return this.definition.description;
    }

    /**
     * Get effective cooldown (with level scaling)
     */
    getCooldown(cooldownMultiplier = 1) {
        const baseCooldown = this.definition.cooldown * (1 - (this.level - 1) * 0.05);
        return baseCooldown * (1 + cooldownMultiplier);
    }

    /**
     * Get effective damage (with level scaling)
     */
    getDamage() {
        return this.definition.damage * (1 + (this.level - 1) * 0.15);
    }

    /**
     * Update weapon cooldown
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
        }
    }

    /**
     * Check if weapon can attack
     */
    canAttack() {
        return this.cooldownTimer <= 0;
    }

    /**
     * Create an attack
     * @param {number} heroX - Hero X position
     * @param {number} heroY - Hero Y position
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {number} cooldownMultiplier - Cooldown multiplier from upgrades
     * @param {number} damageMultiplier - Damage multiplier from upgrades
     * @returns {Attack} The attack instance
     */
    attack(heroX, heroY, targetX, targetY, cooldownMultiplier = 0, damageMultiplier = 1) {
        this.cooldownTimer = this.getCooldown(cooldownMultiplier);
        const effectiveDamage = this.getDamage() * damageMultiplier;

        const attack = new Attack(
            { ...this.definition, damage: effectiveDamage },
            heroX, heroY, targetX, targetY, 1
        );
        return attack;
    }

    /**
     * Level up the weapon
     */
    levelUp() {
        this.level++;
    }
}
