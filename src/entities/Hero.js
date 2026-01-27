/**
 * Grimm Dominion - Hero Entity
 * Player character with weapon system and pickups
 */

import { CONFIG } from '../config.js';
import { distanceSquared, clamp } from '../utils.js';
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

        // New stats from passives
        this.damageReduction = 0;
        this.critChance = 0;
        this.lifesteal = 0;
        this.goldMultiplier = 0;
        this.xpMultiplier = 0;
        this.thorns = 0;
        this.attackRangeMultiplier = 1;

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
    update(deltaTime, enemies, createAttack, movementInput = null) {
        // Movement
        if (movementInput && movementInput.active) {
            const moveX = movementInput.x * this.speed;
            const moveY = movementInput.y * this.speed;
            this.x += moveX;
            this.y += moveY;
            this.targetX = this.x;
            this.targetY = this.y;

            // Update facing direction
            this.facingX = movementInput.x;
            this.facingY = movementInput.y;
        } else {
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
                let nearestDistSq = weapon.definition.range * weapon.definition.range;

                for (const enemy of enemies) {
                    const distSq = distanceSquared(center.x, center.y, enemy.x, enemy.y);
                    if (distSq < nearestDistSq) {
                        nearestDistSq = distSq;
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
     * @returns {Object} Result { died, actualDamage, thornsReflect }
     */
    takeDamage(amount) {
        // Apply damage reduction
        const actualDamage = Math.max(1, amount * (1 - this.damageReduction));
        this.hp -= actualDamage;

        const result = {
            died: false,
            actualDamage: actualDamage,
            thornsReflect: this.thorns
        };

        if (this.hp <= 0) {
            this.hp = 0;
            result.died = true;
        }

        return result;
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
            case 'damageReduction':
                this.damageReduction = Math.min(0.75, this.damageReduction + effect.value);
                break;
            case 'critChance':
                this.critChance = Math.min(1.0, this.critChance + effect.value);
                break;
            case 'lifesteal':
                this.lifesteal += effect.value;
                break;
            case 'goldMultiplier':
                this.goldMultiplier += effect.value;
                break;
            case 'xpMultiplier':
                this.xpMultiplier += effect.value;
                break;
            case 'thorns':
                this.thorns += effect.value;
                break;
            case 'attackRange':
                this.attackRangeMultiplier += effect.value;
                break;
        }
    }

    /**
     * Remove a stat upgrade (for selling)
     * @param {Object} effect - Effect with stat and value
     */
    removeUpgrade(effect) {
        switch (effect.stat) {
            case 'maxHp':
                this.maxHp -= effect.value;
                this.hp = Math.min(this.hp, this.maxHp);
                break;
            case 'speed':
                this.speed -= effect.value;
                break;
            case 'damageMultiplier':
                this.damageMultiplier -= effect.value;
                break;
            case 'cooldownMultiplier':
                this.cooldownMultiplier -= effect.value;
                break;
            case 'pickupRange':
                this.pickupRangeMultiplier -= effect.value;
                break;
            case 'hpRegen':
                this.hpRegen -= effect.value;
                break;
            case 'damageReduction':
                this.damageReduction = Math.max(0, this.damageReduction - effect.value);
                break;
            case 'critChance':
                this.critChance = Math.max(0, this.critChance - effect.value);
                break;
            case 'lifesteal':
                this.lifesteal -= effect.value;
                break;
            case 'goldMultiplier':
                this.goldMultiplier -= effect.value;
                break;
            case 'xpMultiplier':
                this.xpMultiplier -= effect.value;
                break;
            case 'thorns':
                this.thorns -= effect.value;
                break;
            case 'attackRange':
                this.attackRangeMultiplier -= effect.value;
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
