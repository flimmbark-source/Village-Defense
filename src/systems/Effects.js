/**
 * Grimm Dominion - Visual Effects System
 * Handles particles, attack visuals, and other effects
 */

import { generateId } from '../utils.js';

/**
 * Particle for various visual effects
 */
export class Particle {
    constructor(x, y, options = {}) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.size = options.size || 5;
        this.color = options.color || '#ffffff';
        this.alpha = options.alpha || 1;
        this.lifetime = options.lifetime || 1;
        this.maxLifetime = this.lifetime;
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 1;
        this.shrink = options.shrink !== undefined ? options.shrink : true;
        this.shape = options.shape || 'circle'; // circle, square, star
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
    }

    update(deltaTime) {
        this.lifetime -= deltaTime;
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        this.vy += this.gravity * deltaTime;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.rotation += this.rotationSpeed * deltaTime;

        // Fade and shrink
        const lifeRatio = this.lifetime / this.maxLifetime;
        this.alpha = lifeRatio;
        if (this.shrink) {
            this.currentSize = this.size * lifeRatio;
        } else {
            this.currentSize = this.size;
        }
    }

    isDead() {
        return this.lifetime <= 0;
    }
}

/**
 * Floating damage/text number
 */
export class FloatingText {
    constructor(x, y, text, options = {}) {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = options.color || '#ffffff';
        this.font = options.font || 'bold 16px Inter';
        this.lifetime = options.lifetime || 1;
        this.maxLifetime = this.lifetime;
        this.floatSpeed = options.floatSpeed || 30;
        this.alpha = 1;
    }

    update(deltaTime) {
        this.lifetime -= deltaTime;
        this.y -= this.floatSpeed * deltaTime;
        this.alpha = Math.max(0, this.lifetime / this.maxLifetime);
    }

    isDead() {
        return this.lifetime <= 0;
    }
}

/**
 * Effects manager
 */
export class EffectsSystem {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
    }

    /**
     * Update all effects
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update(deltaTime);
            if (this.floatingTexts[i].isDead()) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    /**
     * Add a particle
     * @param {Particle} particle - Particle to add
     */
    addParticle(particle) {
        this.particles.push(particle);
    }

    /**
     * Add floating text
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Text to display
     * @param {Object} options - Options
     */
    addFloatingText(x, y, text, options = {}) {
        this.floatingTexts.push(new FloatingText(x, y, text, options));
    }

    /**
     * Spawn damage number
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} damage - Damage amount
     * @param {boolean} critical - Whether it's a critical hit
     */
    spawnDamageNumber(x, y, damage, critical = false) {
        this.addFloatingText(
            x + (Math.random() - 0.5) * 20,
            y - 10,
            Math.round(damage).toString(),
            {
                color: critical ? '#ffff00' : '#ff6666',
                font: critical ? 'bold 20px Inter' : 'bold 14px Inter',
                lifetime: 0.8,
                floatSpeed: 40
            }
        );
    }

    /**
     * Spawn XP pickup effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} amount - XP amount
     */
    spawnXPPickup(x, y, amount) {
        this.addFloatingText(x, y, `+${amount} XP`, {
            color: '#7fff7f',
            font: 'bold 14px Inter',
            lifetime: 0.6,
            floatSpeed: 50
        });

        // Sparkle particles
        for (let i = 0; i < 5; i++) {
            this.addParticle(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3 - 1,
                size: 4,
                color: '#7fff7f',
                lifetime: 0.4,
                gravity: 0.1
            }));
        }
    }

    /**
     * Spawn gold pickup effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} amount - Gold amount
     */
    spawnGoldPickup(x, y, amount) {
        this.addFloatingText(x, y, `+${amount}`, {
            color: '#ffd700',
            font: 'bold 14px Inter',
            lifetime: 0.6,
            floatSpeed: 50
        });
    }

    /**
     * Spawn level up effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    spawnLevelUp(x, y) {
        this.addFloatingText(x, y - 30, 'LEVEL UP!', {
            color: '#ffd700',
            font: 'bold 24px MedievalSharp',
            lifetime: 1.5,
            floatSpeed: 20
        });

        // Ring of particles
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                size: 8,
                color: '#ffd700',
                lifetime: 0.8,
                friction: 0.95
            }));
        }
    }

    /**
     * Spawn death burst particles
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} color - Particle color
     */
    spawnDeathBurst(x, y, color = '#ff4444') {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 6 + Math.random() * 4,
                color: color,
                lifetime: 0.5 + Math.random() * 0.3,
                gravity: 0.1,
                friction: 0.96
            }));
        }
    }

    /**
     * Clear all effects
     */
    clear() {
        this.particles = [];
        this.floatingTexts = [];
    }
}
