/**
 * Grimm Dominion - Scout Entity (Enemy)
 * Supports multiple enemy types with visible attacks
 */

import { CONFIG } from '../config.js';
import { distance, distanceSquared, isPointInRect, generateId, randomRange } from '../utils.js';
import { EnemyType } from './Castle.js';

export const ScoutState = {
    PATROLLING: 'PATROLLING',
    CHASING: 'CHASING',
    ATTACKING_VILLAGE: 'ATTACKING_VILLAGE',
    ATTACKING_HERO: 'ATTACKING_HERO',
    ATTACKING_CASTLE: 'ATTACKING_CASTLE'
};

export const AttackPhase = {
    NONE: 'NONE',
    WINDUP: 'WINDUP',
    ACTIVE: 'ACTIVE',
    RECOVERY: 'RECOVERY'
};

/**
 * Get stats for an enemy type
 * @param {string} type - Enemy type
 * @returns {Object} Stats config
 */
function getStatsForType(type) {
    switch (type) {
        case EnemyType.ELITE:
            return CONFIG.ELITE_SCOUT;
        case EnemyType.BRUTE:
            return CONFIG.BRUTE;
        case EnemyType.SWARM:
            return CONFIG.SWARM;
        default:
            return CONFIG.SCOUT;
    }
}

export class Scout {
    constructor(x, y, type = EnemyType.SCOUT) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.type = type;

        // Get stats based on type
        const stats = getStatsForType(type);
        const baseStats = CONFIG.SCOUT;

        this.radius = stats.RADIUS;
        this.color = stats.COLOR;
        this.baseColor = stats.COLOR;

        this.hp = stats.MAX_HP;
        this.maxHp = stats.MAX_HP;
        this.damage = stats.DAMAGE;
        this.speed = stats.BASE_SPEED;
        this.villageAttackDamage = stats.VILLAGE_ATTACK_DAMAGE;
        this.villageAttackCooldown = stats.VILLAGE_ATTACK_COOLDOWN;
        this.heroAttackCooldown = stats.HERO_ATTACK_COOLDOWN;
        this.attackRange = stats.ATTACK_RANGE || baseStats.ATTACK_RANGE;
        this.dashDistance = stats.DASH_DISTANCE || baseStats.DASH_DISTANCE;
        this.dashDuration = stats.DASH_DURATION || baseStats.DASH_DURATION;

        // Projectile properties
        this.projectileSpeed = stats.PROJECTILE_SPEED || baseStats.PROJECTILE_SPEED;
        this.projectileRadius = stats.PROJECTILE_RADIUS || baseStats.PROJECTILE_RADIUS;
        this.projectileColor = stats.PROJECTILE_COLOR || baseStats.PROJECTILE_COLOR;

        // XP and gold drops
        this.xpDrop = stats.XP_DROP;
        this.goldDropMin = stats.GOLD_DROP_MIN;
        this.goldDropMax = stats.GOLD_DROP_MAX;
        this.goldDropChance = stats.GOLD_DROP_CHANCE;

        this.isBuffed = false;

        this.state = ScoutState.PATROLLING;
        this.targetX = Math.random() * CONFIG.WORLD.WIDTH;
        this.targetY = Math.random() * CONFIG.WORLD.HEIGHT;

        // Patrol center
        this.patrolCenterX = Math.random() * CONFIG.WORLD.WIDTH;
        this.patrolCenterY = Math.random() * CONFIG.WORLD.HEIGHT;

        // Attack targets
        this.villageAttackTarget = null;
        this.currentTarget = null; // Generic target (can be hero, hut, castle)

        // Attack state
        this.attackPhase = AttackPhase.NONE;
        this.attackTimer = 0;
        this.attackCooldownTimer = 0;
        this.attackAngle = 0;
        this.attackProgress = 0;
        this.attackHasFired = false;
        this.attackHasDashed = false;
        this.dashTimer = 0;
        this.dashStartX = 0;
        this.dashStartY = 0;
        this.dashTargetX = 0;
        this.dashTargetY = 0;
        this.dashDirection = 1;

        // Attack timing
        this.attackWindup = baseStats.ATTACK_WINDUP || 0.3;
        this.attackDuration = baseStats.ATTACK_DURATION || 0.2;
        this.attackRecovery = 0.1;

        // Combat behavior variation
        this.combatProfile = this.createCombatProfile(stats, baseStats);
        this.replanTimer = 0;

        // Hero tracking for predictive movement/aim
        this.lastHeroX = null;
        this.lastHeroY = null;
        this.heroVelocityX = 0;
        this.heroVelocityY = 0;
    }

    /**
     * Check if scout can see the hero
     * @param {Object} hero - Hero entity
     * @param {Array} forests - Array of forest areas
     * @returns {boolean} True if hero is visible
     */
    canSeeHero(hero, forests) {
        const distToHeroSq = distanceSquared(this.x, this.y, hero.x, hero.y);
        const criticalSightSq = CONFIG.SCOUT.CRITICAL_SIGHT_RANGE * CONFIG.SCOUT.CRITICAL_SIGHT_RANGE;
        const sightRangeSq = CONFIG.SCOUT.SIGHT_RANGE * CONFIG.SCOUT.SIGHT_RANGE;

        // Always see hero if in critical range
        if (distToHeroSq <= criticalSightSq) {
            return true;
        }

        // Can't see beyond sight range
        if (distToHeroSq > sightRangeSq) {
            return false;
        }

        // Check if hero is hidden in forest
        const heroInForest = forests.some(f => isPointInRect(hero, f));
        return !heroInForest;
    }

    /**
     * Apply combat buff when entering combat
     */
    applyBuff() {
        if (!this.isBuffed && this.type === EnemyType.SCOUT) {
            this.isBuffed = true;
            this.speed *= CONFIG.SCOUT.SPEED_BUFF_MULTIPLIER;
            this.maxHp += CONFIG.SCOUT.HP_BUFF_BONUS;
            this.hp += CONFIG.SCOUT.HP_BUFF_BONUS;
            this.color = CONFIG.SCOUT.BUFFED_COLOR;
        }
    }

    /**
     * Check if currently in an attack animation
     * @returns {boolean}
     */
    isAttacking() {
        return this.attackPhase !== AttackPhase.NONE;
    }

    /**
     * Update scout AI and movement
     * @param {number} deltaTime - Time since last frame
     * @param {Object} hero - Hero entity
     * @param {Array} forests - Forest areas
     * @param {Array} villages - Village entities
     * @param {Object} castle - Castle entity (for player attacking)
     * @returns {Object|null} Attack event if attack connects
     */
    update(deltaTime, hero, forests, villages, castle = null) {
        this.attackCooldownTimer -= deltaTime;
        this.updateHeroTracking(hero, deltaTime);

        let attackEvent = null;
        if (this.isAttacking()) {
            attackEvent = this.updateAttack(deltaTime);
        }

        // State machine
        if (this.state === ScoutState.PATROLLING) {
            this.updatePatrolling(hero, forests, villages);
        }

        if (this.state === ScoutState.CHASING) {
            this.updateChasing(hero, deltaTime);
        } else if (this.state === ScoutState.ATTACKING_VILLAGE) {
            this.updateVillageAttack();
        } else if (this.state === ScoutState.PATROLLING) {
            this.updatePatrolMovement();
        }

        // Movement
        if (!this.updateDash(deltaTime)) {
            this.moveTowardsTarget();
        }

        // Check if can start an attack
        if (!this.isAttacking()) {
            return this.checkForAttack(hero);
        }

        return attackEvent;
    }

    /**
     * Update patrol state
     */
    updatePatrolling(hero, forests, villages) {
        // Check if we can see the hero
        if (this.canSeeHero(hero, forests)) {
            this.state = ScoutState.CHASING;
            this.currentTarget = hero;
            this.applyBuff();
            return;
        }

        // Look for village targets
        for (const village of villages) {
            const allTargets = [...village.huts.filter(h => !h.isDead())];

            for (const target of allTargets) {
                const distToTargetSq = distanceSquared(this.x, this.y, target.x, target.y);
                if (distToTargetSq <= CONFIG.SCOUT.SIGHT_RANGE * CONFIG.SCOUT.SIGHT_RANGE) {
                    this.state = ScoutState.ATTACKING_VILLAGE;
                    this.villageAttackTarget = target;
                    this.currentTarget = target;
                    village.isUnderAttack = true;
                    village.attackers.add(this.id);
                    this.applyBuff();
                    return;
                }
            }
        }
    }

    /**
     * Update chasing state
     */
    updateChasing(hero, deltaTime) {
        const heroCenter = hero.getCenter();
        const combatTarget = this.getCombatTarget(heroCenter, deltaTime);
        this.targetX = combatTarget.x;
        this.targetY = combatTarget.y;
        this.currentTarget = hero;
    }

    /**
     * Update village attack behavior
     */
    updateVillageAttack() {
        if (!this.villageAttackTarget || this.villageAttackTarget.isDead()) {
            this.state = ScoutState.PATROLLING;
            this.villageAttackTarget = null;
            this.currentTarget = null;
            return;
        }

        this.targetX = this.villageAttackTarget.x + (this.villageAttackTarget.width || 0) / 2;
        this.targetY = this.villageAttackTarget.y + (this.villageAttackTarget.height || 0) / 2;
    }

    /**
     * Update patrol movement
     */
    updatePatrolMovement() {
        const distToTargetSq = distanceSquared(this.x, this.y, this.targetX, this.targetY);
        if (distToTargetSq < 400) {
            this.targetX = this.patrolCenterX + (Math.random() - 0.5) * 2 * CONFIG.SCOUT.PATROL_RADIUS;
            this.targetY = this.patrolCenterY + (Math.random() - 0.5) * 2 * CONFIG.SCOUT.PATROL_RADIUS;
        }
    }

    /**
     * Move towards current target
     */
    moveTowardsTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.speed) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    /**
     * Check if can start an attack against any valid target
     * @param {Object} hero - Hero entity
     * @returns {Object|null} Attack event
     */
    checkForAttack(hero) {
        if (this.attackCooldownTimer > 0 || this.isAttacking()) {
            return null;
        }

        // Check hero distance
        const heroCenter = hero.getCenter();
        const distToHeroSq = distanceSquared(this.x, this.y, heroCenter.x, heroCenter.y);
        const heroAttackRange = this.attackRange + hero.width / 2;

        if (this.state === ScoutState.CHASING && distToHeroSq < heroAttackRange * heroAttackRange) {
            const aimTarget = this.getAttackTarget(heroCenter);
            this.startAttack(aimTarget.x, aimTarget.y, 'hero');
            return null; // Attack will resolve when animation completes
        }

        // Check village target
        if (this.state === ScoutState.ATTACKING_VILLAGE && this.villageAttackTarget) {
            const targetX = this.villageAttackTarget.x + (this.villageAttackTarget.width || 0) / 2;
            const targetY = this.villageAttackTarget.y + (this.villageAttackTarget.height || 0) / 2;
            const distToTargetSq = distanceSquared(this.x, this.y, targetX, targetY);
            const villageAttackRange = this.attackRange + 20;

            if (distToTargetSq < villageAttackRange * villageAttackRange) {
                this.startAttack(targetX, targetY, 'village');
                return null;
            }
        }

        return null;
    }

    /**
     * Start an attack animation
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {string} targetType - 'hero' or 'village'
     */
    startAttack(targetX, targetY, targetType) {
        this.attackPhase = AttackPhase.WINDUP;
        this.attackTimer = 0;
        this.attackAngle = Math.atan2(targetY - this.y, targetX - this.x);
        this.attackTargetType = targetType;
        this.attackProgress = 0;
        this.attackHasFired = false;
        this.attackHasDashed = false;
        this.dashTimer = 0;
        this.dashDirection = Math.random() < 0.5 ? -1 : 1;
    }

    /**
     * Update attack animation
     * @param {number} deltaTime - Time since last frame
     * @returns {Object|null} Projectile data when attack fires
     */
    updateAttack(deltaTime) {
        this.attackTimer += deltaTime;

        if (this.attackPhase === AttackPhase.WINDUP) {
            this.attackProgress = this.attackTimer / this.attackWindup;
            if (this.attackTimer >= this.attackWindup) {
                this.attackPhase = AttackPhase.ACTIVE;
                this.attackTimer = 0;
                this.attackProgress = 0;
            }
        } else if (this.attackPhase === AttackPhase.ACTIVE) {
            this.attackProgress = this.attackTimer / this.attackDuration;
            if (!this.attackHasFired && this.attackTimer >= this.attackDuration * 0.5) {
                if (!this.attackHasDashed) {
                    this.startAttackDash();
                    this.attackHasDashed = true;
                }
                this.attackHasFired = true;
                const speed = this.projectileSpeed;
                return {
                    isProjectile: true,
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(this.attackAngle) * speed,
                    vy: Math.sin(this.attackAngle) * speed,
                    damage: this.attackTargetType === 'hero' ? this.damage : this.villageAttackDamage,
                    targetType: this.attackTargetType,
                    targetRef: this.attackTargetType === 'village' ? this.villageAttackTarget : null,
                    radius: this.projectileRadius,
                    color: this.projectileColor,
                    enemyType: this.type
                };
            }
            if (this.attackTimer >= this.attackDuration) {
                this.attackPhase = AttackPhase.RECOVERY;
                this.attackTimer = 0;
                this.attackProgress = 0;
            }
        } else if (this.attackPhase === AttackPhase.RECOVERY) {
            this.attackProgress = this.attackTimer / this.attackRecovery;
            if (this.attackTimer >= this.attackRecovery) {
                this.attackPhase = AttackPhase.NONE;
                this.attackCooldownTimer = this.attackTargetType === 'hero'
                    ? this.heroAttackCooldown
                    : this.villageAttackCooldown;
            }
        }

        return null;
    }

    /**
     * Start a quick sideways dash right before firing.
     */
    startAttackDash() {
        const perpX = -Math.sin(this.attackAngle);
        const perpY = Math.cos(this.attackAngle);
        const dashX = perpX * this.dashDistance * this.dashDirection;
        const dashY = perpY * this.dashDistance * this.dashDirection;
        const nextX = this.x + dashX;
        const nextY = this.y + dashY;
        const minX = this.radius;
        const minY = this.radius;
        const maxX = CONFIG.WORLD.WIDTH - this.radius;
        const maxY = CONFIG.WORLD.HEIGHT - this.radius;
        this.dashStartX = this.x;
        this.dashStartY = this.y;
        this.dashTargetX = Math.min(maxX, Math.max(minX, nextX));
        this.dashTargetY = Math.min(maxY, Math.max(minY, nextY));
        this.dashTimer = 0;
    }

    /**
     * Slide the scout during a dash.
     * @param {number} deltaTime - Frame delta
     * @returns {boolean} True if dash movement handled
     */
    updateDash(deltaTime) {
        if (!this.attackHasDashed || this.dashTimer >= this.dashDuration) {
            return false;
        }
        this.dashTimer = Math.min(this.dashDuration, this.dashTimer + deltaTime);
        const t = this.dashDuration > 0 ? this.dashTimer / this.dashDuration : 1;
        this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * t;
        this.y = this.dashStartY + (this.dashTargetY - this.dashStartY) * t;
        return true;
    }

    /**
     * Create a combat profile that adds variation to enemy behavior
     * @param {Object} stats - Type-specific stats
     * @param {Object} baseStats - Base scout stats
     * @returns {Object} Combat profile settings
     */
    createCombatProfile(stats, baseStats) {
        const isElite = this.type === EnemyType.ELITE;
        const isBrute = this.type === EnemyType.BRUTE;
        const isSwarm = this.type === EnemyType.SWARM;

        const styleOptions = isBrute
            ? ['crusher']
            : isSwarm
                ? ['dart', 'skirmisher']
                : isElite
                    ? ['flanker', 'skirmisher']
                    : ['skirmisher', 'flanker', 'dart'];

        const style = styleOptions[Math.floor(Math.random() * styleOptions.length)];
        const baseRange = (stats.ATTACK_RANGE || baseStats.ATTACK_RANGE) + randomRange(10, 45);

        return {
            style,
            baseRange,
            preferredRange: baseRange,
            strafeDirection: Math.random() < 0.5 ? -1 : 1,
            strafeRadius: randomRange(25, isElite ? 90 : 70),
            leadFactor: randomRange(isBrute ? 0.4 : 0.6, isElite ? 1.2 : 1.0),
            replanCooldown: randomRange(0.6, 1.4),
            switchChance: isBrute ? 0.1 : 0.35,
            jukeMagnitude: isSwarm ? randomRange(8, 22) : randomRange(4, 14)
        };
    }

    /**
     * Track hero velocity for predictive movement/aiming
     * @param {Object} hero - Hero entity
     * @param {number} deltaTime - Frame delta
     */
    updateHeroTracking(hero, deltaTime) {
        if (!hero) return;
        const heroCenter = hero.getCenter();
        if (this.lastHeroX !== null && this.lastHeroY !== null && deltaTime > 0) {
            const rawVx = (heroCenter.x - this.lastHeroX) / deltaTime;
            const rawVy = (heroCenter.y - this.lastHeroY) / deltaTime;
            this.heroVelocityX = this.heroVelocityX * 0.6 + rawVx * 0.4;
            this.heroVelocityY = this.heroVelocityY * 0.6 + rawVy * 0.4;
        }
        this.lastHeroX = heroCenter.x;
        this.lastHeroY = heroCenter.y;
    }

    /**
     * Calculate a combat movement target based on behavior profile
     * @param {Object} heroCenter - Hero center position
     * @returns {Object} Movement target
     */
    getCombatTarget(heroCenter, deltaTime) {
        const profile = this.combatProfile;
        const dx = heroCenter.x - this.x;
        const dy = heroCenter.y - this.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const dirX = dx / dist;
        const dirY = dy / dist;
        const perpX = -dirY;
        const perpY = dirX;

        if (this.replanTimer <= 0) {
            this.replanTimer = profile.replanCooldown;
            if (Math.random() < profile.switchChance) {
                profile.strafeDirection *= -1;
            }
            profile.preferredRange = profile.baseRange + randomRange(-10, 15);
            profile.strafeRadius = Math.max(15, profile.strafeRadius + randomRange(-10, 12));
        } else {
            this.replanTimer -= deltaTime;
        }

        const leadTime = Math.min(0.8, Math.max(0.15, (dist / this.projectileSpeed) * profile.leadFactor));
        const predictedX = heroCenter.x + this.heroVelocityX * leadTime;
        const predictedY = heroCenter.y + this.heroVelocityY * leadTime;

        let offsetScale = profile.strafeRadius;
        if (profile.style === 'flanker') offsetScale *= 1.3;
        if (profile.style === 'crusher') offsetScale *= 0.25;
        if (profile.style === 'dart') offsetScale *= 0.8;

        let targetX = predictedX + perpX * offsetScale * profile.strafeDirection;
        let targetY = predictedY + perpY * offsetScale * profile.strafeDirection;

        if (profile.style === 'dart') {
            targetX += randomRange(-profile.jukeMagnitude, profile.jukeMagnitude);
            targetY += randomRange(-profile.jukeMagnitude, profile.jukeMagnitude);
        }

        if (dist < profile.preferredRange * 0.85 && profile.style !== 'crusher') {
            const retreat = profile.preferredRange - dist;
            targetX -= dirX * retreat;
            targetY -= dirY * retreat;
        }

        if (profile.style === 'crusher' && dist > profile.preferredRange * 0.75) {
            targetX = predictedX;
            targetY = predictedY;
        }

        return { x: targetX, y: targetY };
    }

    /**
     * Calculate a predictive aim target for projectiles
     * @param {Object} heroCenter - Hero center position
     * @returns {Object} Aim target
     */
    getAttackTarget(heroCenter) {
        return {
            x: heroCenter.x ,
            y: heroCenter.y
        };
    }

    /**
     * Take damage
     * @param {number} amount - Damage amount
     * @returns {boolean} True if dead
     */
    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }

    /**
     * Check if scout is dead
     * @returns {boolean} True if dead
     */
    isDead() {
        return this.hp <= 0;
    }

    /**
     * Get drops when killed
     * @returns {Array} Array of drop objects { type, value, offsetX, offsetY }
     */
    getDrops() {
        const drops = [];

        // Always drop XP
        drops.push({
            type: 'xp',
            value: this.xpDrop,
            offsetX: 0,
            offsetY: 0
        });

        // Always drop gold - spawn multiple coins that scatter
        const totalGold = Math.floor(randomRange(this.goldDropMin, this.goldDropMax));
        const coinCount = Math.min(Math.max(2, Math.floor(totalGold / 5)), 6); // 2-6 coins
        const goldPerCoin = Math.ceil(totalGold / coinCount);

        for (let i = 0; i < coinCount; i++) {
            // Random scatter offset
            const angle = (Math.PI * 2 * i / coinCount) + randomRange(-0.3, 0.3);
            const dist = randomRange(15, 40);
            drops.push({
                type: 'gold',
                value: i === coinCount - 1 ? totalGold - goldPerCoin * (coinCount - 1) : goldPerCoin,
                offsetX: Math.cos(angle) * dist,
                offsetY: Math.sin(angle) * dist
            });
        }

        return drops;
    }
}
