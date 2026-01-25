/**
 * Grimm Dominion - Scout Entity (Enemy)
 */

import { CONFIG } from '../config.js';
import { distance, isPointInRect, generateId, randomRange } from '../utils.js';

export const ScoutState = {
    PATROLLING: 'PATROLLING',
    CHASING: 'CHASING',
    ATTACKING_VILLAGE: 'ATTACKING_VILLAGE'
};

export class Scout {
    constructor(x, y) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.radius = CONFIG.SCOUT.RADIUS;
        this.color = CONFIG.SCOUT.COLOR;

        this.hp = CONFIG.SCOUT.MAX_HP;
        this.maxHp = CONFIG.SCOUT.MAX_HP;
        this.speed = CONFIG.SCOUT.BASE_SPEED;
        this.isBuffed = false;

        this.state = ScoutState.PATROLLING;
        this.targetX = Math.random() * CONFIG.WORLD.WIDTH;
        this.targetY = Math.random() * CONFIG.WORLD.HEIGHT;

        // Patrol center
        this.patrolCenterX = Math.random() * CONFIG.WORLD.WIDTH;
        this.patrolCenterY = Math.random() * CONFIG.WORLD.HEIGHT;

        // Attack targets
        this.villageAttackTarget = null;
        this.villageAttackCooldown = 0;
        this.heroAttackCooldown = 0;
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
        if (!this.isBuffed) {
            this.isBuffed = true;
            this.speed *= CONFIG.SCOUT.SPEED_BUFF_MULTIPLIER;
            this.maxHp += CONFIG.SCOUT.HP_BUFF_BONUS;
            this.hp += CONFIG.SCOUT.HP_BUFF_BONUS;
            this.color = CONFIG.SCOUT.BUFFED_COLOR;
        }
    }

    /**
     * Update scout AI and movement
     * @param {number} deltaTime - Time since last frame
     * @param {Object} hero - Hero entity
     * @param {Array} forests - Forest areas
     * @param {Array} villages - Village entities
     */
    update(deltaTime, hero, forests, villages) {
        this.villageAttackCooldown -= deltaTime;
        this.heroAttackCooldown -= deltaTime;

        // State machine
        if (this.state === ScoutState.PATROLLING) {
            this.updatePatrolling(hero, forests, villages);
        }

        if (this.state === ScoutState.CHASING) {
            this.targetX = hero.x;
            this.targetY = hero.y;
        } else if (this.state === ScoutState.ATTACKING_VILLAGE) {
            this.updateVillageAttack();
        } else if (this.state === ScoutState.PATROLLING) {
            this.updatePatrolMovement();
        }

        // Movement
        this.moveTowardsTarget();
    }

    /**
     * Update patrol state
     */
    updatePatrolling(hero, forests, villages) {
        // Check if we can see the hero
        if (this.canSeeHero(hero, forests)) {
            this.state = ScoutState.CHASING;
            this.applyBuff();
            return;
        }

        // Look for village targets
        for (const village of villages) {
            const allTargets = [...village.villagers, ...village.huts];

            for (const target of allTargets) {
                if (target.hp <= 0) continue;

                const distToTarget = distance(this.x, this.y, target.x, target.y);
                if (distToTarget <= CONFIG.SCOUT.SIGHT_RANGE) {
                    this.state = ScoutState.ATTACKING_VILLAGE;
                    this.villageAttackTarget = target;
                    village.isUnderAttack = true;
                    village.attackers.add(this.id);
                    this.applyBuff();
                    return;
                }
            }
        }
    }

    /**
     * Update village attack behavior
     */
    updateVillageAttack() {
        if (!this.villageAttackTarget || this.villageAttackTarget.hp <= 0) {
            this.state = ScoutState.PATROLLING;
            this.villageAttackTarget = null;
            return;
        }

        this.targetX = this.villageAttackTarget.x;
        this.targetY = this.villageAttackTarget.y;

        const distToTarget = distance(this.x, this.y, this.targetX, this.targetY);
        if (distToTarget < 30 && this.villageAttackCooldown <= 0) {
            this.villageAttackTarget.hp -= CONFIG.SCOUT.VILLAGE_ATTACK_DAMAGE;
            this.villageAttackCooldown = CONFIG.SCOUT.VILLAGE_ATTACK_COOLDOWN;
        }
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

        // Don't move if chasing and in attack range but on cooldown
        let shouldMove = true;
        if (this.state === ScoutState.CHASING && dist < 30 && this.heroAttackCooldown > 0) {
            shouldMove = false;
        }

        if (dist > this.speed && shouldMove) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    /**
     * Try to attack the hero if in range
     * @param {Object} hero - Hero entity
     * @returns {boolean} True if attacked
     */
    tryAttackHero(hero) {
        const heroCenter = hero.getCenter();
        const dist = distance(this.x, this.y, heroCenter.x, heroCenter.y);

        if (dist < this.radius + hero.width / 2 && this.heroAttackCooldown <= 0) {
            this.heroAttackCooldown = CONFIG.SCOUT.HERO_ATTACK_COOLDOWN;
            return true;
        }
        return false;
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
     * @returns {Array} Array of drop objects { type, value }
     */
    getDrops() {
        const drops = [];

        // Always drop XP
        drops.push({
            type: 'xp',
            value: CONFIG.SCOUT.XP_DROP
        });

        // Chance to drop gold
        if (Math.random() < CONFIG.SCOUT.GOLD_DROP_CHANCE) {
            drops.push({
                type: 'gold',
                value: Math.floor(randomRange(CONFIG.SCOUT.GOLD_DROP_MIN, CONFIG.SCOUT.GOLD_DROP_MAX))
            });
        }

        return drops;
    }
}
