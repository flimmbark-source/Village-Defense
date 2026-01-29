/**
 * Village Defense - Arrow Tower Entity
 *
 * Defensive structure that shoots arrows at nearby enemies
 */

import { generateId } from '../utils.js';

export class ArrowTower {
    constructor(x, y) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;

        this.hp = 150;
        this.maxHp = 150;

        this.damage = 15;
        this.range = 250;
        this.attackCooldown = 1.5; // seconds
        this.attackTimer = 0;

        this.target = null;
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

    /**
     * Check if tower is destroyed
     * @returns {boolean} True if destroyed
     */
    isDead() {
        return this.hp <= 0;
    }

    /**
     * Update arrow tower
     * @param {number} deltaTime - Time since last frame
     * @param {Array} scouts - All enemy scouts
     * @param {Function} onArrowShot - Callback when arrow is shot (target)
     * @returns {Object|null} Attack event for rendering
     */
    update(deltaTime, scouts, onArrowShot) {
        if (this.isDead()) return null;

        this.attackTimer -= deltaTime;

        // Find target in range
        if (!this.target || this.target.hp <= 0 || this.getDistanceToTarget(this.target) > this.range) {
            this.target = this.findNearestEnemy(scouts);
        }

        // Attack if target in range and cooldown ready
        if (this.target && this.attackTimer <= 0) {
            this.attackTimer = this.attackCooldown;

            // Trigger arrow shot callback
            if (onArrowShot) {
                onArrowShot(this.target);
            }

            return {
                type: 'arrow_tower_shot',
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                targetX: this.target.x,
                targetY: this.target.y
            };
        }

        return null;
    }

    /**
     * Find nearest enemy in range
     * @param {Array} scouts - All scouts
     * @returns {Object|null} Nearest scout or null
     */
    findNearestEnemy(scouts) {
        let nearest = null;
        let minDist = this.range;

        for (const scout of scouts) {
            if (scout.hp <= 0) continue;

            const dist = this.getDistanceToTarget(scout);
            if (dist < minDist) {
                minDist = dist;
                nearest = scout;
            }
        }

        return nearest;
    }

    /**
     * Get distance to target
     * @param {Object} target - Target entity
     * @returns {number} Distance
     */
    getDistanceToTarget(target) {
        const dx = target.x - (this.x + this.width / 2);
        const dy = target.y - (this.y + this.height / 2);
        return Math.sqrt(dx * dx + dy * dy);
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
