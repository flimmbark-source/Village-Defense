/**
 * Grimm Dominion - Utility Functions
 */

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance between the points
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate squared distance between two points (avoids sqrt)
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Squared distance between the points
 */
export function distanceSquared(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

/**
 * Check if a point/entity is within a rectangle
 * @param {Object} point - Point with x, y (and optional width, height)
 * @param {Object} rect - Rectangle with x, y, width, height
 * @returns {boolean} True if point is in rectangle
 */
export function isPointInRect(point, rect) {
    const pointX = point.x + (point.width ? point.width / 2 : 0);
    const pointY = point.y + (point.height ? point.height / 2 : 0);
    return pointX >= rect.x &&
           pointX <= rect.x + rect.width &&
           pointY >= rect.y &&
           pointY <= rect.y + rect.height;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Generate a random ID
 * @returns {number} Random ID
 */
export function generateId() {
    return Math.random();
}

/**
 * Linear interpolation
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Get random value in range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random value in range
 */
export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Normalize a vector
 * @param {number} x - X component
 * @param {number} y - Y component
 * @returns {Object} Normalized vector { x, y }
 */
export function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

/**
 * Move towards a target position
 * @param {Object} current - Current position { x, y }
 * @param {Object} target - Target position { x, y }
 * @param {number} speed - Movement speed
 * @returns {Object} New position { x, y }
 */
export function moveTowards(current, target, speed) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= speed) {
        return { x: target.x, y: target.y };
    }

    return {
        x: current.x + (dx / dist) * speed,
        y: current.y + (dy / dist) * speed
    };
}

/**
 * Update rgba color alpha value
 * @param {string} color - RGBA color string
 * @param {number} alpha - New alpha value (0-1)
 * @returns {string} Updated color string
 */
export function setColorAlpha(color, alpha) {
    return color.replace(/rgba\((\d+,\s*\d+,\s*\d+,\s*)[^)]+\)/, `rgba($1${alpha})`);
}
