/**
 * Grimm Dominion - Projectile Entity
 */

import { CONFIG, COLORS } from '../config.js';
import { distance } from '../utils.js';

export class Projectile {
    /**
     * Create a new projectile
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {number} targetId - ID of target scout
     * @param {string} owner - 'hero' or 'militia'
     */
    constructor(x, y, targetId, owner) {
        this.x = x;
        this.y = y;
        this.targetId = targetId;
        this.owner = owner;

        if (owner === 'hero') {
            this.radius = 5;
            this.color = COLORS.PROJECTILE_HERO;
            this.speed = CONFIG.HERO.PROJECTILE_SPEED;
            this.damage = null; // Damage set by hero
        } else {
            this.radius = 4;
            this.color = COLORS.PROJECTILE_MILITIA;
            this.speed = CONFIG.MILITIA.PROJECTILE_SPEED;
            this.damage = CONFIG.MILITIA.DAMAGE;
        }
    }

    /**
     * Update projectile position
     * @param {Array} scouts - Array of scouts to find target
     * @returns {Object|null} Hit result { target, damage } or null if should remove
     */
    update(deltaTime, scouts, heroDamage) {
        const target = scouts.find(s => s.id === this.targetId);

        // Remove if target doesn't exist
        if (!target) {
            return { remove: true };
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const step = this.speed * deltaTime * 60;
        if (dist > step) {
            // Move towards target
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
            return null;
        } else {
            // Hit target
            const damage = this.owner === 'hero' ? heroDamage : this.damage;
            return {
                remove: true,
                hit: true,
                target: target,
                damage: damage,
                owner: this.owner
            };
        }
    }
}
