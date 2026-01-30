/**
 * Grimm Dominion - Camera System
 * Supports following targets and zoom
 */

import { CONFIG } from '../config.js';
import { clamp } from '../utils.js';

export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.baseWidth = CONFIG.CAMERA.DEFAULT_WIDTH;
        this.baseHeight = CONFIG.CAMERA.DEFAULT_HEIGHT;
        this.width = this.baseWidth;
        this.height = this.baseHeight;

        // Zoom - start zoomed in at 1.5x
        this.minZoom = CONFIG.CAMERA.MIN_ZOOM;
        this.maxZoom = CONFIG.CAMERA.MAX_ZOOM;
        this.zoom = 1.5;
        this.targetZoom = 1.5;
        this.zoomSpeed = 0.1; // Smoothing speed

        // Update viewport for initial zoom
        this.updateViewport();
    }

    /**
     * Follow a target entity
     * @param {Object} target - Entity with x, y properties
     */
    follow(target) {
        // Center camera on target
        this.x = target.x - this.width / 2;
        this.y = target.y - this.height / 2;

        // Clamp to world bounds (center if viewport exceeds world size)
        const maxX = CONFIG.WORLD.WIDTH - this.width;
        const maxY = CONFIG.WORLD.HEIGHT - this.height;
        this.x = maxX < 0 ? maxX / 2 : clamp(this.x, 0, maxX);
        this.y = maxY < 0 ? maxY / 2 : clamp(this.y, 0, maxY);
    }

    /**
     * Update camera (for smooth zoom)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Smooth zoom interpolation
        if (Math.abs(this.zoom - this.targetZoom) > 0.001) {
            this.zoom += (this.targetZoom - this.zoom) * this.zoomSpeed * 60 * deltaTime;
            this.updateViewport();
        }
    }

    /**
     * Update viewport size based on zoom
     */
    updateViewport() {
        this.width = this.baseWidth / this.zoom;
        this.height = this.baseHeight / this.zoom;
    }

    /**
     * Set zoom level
     * @param {number} zoom - New zoom level
     */
    setZoom(zoom) {
        this.targetZoom = clamp(zoom, this.minZoom, this.maxZoom);
    }

    /**
     * Update zoom limits
     * @param {number} minZoom - Minimum zoom level
     * @param {number} maxZoom - Maximum zoom level
     */
    setZoomLimits(minZoom, maxZoom) {
        this.minZoom = minZoom;
        this.maxZoom = maxZoom;
        this.zoom = clamp(this.zoom, this.minZoom, this.maxZoom);
        this.targetZoom = clamp(this.targetZoom, this.minZoom, this.maxZoom);
        this.updateViewport();
    }

    /**
     * Adjust zoom by delta
     * @param {number} delta - Zoom delta (positive = zoom in, negative = zoom out)
     */
    adjustZoom(delta) {
        this.setZoom(this.targetZoom + delta * CONFIG.CAMERA.ZOOM_SPEED);
    }

    /**
     * Resize the camera viewport
     * @param {number} width - New base width
     * @param {number} height - New base height
     */
    resize(width, height) {
        this.baseWidth = width;
        this.baseHeight = height;
        this.updateViewport();
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

    /**
     * Get the visible world bounds
     * @returns {Object} Bounds { left, top, right, bottom }
     */
    getBounds() {
        return {
            left: this.x,
            top: this.y,
            right: this.x + this.width,
            bottom: this.y + this.height
        };
    }

    /**
     * Get the visible world bounds with an optional margin
     * @param {number} margin - Extra padding around the viewport
     * @returns {Object} Bounds { left, top, right, bottom }
     */
    getWorldViewBounds(margin = 200) {
        return {
            left: Math.max(0, this.x - margin),
            top: Math.max(0, this.y - margin),
            right: Math.min(CONFIG.WORLD.WIDTH, this.x + this.width + margin),
            bottom: Math.min(CONFIG.WORLD.HEIGHT, this.y + this.height + margin)
        };
    }
}
