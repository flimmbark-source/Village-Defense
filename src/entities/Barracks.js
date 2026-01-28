/**
 * Village Defense - Barracks Entity
 *
 * Building that periodically spawns militia guards for the village
 */

import { CONFIG } from '../config.js';
import { generateId } from '../utils.js';
import { Militia } from './Village.js';

export class Barracks {
    constructor(x, y, spawnInterval = 30) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 45;

        this.hp = 200;
        this.maxHp = 200;

        this.spawnInterval = spawnInterval; // seconds
        this.spawnTimer = spawnInterval; // Start with full timer
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
     * Check if barracks is destroyed
     * @returns {boolean} True if destroyed
     */
    isDead() {
        return this.hp <= 0;
    }

    /**
     * Update barracks - spawn militia periodically
     * @param {number} deltaTime - Time since last frame
     * @returns {Militia|null} New militia or null
     */
    update(deltaTime) {
        if (this.isDead()) return null;

        this.spawnTimer -= deltaTime * CONFIG.SPEED_MULTIPLIER;

        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.spawnInterval;

            // Spawn a new militia near the barracks
            const offsetX = (Math.random() - 0.5) * 60;
            const offsetY = (Math.random() - 0.5) * 60;
            return new Militia(
                this.x + this.width / 2 + offsetX,
                this.y + this.height / 2 + offsetY
            );
        }

        return null;
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
