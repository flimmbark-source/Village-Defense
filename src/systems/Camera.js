/**
 * Grimm Dominion - Camera System
 */

import { CONFIG } from '../config.js';
import { clamp } from '../utils.js';

export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = CONFIG.CAMERA.DEFAULT_WIDTH;
        this.height = CONFIG.CAMERA.DEFAULT_HEIGHT;
    }

    /**
     * Follow a target entity
     * @param {Object} target - Entity with x, y properties
     */
    follow(target) {
        this.x = target.x - this.width / 2;
        this.y = target.y - this.height / 2;

        // Clamp to world bounds
        this.x = clamp(this.x, 0, CONFIG.WORLD.WIDTH - this.width);
        this.y = clamp(this.y, 0, CONFIG.WORLD.HEIGHT - this.height);
    }

    /**
     * Resize the camera viewport
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {Object} World position { x, y }
     */
    screenToWorld(screenX, screenY, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = this.width / rect.width;
        const scaleY = this.height / rect.height;

        return {
            x: (screenX - rect.left) * scaleX + this.x,
            y: (screenY - rect.top) * scaleY + this.y
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @returns {Object} Screen position { x, y }
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }

    /**
     * Check if a point is visible on screen
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @param {number} margin - Optional margin
     * @returns {boolean} True if visible
     */
    isVisible(worldX, worldY, margin = 0) {
        return worldX >= this.x - margin &&
               worldX <= this.x + this.width + margin &&
               worldY >= this.y - margin &&
               worldY <= this.y + this.height + margin;
    }
}
