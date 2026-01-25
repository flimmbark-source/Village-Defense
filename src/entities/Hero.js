/**
 * Grimm Dominion - Hero Entity
 * Player character with weapon system and pickups
 */

import { CONFIG } from '../config.js';
import { distance, clamp } from '../utils.js';
import { WeaponInstance } from './Weapon.js';

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

        // Stat multipliers (from upgrades)
        this.damageMultiplier = 1;
        this.cooldownMultiplier = 0; // Negative = faster
        this.pickupRangeMultiplier = 1;
        this.hpRegen = 0;
        this.regenTimer = 0;

        // Weapons (inventory of WeaponInstances)
        this.weapons = [];

        // Last facing direction (for attacks)
        this.facingX = 1;
        this.facingY = 0;
    }

    /**
     * Add starting weapon
     * @param {string} weaponId - Weapon ID from config
     */
    addStartingWeapon(weaponId) {
        this.weapons.push(new WeaponInstance(weaponId, 1));
    }

    /**
     * Add a weapon
     * @param {string} weaponId - Weapon ID
     * @returns {boolean} True if added successfully
     */
    addWeapon(weaponId) {
        // Check if we already have this weapon
        const existing = this.weapons.find(w => w.id === weaponId);
        if (existing) {
            existing.levelUp();
            return true;
        }

        // Add new weapon (max 6 weapons like inventory size)
        if (this.weapons.length < CONFIG.INVENTORY_SIZE) {
            this.weapons.push(new WeaponInstance(weaponId, 1));
            return true;
        }
        return false;
    }

    /**
     * Upgrade a weapon
     * @param {string} weaponId - Weapon ID to upgrade
     * @returns {boolean} True if upgraded
     */
    upgradeWeapon(weaponId) {
        const weapon = this.weapons.find(w => w.id === weaponId);
        if (weapon) {
            weapon.levelUp();
            return true;
        }
        return false;
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
     * Update hero
     * @param {number} deltaTime - Time since last frame
     * @param {Array} enemies - Array of enemies for targeting
     * @param {Function} createAttack - Callback to create an attack
     */
    update(deltaTime, enemies, createAttack) {
        // Movement
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.speed) {
            const moveX = (dx / dist) * this.speed;
            const moveY = (dy / dist) * this.speed;
            this.x += moveX;
            this.y += moveY;

            // Update facing direction
            this.facingX = dx / dist;
            this.facingY = dy / dist;
        }

        // Clamp to world bounds
        this.x = clamp(this.x, 0, CONFIG.WORLD.WIDTH - this.width);
        this.y = clamp(this.y, 0, CONFIG.WORLD.HEIGHT - this.height);

        // HP Regeneration
        if (this.hpRegen > 0) {
            this.regenTimer += deltaTime;
            if (this.regenTimer >= 1) {
                this.regenTimer -= 1;
                this.hp = Math.min(this.hp + this.hpRegen, this.maxHp);
            }
        }

        // Update weapons and auto-attack
        for (const weapon of this.weapons) {
            weapon.update(deltaTime);

            if (weapon.canAttack() && enemies.length > 0) {
                // Find nearest enemy in range
                const center = this.getCenter();
                let nearest = null;
                let nearestDist = weapon.definition.range;

                for (const enemy of enemies) {
                    const d = distance(center.x, center.y, enemy.x, enemy.y);
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearest = enemy;
                    }
                }

                if (nearest) {
                    const attack = weapon.attack(
                        center.x, center.y,
                        nearest.x, nearest.y,
                        this.cooldownMultiplier,
                        this.damageMultiplier
                    );
                    createAttack(attack);
                }
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
     */
    applyUpgrade(effect) {
        switch (effect.stat) {
            case 'maxHp':
                this.maxHp += effect.value;
                this.hp += effect.value;
                break;
            case 'speed':
                this.speed += effect.value;
                break;
            case 'damageMultiplier':
                this.damageMultiplier += effect.value;
                break;
            case 'cooldownMultiplier':
                this.cooldownMultiplier += effect.value;
                break;
            case 'pickupRange':
                this.pickupRangeMultiplier += effect.value;
                break;
            case 'hpRegen':
                this.hpRegen += effect.value;
                break;
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
     * Get effective pickup range
     * @returns {number} Pickup range
     */
    getPickupRange() {
        return CONFIG.HERO.PICKUP_RANGE * this.pickupRangeMultiplier;
    }

    /**
     * Get effective pickup magnet range
     * @returns {number} Magnet range
     */
    getPickupMagnetRange() {
        return CONFIG.HERO.PICKUP_MAGNET_RANGE * this.pickupRangeMultiplier;
    }

    /**
     * Get health percentage
     * @returns {number} Health ratio 0-1
     */
    getHealthRatio() {
        return this.hp / this.maxHp;
    }
}
