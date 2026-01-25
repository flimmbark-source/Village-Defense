/**
 * Grimm Dominion - Village Entity
 */

import { CONFIG } from '../config.js';
import { distance, generateId } from '../utils.js';

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

export class Militia {
    constructor(x, y) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.width = CONFIG.MILITIA.WIDTH;
        this.height = CONFIG.MILITIA.HEIGHT;
        this.color = CONFIG.MILITIA.COLOR;

        this.hp = CONFIG.MILITIA.MAX_HP;
        this.maxHp = CONFIG.MILITIA.MAX_HP;
        this.attackTimer = 0;
        this.targetScout = null;
    }

    /**
     * Update militia AI
     * @param {number} deltaTime - Time since last frame
     * @param {Object} village - Parent village
     * @param {Array} scouts - All scouts
     * @param {Function} createProjectile - Callback to create projectile
     */
    update(deltaTime, village, scouts, createProjectile) {
        this.attackTimer -= deltaTime;

        if (!village.isUnderAttack) {
            this.targetScout = null;
            return;
        }

        // Find or validate target
        if (!this.targetScout || this.targetScout.hp <= 0 || !village.attackers.has(this.targetScout.id)) {
            this.targetScout = scouts.find(s => village.attackers.has(s.id)) || null;
        }

        if (!this.targetScout) return;

        // Move towards target
        const dx = this.targetScout.x - this.x;
        const dy = this.targetScout.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > CONFIG.MILITIA.SPEED) {
            this.x += (dx / dist) * CONFIG.MILITIA.SPEED;
            this.y += (dy / dist) * CONFIG.MILITIA.SPEED;
        }

        // Attack if in range
        if (dist < CONFIG.MILITIA.ATTACK_RANGE && this.attackTimer <= 0) {
            createProjectile(this.x, this.y, this.targetScout.id, 'militia');
            this.attackTimer = CONFIG.MILITIA.ATTACK_COOLDOWN;
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

        this.isUnderAttack = false;
        this.attackers = new Set();
        this.heroHasHelped = false;

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

        // Create militia
        for (let i = 0; i < CONFIG.VILLAGE.MILITIA_COUNT; i++) {
            this.militia.push(new Militia(
                this.x + (Math.random() - 0.5) * 80,
                this.y + (Math.random() - 0.5) * 80
            ));
        }
    }

    /**
     * Update village and militia
     * @param {number} deltaTime - Time since last frame
     * @param {Array} scouts - All scouts
     * @param {Function} createProjectile - Callback to create projectile
     */
    update(deltaTime, scouts, createProjectile) {
        // Update militia
        for (const m of this.militia) {
            m.update(deltaTime, this, scouts, createProjectile);
        }

        // Clean up dead villagers
        this.villagers = this.villagers.filter(v => !v.isDead());

        // If all huts are destroyed, stop being under attack
        if (this.isDestroyed() && this.isUnderAttack) {
            this.isUnderAttack = false;
            this.attackers.clear();
        }
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
     * @returns {Object|null} Result with heroHelped if attack ended
     */
    removeAttacker(scoutId) {
        if (!this.attackers.has(scoutId)) return null;

        this.attackers.delete(scoutId);

        if (this.attackers.size === 0 && this.isUnderAttack) {
            this.isUnderAttack = false;
            const heroHelped = this.heroHasHelped;
            this.heroHasHelped = false;
            return { attackEnded: true, heroHelped };
        }

        return { attackEnded: false };
    }

    /**
     * Mark that the hero has helped defend this village
     */
    markHeroHelped() {
        this.heroHasHelped = true;
    }
}
