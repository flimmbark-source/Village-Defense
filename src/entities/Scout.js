/**
 * Grimm Dominion - Scout Entity (Enemy)
 * Supports multiple enemy types with visible attacks
 */

import { CONFIG } from '../config.js';
import { distance, isPointInRect, generateId, randomRange } from '../utils.js';
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

        // Attack timing
        this.attackWindup = baseStats.ATTACK_WINDUP || 0.3;
        this.attackDuration = baseStats.ATTACK_DURATION || 0.2;
        this.attackRecovery = 0.1;
    }

    /**
     * Check if scout can see the hero
     * @param {Object} hero - Hero entity
     * @param {Array} forests - Array of forest areas
     * @returns {boolean} True if hero is visible
     */
    canSeeHero(hero, forests) {
        const distToHero = distance(this.x, this.y, hero.x, hero.y);

        // Always see hero if in critical range
        if (distToHero <= CONFIG.SCOUT.CRITICAL_SIGHT_RANGE) {
            return true;
        }

        // Can't see beyond sight range
        if (distToHero > CONFIG.SCOUT.SIGHT_RANGE) {
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

        // Update attack animation if in progress
        if (this.isAttacking()) {
            return this.updateAttack(deltaTime);
        }

        // State machine
        if (this.state === ScoutState.PATROLLING) {
            this.updatePatrolling(hero, forests, villages);
        }

        if (this.state === ScoutState.CHASING) {
            this.updateChasing(hero);
        } else if (this.state === ScoutState.ATTACKING_VILLAGE) {
            this.updateVillageAttack();
        } else if (this.state === ScoutState.PATROLLING) {
            this.updatePatrolMovement();
        }

        // Movement (don't move while attacking)
        this.moveTowardsTarget();

        // Check if can start an attack
        return this.checkForAttack(hero);
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
                const distToTarget = distance(this.x, this.y, target.x, target.y);
                if (distToTarget <= CONFIG.SCOUT.SIGHT_RANGE) {
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
    updateChasing(hero) {
        this.targetX = hero.x + hero.width / 2;
        this.targetY = hero.y + hero.height / 2;
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
        const distToTarget = distance(this.x, this.y, this.targetX, this.targetY);
        if (distToTarget < 20) {
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

        // Don't move if in attack range and waiting for cooldown, or if attacking
        if (dist < this.attackRange || this.isAttacking()) {
            return;
        }

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
        const distToHero = distance(this.x, this.y, heroCenter.x, heroCenter.y);

        if (this.state === ScoutState.CHASING && distToHero < this.attackRange + hero.width / 2) {
            this.startAttack(heroCenter.x, heroCenter.y, 'hero');
            return null; // Attack will resolve when animation completes
        }

        // Check village target
        if (this.state === ScoutState.ATTACKING_VILLAGE && this.villageAttackTarget) {
            const targetX = this.villageAttackTarget.x + (this.villageAttackTarget.width || 0) / 2;
            const targetY = this.villageAttackTarget.y + (this.villageAttackTarget.height || 0) / 2;
            const distToTarget = distance(this.x, this.y, targetX, targetY);

            if (distToTarget < this.attackRange + 20) {
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
    }

    /**
     * Update attack animation
     * @param {number} deltaTime - Time since last frame
     * @returns {Object|null} Attack event when attack connects
     */
    updateAttack(deltaTime) {
        this.attackTimer += deltaTime;

        if (this.attackPhase === AttackPhase.WINDUP) {
            this.attackProgress = this.attackTimer / this.attackWindup;
            if (this.attackTimer >= this.attackWindup) {
                this.attackPhase = AttackPhase.ACTIVE;
                this.attackTimer = 0;
                this.attackProgress = 0;

                // Return the attack event
                return {
                    type: this.attackTargetType,
                    damage: this.attackTargetType === 'hero' ? this.damage : this.villageAttackDamage,
                    x: this.x + Math.cos(this.attackAngle) * this.attackRange,
                    y: this.y + Math.sin(this.attackAngle) * this.attackRange,
                    angle: this.attackAngle,
                    radius: this.attackRange
                };
            }
        } else if (this.attackPhase === AttackPhase.ACTIVE) {
            this.attackProgress = this.attackTimer / this.attackDuration;
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
