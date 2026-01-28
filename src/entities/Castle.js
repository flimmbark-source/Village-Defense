/**
 * Grimm Dominion - Castle Entity (Dark Lord's Fortress)
 * The main objective - destroy this to win!
 */

import { CONFIG } from '../config.js';
import { generateId } from '../utils.js';

export const EnemyType = {
    SCOUT: 'scout',
    ELITE: 'elite',
    BRUTE: 'brute',
    SWARM: 'swarm'
};

export class Castle {
    constructor(x, y) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.width = CONFIG.CASTLE.WIDTH;
        this.height = CONFIG.CASTLE.HEIGHT;
        this.radius = Math.max(this.width, this.height) / 2;

        // HP
        this.hp = CONFIG.CASTLE.MAX_HP;
        this.maxHp = CONFIG.CASTLE.MAX_HP;

        // Wave spawning
        this.spawnTimer = 0;
        this.spawnCooldown = CONFIG.CASTLE.BASE_SPAWN_COOLDOWN;
        this.waveNumber = 0;

        // Time-based scaling
        this.gameTime = 0;
        this.currentWaveSize = 1;

        // Skill tree bonuses
        this.spawnCooldownBonus = 0; // Added delay from skill tree
        this.waveReduction = 0; // Reduce wave size from skill tree
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

    /**
     * Get HP percentage
     * @returns {number} HP as 0-1 ratio
     */
    getHPPercent() {
        return this.hp / this.maxHp;
    }

    /**
     * Update castle state
     * @param {number} deltaTime - Time since last frame
     * @returns {Array|null} Array of enemy types to spawn, or null
     */
    update(deltaTime) {
        if (this.hp <= 0) return null;

        this.gameTime += deltaTime;
        this.spawnTimer += deltaTime;

        // Check if it's time to spawn a wave (with skill tree bonus delay)
        const effectiveCooldown = this.spawnCooldown + this.spawnCooldownBonus;
        if (this.spawnTimer >= effectiveCooldown) {
            this.spawnTimer = 0;
            this.waveNumber++;

            // Calculate wave size based on game time
            const timeScaling = Math.floor(this.gameTime / CONFIG.CASTLE.SCALE_INTERVAL);
            const baseWaveSize = Math.min(1 + timeScaling, CONFIG.CASTLE.MAX_WAVE_SIZE);

            // Apply wave reduction from skill tree
            this.currentWaveSize = Math.max(1, baseWaveSize - this.waveReduction);

            return this.generateWave();
        }

        return null;
    }

    /**
     * Generate a wave of enemies based on HP thresholds
     * @returns {Array} Array of enemy types to spawn
     */
    generateWave() {
        const wave = [];
        const hpPercent = this.getHPPercent();
        const thresholds = CONFIG.CASTLE.THRESHOLDS;

        for (let i = 0; i < this.currentWaveSize; i++) {
            wave.push(this.pickEnemyType(hpPercent, thresholds));
        }

        return wave;
    }

    /**
     * Pick an enemy type based on HP thresholds
     * @param {number} hpPercent - Current HP percentage
     * @param {Object} thresholds - HP threshold config
     * @returns {string} Enemy type
     */
    pickEnemyType(hpPercent, thresholds) {
        const roll = Math.random();

        // Below 25% - chance for swarm
        if (hpPercent < thresholds.SWARM_SPAWN) {
            if (roll < 0.4) return EnemyType.SWARM;
            if (roll < 0.6) return EnemyType.BRUTE;
            if (roll < 0.85) return EnemyType.ELITE;
            return EnemyType.SCOUT;
        }

        // Below 50% - chance for brutes
        if (hpPercent < thresholds.BRUTE_SPAWN) {
            if (roll < 0.3) return EnemyType.BRUTE;
            if (roll < 0.6) return EnemyType.ELITE;
            return EnemyType.SCOUT;
        }

        // Below 75% - chance for elites
        if (hpPercent < thresholds.ELITE_SPAWN) {
            if (roll < 0.4) return EnemyType.ELITE;
            return EnemyType.SCOUT;
        }

        // Full HP - only basic scouts
        return EnemyType.SCOUT;
    }

    /**
     * Take damage
     * @param {number} amount - Damage to take
     * @returns {boolean} True if destroyed
     */
    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);

        // Speed up spawning as HP decreases
        const hpPercent = this.getHPPercent();
        const cooldownRange = CONFIG.CASTLE.BASE_SPAWN_COOLDOWN - CONFIG.CASTLE.MIN_SPAWN_COOLDOWN;
        this.spawnCooldown = CONFIG.CASTLE.MIN_SPAWN_COOLDOWN + cooldownRange * hpPercent;

        return this.hp <= 0;
    }

    /**
     * Check if castle is destroyed
     * @returns {boolean} True if destroyed
     */
    isDestroyed() {
        return this.hp <= 0;
    }

    /**
     * Get spawn progress (0-1)
     * @returns {number} Progress to next spawn
     */
    getSpawnProgress() {
        const effectiveCooldown = this.spawnCooldown + this.spawnCooldownBonus;
        return this.spawnTimer / effectiveCooldown;
    }
}
