/**
 * Grimm Dominion - Village Entity
 */

import { CONFIG } from '../config.js';
import { distance, generateId } from '../utils.js';
import { ArrowTower } from './ArrowTower.js';
import { Barracks } from './Barracks.js';

export class Villager {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.VILLAGE.VILLAGER_RADIUS;
        this.hp = CONFIG.VILLAGE.VILLAGER_HP;
        this.maxHp = CONFIG.VILLAGE.VILLAGER_HP;
    }

    isDead() {
        return this.hp <= 0;
    }
}

export class Hut {
    constructor(x, y) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.width = CONFIG.VILLAGE.HUT_WIDTH;
        this.height = CONFIG.VILLAGE.HUT_HEIGHT;
        this.hp = CONFIG.VILLAGE.HUT_HP;
        this.maxHp = CONFIG.VILLAGE.HUT_HP;
    }

    /**
     * Take damage
     * @param {number} amount - Damage amount
     * @returns {boolean} True if destroyed
     */
    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        return this.hp <= 0;
    }

    isDead() {
        return this.hp <= 0;
    }

    /**
     * Get center position
     * @returns {Object} Center coordinates
     */
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }
}

// Militia states
const MilitiaState = {
    IDLE: 'IDLE',
    ENGAGING: 'ENGAGING',
    DISENGAGING: 'DISENGAGING'
};

export class Militia {
    constructor(x, y) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.homeX = x; // Remember spawn position for returning
        this.homeY = y;
        this.width = CONFIG.MILITIA.WIDTH;
        this.height = CONFIG.MILITIA.HEIGHT;
        this.color = CONFIG.MILITIA.COLOR;

        this.hp = CONFIG.MILITIA.MAX_HP;
        this.maxHp = CONFIG.MILITIA.MAX_HP;
        this.attackTimer = 0;
        this.targetScout = null;

        // State machine
        this.state = MilitiaState.IDLE;

        // Disengage system
        this.attackCount = 0;
        this.disengageAttackThreshold = CONFIG.MILITIA.DISENGAGE_ATTACK_COUNT;

        // Sword swipe attack
        this.isAttacking = false;
        this.swipeTimer = 0;
        this.swipeAngle = 0;
        this.swipeProgress = 0;

        // Skill tree bonus
        this.damageBonus = 0; // Multiplier (e.g., 0.25 = +25% damage)
    }

    /**
     * Take damage
     * @param {number} amount - Damage amount
     * @returns {boolean} True if killed
     */
    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        return this.hp <= 0;
    }

    /**
     * Check if militia is dead
     * @returns {boolean} True if dead
     */
    isDead() {
        return this.hp <= 0;
    }

    /**
     * Update militia AI
     * @param {number} deltaTime - Time since last frame
     * @param {Object} village - Parent village
     * @param {Array} scouts - All scouts
     * @param {Function} onMeleeHit - Callback when melee attack hits (scoutId, damage)
     * @returns {Object|null} Attack event for rendering
     */
    update(deltaTime, village, scouts, onMeleeHit) {
        if (this.isDead()) return null;

        const speedMult = CONFIG.SPEED_MULTIPLIER;
        this.attackTimer -= deltaTime * speedMult;
        let attackEvent = null;

        // Update swipe animation
        if (this.isAttacking) {
            this.swipeTimer += deltaTime * speedMult;
            this.swipeProgress = this.swipeTimer / CONFIG.MILITIA.SWIPE_DURATION;
            if (this.swipeTimer >= CONFIG.MILITIA.SWIPE_DURATION) {
                this.isAttacking = false;
                this.swipeTimer = 0;
                this.swipeProgress = 0;
            }
        }

        // State machine
        switch (this.state) {
            case MilitiaState.IDLE:
                if (village.isUnderAttack) {
                    this.state = MilitiaState.ENGAGING;
                    this.attackCount = 0;
                }
                break;

            case MilitiaState.ENGAGING:
                attackEvent = this.updateEngaging(deltaTime, village, scouts, onMeleeHit);
                break;

            case MilitiaState.DISENGAGING:
                this.updateDisengaging(deltaTime, village);
                break;
        }

        return attackEvent;
    }

    /**
     * Update engaging state - chase and attack enemies
     */
    updateEngaging(deltaTime, village, scouts, onMeleeHit) {
        // Check if we should disengage
        if (this.attackCount >= this.disengageAttackThreshold) {
            this.state = MilitiaState.DISENGAGING;
            this.targetScout = null;
            return null;
        }

        // Find or validate target
        if (!this.targetScout || this.targetScout.hp <= 0 || !village.attackers.has(this.targetScout.id)) {
            this.targetScout = scouts.find(s => village.attackers.has(s.id) && s.hp > 0) || null;
        }

        if (!this.targetScout) {
            // No targets, return to idle
            if (!village.isUnderAttack) {
                this.state = MilitiaState.IDLE;
            }
            return null;
        }

        // Move towards target
        const dx = this.targetScout.x - this.x;
        const dy = this.targetScout.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > CONFIG.MILITIA.ATTACK_RANGE) {
            const step = CONFIG.MILITIA.SPEED * deltaTime * 60 * CONFIG.SPEED_MULTIPLIER;
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }

        // Melee attack if in range and cooldown ready
        if (dist <= CONFIG.MILITIA.ATTACK_RANGE && this.attackTimer <= 0 && !this.isAttacking) {
            // Start sword swipe
            this.isAttacking = true;
            this.swipeTimer = 0;
            this.swipeAngle = Math.atan2(dy, dx);
            this.attackTimer = CONFIG.MILITIA.ATTACK_COOLDOWN;
            this.attackCount++;

            // Deal damage immediately (melee hit)
            if (onMeleeHit && this.targetScout && !this.targetScout.isDead()) {
                const damage = Math.floor(CONFIG.MILITIA.DAMAGE * (1 + this.damageBonus));
                onMeleeHit(this.targetScout, damage, this);
            }

            // Return attack event for visual
            return {
                type: 'militia_swipe',
                x: this.x,
                y: this.y,
                angle: this.swipeAngle,
                militia: this
            };
        }

        return null;
    }

    /**
     * Update disengaging state - return to village
     */
    updateDisengaging(deltaTime, village) {
        const dx = this.homeX - this.x;
        const dy = this.homeY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Move back to home position with speed boost
        const speed = CONFIG.MILITIA.SPEED * CONFIG.MILITIA.DISENGAGE_SPEED_MULTIPLIER;
        const step = speed * deltaTime * 60 * CONFIG.SPEED_MULTIPLIER;

        if (dist > step) {
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        } else {
            // Reached home, reset and check if still under attack
            this.x = this.homeX;
            this.y = this.homeY;
            this.attackCount = 0;

            if (village.isUnderAttack) {
                this.state = MilitiaState.ENGAGING;
            } else {
                this.state = MilitiaState.IDLE;
            }
        }
    }
}

export class Village {
    constructor(x, y) {
        this.id = generateId();
        this.x = x;
        this.y = y;

        this.huts = [];
        this.villagers = [];
        this.militia = [];
        this.arrowTowers = [];
        this.barracks = [];

        this.isUnderAttack = false;
        this.attackers = new Set();
        this.heroHasHelped = false;

        // Skill tree bonuses (set by game)
        this.bonusMilitia = 0;
        this.militiaDamageBonus = 0;
        this.militiaHpBonus = 0;
        this.hasArrowTower = false;
        this.hasBarracks = false;
        this.barracksSpawnInterval = 30;

        // Save reward nodes (per wave)
        this.maxSaveNodes = 1; // Can be increased by skill tree
        this.filledSaveNodes = 0; // Nodes filled this wave
        this.saveGoldReward = 50; // Gold per node

        this.initialize();
    }

    /**
     * Initialize village entities
     */
    initialize() {
        // Create huts
        for (let i = 0; i < CONFIG.VILLAGE.HUT_COUNT; i++) {
            this.huts.push(new Hut(
                this.x + (Math.random() - 0.5) * 150,
                this.y + (Math.random() - 0.5) * 150
            ));
        }

        // Create villagers
        for (let i = 0; i < CONFIG.VILLAGE.VILLAGER_COUNT; i++) {
            this.villagers.push(new Villager(
                this.x + (Math.random() - 0.5) * 100,
                this.y + (Math.random() - 0.5) * 100
            ));
        }

        // Create militia (base + bonus)
        const totalMilitia = CONFIG.VILLAGE.MILITIA_COUNT + this.bonusMilitia;
        for (let i = 0; i < totalMilitia; i++) {
            const militia = new Militia(
                this.x + (Math.random() - 0.5) * 80,
                this.y + (Math.random() - 0.5) * 80
            );

            // Apply skill tree bonuses
            militia.maxHp += this.militiaHpBonus;
            militia.hp += this.militiaHpBonus;
            militia.damageBonus = this.militiaDamageBonus;

            this.militia.push(militia);
        }

        // Create arrow tower if unlocked
        if (this.hasArrowTower) {
            this.arrowTowers.push(new ArrowTower(
                this.x - 60,
                this.y - 70
            ));
        }

        // Create barracks if unlocked
        if (this.hasBarracks) {
            this.barracks.push(new Barracks(
                this.x + 60,
                this.y - 70,
                this.barracksSpawnInterval
            ));
        }
    }

    /**
     * Apply skill tree bonuses to village (called when skills change)
     * @param {Object} bonuses - Skill tree bonuses
     */
    applySkillBonuses(bonuses) {
        this.bonusMilitia = bonuses.extraMilitiaPerVillage || 0;
        this.militiaDamageBonus = bonuses.militiaDamageBonus || 0;
        this.militiaHpBonus = bonuses.militiaHpBonus || 0;
        this.hasArrowTower = bonuses.arrowTowerPerVillage > 0;
        this.hasBarracks = bonuses.barracksPerVillage > 0;
        this.barracksSpawnInterval = bonuses.barracksSpawnInterval || 30;

        // Re-initialize to apply bonuses
        this.huts = [];
        this.villagers = [];
        this.militia = [];
        this.arrowTowers = [];
        this.barracks = [];
        this.initialize();
    }

    /**
     * Update village and militia
     * @param {number} deltaTime - Time since last frame
     * @param {Array} scouts - All scouts
     * @param {Function} onMeleeHit - Callback when militia melee attack hits (scout, damage, militia)
     * @returns {Array} Array of attack events (including arrow projectiles)
     */
    update(deltaTime, scouts, onMeleeHit) {
        const attackEvents = [];

        // Update militia
        for (const m of this.militia) {
            const event = m.update(deltaTime, this, scouts, onMeleeHit);
            if (event) {
                attackEvents.push(event);
            }
        }

        // Update arrow towers
        for (const tower of this.arrowTowers) {
            const event = tower.update(deltaTime, scouts);
            if (event) {
                // Arrow projectile creation event
                attackEvents.push(event);
            }
        }

        // Update barracks - spawn militia
        for (const barracks of this.barracks) {
            const newMilitia = barracks.update(deltaTime);
            if (newMilitia) {
                // Apply current bonuses to new militia
                newMilitia.maxHp += this.militiaHpBonus;
                newMilitia.hp += this.militiaHpBonus;
                newMilitia.damageBonus = this.militiaDamageBonus;
                this.militia.push(newMilitia);
            }
        }

        // Clean up dead entities
        this.villagers = this.villagers.filter(v => !v.isDead());
        this.militia = this.militia.filter(m => !m.isDead());
        this.arrowTowers = this.arrowTowers.filter(t => !t.isDead());
        this.barracks = this.barracks.filter(b => !b.isDead());

        // If all huts are destroyed, stop being under attack
        if (this.isDestroyed() && this.isUnderAttack) {
            this.isUnderAttack = false;
            this.attackers.clear();
        }

        return attackEvents;
    }

    /**
     * Check if village is destroyed (all huts gone)
     * @returns {boolean} True if all huts are destroyed
     */
    isDestroyed() {
        return this.huts.every(h => h.isDead());
    }

    /**
     * Get number of remaining huts
     * @returns {number} Count of living huts
     */
    getRemainingHuts() {
        return this.huts.filter(h => !h.isDead()).length;
    }

    /**
     * Get a specific hut by ID
     * @param {string} id - Hut ID
     * @returns {Object|null} Hut or null
     */
    getHutById(id) {
        return this.huts.find(h => h.id === id) || null;
    }

    /**
     * Remove an attacker from this village
     * @param {number} scoutId - Scout ID to remove
     * @returns {Object|null} Result with heroHelped and goldAwarded if attack ended
     */
    removeAttacker(scoutId) {
        if (!this.attackers.has(scoutId)) return null;

        this.attackers.delete(scoutId);

        if (this.attackers.size === 0 && this.isUnderAttack) {
            this.isUnderAttack = false;
            const heroHelped = this.heroHasHelped;
            this.heroHasHelped = false;

            // Check if we should award gold (hero helped and nodes available)
            let goldAwarded = 0;
            if (heroHelped && this.filledSaveNodes < this.maxSaveNodes) {
                this.filledSaveNodes++;
                goldAwarded = this.saveGoldReward;
            }

            return { attackEnded: true, heroHelped, goldAwarded };
        }

        return { attackEnded: false };
    }

    /**
     * Mark that the hero has helped defend this village
     */
    markHeroHelped() {
        this.heroHasHelped = true;
    }

    /**
     * Reset save nodes for new wave
     */
    resetSaveNodes() {
        this.filledSaveNodes = 0;
    }
}
