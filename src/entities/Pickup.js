/**
 * Grimm Dominion - Pickup Entity (XP orbs, Gold)
 */

import { CONFIG } from '../config.js';
import { distance, generateId } from '../utils.js';

export const PickupType = {
    XP: 'xp',
    GOLD: 'gold'
};

export class Pickup {
    constructor(x, y, type, value) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.type = type;
        this.value = value;

        this.lifetime = CONFIG.PICKUP.LIFETIME;
        this.time = 0;
        this.collected = false;
        this.magnetized = false;

        // Visual properties based on type
        if (type === PickupType.XP) {
            this.radius = CONFIG.PICKUP.XP_RADIUS;
            this.color = CONFIG.PICKUP.XP_COLOR;
            this.glowColor = CONFIG.PICKUP.XP_GLOW;
        } else {
            this.radius = CONFIG.PICKUP.GOLD_RADIUS;
            this.color = CONFIG.PICKUP.GOLD_COLOR;
            this.glowColor = CONFIG.PICKUP.GOLD_GLOW;
        }

        // Spawn with slight random velocity
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3 - 2; // Slight upward bias
        this.friction = 0.92;
    }

    /**
     * Update pickup
     * @param {number} deltaTime - Time since last frame
     * @param {Object} hero - Hero entity for magnet effect
     * @returns {Object|null} Collection result if collected
     */
    update(deltaTime, hero) {
        this.time += deltaTime;
        this.lifetime -= deltaTime;

        // Apply initial velocity with friction
        if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= this.friction;
            this.vy *= this.friction;
            this.baseY = this.y;
        }

        // Floating animation
        this.y = this.baseY + Math.sin(this.time * CONFIG.PICKUP.FLOAT_SPEED) * CONFIG.PICKUP.FLOAT_AMPLITUDE;

        // Calculate distance to hero
        const heroCenter = hero.getCenter();
        const dist = distance(this.x, this.y, heroCenter.x, heroCenter.y);

        // Calculate effective pickup range (with upgrades)
        const magnetRange = hero.getPickupMagnetRange();
        const pickupRange = hero.getPickupRange();

        // Magnet effect - pull towards hero
        if (dist < magnetRange) {
            this.magnetized = true;
            const dx = heroCenter.x - this.x;
            const dy = heroCenter.y - this.y;
            const speed = CONFIG.HERO.PICKUP_MAGNET_SPEED * (1 - dist / magnetRange + 0.5);
            this.x += (dx / dist) * speed;
            this.baseY += (dy / dist) * speed;
        }

        // Collection
        if (dist < pickupRange) {
            this.collected = true;
            return {
                type: this.type,
                value: this.value
            };
        }

        // Check if expired
        if (this.lifetime <= 0) {
            this.collected = true;
            return null;
        }

        return null;
    }

    /**
     * Check if pickup should be removed
     * @returns {boolean} True if should remove
     */
    shouldRemove() {
        return this.collected;
    }

    /**
     * Get the visual alpha based on remaining lifetime
     * @returns {number} Alpha value 0-1
     */
    getAlpha() {
        if (this.lifetime > 5) return 1;
        // Fade out in last 5 seconds with blinking
        const fade = this.lifetime / 5;
        const blink = this.lifetime < 3 ? (Math.sin(this.time * 10) * 0.3 + 0.7) : 1;
        return fade * blink;
    }

    /**
     * Create XP pickup
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} value - XP value
     * @returns {Pickup} New XP pickup
     */
    static createXP(x, y, value) {
        return new Pickup(x, y, PickupType.XP, value);
    }

    /**
     * Create gold pickup
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} value - Gold value
     * @returns {Pickup} New gold pickup
     */
    static createGold(x, y, value) {
        return new Pickup(x, y, PickupType.GOLD, value);
    }
}
