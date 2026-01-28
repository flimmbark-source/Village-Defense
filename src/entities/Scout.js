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
    ATTACKING_CASTLE: 'ATTACKING_CASTLE',
    DISENGAGING: 'DISENGAGING' // Moving towards village, can fire at hero but won't chase
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

        // Village priority / disengage system
        this.disengageAttackCount = stats.DISENGAGE_ATTACK_COUNT || baseStats.DISENGAGE_ATTACK_COUNT || 3;
        this.disengageDuration = stats.DISENGAGE_DURATION || baseStats.DISENGAGE_DURATION || 3.0;
        this.disengageSpeedMultiplier = stats.DISENGAGE_SPEED_MULTIPLIER || baseStats.DISENGAGE_SPEED_MULTIPLIER || 1.2;
        this.heroAttackCount = 0; // Tracks attacks against hero
        this.disengageTimer = 0; // Timer during disengage phase
        this.disengageVillageTarget = null; // Village being moved towards during disengage
        this.enrageStacks = 0; // Bonus attacks from enrage debuff (from hero weapons)

        // Village attack tracking - reference to village for militia targeting
        this.attackingVillage = null;

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
            this.updateChasing(hero, deltaTime, villages);
        } else if (this.state === ScoutState.DISENGAGING) {
            this.updateDisengaging(hero, deltaTime, villages);
        } else if (this.state === ScoutState.ATTACKING_VILLAGE) {
            this.updateVillageAttack();
        } else if (this.state === ScoutState.PATROLLING) {
            this.updatePatrolMovement();
        }

        // Movement
        if (!this.updateDash(deltaTime)) {
            this.moveTowardsTarget(deltaTime, this.state === ScoutState.DISENGAGING);
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
            // Include militia as potential targets (they're a threat!)
            const allTargets = [
                ...village.militia.filter(m => !m.isDead()),
                ...village.huts.filter(h => !h.isDead())
            ];

            for (const target of allTargets) {
                const distToTargetSq = distanceSquared(this.x, this.y, target.x, target.y);
                if (distToTargetSq <= CONFIG.SCOUT.SIGHT_RANGE * CONFIG.SCOUT.SIGHT_RANGE) {
                    this.state = ScoutState.ATTACKING_VILLAGE;
                    this.villageAttackTarget = target;
                    this.currentTarget = target;
                    this.attackingVillage = village; // Store village reference
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
     * @param {Object} hero - Hero entity
     * @param {number} deltaTime - Time delta
     * @param {Array} villages - Village entities for disengage targeting
     */
    updateChasing(hero, deltaTime, villages) {
        const heroCenter = hero.getCenter();

        // Check if we should disengage based on hero attack count
        const effectiveDisengageCount = this.disengageAttackCount + this.enrageStacks + (hero.taunt || 0);
        if (this.heroAttackCount >= effectiveDisengageCount) {
            // Find nearest non-destroyed village to disengage towards
            const targetVillage = this.findNearestVillage(villages);
            if (targetVillage) {
                this.state = ScoutState.DISENGAGING;
                this.disengageVillageTarget = targetVillage;
                this.disengageTimer = this.disengageDuration;
                this.heroAttackCount = 0; // Reset counter
                return;
            }
        }

        const combatTarget = this.getCombatTarget(heroCenter, deltaTime);
        this.targetX = combatTarget.x;
        this.targetY = combatTarget.y;
        this.currentTarget = hero;
    }

    /**
     * Update disengaging state - moving towards village while firing at hero
     * @param {Object} hero - Hero entity (can still fire at)
     * @param {number} deltaTime - Time delta
     * @param {Array} villages - Village entities
     */
    updateDisengaging(hero, deltaTime, villages) {
        this.disengageTimer -= deltaTime;

        // If timer expired, transition to village attack or resume chase
        if (this.disengageTimer <= 0) {
            if (this.disengageVillageTarget && !this.disengageVillageTarget.isDestroyed()) {
                // Switch to attacking the village
                this.state = ScoutState.ATTACKING_VILLAGE;
                this.attackingVillage = this.disengageVillageTarget;

                // Prioritize militia targets first, then huts
                const validMilitia = this.disengageVillageTarget.militia.filter(m => !m.isDead());
                const validHuts = this.disengageVillageTarget.huts.filter(h => !h.isDead());

                if (validMilitia.length > 0) {
                    this.villageAttackTarget = validMilitia[0];
                    this.currentTarget = validMilitia[0];
                } else if (validHuts.length > 0) {
                    this.villageAttackTarget = validHuts[0];
                    this.currentTarget = validHuts[0];
                }

                this.disengageVillageTarget.isUnderAttack = true;
                this.disengageVillageTarget.attackers.add(this.id);
            } else {
                // No valid village, go back to patrolling
                this.state = ScoutState.PATROLLING;
            }
            this.disengageVillageTarget = null;
            this.enrageStacks = 0; // Clear enrage when disengage ends
            return;
        }

        // Move towards village center
        if (this.disengageVillageTarget && !this.disengageVillageTarget.isDestroyed()) {
            this.targetX = this.disengageVillageTarget.x;
            this.targetY = this.disengageVillageTarget.y;
        } else {
            // Village was destroyed, find another or return to patrol
            const newTarget = this.findNearestVillage(villages);
            if (newTarget) {
                this.disengageVillageTarget = newTarget;
                this.targetX = newTarget.x;
                this.targetY = newTarget.y;
            } else {
                this.state = ScoutState.PATROLLING;
                this.disengageVillageTarget = null;
            }
        }

        // Keep tracking hero for opportunistic attacks (handled in checkForAttack)
        this.currentTarget = hero;
    }

    /**
     * Find the nearest non-destroyed village
     * @param {Array} villages - Village entities
     * @returns {Object|null} Nearest village or null
     */
    findNearestVillage(villages) {
        let nearest = null;
        let nearestDistSq = Infinity;

        for (const village of villages) {
            if (village.isDestroyed()) continue;

            const distSq = distanceSquared(this.x, this.y, village.x, village.y);
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = village;
            }
        }

        return nearest;
    }

    /**
     * Update village attack behavior
     * Prioritizes militia (threats) over huts
     */
    updateVillageAttack() {
        // If current target is dead, find a new one
        if (!this.villageAttackTarget || this.villageAttackTarget.isDead()) {
            // Try to find a new target in the same village
            if (this.attackingVillage && !this.attackingVillage.isDestroyed()) {
                // Prioritize militia (they're shooting at us!)
                const nearestMilitia = this.findNearestTarget(this.attackingVillage.militia.filter(m => !m.isDead()));
                if (nearestMilitia) {
                    this.villageAttackTarget = nearestMilitia;
                    this.currentTarget = nearestMilitia;
                    return;
                }

                // Fall back to huts
                const nearestHut = this.findNearestTarget(this.attackingVillage.huts.filter(h => !h.isDead()));
                if (nearestHut) {
                    this.villageAttackTarget = nearestHut;
                    this.currentTarget = nearestHut;
                    return;
                }
            }

            // No valid targets, go back to patrolling
            this.state = ScoutState.PATROLLING;
            this.villageAttackTarget = null;
            this.currentTarget = null;
            this.attackingVillage = null;
            return;
        }

        // Check if there's nearby militia we should prioritize over current target (if current is a hut)
        if (this.attackingVillage && this.villageAttackTarget.width === CONFIG.VILLAGE.HUT_WIDTH) {
            const aliveMilitia = this.attackingVillage.militia.filter(m => !m.isDead());
            if (aliveMilitia.length > 0) {
                // Check if any militia is close and threatening
                const nearestMilitia = this.findNearestTarget(aliveMilitia);
                if (nearestMilitia) {
                    const distToMilitia = distanceSquared(this.x, this.y, nearestMilitia.x, nearestMilitia.y);
                    // Switch target if militia is within attack range
                    if (distToMilitia < (this.attackRange + 50) * (this.attackRange + 50)) {
                        this.villageAttackTarget = nearestMilitia;
                        this.currentTarget = nearestMilitia;
                    }
                }
            }
        }

        this.targetX = this.villageAttackTarget.x + (this.villageAttackTarget.width || 0) / 2;
        this.targetY = this.villageAttackTarget.y + (this.villageAttackTarget.height || 0) / 2;
    }

    /**
     * Find the nearest target from a list
     * @param {Array} targets - Array of potential targets
     * @returns {Object|null} Nearest target or null
     */
    findNearestTarget(targets) {
        let nearest = null;
        let nearestDistSq = Infinity;

        for (const target of targets) {
            const distSq = distanceSquared(this.x, this.y, target.x, target.y);
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = target;
            }
        }

        return nearest;
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
     * @param {number} deltaTime - Time delta
     * @param {boolean} isDisengaging - Whether in disengage state (use speed multiplier)
     */
    moveTowardsTarget(deltaTime, isDisengaging = false) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speedMult = isDisengaging ? this.disengageSpeedMultiplier : 1.0;
        const step = this.speed * speedMult * deltaTime * 60;

        if (dist > step) {
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
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

        // Check hero distance - can attack hero while CHASING or DISENGAGING
        const heroCenter = hero.getCenter();
        const distToHeroSq = distanceSquared(this.x, this.y, heroCenter.x, heroCenter.y);
        const heroAttackRange = this.attackRange + hero.width / 2;

        if ((this.state === ScoutState.CHASING || this.state === ScoutState.DISENGAGING) &&
            distToHeroSq < heroAttackRange * heroAttackRange) {
            const aimTarget = this.getAttackTarget(heroCenter);
            this.startAttack(aimTarget.x, aimTarget.y, 'hero');
            // Increment hero attack counter (only while chasing, disengaging doesn't count)
            if (this.state === ScoutState.CHASING) {
                this.heroAttackCount++;
            }
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
                this.attackTimer = 1;
                this.attackProgress = 0;
            }
        } else if (this.attackPhase === AttackPhase.ACTIVE) {
            this.attackProgress = this.attackTimer / this.attackDuration;
            if (!this.attackHasDashed && this.attackTimer >= this.attackDuration * 0.5) {
                this.startAttackDash();
                this.attackHasDashed = true;
            }
            if (this.attackHasDashed && !this.attackHasFired
                && (this.dashDuration === 0 || this.dashTimer >= this.dashDuration)) {
                let aimTargetX = this.x + Math.cos(this.attackAngle);
                let aimTargetY = this.y + Math.sin(this.attackAngle);
                if (this.attackTargetType === 'hero' && this.currentTarget?.getCenter) {
                    const heroCenter = this.currentTarget.getCenter();
                    const aimTarget = this.getAttackTarget(heroCenter);
                    aimTargetX = aimTarget.x;
                    aimTargetY = aimTarget.y;
                } else if (this.attackTargetType === 'village' && this.villageAttackTarget) {
                    aimTargetX = this.villageAttackTarget.x + (this.villageAttackTarget.width || 0) / 2;
                    aimTargetY = this.villageAttackTarget.y + (this.villageAttackTarget.height || 0) / 2;
                }
                this.attackAngle = Math.atan2(aimTargetY - this.y, aimTargetX - this.x);
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
            if (this.attackHasFired && this.attackTimer >= this.attackDuration) {
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
     * Apply enrage debuff - increases disengage attack count
     * @param {number} stacks - Number of enrage stacks to add
     */
    applyEnrage(stacks) {
        this.enrageStacks += stacks;
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
