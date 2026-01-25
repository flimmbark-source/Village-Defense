/**
 * Grimm Dominion - Hero Entity
 */

import { CONFIG } from '../config.js';
import { distance, clamp } from '../utils.js';

export class Hero {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.HERO.WIDTH;
        this.height = CONFIG.HERO.HEIGHT;
        this.color = CONFIG.HERO.COLOR;

        this.targetX = x;
        this.targetY = y;

        this.hp = CONFIG.HERO.INITIAL_HP;
        this.maxHp = CONFIG.HERO.INITIAL_HP;
        this.gold = CONFIG.HERO.INITIAL_GOLD;

        this.speed = CONFIG.HERO.SPEED;
        this.attackDamage = CONFIG.HERO.ATTACK_DAMAGE;
        this.attackCooldown = CONFIG.HERO.ATTACK_COOLDOWN;
        this.attackTimer = 0;
        this.attackRange = CONFIG.HERO.ATTACK_RANGE;
        this.projectileSpeed = CONFIG.HERO.PROJECTILE_SPEED;

        this.inventory = new Array(CONFIG.INVENTORY_SIZE).fill(null);
    }

    /**
     * Set the movement target position
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     */
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Update hero position and attack logic
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Array} scouts - Array of scout enemies
     * @param {Function} createProjectile - Callback to create a projectile
     */
    update(deltaTime, scouts, createProjectile) {
        // Movement
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.speed) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        // Clamp to world bounds
        this.x = clamp(this.x, 0, CONFIG.WORLD.WIDTH - this.width);
        this.y = clamp(this.y, 0, CONFIG.WORLD.HEIGHT - this.height);

        // Attack cooldown
        this.attackTimer -= deltaTime;

        // Auto-attack nearest enemy in range
        if (this.attackTimer <= 0) {
            let nearestScout = null;
            let nearestDist = Infinity;

            for (const scout of scouts) {
                const d = distance(this.x, this.y, scout.x, scout.y);
                if (d < this.attackRange && d < nearestDist) {
                    nearestScout = scout;
                    nearestDist = d;
                }
            }

            if (nearestScout) {
                createProjectile(
                    this.x + this.width / 2,
                    this.y + this.height / 2,
                    nearestScout.id,
                    'hero'
                );
                this.attackTimer = this.attackCooldown;
            }
        }
    }

    /**
     * Take damage
     * @param {number} amount - Amount of damage to take
     * @returns {boolean} True if hero died
     */
    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            return true;
        }
        return false;
    }

    /**
     * Apply a stat upgrade
     * @param {Object} effect - Effect with stat and value
     * @param {number} multiplier - Multiplier for the effect (positive for apply, negative for remove)
     */
    applyUpgrade(effect, multiplier = 1) {
        if (effect.stat === 'maxHp') {
            this.maxHp += effect.value * multiplier;
            if (multiplier > 0) {
                this.hp += effect.value * multiplier;
            }
            this.hp = Math.min(this.hp, this.maxHp);
        } else {
            this[effect.stat] += effect.value * multiplier;
        }
    }

    /**
     * Add gold to hero
     * @param {number} amount - Amount of gold to add
     */
    addGold(amount) {
        this.gold += amount;
    }

    /**
     * Spend gold
     * @param {number} amount - Amount to spend
     * @returns {boolean} True if successful
     */
    spendGold(amount) {
        if (this.gold >= amount) {
            this.gold -= amount;
            return true;
        }
        return false;
    }

    /**
     * Get the center position of the hero
     * @returns {Object} Center position { x, y }
     */
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    /**
     * Add item to inventory
     * @param {Object} item - Item to add
     * @returns {boolean} True if successful
     */
    addToInventory(item) {
        const emptySlot = this.inventory.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
            this.inventory[emptySlot] = item;
            return true;
        }
        return false;
    }

    /**
     * Check if hero has an item
     * @param {string} itemId - Item ID to check
     * @returns {boolean} True if hero has the item
     */
    hasItem(itemId) {
        return this.inventory.some(item => item && item.id === itemId);
    }

    /**
     * Swap inventory slots
     * @param {number} fromIndex - Source slot index
     * @param {number} toIndex - Destination slot index
     */
    swapInventorySlots(fromIndex, toIndex) {
        [this.inventory[fromIndex], this.inventory[toIndex]] =
            [this.inventory[toIndex], this.inventory[fromIndex]];
    }
}
